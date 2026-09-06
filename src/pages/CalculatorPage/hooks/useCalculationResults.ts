import { useMemo, useSyncExternalStore } from "react";
import { calculateDamage } from "../../../calculator/damage";
import { calculateFinalStats } from "../../../calculator/stats";
import { characters } from "../../../data/sampleData";
import { buffs } from "../../../data/buffs";
import { DEFAULT_WEAPON_LEVEL, weaponAtLevel, weaponsById } from "../../../data/weapons";
import { DEFAULT_CHARACTER_LEVEL, characterAtLevel } from "../../../data/characterStats";
import { nodeStats } from "../../../data/characterNodes";
import {
  echoStoreVersion,
  equippedEchoes,
  loadEchoLinks,
  loadMyEchoes,
  mainEchoOf,
  subscribeEchoStore,
} from "../../../data/echoStore";
import { echoSkillOf } from "../../../data/echoAttacks";
import { ANOMALIES, anomalyAttack, anomalyFromAttackId } from "../../../data/anomalies";
import { calculateAnomalyDamage } from "../../../calculator/anomaly";
import { calculateDiscordDamage } from "../../../calculator/discord";
import { DISCORD_ATTACK_ID, discordAttack, isDiscordAttackId } from "../../../data/discord";
import {
  anomalyStackCap,
  applyDamageTypeSwitch,
  buffContributions,
  manualBuffDelta,
} from "../../../calculator/manualBuffs";
import type { Stats } from "../../../types/stats";
import type { EchoLink, MyEcho } from "../../../data/echoStore";
import type {
  Character,
  CharacterWeaponConfig,
  ManualBuff,
  PartyConfig,
  SkillCategory,
} from "../../../types/game";

export interface CalculationResult {
  item: PartyConfig["rotation"][number];
  character: Character;
  attack: Character["skills"][number]["attacks"][number];
  activeBuffs: typeof buffs;
  /**
   * 이 공격이 든 스킬의 갈래(공명 회로 등). 공격 자체(Attack.type)에는 회로 자리가 없어서
   * — 회로에 든 공격도 type은 강공격·공명 스킬이다 — 카드 색을 가르려면 이쪽이 필요하다.
   */
  skillCategory?: SkillCategory;
  stats: ReturnType<typeof calculateFinalStats>;
  /**
   * 피해 결과. 일반 공격과 이상 효과는 계산식이 통째로 달라 모양도 다르다.
   * kind로 갈라 보면 된다 — 카드에 뜨는 숫자(normalDamage 등)는 양쪽이 같다.
   */
  damage:
    | ReturnType<typeof calculateDamage>
    | ReturnType<typeof calculateAnomalyDamage>
    | ReturnType<typeof calculateDiscordDamage>;
}

/** 두 증분을 칸마다 더한 새 Stats. 원본은 건드리지 않는다. */
function addStats(a: Stats, b: Stats): Stats {
  const out = { ...a };
  for (const key of Object.keys(out) as (keyof Stats)[]) out[key] += b[key];
  return out;
}

/** 공격과 그 공격이 속한 스킬을 함께 찾는다. 스킬 레벨을 걸어주려면 스킬 id가 필요하다. */
function findAttack(character: Character, id: string) {
  for (const skill of character.skills) {
    const attack = skill.attacks.find((a) => a.id === id);
    if (attack) return { attack, skill };
  }
  return undefined;
}

/**
 * 메인 슬롯(첫 번째 자리) 에코의 어빌리티 공격을 찾는다.
 *
 * 에코 어빌리티는 캐릭터 데이터가 아니라 낀 에코에서 나오므로 skills에는 없다.
 * 에코를 갈아끼우면 담아둔 공격이 더 이상 안 잡힐 수 있는데, 그때는 그냥 빠진다
 * — 캐릭터 공격이 사라졌을 때와 같은 처리다.
 */
function findEchoAttack(characterId: string, id: string, links: EchoLink[], owned: MyEcho[]) {
  const main = mainEchoOf(characterId, links, owned);
  if (!main) return undefined;

  const skill = echoSkillOf(main.id, main.iconUrl, characterId);
  const attack = skill?.attacks.find((a) => a.id === id);
  return skill && attack ? { attack, skill } : undefined;
}

