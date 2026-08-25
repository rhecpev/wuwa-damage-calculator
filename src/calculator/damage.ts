import type { Attack, Buff, Character, Element, Enemy } from "../types/game";
import type { Stats } from "../types/stats";

/**
 * 최종 데미지 = 스킬 계수 × 기초 공격력(=Stats.atk, 이미 %/깡공 반영된 최종값)
 *   × 피해증가 × 크리티컬 × 부스트 × 속성저항 × 방어저항 × 받는피해 × 최종피해
 *   + 고정 추가 피해
 *
 * 피해증가(Bonus)와 부스트(Boost)는 서로 다른 독립 곱연산 그룹.
 * (Stats.atk 자체는 calculateFinalStats에서 기초공격력×공격력배율이 이미 곱해진 값이므로
 * 여기서 별도의 "공격력 배율" 단계를 두지 않고 곧바로 사용한다.)
 */

const ELEMENT_BONUS_KEY: Record<Element, keyof Stats> = {
  Glacio: "glacioDamageBonus",
  Fusion: "fusionDamageBonus",
  Aero: "aeroDamageBonus",
  Electro: "electroDamageBonus",
  Spectro: "spectroDamageBonus",
  Havoc: "havocDamageBonus",
};

const ELEMENT_BOOST_KEY: Record<Element, keyof Stats> = {
  Glacio: "glacioBoost",
  Fusion: "fusionBoost",
  Aero: "aeroBoost",
  Electro: "electroBoost",
  Spectro: "spectroBoost",
  Havoc: "havocBoost",
};

function categoryDamageBonus(a: Attack, s: Stats): number {
  const t = a.damageBonusType ?? a.type;
  switch (t) {
    case "Basic":
    case "Aerial":
    case "DodgeCounter":
      return s.basicDamageBonus;
    case "Heavy":
      return s.heavyDamageBonus;
    case "Skill":
      return s.skillDamageBonus;
    case "Liberation":
      return s.liberationDamageBonus;
    case "Intro":
      return s.introDamageBonus;
    case "Outro":
      return s.outroDamageBonus;
    case "Echo":
      return s.echoDamageBonus;
    default:
      return 0;
  }
}

function categoryBoost(a: Attack, s: Stats): number {
  const t = a.damageBonusType ?? a.type;
  switch (t) {
    case "Basic":
    case "Aerial":
    case "DodgeCounter":
      return s.basicBoost;
    case "Heavy":
      return s.heavyBoost;
    case "Skill":
      return s.skillBoost;
    case "Liberation":
      return s.liberationBoost;
    default:
      return 0; // 변주/반주/에코/협동 부스트는 게임 내 소스가 확인되지 않아 미지원
  }
}

/** 속성저항 배율. R = 적 기본저항 - 저항관통. 게임 원본 3구간 분기. */
function resMultiplier(baseRes: number, resPen: number): number {
  const r = baseRes - resPen;
  if (r < 0) return 1 - r / 2;
  if (r < 0.8) return 1 - r;
  return 1 / (1 + 5 * r);
}

/**
 * 방어저항 배율.
 * = (800+8×내레벨) / (800+8×내레벨 + (792+8×적레벨)×(1-방어무시)×(1-방어감소))
 * 792는 적 기초방어력 상수(Enemy DEF = 8×LVL(Enemy)+792).
 */
function defMultiplier(
  charLevel: number,
  enemyLevel: number,
  defIgnore: number,
  defReduction: number,
): number {
  const numerator = 800 + 8 * charLevel;
  const enemyDef = 792 + 8 * enemyLevel;
  const denominator =
    numerator + enemyDef * (1 - defIgnore) * (1 - defReduction);
  return numerator / denominator;
}

export function calculateDamage(
  a: Attack,
  c: Character,
  s: Stats,
  b: Buff[],
  e: Enemy,
) {
  const attr = a.scalingStat === "ATK" ? s.atk : a.scalingStat === "HP" ? s.hp : s.def;

  const dmgBonus =
    1 + s.allDamageBonus + categoryDamageBonus(a, s) + s[ELEMENT_BONUS_KEY[a.element]];
  const boost = 1 + categoryBoost(a, s) + s[ELEMENT_BOOST_KEY[a.element]];
  const critMultiplier = 1 + s.critDamage; // critDamage는 기본 100% 제외한 보너스분
  const rate = Math.min(Math.max(s.critRate, 0), 1);
  const resMult = resMultiplier(e.baseRes, s.resPen);
  const defMult = defMultiplier(c.level, e.level, s.defIgnore, s.defReduction);
  const dmgTaken = 1 + (e.damageTakenBonus ?? 0);
  const totalDmg = 1 + s.totalDamageBonus;
  const drMult = 1 - e.damageReduction;
  const erMult = 1 - e.elementReduction;

  const multiplierChain =
    dmgBonus * boost * resMult * defMult * drMult * erMult * dmgTaken * totalDmg;

  // 히트별로 "스킬 계수 × 기초 공격력"을 구해 전부 더한다.
  // (일반공격 2단 = 38.99% 히트 1번 + 19.50% 히트 3번의 합)
  let normal = 0;
  for (const levels of a.hits) {
    const mv = levels[Math.max(0, a.skillLevel - 1)] ?? levels.at(-1) ?? 0;
    normal += attr * mv;
  }
  normal *= multiplierChain;
  const crit = normal * critMultiplier;
  const fixed = a.fixedDamage ?? 0; // 모든 배율과 무관, 크리티컬 영향 없음

  return {
    normalDamage: normal + fixed,
    criticalDamage: crit + fixed,
    expectedDamage: normal * (1 - rate) + crit * rate + fixed,
    hitCount: a.hits.length,
    activeBuffs: b,
  };
}
