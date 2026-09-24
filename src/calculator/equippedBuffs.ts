import { weaponsById } from "../data/weapons";
import { echoAbilityBuffs, echoSetBuffs } from "../data/echoBuffs";
import { anomaliesOf } from "../data/characterAnomalies";
import { baseCharacterId } from "../data/modeVariants";
import { echoesById, fetterGroupByName } from "../data/echoes";
import { echoesOf, loadEchoLinks, loadMyEchoes, type EchoLink, type MyEcho } from "../data/echoStore";
import { CATEGORY_BONUS_KEY, ELEMENT_BONUS_KEY } from "./damage";
import type {
  Character,
  CharacterBuffTemplate,
  CharacterWeaponConfig,
  ManualBuff,
  PartyMemberConfig,
} from "../types/game";
import type { Stats } from "../types/stats";

/**
 * 장착한 무기와 편성한 캐릭터가 들고 있는 버프를 버프 목록에 자동으로 합쳐 넣는다.
 *
 * 무기를 끼면 바로 잡히고, 정련을 바꾸면 수치가 따라 바뀌고, 빼면 사라진다.
 * 캐릭터 쪽도 같은 방식이며 공명체인 단계와 공명 모드로 걸러진다.
 * 사용자가 손으로 담는 절차가 없으므로 목록에 복사본을 쌓아두지 않고 매번 계산해서 만든다.
 */

/** 무기·효과 순서로 고정되는 id. 정련을 바꿔도 같은 id라 켜고 끈 상태가 유지된다. */
export const weaponBuffId = (weaponId: string, index: number) => `weapon:${weaponId}:${index}`;

export function deriveWeaponBuffs(
  characterWeapons: Record<string, CharacterWeaponConfig>,
  characterIds: string[],
): ManualBuff[] {
  const out: ManualBuff[] = [];

  for (const characterId of characterIds) {
    const equipped = characterWeapons[characterId];
    if (!equipped) continue;

    const weapon = weaponsById.get(equipped.weaponId);
    if (!weapon) continue;

    weapon.passiveBuffs.forEach((template, index) => {
      out.push({
        id: weaponBuffId(weapon.id, index),
        label: `${weapon.name} · ${template.label}`,
        target: template.target,
        damageType: template.damageType,
        ...(template.element ? { element: template.element } : {}),
        value: template.values[equipped.refine - 1] ?? template.values.at(-1) ?? 0,
        // 무기 효과의 공격력%는 조건부라도 스탯창과 같은 묶음으로 붙는다(실측 확인).
        // 파티원에게 거는 효과만은 남의 스탯창에 못 들어가므로 템플릿에서 buff로 지정한다.
        statGroup: template.statGroup ?? "panel",
        stacks: template.stacks ?? 1,
        modifier: template.modifier ?? "increase",
        enabled: true,
        // 조건 메모가 달려 있으면 발동형으로 본다.
        uptime: template.uptime ?? (template.condition ? "active" : "passive"),
        scope: template.scope ?? "self", // 따로 적지 않으면 본인 버프로 본다
        ownerId: characterId,
        ...(template.maxStacks ? { maxStacks: template.maxStacks } : {}),
        ...(template.exclusiveGroup ? { exclusiveGroup: template.exclusiveGroup } : {}),
        // 루틴에서 저절로 켜지는 효과(calculator/autoBuffs.ts). 무기·에코는 누가 낄지 모르므로
        // 공격 id가 아니라 분류(triggeredByType)로 걸린다.
        ...(template.triggeredBy ? { triggeredBy: template.triggeredBy } : {}),
        ...(template.triggeredByType ? { triggeredByType: template.triggeredByType } : {}),
        ...(template.endsOn ? { endsOn: template.endsOn } : {}),
        ...(template.stacksPerTrigger !== undefined
          ? { stacksPerTrigger: template.stacksPerTrigger }
          : {}),
        ...(template.statusStacks ? { statusStacks: template.statusStacks } : {}),
        // 무기 버프는 목록에 무기 그림으로 띄운다.
        ...(weapon.icon ? { iconUrl: weapon.icon } : {}),
      });
    });
  }

  return out;
}

