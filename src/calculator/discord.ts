import { DISCORD_BASE, DISCORD_DEFAULT_RATE } from "../data/discord";
import type { Character, Enemy } from "../types/game";
import type { Stats } from "../types/stats";

/**
 * 조화도 파괴(부조화) 피해.
 *
 *   부조화 데미지 = 10027.14 × 최종배율 × 방어저항 × 속성저항
 *                 × (1 + 최종피해) × (1 + 조화도 파괴 증폭/100) × 반복 횟수
 *
 * 스킬 피해식(damage.ts)·이상 효과식(anomaly.ts)과 겹치는 데가 거의 없어서 따로 둔다.
 * 무엇이 걸리고 무엇이 안 걸리는지는 data/discord.ts 설명 참고.
 *
 * 특히 조심할 것 —
 *   ① **크리티컬이 없다.** 세 결과값(일반·크리·기대)이 전부 같게 나온다.
 *   ② **피해 보너스도 부스트도 안 걸린다.** 공격력을 올려도 이 피해는 꿈쩍하지 않는다.
 *   ③ **방어력 무시가 걸린다.** 이상 효과는 감소만 걸리는 것과 정반대라 헷갈리기 쉽다.
 *   ④ **조화도 파괴 증폭은 여기에만 걸린다.** 스탯창 표시값이 pt라 100으로 나눠 쓴다.
 */

/** 일반 피해와 같은 3구간 분기. damage.ts의 resMultiplier와 같은 식이다. */
function resMultiplier(baseRes: number, resPen: number): number {
  const r = baseRes - resPen;
  if (r < 0) return 1 - r / 2;
  if (r < 0.8) return 1 - r;
  return 1 / (1 + 5 * r);
}

/**
 * 부조화 피해의 방어저항. **일반 피해와 같다** — 방어무시·방어감소가 둘 다 걸린다.
 * (이상 효과만 방어무시가 빠진다. anomaly.ts 참고.)
 */
function discordDefMultiplier(
  charLevel: number,
  enemyLevel: number,
  defIgnore: number,
  defReduction: number,
): number {
  const numerator = 800 + 8 * charLevel;
  const enemyDef = 792 + 8 * enemyLevel;
  return numerator / (numerator + enemyDef * (1 - defIgnore) * (1 - defReduction));
}

/** 피해량 올림. 게임과 같은 자리에서 올리도록 float32로 떨어뜨린 뒤 올린다(damage.ts 설명 참고). */
const ceilDamage = (v: number) =>
  Math.ceil(Math.fround(v) - Math.max(1e-9, Math.abs(v) * 1.2e-7));

export interface DiscordDamageInput {
  /** 조화도 파괴 배율. 기본 조화도 파괴는 1600%(=16.0)다. */
  rate?: number;
  /** 같은 조화도 파괴가 몇 번 터졌는지. 기본 1. */
  occurrences?: number;
}

export function calculateDiscordDamage(
  input: DiscordDamageInput,
  c: Character,
  s: Stats,
  e: Enemy,
) {
  const rate = input.rate ?? DISCORD_DEFAULT_RATE;
  const occurrences = Math.max(0, Math.floor(input.occurrences ?? 1));

  // 최종배율 = (기본배율 + 배율증가) × (1 + 배율상승). 스킬 피해와 같은 규칙이다.
  const motionValue = (rate + s.motionValueIncrease) * (1 + s.motionValueAmplify);
  const base = DISCORD_BASE * motionValue;

  // 물리 피해라 적 속성과 같아지는 일이 없다 — 늘 기본 저항 쪽을 본다.
  const baseRes = e.baseRes;
  const resPenTotal = s.resPen + s.resReduction;
  const resMult = resMultiplier(baseRes, resPenTotal);
  const defMult = discordDefMultiplier(c.level, e.level, s.defIgnore, s.defReduction);
  const totalDmg = 1 + s.totalDamageBonus;
  const drMult = 1 - e.damageReduction;
  // 조화도 파괴 증폭 — 스탯창 표시값이 pt라 100으로 나눈다(공명 효율과 같은 단위 규칙).
  const amplify = 1 + s.syncAmplify / 100;

  const multiplierChain = defMult * resMult * drMult * totalDmg * amplify;
  const raw = base * occurrences * multiplierChain;
  const damage = ceilDamage(raw);

  return {
    /** 조화도 파괴로 낸 결과. 계산식 창이 이 값으로 다른 카드를 그린다. */
    kind: "discord" as const,
    // 크리티컬이 없어 세 값이 모두 같다. 화면이 일반 공격과 같은 카드를 쓰므로 모양만 맞춘다.
    normalDamage: damage,
    criticalDamage: damage,
    expectedDamage: damage,
    hits: [
      {
        baseMotionValue: rate,
        motionValue,
        raw,
        normalDamage: damage,
        criticalDamage: damage,
        expectedDamage: damage,
      },
    ],
    hitCount: 1,
    fixedDamage: 0,
    activeBuffs: [],
    breakdown: {
      discordBase: DISCORD_BASE,
      baseRate: rate,
      motionValueIncrease: s.motionValueIncrease,
      motionValueAmplify: s.motionValueAmplify,
      motionValue,
      base,
      occurrences,
      // 속성저항 — 물리 고정
      element: "Physical" as const,
      baseRes,
      resPen: s.resPen,
      resReduction: s.resReduction,
      resPenTotal,
      resMult,
      // 방어저항 — 무시와 감소가 둘 다 걸린다
      charLevel: c.level,
      enemyLevel: e.level,
      defIgnore: s.defIgnore,
      defReduction: s.defReduction,
      defMult,
      enemyDamageReduction: e.damageReduction,
      drMult,
      totalDamageBonus: s.totalDamageBonus,
      totalDmg,
      syncAmplify: s.syncAmplify,
      amplify,
      multiplierChain,
      rawTotal: raw,
    },
  };
}
