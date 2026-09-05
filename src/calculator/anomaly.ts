import { ANOMALIES, type AnomalyKind } from "../data/anomalies";
import type { Character, Enemy } from "../types/game";
import type { Stats } from "../types/stats";

/**
 * 이상 효과(Anomaly) 피해.
 *
 *   이상 데미지 = 이상 기초값 × 발생횟수 × 부스트 × 이상 치명
 *                × 방어저항 × 속성저항 × 최종피해
 *
 * 일반 피해식(calculator/damage.ts)과 겹치는 데가 거의 없다 —
 * 공격력도 스킬 계수도 크리티컬도 타지 않고, 피해증가(DMG Bonus) 그룹도 걸리지 않는다.
 * 그래서 같은 함수에 끼워 넣지 않고 통째로 따로 둔다.
 *
 * 출처: docs/조화도-이상-대미지-공식.md (phro.love). 90레벨 기준값만 알려져 있다.
 *
 * 일반 피해와 다른 곳 두 군데를 특히 조심할 것 —
 *   ① 방어저항에 **방어무시(defIgnore)가 들어가지 않는다.** 방어감소(defReduction)만 반영한다.
 *   ② 부스트가 일반 피해의 boost 그룹과 다른 칸이다(anomalyBoost · <효과>Boost).
 */

/** 이상 효과별 부스트를 담는 Stats 칸. */
const ANOMALY_BOOST_KEY: Record<AnomalyKind, keyof Stats> = {
  AeroErosion: "aeroErosionBoost",
  SpectroFrazzle: "spectroFrazzleBoost",
  ElectroFlare: "electroFlareBoost",
  FrostChafe: "frostChafeBoost",
  FusionBurst: "fusionBurstBoost",
  HavocBane: "havocBaneBoost",
};

/** 일반 피해와 같은 3구간 분기. damage.ts의 resMultiplier와 같은 식이다. */
function resMultiplier(baseRes: number, resPen: number): number {
  const r = baseRes - resPen;
  if (r < 0) return 1 - r / 2;
  if (r < 0.8) return 1 - r;
  return 1 / (1 + 5 * r);
}

/**
 * 이상 피해 전용 방어저항.
 * = (800+8×내레벨) / (800+8×내레벨 + (792+8×적레벨) × (1−방어감소))
 *
 * 일반 피해와 달리 **방어무시가 빠진다.** 원문이 명시적으로 그렇게 적어 두었고,
 * 이걸 놓치면 방어무시를 가진 빌드에서 조용히 과대평가된다.
 */
function anomalyDefMultiplier(charLevel: number, enemyLevel: number, defReduction: number): number {
  const numerator = 800 + 8 * charLevel;
  const enemyDef = 792 + 8 * enemyLevel;
  return numerator / (numerator + enemyDef * (1 - defReduction));
}

const ceilDamage = (v: number) => Math.ceil(v - 1e-9);

export interface AnomalyDamageInput {
  kind: AnomalyKind;
  /** 적에게 쌓인 스택. 기초값이 여기서 나온다. */
  stacks: number;
  /** 그 상태로 몇 번 터졌는지. 기본 1. */
  occurrences: number;
}

export function calculateAnomalyDamage(
  input: AnomalyDamageInput,
  c: Character,
  s: Stats,
  e: Enemy,
) {
  const def = ANOMALIES[input.kind];
  const stacks = Math.max(0, Math.floor(input.stacks));
  const occurrences = Math.max(0, Math.floor(input.occurrences));

  // 「폭발 배율 200% 상승」처럼 이상 피해 자체를 키우는 효과는 기초값에 곱한다.
  const base = def.baseDamage(stacks) * (1 + s.anomalyAmplify);

  // 부스트 — 효과를 가리지 않는 것과 이 효과 전용을 더한다.
  const boost = 1 + s.anomalyBoost + s[ANOMALY_BOOST_KEY[def.id]];
  // 이상 치명 — 원래 이상 피해에는 크리티컬이 없어서 기본은 1.0이다.
  // 「크리티컬을 발생시킬 수 있다」는 효과를 받으면 그때만 붙는다(에이메스 6체인).
  //   기대값 = 1 + 확률 × (피해 − 1). anomalyCritDamage가 이미 「1을 넘는 부분」이다.
  const critMultiplier = 1 + s.anomalyCritRate * s.anomalyCritDamage;

  const baseRes = def.element === e.element ? e.sameElementRes : e.baseRes;
  const resPenTotal = s.resPen + s.resReduction;
  const resMult = resMultiplier(baseRes, resPenTotal);
  const defMult = anomalyDefMultiplier(c.level, e.level, s.defReduction);
  const totalDmg = 1 + s.totalDamageBonus;
  const drMult = 1 - e.damageReduction;

  const multiplierChain = boost * critMultiplier * defMult * resMult * drMult * totalDmg;
  const raw = base * occurrences * multiplierChain;
  const damage = ceilDamage(raw);

  return {
    /** 이상 효과 피해로 낸 결과. 화면이 계산식 창을 다르게 그리는 기준이 된다. */
    kind: "anomaly" as const,
    // 이상 피해에는 크리티컬이 없다 — 세 값이 모두 같게 나온다.
    // 계산 화면이 일반 공격과 같은 카드를 쓰므로 모양을 맞춰 둔다.
    normalDamage: damage,
    criticalDamage: damage,
    expectedDamage: damage,
    hits: [
      {
        baseMotionValue: 0,
        motionValue: 0,
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
      anomaly: def.id,
      anomalyName: def.name,
      anomalyType: def.type,
      anomalyFormula: def.formula,
      stacks,
      occurrences,
      base,
      // 부스트
      anomalyBoost: s.anomalyBoost,
      kindBoost: s[ANOMALY_BOOST_KEY[def.id]],
      boost,
      critMultiplier,
      // 속성저항
      element: def.element,
      baseRes,
      sameElement: def.element === e.element,
      resPen: s.resPen,
      resReduction: s.resReduction,
      resPenTotal,
      resMult,
      // 방어저항 — 방어무시가 빠진다
      charLevel: c.level,
      enemyLevel: e.level,
      defReduction: s.defReduction,
      defMult,
      enemyDamageReduction: e.damageReduction,
      drMult,
      totalDamageBonus: s.totalDamageBonus,
      totalDmg,
      multiplierChain,
      rawTotal: raw,
    },
  };
}