/** panelStacks를 보유 체인에 맞는 스택 하나로. {체인: 스택}이면 체인 이하에서 가장 높은 칸. */
function panelStacksAt(value: number | Record<number, number>, chain: number): number {
  if (typeof value === "number") return value;
  let best = 0;
  let stacks = 0;
  for (const [key, count] of Object.entries(value)) {
    const at = Number(key);
    if (at <= chain && at >= best) {
      best = at;
      stacks = count;
    }
  }
  return stacks;
}

/**
 * 스킬 레벨을 따라가는 버프의 값.
 *
 * 플로로 「잔음 1스택 당 배율 증가량」처럼 스킬 속성표에 레벨별로 적혀 있는 값이 있다.
 * valuesByLevel(레벨 1~10)과 levelSkillId를 적어 두면 그 스킬의 레벨 칸을 읽어 고른다.
 * 레벨을 정해 두지 않았으면 그 스킬의 기본값(10레벨)을 쓴다 — 계산 쪽 규칙과 같다.
 */
function levelValue(
  template: CharacterBuffTemplate,
  levels: Record<string, number> | undefined,
): number {
  const table = template.valuesByLevel;
  if (!table || table.length === 0) return template.value;
  const level = template.levelSkillId ? levels?.[template.levelSkillId] : undefined;
  if (level === undefined) return table[table.length - 1];
  return table[Math.min(Math.max(Math.round(level), 1), table.length) - 1];
}

/** 캐릭터 고유 버프의 id. 캐릭터·효과 순서로 고정된다. */
export const characterBuffId = (characterId: string, index: number) =>
  `character:${characterId}:${index}`;

/**
 * 파티에 편성된 캐릭터가 들고 있는 버프를 모은다.
 * 공명체인 단계가 모자라거나, 공명 모드가 다르거나,
 * 그 버프를 주는 고유 스킬을 캐릭터 관리에서 꺼두었으면 빠진다.
 *
 * characterInherents: 캐릭터별로 켜둔 고유 스킬 id 목록(PartyConfigContext).
 *   스킬 트리 노드와 같은 규칙이라 값이 없는 캐릭터는 "전부 켬"으로 본다.
 */
