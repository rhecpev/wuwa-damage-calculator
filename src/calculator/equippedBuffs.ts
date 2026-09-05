import { weaponsById } from "../data/weapons";
import { getWeaponBuffOverrides, weaponBuffKey } from "../data/weaponBuffOverrides";
import { characterBuffKey, getCharacterBuffOverrides } from "../data/characterBuffOverrides";
import { echoAbilityBuffs, echoSetBuffs } from "../data/echoBuffs";
import { echoesById, fetterGroupByName } from "../data/echoes";
import {
  echoAbilityOwnerId,
  echoBuffKey,
  echoSetOwnerId,
  getEchoBuffOverrides,
} from "../data/echoBuffOverrides";
import { loadEchoLinks, loadMyEchoes, type EchoLink, type MyEcho } from "../data/echoStore";
import type {
  Character,
  CharacterWeaponConfig,
  ManualBuff,
  PartyMemberConfig,
} from "../types/game";

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

    const overrides = getWeaponBuffOverrides();

    weapon.passiveBuffs.forEach((template, index) => {
      // 데이터 확인 탭에서 사람이 고쳐 둔 상시/발동 · 본인/파티가 있으면 그게 이긴다.
      const override = overrides[weaponBuffKey(weapon.id, index)];
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
        uptime: override?.uptime ?? template.uptime ?? (template.condition ? "active" : "passive"),
        scope: override?.scope ?? template.scope ?? "self", // 따로 적지 않으면 본인 버프로 본다
        ownerId: characterId,
        ...(template.maxStacks ? { maxStacks: template.maxStacks } : {}),
        ...(template.exclusiveGroup ? { exclusiveGroup: template.exclusiveGroup } : {}),
        // 무기 버프는 목록에 무기 그림으로 띄운다.
        ...(weapon.icon ? { iconUrl: weapon.icon } : {}),
      });
    });
  }

  return out;
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
): ManualBuff[] {
  const out: ManualBuff[] = [];

  for (const { character, config } of members) {
    const chain = config.resonanceChain ?? 0;
    const mode = config.resonanceMode ?? character.resonanceModes?.[0];
    const inherentsOn = characterInherents[character.id];
    const overrides = getCharacterBuffOverrides();

    (character.passiveBuffs ?? []).forEach((template, index) => {
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

      // 버프 정리 탭에서 사람이 고쳐 둔 상시/발동 · 본인/파티가 있으면 그게 이긴다.
      const override = overrides[characterBuffKey(character.id, index)];

      out.push({
        id: characterBuffId(character.id, index),
        label: `${character.name} · ${template.label}`,
        target: template.target,
        damageType: template.damageType,
        ...(template.element ? { element: template.element } : {}),
        ...(template.attackId ? { attackId: template.attackId } : {}),
        ...(template.attackIds ? { attackIds: template.attackIds } : {}),
        value: template.value,
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
        // 캐릭터 쪽 버프(공명체인·고유효과)는 전투 중에 얹히는 묶음이 기본이다.
        statGroup: template.statGroup ?? "buff",
        stacks: template.stacks ?? 1,
        modifier: template.modifier ?? "increase",
        enabled: true,
        uptime: override?.uptime ?? template.uptime ?? (template.condition ? "active" : "passive"),
        scope: override?.scope ?? template.scope ?? "self", // 따로 적지 않으면 본인 버프로 본다
        ownerId: character.id,
        ...(template.maxStacks ? { maxStacks: template.maxStacks } : {}),
        ...(template.exclusiveGroup ? { exclusiveGroup: template.exclusiveGroup } : {}),
      });
    });
  }

  return out;
}

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
  const overrides = getEchoBuffOverrides();

  for (const characterId of characterIds) {
    // 순서가 곧 슬롯 순서다. 목록에 없는(지운) 에코는 걸러낸다.
    const equipped = links
      .filter((link) => link.characterId === characterId)
      .map((link) => owned.find((e) => e.pk === link.echoId))
      .filter((e): e is MyEcho => e !== undefined);

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
      const ownerKey = echoSetOwnerId(setName);

      templates.forEach((template, index) => {
        // 맞춘 개수가 그 단계에 못 미치면 아직 열리지 않은 효과다.
        if (count < template.setKey) return;
        // 낀 사람을 가리는 효과라면 그 사람일 때만(어빌리티 쪽과 같은 규칙).
        if (template.onlyCharacters && !template.onlyCharacters.includes(characterId)) return;

        const override = overrides[echoBuffKey(ownerKey, index)];
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
            override?.uptime ?? template.uptime ?? (template.condition ? "active" : "passive"),
          scope: override?.scope ?? template.scope ?? "self",
          ownerId: characterId,
          ...(template.maxStacks ? { maxStacks: template.maxStacks } : {}),
          ...(template.exclusiveGroup ? { exclusiveGroup: template.exclusiveGroup } : {}),
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
    const abilityOwnerKey = echoAbilityOwnerId(main.id);

    abilityTemplates.forEach((template, index) => {
      // 「장착 캐릭터가 루시 혹은 레베카일 경우」처럼 낀 사람을 가리는 효과.
      // 조건 메모만으로는 걸러지지 않아 여기서 실제로 뺀다.
      if (template.onlyCharacters && !template.onlyCharacters.includes(characterId)) return;

      const override = overrides[echoBuffKey(abilityOwnerKey, index)];
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
        uptime: override?.uptime ?? template.uptime ?? (template.condition ? "active" : "passive"),
        scope: override?.scope ?? template.scope ?? "self",
        ownerId: characterId,
        ...(template.maxStacks ? { maxStacks: template.maxStacks } : {}),
        ...(template.exclusiveGroup ? { exclusiveGroup: template.exclusiveGroup } : {}),
        ...(mainIcon ? { iconUrl: mainIcon } : {}),
      });
    });
  }

  return out;
}