export function useCalculationResults(
  config: PartyConfig,
  characterWeapons: Record<string, CharacterWeaponConfig> = {},
  manualBuffs: ManualBuff[] = [],
  characterChains: Record<string, number> = {},
  characterSkillLevels: Record<string, Record<string, number>> = {},
  characterLevels: Record<string, number> = {},
  characterNodes: Record<string, string[]> = {},
) {
  // 에코 저장소는 localStorage 한 벌이라 React 상태가 아니다. 메인 에코를 갈아끼우면
  // 그 어빌리티 공격도 달라지므로, 저장될 때마다 올라가는 번호를 보고 다시 계산한다.
  const echoVersion = useSyncExternalStore(subscribeEchoStore, echoStoreVersion);

  const results = useMemo<CalculationResult[]>(() => {
    const output: CalculationResult[] = [];
    const enemy = config.enemy;

    // 장착 에코는 캐릭터 관리 탭에서 정한 것을 그대로 쓴다(저장본 한 벌).
    const links = loadEchoLinks();
    const owned = loadMyEchoes();

    for (const item of config.rotation) {
      const baseCharacter = characters.find((c) => c.id === item.characterId);
      if (!baseCharacter) continue;

      // 캐릭터 관리 탭에서 정한 레벨의 기초 스탯으로 바꾼 사본을 쓴다.
      // 레벨은 기초 스탯뿐 아니라 방어저항 배율(내 레벨)에도 들어간다.
      const character = characterAtLevel(
        baseCharacter,
        characterLevels[baseCharacter.id] ?? DEFAULT_CHARACTER_LEVEL,
      );

      // 이상 효과 항목은 캐릭터 스킬이 아니다 — 적에게 쌓인 상태라서 공격 목록에 없다.
      // 루틴에 담을 때 만든 id에서 어느 효과인지 되찾아 공격 모양으로 감싼다.
      const anomalyDef = anomalyFromAttackId(item.attackId);
      const found = isDiscordAttackId(item.attackId)
        ? { attack: discordAttack(), skill: { id: DISCORD_ATTACK_ID } }
        : anomalyDef
        ? { attack: anomalyAttack(anomalyDef.id), skill: { id: `anomaly:${anomalyDef.id}` } }
        : (findAttack(character, item.attackId) ??
          findEchoAttack(character.id, item.attackId, links, owned));
      if (!found) continue;

      // 캐릭터 관리 탭에서 정한 스킬 레벨을 걸어준다. 없으면 데이터 기본값(보통 10).
      const level = characterSkillLevels[character.id]?.[found.skill.id] ?? found.attack.skillLevel;
      const leveledAttack =
        level === found.attack.skillLevel ? found.attack : { ...found.attack, skillLevel: level };

      const memberEchoes = equippedEchoes(character.id, links, owned);

      // data/buffs.ts 쪽 정적 버프도 같은 규칙 — 기본 미적용, 켜둔 것만 넣는다.
      const activeBuffs = buffs.filter((b: (typeof buffs)[number]) =>
        item.enabledBuffIds.includes(b.id),
      );

      // 무기는 캐릭터 관리 탭에서 캐릭터별로 고른 것을 쓴다. 공격력은 거기서 정한 레벨의 값.
      const equippedWeapon = characterWeapons[character.id];
      const weaponEntry = weaponsById.get(equippedWeapon?.weaponId ?? "");
      const weapon = weaponEntry
        ? weaponAtLevel(weaponEntry, equippedWeapon?.level ?? DEFAULT_WEAPON_LEVEL)
        : undefined;

      // 상시(passive) 버프는 조건이 없으니 기본으로 걸린다. 다만 「이 버프가 얼마나 보태는지」를
      // 보려고 잠깐 빼 보는 일이 잦아, 이 공격에서 꺼 둔 것(disabledBuffIds)은 뺀다.
      // 조건부(active) 버프는 반대로 켜둔 것만 넣는다.
      // 공격 분류가 맞는지는 manualBuffDelta 안의 appliesTo가 다시 본다.
      const off = new Set(item.disabledBuffIds ?? []);
      const itemBuffs = manualBuffs
        .filter((buff) =>
          buff.uptime === "passive" ? !off.has(buff.id) : item.enabledBuffIds.includes(buff.id),
        )
        // 스택형 버프는 이 공격에서 정한 스택이 있으면 그 값으로 바꿔 넣는다.
        .map((buff) => {
          const picked = item.buffStacks?.[buff.id];
          if (picked === undefined || picked === buff.stacks) return buff;
          // 이상 효과 스택을 쓰는 버프는 상한이 버프 구성에 따라 오르내린다 —
          // 상한을 올려주던 버프를 끄면 담아 뒀던 스택이 상한 밖으로 남는다. 그때는 잘라 쓴다.
          const cap = buff.anomalyStacks
            ? anomalyStackCap(buff.anomalyStacks, manualBuffs, item.enabledBuffIds, item.disabledBuffIds)
                .max
            : (buff.maxStacks ?? picked);
          return { ...buff, stacks: Math.min(picked, cap) };
        });

      // 「이번 피해는 공명 해방 피해로 적용된다」 같은 조건부 분류 전환을 먼저 얹는다.
      // 아래 버프 판정(appliesTo)이 damageBonusType을 보므로 순서가 여기여야 한다.
      // 카드에서 손으로 고른 판정이 있으면 그것이 마지막에 이긴다 — 사람이 고른 값이라서다.
      const switched = applyDamageTypeSwitch(leveledAttack, itemBuffs);
      const attack = item.damageBonusType
        ? { ...switched, damageBonusType: item.damageBonusType }
        : switched;

      // 증분을 calculateFinalStats 안으로 넘겨서 공격력% 같은 값이
      // 기초 스탯 곱연산에 제대로 들어가게 한다.
      // 스킬 트리 노드는 버프 한 줄처럼 얹는다. 켠 노드의 합계만 들어간다.
      const treeBuff = {
        id: "skillTree",
        name: "스킬 트리",
        source: character.name,
        description: "켜둔 스킬 트리 스탯 노드의 합계",
        stats: nodeStats(character.id, characterNodes[character.id]),
      };

      const weaponForStats = weapon ?? { id: "", name: "", baseAtk: 0, stats: {} };
      const baseBuffs = [...activeBuffs, treeBuff];
      const chain = characterChains[character.id] ?? 0;

      // 수치가 처음부터 정해져 있는 버프.
      const base = manualBuffDelta(attack, itemBuffs, character.id);

      // 공명 효율 · 조화도 파괴 증폭 · 부조화 효율에 비례하는 버프는 그 세 수치가
      // 확정돼야 값이 나온다. 셋 다 공격력에 기대지 않으므로 한 번 계산해서 꺼내 오면 된다
      // — 이 판(panelSource)은 버리고, 뽑은 값을 아래 본계산의 증분에 얹는다.
      //   (「내려앉은 깃털의 노래」의 공명 효율 비례 파티 공격력이 이 길로 들어온다)
      const panelSource = calculateFinalStats(
        character,
        weaponForStats,
        memberEchoes,
        baseBuffs,
        chain,
        base,
      );
      const panel = manualBuffDelta(attack, itemBuffs, character.id, panelSource, "panel");

      const stats = calculateFinalStats(
        character,
        weaponForStats,
        memberEchoes,
        baseBuffs,
        chain,
        addStats(base, panel),
        // 같은 버프를 한 줄씩 남긴 것. 계산에는 위 증분을 쓰고, 이건 상세보기 내역용이다.
        [
          ...buffContributions(attack, itemBuffs, character.id),
          ...buffContributions(attack, itemBuffs, character.id, panelSource, "panel"),
        ],
      );

      // 공격력·HP·방어력에 비례하는 버프(scaleFrom: ATK/HP/DEF)는 최종 스탯이 나온 뒤에야
      // 값이 정해진다. 마지막으로 한 번 더 불러 그것만 얹는다 — 이 버프들은 스탯을 올리지 않으니
      // 위에서 구한 공격력·방어력·HP가 그대로 최종값이고 순환이 생기지 않는다.
      const scaled = manualBuffDelta(attack, itemBuffs, character.id, stats, "scaled");
      for (const key of Object.keys(scaled) as (keyof typeof scaled)[]) {
        if (scaled[key]) stats[key] += scaled[key];
      }
      stats.contributions.push(
        ...buffContributions(attack, itemBuffs, character.id, stats, "scaled"),
      );

      output.push({
        item,
        character,
        attack,
        skillCategory: (found.skill as { category?: SkillCategory }).category,
        activeBuffs,
        stats,
        damage: attack.discord
          ? calculateDiscordDamage(
              {
                rate: item.discordRate,
                occurrences: item.discordOccurrences ?? 1,
              },
              character,
              stats,
              enemy,
            )
          : attack.anomaly
          ? calculateAnomalyDamage(
              {
                kind: attack.anomaly,
                // 스택을 안 정했으면 그 효과의 최대 스택으로 본다
                // — 폭발형은 최대에서만 터지고, 틱형도 보통 최대를 채워 쓴다.
                // 상한을 올려주는 버프(치사의 반주)를 켜 뒀으면 그 상한을 쓴다.
                stacks:
                  item.anomalyStacks ??
                  anomalyStackCap(attack.anomaly, itemBuffs, item.enabledBuffIds, item.disabledBuffIds)
                    .max,
                occurrences: item.anomalyOccurrences ?? 1,
              },
              character,
              stats,
              enemy,
            )
          : calculateDamage(attack, character, stats, activeBuffs, enemy),
      });
    }

    return output;
  }, [
    config,
    characterWeapons,
    manualBuffs,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
    echoVersion,
  ]);

  return results;
}