export function deriveCharacterBuffs(
  members: { character: Character; config: PartyMemberConfig }[],
  characterInherents: Record<string, string[] | undefined> = {},
  characterSkillLevels: Record<string, Record<string, number>> = {},
): ManualBuff[] {
  const out: ManualBuff[] = [];

  for (const { character, config } of members) {
    const chain = config.resonanceChain ?? 0;
    const mode = config.resonanceMode ?? character.resonanceModes?.[0];
    const inherentsOn = characterInherents[character.id];

    (character.passiveBuffs ?? []).forEach((template, index) => {
      // 자리만 남긴 줄은 버프를 만들지 않는다. forEach의 index는 배열 위치라 그대로 남으므로
      // 뒤 줄의 id가 당겨지지 않는다 — 그게 이 칸을 두는 이유다(types/game.ts의 retired).
      if (template.retired) return;
      if (template.resonanceChain !== undefined && chain < template.resonanceChain) return;
      if (template.resonanceMode !== undefined && mode !== template.resonanceMode) return;
      // 고유 스킬에서 나온 버프는 그 스킬을 꺼두면 같이 빠진다.
      // inherentsOn이 undefined면 아직 손대지 않은 캐릭터라 전부 켠 것으로 본다.
      if (
        template.inherentSkillId !== undefined &&
        inherentsOn !== undefined &&
        !inherentsOn.includes(template.inherentSkillId)
      )
        return;

      out.push({
        id: characterBuffId(character.id, index),
        label: `${character.name} · ${template.label}`,
        target: template.target,
        damageType: template.damageType,
        ...(template.element ? { element: template.element } : {}),
        ...(template.attackId ? { attackId: template.attackId } : {}),
        ...(template.attackIds ? { attackIds: template.attackIds } : {}),
        // 레벨 표가 있으면 그 스킬의 레벨 값을 쓴다(플로로 「잔음」 배율 증가량).
        value: levelValue(template, characterSkillLevels[character.id]),
        // 수치가 스탯에서 나오는 버프(연무 3체인 등)는 그 스탯 종류와 상한을 그대로 넘긴다.
        ...(template.scaleFrom ? { scaleFrom: template.scaleFrom } : {}),
        ...(template.scaleOffset !== undefined ? { scaleOffset: template.scaleOffset } : {}),
        // 이상 효과 스택을 그대로 쓰는 버프 · 그 상한을 올려주는 버프
        ...(template.anomalyStacks ? { anomalyStacks: template.anomalyStacks } : {}),
        ...(template.raisesAnomalyStacks !== undefined
          ? { raisesAnomalyStacks: template.raisesAnomalyStacks }
          : {}),
        ...(template.raisesAnomalyKinds ? { raisesAnomalyKinds: template.raisesAnomalyKinds } : {}),
        // 켜면 그 공격의 피해 판정이 바뀌는 버프(데니아 3체인)
        ...(template.switchesDamageBonusType
          ? { switchesDamageBonusType: template.switchesDamageBonusType }
          : {}),
        ...(template.maxValue !== undefined ? { maxValue: template.maxValue } : {}),
        // 카드의 발수만큼 발마다 스택이 오르는 버프(모르테피 「자유로운 리듬」)
        ...(template.rampsWithRepeat ? { rampsWithRepeat: true } : {}),
        // 캐릭터 쪽 버프(공명체인·고유효과)는 전투 중에 얹히는 묶음이 기본이다.
        statGroup: template.statGroup ?? "buff",
        stacks: template.stacks ?? 1,
        modifier: template.modifier ?? "increase",
        enabled: true,
        uptime: template.uptime ?? (template.condition ? "active" : "passive"),
        scope: template.scope ?? "self", // 따로 적지 않으면 본인 버프로 본다
        // 파티 버프인데 본인은 빼는 것(치사 2체인) — 본인 몫이 따로 적혀 있다.
        ...(template.excludeOwner ? { excludeOwner: true } : {}),
        // 특정 캐릭터 전용 파티 버프(파수인 「자아의 이끌림」의 방랑자 몫)
        ...(template.onlyFor ? { onlyFor: template.onlyFor } : {}),
        // 상시지만 게임 속성 창에는 안 찍히는 것(감심 형식 무극)
        ...(template.hideFromPanel ? { hideFromPanel: true } : {}),
        // 「전체 속성 피해 보너스」라 속성 창 6칸에 모두 찍히는 것(치사 2체인)
        ...(template.allElements ? { allElements: true } : {}),
        // 발동 버프지만 속성 창에 늘 찍히는 것 — 보유 체인에 맞는 스택으로 풀어 둔다.
        ...(template.panelStacks !== undefined
          ? { panelStacks: panelStacksAt(template.panelStacks, chain) }
          : {}),
        ownerId: character.id,
        // 체인에 따라 상한이 오르는 스택(시그리카 「타고난 재능?」 기본 2 · 3체인 4)은 보유 체인의 상한으로 풀어 둔다.
        ...(template.maxStacksByChain
          ? { maxStacks: panelStacksAt(template.maxStacksByChain, chain) }
          : template.maxStacks
            ? { maxStacks: template.maxStacks }
            : {}),
        ...(template.maxStacksByChain
          ? { stacks: Math.min(template.stacks ?? 1, panelStacksAt(template.maxStacksByChain, chain)) }
          : {}),
        ...(template.exclusiveGroup ? { exclusiveGroup: template.exclusiveGroup } : {}),
        // 「이 공격을 쓰면 그 뒤로 걸린다」 — 루틴에서 저절로 켜 준다(calculator/autoBuffs.ts).
        ...(template.triggeredBy ? { triggeredBy: template.triggeredBy } : {}),
        ...(template.triggeredByType ? { triggeredByType: template.triggeredByType } : {}),
        ...(template.endsOn ? { endsOn: template.endsOn } : {}),
        ...(template.stacksPerTrigger !== undefined
          ? { stacksPerTrigger: template.stacksPerTrigger }
          : {}),
        // 적에게 붙는 상태(조화 밀집 · 간섭)의 스택을 따르는 줄 · 그 상한을 올려 주는 줄
        ...(template.statusStacks ? { statusStacks: template.statusStacks } : {}),
        ...(template.raisesStatusStacks !== undefined
          ? { raisesStatusStacks: template.raisesStatusStacks }
          : {}),
        ...(template.raisesStatusKinds ? { raisesStatusKinds: template.raisesStatusKinds } : {}),
      });
    });
  }

  return out;
}

