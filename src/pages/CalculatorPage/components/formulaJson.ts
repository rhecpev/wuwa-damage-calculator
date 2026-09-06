import type { CalculationResult } from "../hooks/useCalculationResults";
import type { Stats } from "../../../types/stats";
import type { ManualBuff } from "../../../types/game";
import { appliesTo, buffAmount, statPatch } from "../../../calculator/manualBuffs";

/**
 * 이 한 대가 어떻게 계산됐는지를 통째로 JSON 한 덩이로 만든다.
 *
 * 계산이 어긋나 보일 때 "어디서 어긋났는지"를 남한테 그대로 보여주려는 것이다.
 * 그래서 화면에 뜬 숫자만이 아니라 재료(스탯 출처 · 걸린 버프 · 중간값)를 같이 담는다.
 * 값은 전부 계산이 이미 낸 것을 옮겨 담기만 한다 — 여기서 다시 계산하지 않는다.
 * (버프 수치만은 예외로 buffAmount를 다시 부른다. 계산에 쓰인 것과 같은 함수·같은 인자다.)
 */

/** 0인 칸은 뺀다 — 붙여넣었을 때 실제로 걸린 줄만 눈에 들어오게. */
function nonZero(stats: Partial<Stats>): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const key of Object.keys(stats) as (keyof Stats)[]) if (stats[key]) out[key] = stats[key];
  return out;
}

/**
 * 이 공격에 걸릴 수 있는 버프 한 줄씩 — 켰는지, 얼마가 들어갔는지, 어느 칸에 얹혔는지.
 *
 * 「켜져 있는데 왜 값이 안 변하지」를 그 자리에서 가리려는 목적이라, **꺼 둔 것도 담는다**.
 * 적용여부는 계산기가 실제로 쓰는 규칙 그대로다 —
 *   상시(passive)  이 공격에서 따로 꺼두지 않았으면 걸린다
 *   조건부(active) 이 공격에서 켜 둔 것만 걸린다
 * 수치는 buffAmount가 낸 값이고, 파티 버프의 비례분은 준 사람의 스탯창을 본다(ownerPanels).
 */
function buffRows(result: CalculationResult, allBuffs: ManualBuff[]) {
  const { attack, character, item, stats, ownerPanels } = result;
  const off = new Set(item.disabledBuffIds ?? []);

  return allBuffs
    .filter((buff) => appliesTo(buff, attack, character.id))
    .map((buff) => {
      const always = buff.uptime === "passive";
      const on = always ? !off.has(buff.id) : item.enabledBuffIds.includes(buff.id);
      const stacks = item.buffStacks?.[buff.id] ?? buff.stacks;
      // scaleFrom 버프는 단계에 따라 보는 스탯이 다르다. 여기서는 최종 스탯으로 한 번 낸다
      // — 화면(버프 창)에 뜨는 수치와 같은 값이다.
      const amount = buffAmount(buff, stacks, stats, ownerPanels);
      const patch = statPatch(buff, amount);

      return {
        id: buff.id,
        이름: buff.label,
        주인: buff.ownerId ?? null,
        적용됨: on,
        상시: always,
        범위: buff.scope ?? "self",
        자리: buff.target,
        피해분류: buff.damageType,
        ...(buff.element ? { 속성: buff.element } : {}),
        ...(buff.attackId || buff.attackIds ? { 지정공격: buff.attackIds ?? [buff.attackId] } : {}),
        적힌수치: buff.value,
        스택: stacks,
        ...(buff.maxStacks ? { 최대스택: buff.maxStacks } : {}),
        ...(buff.statGroup ? { 스탯묶음: buff.statGroup } : {}),
        ...(buff.modifier ? { 방식: buff.modifier } : {}),
        ...(buff.scaleFrom
          ? {
              비례: {
                기준: buff.scaleFrom,
                // 파티 버프면 준 사람의 스탯창에서 나온다. 누구 것을 봤는지 적어 둔다.
                기준주인:
                  buff.scope === "party" && buff.ownerId && ownerPanels[buff.ownerId]
                    ? buff.ownerId
                    : character.id,
                ...(buff.scaleOffset !== undefined ? { 초과기준: buff.scaleOffset } : {}),
                ...(buff.maxValue !== undefined ? { 상한: buff.maxValue } : {}),
              },
            }
          : {}),
        ...(buff.anomalyStacks ? { 이상스택사용: buff.anomalyStacks } : {}),
        ...(buff.raisesAnomalyStacks ? { 이상스택상한증가: buff.raisesAnomalyStacks } : {}),
        ...(buff.exclusiveGroup ? { 배타묶음: buff.exclusiveGroup } : {}),
        // 실제로 얹힌 값. 적용되지 않은 버프는 「켰다면 이만큼」이라는 뜻이다.
        수치: amount,
        들어간칸: patch ? nonZero(patch) : null,
      };
    });
}

