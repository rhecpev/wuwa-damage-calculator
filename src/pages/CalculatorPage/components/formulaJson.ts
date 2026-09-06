import type { CalculationResult } from "../hooks/useCalculationResults";
import type { Stats } from "../../../types/stats";

/**
 * 이 한 대가 어떻게 계산됐는지를 통째로 JSON 한 덩이로 만든다.
 *
 * 계산이 어긋나 보일 때 "어디서 어긋났는지"를 남한테 그대로 보여주려는 것이다.
 * 그래서 화면에 뜬 숫자만이 아니라 재료(스탯 출처 · 걸린 버프 · 중간값)를 같이 담는다.
 * 값은 전부 계산이 이미 낸 것을 옮겨 담기만 한다 — 여기서 다시 계산하지 않는다.
 */

/** 0인 칸은 뺀다 — 붙여넣었을 때 실제로 걸린 줄만 눈에 들어오게. */
function nonZero(stats: Partial<Stats>): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const key of Object.keys(stats) as (keyof Stats)[]) if (stats[key]) out[key] = stats[key];
  return out;
}

export function formulaJson(result: CalculationResult): string {
  const { character, attack, item, activeBuffs, damage } = result;
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
      로테이션: { 켜둔버프: item.enabledBuffIds },
      스탯: {
        최종: nonZero(finalStats),
        조립: sources,
        출처: contributions,
      },
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