/**
 * 「장착 캐릭터가 ○○일 경우」를 따지는 자리. 이중 모드 캐릭터는 모드마다 id가 갈라져 있어
 * (aymes -> aymes-discord · aymes-flame) 원래 id로도 한 번 더 본다 — 에이메스 시길룸이 그랬다.
 */
const wornBy = (only: string[] | undefined, characterId: string) =>
  !only || only.includes(characterId) || only.includes(baseCharacterId(characterId));

/** 이 캐릭터가 끼면 상시가 되는 효과인지(passiveFor). 모드로 갈린 id도 원래 id로 본다. */
const passiveFor = (list: string[] | undefined, characterId: string) =>
  !!list && (list.includes(characterId) || list.includes(baseCharacterId(characterId)));

/** 화음 세트 버프의 id. 캐릭터마다 따로 켜고 끌 수 있도록 캐릭터 id를 앞에 둔다. */
export const echoSetBuffId = (characterId: string, setName: string, index: number) =>
  `echoset:${characterId}:${setName}:${index}`;

/** 메인 에코 어빌리티 버프의 id. */
export const echoAbilityBuffId = (characterId: string, echoId: string, index: number) =>
  `echoability:${characterId}:${echoId}:${index}`;

/**
 * 장착한 에코에서 나오는 버프를 모은다. 두 갈래가 규칙이 서로 다르다.
 *
 *   화음(세트) 효과   자리를 가리지 않는다. 같은 화음을 고른 에코가 몇 개인지 세고,
 *                     그 개수 이하의 단계(setKey)만 열린다 — 3개면 2세트만, 5개면 2·5세트 둘 다.
 *   에코 어빌리티     메인 슬롯(첫 번째 자리)에 낀 에코 하나만 걸린다.
 *                     2~5번 자리 에코의 어빌리티는 장착 효과든 발동 효과든 걸리지 않는다.
 *
 * 어느 화음을 골랐는지는 에코마다 options.selectedFetter에 담겨 있다(에코 관리 탭에서 고른다).
 * 슬롯 순서는 연결 목록(EchoLink)의 순서 그대로다 — 첫 번째가 메인이다.
 */