export function formulaJson(result: CalculationResult, allBuffs?: ManualBuff[]): string {
  const { character, attack, item, activeBuffs, damage, ownerPanels } = result;
  const { sources, contributions, ...finalStats } = result.stats;
  // 걸린 버프는 아래에서 따로 적으므로 피해 쪽 사본은 뺀다 — 같은 목록이 두 번 들어가지 않게.
  const { activeBuffs: _inDamage, ...damageOnly } = damage as typeof damage & {
    activeBuffs?: unknown;
  };

  return JSON.stringify(
    {
      앱: { 버전: __BUILD_VERSION__, 빌드: __BUILD_TIME__ },
      캐릭터: {
        이름: character.name,
        id: character.id,
        레벨: character.level,
        속성: character.element,
        무기종류: character.weaponType,
      },
      공격: {
        이름: attack.name,
        id: attack.id,
        분류: attack.type,
        피해판정: attack.damageBonusType ?? attack.type,
        속성: attack.element,
        계수기준: attack.scalingStat,
        스킬레벨: attack.skillLevel,
        이상효과: attack.anomaly ?? null,
        조화도파괴: attack.discord ?? false,
      },
      로테이션: {
        켜둔버프: item.enabledBuffIds,
        ...(item.disabledBuffIds?.length ? { 꺼둔상시버프: item.disabledBuffIds } : {}),
        ...(item.buffStacks ? { 버프스택: item.buffStacks } : {}),
        ...(item.anomalyStacks !== undefined ? { 이상스택: item.anomalyStacks } : {}),
      },
      스탯: {
        최종: nonZero(finalStats),
        조립: sources,
        출처: contributions,
      },
      // 이 공격에 걸릴 수 있는 버프 전부. 꺼 둔 것도 「켰다면 얼마」로 함께 담긴다.
      버프: allBuffs ? buffRows(result, allBuffs) : undefined,
      // 파티 버프의 비례분이 본 「준 사람의 스탯창」 중 실제로 쓰이는 칸만.
      준사람스탯: Object.fromEntries(
        Object.entries(ownerPanels).map(([id, s]) => [
          id,
          {
            공격력: Math.floor(s.atk),
            HP: Math.floor(s.hp),
            방어력: Math.floor(s.def),
            공명효율: 1 + s.energyRegen,
            부조화효율: 1 + s.discordEfficiency,
            조화도파괴증폭: s.syncAmplify,
          },
        ]),
      ),
      // data/buffs.ts 쪽 정적 버프 중 이 공격에서 켜 둔 것.
      // 수기·무기·캐릭터·에코 버프는 스탯을 거쳐 들어오므로 위 「스탯.출처」에 한 줄씩 있다.
      정적버프: activeBuffs.map((buff) => ({
        id: buff.id,
        이름: buff.name,
        출처: buff.source,
        스탯: nonZero(buff.stats),
      })),
      피해: damageOnly,
    },
    null,
    2,
  );
}