export function deriveEchoBuffs(
  characterIds: string[],
  links: EchoLink[] = loadEchoLinks(),
  owned: MyEcho[] = loadMyEchoes(),
): ManualBuff[] {
  const out: ManualBuff[] = [];

  for (const characterId of characterIds) {
    // 순서가 곧 슬롯 순서다. 목록에 없는(지운) 에코는 걸러낸다.
    // 대여로 둔 캐릭터면 대여 빌드의 에코가 나온다(echoStore.echoesOf).
    const equipped = echoesOf(characterId, links, owned);

    if (equipped.length === 0) continue;

    // ── 화음 세트 ── 고른 화음별로 몇 개를 맞췄는지 센다.
    const counts = new Map<string, number>();
    for (const echo of equipped) {
      const name = (echo.options as { selectedFetter?: string } | undefined)?.selectedFetter;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    for (const [setName, count] of counts) {
      const templates = echoSetBuffs[setName];
      if (!templates) continue;
      const icon = fetterGroupByName(setName)?.icon ?? undefined;

      templates.forEach((template, index) => {
        // 맞춘 개수가 그 단계에 못 미치면 아직 열리지 않은 효과다.
        if (count < template.setKey) return;
        // 낀 사람을 가리는 효과라면 그 사람일 때만(어빌리티 쪽과 같은 규칙).
        if (!wornBy(template.onlyCharacters, characterId)) return;
        // 「적에게 ○○ 효과 추가 시」가 조건인 줄은 그 효과를 붙일 수 있는 사람에게만 뜬다.
        if (
          template.requiresAnomaly &&
          !anomaliesOf(characterId).includes(template.requiresAnomaly)
        )
          return;

        out.push({
          id: echoSetBuffId(characterId, setName, index),
          label: `${setName} ${template.setKey}세트 · ${template.label}`,
          target: template.target,
          damageType: template.damageType,
          ...(template.element ? { element: template.element } : {}),
          value: template.value,
          ...(template.scaleFrom ? { scaleFrom: template.scaleFrom } : {}),
          ...(template.scaleOffset !== undefined ? { scaleOffset: template.scaleOffset } : {}),
          ...(template.maxValue !== undefined ? { maxValue: template.maxValue } : {}),
          // 에코 세트 효과는 스탯창에 찍히지 않고 전투 중에 붙는다(실측 확인).
          statGroup: template.statGroup ?? "buff",
          stacks: template.stacks ?? 1,
          modifier: template.modifier ?? "increase",
          enabled: true,
          uptime:
            (passiveFor(template.passiveFor, characterId) ? "passive" : undefined) ??
            template.uptime ??
            (template.condition ? "active" : "passive"),
          scope: template.scope ?? "self",
          ownerId: characterId,
          ...(template.maxStacks ? { maxStacks: template.maxStacks } : {}),
          ...(template.exclusiveGroup ? { exclusiveGroup: template.exclusiveGroup } : {}),
          // 루틴에서 저절로 켜지는 효과(calculator/autoBuffs.ts). 에코도 누가 낄지 모르므로
          // 공격 id가 아니라 분류(triggeredByType)로 걸린다.
          ...(template.triggeredBy ? { triggeredBy: template.triggeredBy } : {}),
          ...(template.triggeredByType ? { triggeredByType: template.triggeredByType } : {}),
          ...(template.endsOn ? { endsOn: template.endsOn } : {}),
          ...(template.stacksPerTrigger !== undefined
            ? { stacksPerTrigger: template.stacksPerTrigger }
            : {}),
          ...(template.statusStacks ? { statusStacks: template.statusStacks } : {}),
          ...(icon ? { iconUrl: icon } : {}),
        });
      });
    }

    // ── 에코 어빌리티 ── 메인 슬롯(첫 번째)에 낀 에코 것만.
    const main = equipped[0];
    const abilityTemplates = echoAbilityBuffs[main.id];
    if (!abilityTemplates) continue;

    const mainName = main.name || echoesById.get(main.id)?.name || `에코 ${main.id}`;
    const mainIcon = main.iconUrl ?? echoesById.get(main.id)?.icon ?? undefined;

    abilityTemplates.forEach((template, index) => {
      // 「장착 캐릭터가 루시 혹은 레베카일 경우」처럼 낀 사람을 가리는 효과.
      // 조건 메모만으로는 걸러지지 않아 여기서 실제로 뺀다.
      if (!wornBy(template.onlyCharacters, characterId)) return;
      // 세트 쪽과 같은 규칙 — 못 붙이는 이상 효과가 조건이면 이 줄은 서지 않는다.
      if (template.requiresAnomaly && !anomaliesOf(characterId).includes(template.requiresAnomaly))
        return;

      out.push({
        id: echoAbilityBuffId(characterId, main.id, index),
        label: `${mainName} · ${template.label}`,
        // 한 갈래에만 붙는 효과(길게 누르기의 지속 타격 등)는 그 공격에만 걸린다.
        ...(template.attackIds ? { attackIds: template.attackIds } : {}),
        target: template.target,
        damageType: template.damageType,
        ...(template.element ? { element: template.element } : {}),
        value: template.value,
        ...(template.scaleFrom ? { scaleFrom: template.scaleFrom } : {}),
        ...(template.scaleOffset !== undefined ? { scaleOffset: template.scaleOffset } : {}),
        ...(template.maxValue !== undefined ? { maxValue: template.maxValue } : {}),
        statGroup: template.statGroup ?? "buff",
        stacks: template.stacks ?? 1,
        modifier: template.modifier ?? "increase",
        enabled: true,
        uptime:
          (passiveFor(template.passiveFor, characterId) ? "passive" : undefined) ??
          template.uptime ??
          (template.condition ? "active" : "passive"),
        scope: template.scope ?? "self",
        ownerId: characterId,
        ...(template.maxStacks ? { maxStacks: template.maxStacks } : {}),
        ...(template.exclusiveGroup ? { exclusiveGroup: template.exclusiveGroup } : {}),
        // 「에코 어빌리티 발동 후」처럼 루틴에서 저절로 켜지는 효과 — 분류로 건다.
        ...(template.triggeredBy ? { triggeredBy: template.triggeredBy } : {}),
        ...(template.triggeredByType ? { triggeredByType: template.triggeredByType } : {}),
        ...(template.endsOn ? { endsOn: template.endsOn } : {}),
        ...(template.stacksPerTrigger !== undefined
          ? { stacksPerTrigger: template.stacksPerTrigger }
          : {}),
        ...(template.statusStacks ? { statusStacks: template.statusStacks } : {}),
        ...(mainIcon ? { iconUrl: mainIcon } : {}),
      });
    });
  }

  return out;
}

/** 피해 종류 → 스탯창 칸. 속성 표와 분류 표를 한 번에 뒤지려고 합쳐 둔다. */
const BONUS_KEY_BY_DAMAGE_TYPE: Partial<Record<string, keyof Stats>> = {
  ...ELEMENT_BONUS_KEY,
  ...CATEGORY_BONUS_KEY,
};

/**
 * 이 버프가 스탯창의 어느 칸에 찍히는지. 찍힐 칸이 없으면 null.
 *
 * 공격력·HP·방어력 %는 어느 묶음에서 왔는지로 자리가 갈린다(calculateFinalStats 주석 참고).
 *   panel = 스탯창 값을 확정할 때 먼저 곱해지는 것 — 무기 효과 · 에코 옵션 · 스킬 트리
 *   buff  = 확정된 값 위에 더해지는 것 — 공명체인 · 파티 버프 · 에코 세트 효과
 * 그래서 나머지 칸과 달리 이 셋만 statGroup을 보고 자리를 고른다.
 */
function panelStatKey(buff: ManualBuff): keyof Stats | null {
  switch (buff.target) {
    case "damageBonus":
      // 「인멸 피해 보너스」를 damageType "All" + element로 적은 것도 있다(천괴중루 등 에코 어빌리티).
      if (buff.damageType === "All" && buff.element) return ELEMENT_BONUS_KEY[buff.element];
      // "All"(전체 피해 보너스)과 "Chain"(협동 공격)은 게임 속성 창에도 칸이 없다.
      return BONUS_KEY_BY_DAMAGE_TYPE[buff.damageType] ?? null;
    case "critRate":
      return "critRate";
    case "critDamage":
      return "critDamage";
    case "energyRegen":
      return "energyRegen";
    case "syncAmplify":
      return "syncAmplify";
    case "discordEfficiency":
      return "discordEfficiency";
    case "healingBonus":
      return "healingBonus";

    // 공격력·HP·방어력 — 스탯창의 세 줄. 공격력만 있고 체력·방어력이 빠지면
    // 같은 무기·에코를 끼고도 한 줄만 맞는 화면이 된다.
    case "atkFlat":
      return "atk";
    case "atkPercent":
      return buff.statGroup === "panel" ? "atkPercent" : "atkPercentBuff";
    case "hpPercent":
      return buff.statGroup === "panel" ? "hpPercent" : "hpPercentBuff";
    case "defPercent":
      return buff.statGroup === "panel" ? "defPercent" : "defPercentBuff";

    default:
      return null;
  }
}

/**
 * 낀 것에서 나오는 **조건 없는** 효과를 스탯창 값으로 옮긴다.
 *
 * 네 군데서 모은다.
 *   무기 효과       「공격력이 12% 증가된다」처럼 끼고만 있으면 걸리는 것
 *   고유 스킬·체인  발동 조건 없이 늘 붙는 것
 *   에코 어빌리티   1번 자리 에코의 「메인 슬롯에 장착 시 …」
 *   화음 세트 효과  2세트처럼 맞추기만 하면 조건 없이 걸리는 것
 *
 * 화음 세트는 예전에 통째로 뺐었다 — 공격력% 세트가 게임 속성 창에 안 찍힌다는 실측 때문이다.
 * 그런데 2세트 고정 스탯(「내려앉은 깃털의 노래」 공명 효율 10% 등)까지 같이 빠져서
 * 화면에 아예 안 잡혔다. 그래서 조건 없는 것만 받도록 바꾸고, 공격력·HP·방어력 %는
 * statGroup이 "buff"라 스탯창 몫이 아니라 버프 몫으로 들어간다(panelStatKey 참고) —
 * 속성 창 숫자는 그대로 두면서 세트 효과는 화면에 잡히는 자리다.
 *
 * 빼는 것 —
 *   uptime "active"   발동 조건이 있는 것. 끼고만 있어서는 걸리지 않는다.
 *   scope "party"     남에게 가는 것. 이 캐릭터의 속성 창에 찍힐 값이 아니다.
 *   scaleFrom 있는 것  수치가 스탯에서 나오는 것. 스탯을 확정하는 자리에서 그 스탯을 되읽을 수 없다.
 *   hideFromPanel     상시지만 게임 속성 창에는 안 찍히는 것(감심 형식 무극).
 *   attackId(s) 있는 것 특정 공격에만 붙는 것(복링 1체인 귀일 크리티컬).
 * 스탯창에 칸이 없는 것(전체 피해 보너스 · 협동 공격 · 저항 무시 등)도 조용히 넘어간다.
 *
 * 이 값은 **보여주기 전용**이다. 피해 계산은 같은 효과를 ManualBuff 쪽에서 이미 받고 있으므로,
 * 여기서 더한 것을 계산에 다시 넣으면 두 번 걸린다.
 */
export function equippedPanelStats(
  character: Character,
  weaponConfig: CharacterWeaponConfig | undefined,
  resonanceChain = 0,
  links: EchoLink[] = loadEchoLinks(),
  owned: MyEcho[] = loadMyEchoes(),
  inherents: Record<string, string[] | undefined> = {},
): Partial<Stats> {
  const id = character.id;

  const weaponBuffs = weaponConfig ? deriveWeaponBuffs({ [id]: weaponConfig }, [id]) : [];
  const characterBuffs = deriveCharacterBuffs(
    [{ character, config: { characterId: id, weaponId: weaponConfig?.weaponId ?? "", echoIds: [], resonanceChain } }],
    inherents,
  );
  // 어빌리티와 화음 세트 둘 다. 조건이 붙은 것은 아래 uptime 검사에서 빠진다.
  const echoBuffs = deriveEchoBuffs([id], links, owned);

  const out: Partial<Stats> = {};
  for (const buff of [...weaponBuffs, ...characterBuffs, ...echoBuffs]) {
    // 발동 버프라도 panelStacks가 있으면 속성 창에 늘 찍히는 것이라 그 스택으로 넣는다(아우구스타 「왕관」).
    const panelStacks = typeof buff.panelStacks === "number" ? buff.panelStacks : undefined;
    if ((buff.uptime === "active" && panelStacks === undefined) || buff.scope === "party") continue;
    if (buff.scaleFrom) continue;
    if (buff.hideFromPanel) continue;
    // 특정 공격에만 붙는 버프(복링 1체인 「귀일」 크리티컬 등)는 그 공격에서만 걸린다 — 스탯창 몫이 아니다.
    if (buff.attackId || buff.attackIds?.length) continue;

    // 무기의 「전체 속성 피해 보너스」는 게임 속성 창의 6속성 칸에 모두 찍힌다(물리는 제외).
    // 캐릭터 쪽도 allElements로 표시한 것은 같다(치사 2체인 「파멸의 선」 50%).
    // 캐릭터 · 에코 쪽 "All"은 칸이 없는 전체 피해 보너스라 그대로 넘어간다.
    if (
      buff.target === "damageBonus" &&
      buff.damageType === "All" &&
      !buff.element &&
      (weaponBuffs.includes(buff) || buff.allElements)
    ) {
      const amount = buff.value * (buff.stacks || 1);
      for (const [element, key] of Object.entries(ELEMENT_BONUS_KEY)) {
        if (element === "Physical") continue;
        out[key] = (out[key] ?? 0) + amount;
      }
      continue;
    }

    const key = panelStatKey(buff);
    if (!key) continue;
    out[key] = (out[key] ?? 0) + buff.value * (panelStacks ?? (buff.stacks || 1));
  }

  return out;
}
