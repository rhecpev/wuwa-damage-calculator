import type { Attack, AttackType, Buff, Character, DamageElement, Enemy } from "../types/game";
import type { Stats } from "../types/stats";

/**
 * 최종 데미지 = 스킬 계수(배율 증가·상승 반영) × 기초 공격력(=Stats.atk, 이미 %/깡공 반영된 최종값)
 *   × 피해증가 × 크리티컬 × 부스트 × 속성저항 × 방어저항 × 받는피해 × 최종피해
 *   + 고정 추가 피해
 *
 * 피해증가(Bonus)와 부스트(Boost)는 서로 다른 독립 곱연산 그룹.
 * (Stats.atk 자체는 calculateFinalStats에서 기초공격력×공격력배율이 이미 곱해진 값이므로
 * 여기서 별도의 "공격력 배율" 단계를 두지 않고 곧바로 사용한다.)
 *
 * 끝수 처리 — 게임과 같은 규칙:
 *   1) 계수에 곱하는 스탯(공격력/방어력/HP)은 소수점을 버린 정수를 쓴다.
 *   2) 그렇게 나온 피해량에 소수점이 남으면 올린다.
 */

export const ELEMENT_BONUS_KEY: Record<DamageElement, keyof Stats> = {
  Glacio: "glacioDamageBonus",
  Fusion: "fusionDamageBonus",
  Aero: "aeroDamageBonus",
  Electro: "electroDamageBonus",
  Spectro: "spectroDamageBonus",
  Havoc: "havocDamageBonus",
  // 물리는 6속성이 아니지만 피해 보너스 칸은 따로 있다(에코 어빌리티의 물리 피해).
  Physical: "physicalDamageBonus",
};

/** 물리는 부스트 칸이 게임에 없어 비어 있다 — 그래서 Record가 아니라 Partial이다. */
export const ELEMENT_BOOST_KEY: Partial<Record<DamageElement, keyof Stats>> = {
  Glacio: "glacioBoost",
  Fusion: "fusionBoost",
  Aero: "aeroBoost",
  Electro: "electroBoost",
  Spectro: "spectroBoost",
  Havoc: "havocBoost",
};

/** 이 공격에 걸리는 분류(피해증가·부스트 모두 이 값을 본다). 상세보기 라벨로도 쓴다. */
function categoryOf(a: Attack): AttackType {
  return a.damageBonusType ?? a.type;
}

/** 공격 분류 -> 그 분류의 피해증가 Stats 키. 없는 분류는 걸리는 칸이 없다. */
export const CATEGORY_BONUS_KEY: Partial<Record<AttackType, keyof Stats>> = {
  Basic: "basicDamageBonus",
  Aerial: "basicDamageBonus",
  DodgeCounter: "basicDamageBonus",
  Heavy: "heavyDamageBonus",
  Skill: "skillDamageBonus",
  Liberation: "liberationDamageBonus",
  Intro: "introDamageBonus",
  Outro: "outroDamageBonus",
  Echo: "echoDamageBonus",
};

/** 같은 방식의 부스트 키. 변주/반주/에코/협동 부스트는 게임 내 소스가 확인되지 않아 미지원. */
export const CATEGORY_BOOST_KEY: Partial<Record<AttackType, keyof Stats>> = {
  Basic: "basicBoost",
  Aerial: "basicBoost",
  DodgeCounter: "basicBoost",
  Heavy: "heavyBoost",
  Skill: "skillBoost",
  Liberation: "liberationBoost",
};

function categoryDamageBonus(a: Attack, s: Stats): number {
  const key = CATEGORY_BONUS_KEY[categoryOf(a)];
  return key ? s[key] : 0;
}

function categoryBoost(a: Attack, s: Stats): number {
  const key = CATEGORY_BOOST_KEY[categoryOf(a)];
  return key ? s[key] : 0;
}

function elementBoost(a: Attack, s: Stats): number {
  const key = ELEMENT_BOOST_KEY[a.element];
  return key ? s[key] : 0;
}

/**
 * 피해량 올림.
 *
 * 게임은 피해를 float32로 굴린다(언리얼). 우리는 double로 재므로, 값이 정수에 아주 가까울 때
 * 우리 쪽에만 남은 찌꺼기 때문에 한 칸 더 올라가는 일이 생긴다. 그래서 올리기 전에
 * float32로 한 번 떨어뜨린다 — 게임이 보는 값과 같은 자리에서 올림하게 된다.
 *
 * 현령 Lv.90 실측이 이 자리를 잡아 준다. 공명 해방 「만음을 잠재운 깃털」 크리
 *   double:  93438.0009 → ⌈⌉ 93439  (게임은 93438)
 *   float32: 93438.0000 → ⌈⌉ 93438  ← 일치
 * 같은 실측의 나머지 아홉 줄(일반 공격 1~4단 비크리·크리)은 float32로 떨어뜨려도 그대로다
 * — 올림까지 0.009 넘게 남아 있어 float32의 눈금(93438 근처에서 0.0078)에 걸리지 않는다.
 */
const ceilDamage = (v: number) => Math.ceil(Math.fround(v) - 1e-9);

/**
 * 속성저항 배율. R = 적 기본저항 - (저항 무시 + 저항 감소). 게임 원본 3구간 분기.
 * 저항 무시와 저항 감소는 서로 다른 출처지만 같은 자리에 들어간다 — 합연산으로 먼저 더하고
 * 그 합을 저항에서 한 번만 뺀다(각각 따로 곱하지 않는다).
 */
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
  // 계수에 곱하는 스탯은 소수점을 버린 정수(게임 스탯창에 찍히는 값)를 쓴다.
  const attr = Math.floor(
    a.scalingStat === "ATK" ? s.atk : a.scalingStat === "HP" ? s.hp : s.def,
  );

  const dmgBonus =
    1 + s.allDamageBonus + categoryDamageBonus(a, s) + s[ELEMENT_BONUS_KEY[a.element]];
  const boost = 1 + s.allBoost + categoryBoost(a, s) + elementBoost(a, s);
  const critMultiplier = 1 + s.critDamage; // critDamage는 기본 100% 제외한 보너스분
  const rate = Math.min(Math.max(s.critRate, 0), 1);
  // 몬스터 속성과 같은 속성으로 때리면 저항이 더 높게 잡힌다.
  const baseRes = a.element === e.element ? e.sameElementRes : e.baseRes;
  // 저항 무시 + 저항 감소를 먼저 더한다.
  const resPenTotal = s.resPen + s.resReduction;
  const resMult = resMultiplier(baseRes, resPenTotal);
  const defMult = defMultiplier(c.level, e.level, s.defIgnore, s.defReduction);
  const dmgTaken = 1 + (e.damageTakenBonus ?? 0) + s.damageTakenBonus;
  const totalDmg = 1 + s.totalDamageBonus;
  const drMult = 1 - e.damageReduction;

  const multiplierChain =
    dmgBonus * boost * resMult * defMult * drMult * dmgTaken * totalDmg;

  // 스킬 배율에 걸리는 "증가"와 "상승"은 붙는 방식이 다르다.
  //   상승: 계수 × (1 + 상승률)   — 곱연산
  //   증가: 계수 + 증가율         — 합연산(계수와 같은 단위로 그대로 더한다)
  // 예) 500% 계수에 25%면 상승은 625%, 증가는 525%.
  // 둘 다 0이면 원래 계수 그대로다.
  const mvAmplify = 1 + s.motionValueAmplify;
  const mvIncrease = s.motionValueIncrease;

  // 히트별로 "스킬 계수 × 기초 공격력 × 배율"을 구한다.
  // (일반공격 2단 = 38.99% 히트 1번 + 19.50% 히트 3번)
  // 게임도 히트마다 피해 숫자가 따로 뜨므로 한 대씩 값을 남겨두고, 합계는 아래에서 따로 낸다.
  const hits = a.hits.map((levels) => {
    const base = levels[Math.max(0, a.skillLevel - 1)] ?? levels.at(-1) ?? 0;
    const mv = base * mvAmplify + mvIncrease;
    const raw = attr * mv * multiplierChain;

    const hitNormal = ceilDamage(raw);
    const hitCrit = ceilDamage(raw * critMultiplier);

    return {
      /** 데이터에 적힌 이 히트의 원래 계수(스킬 레벨만 반영). 상세보기용. */
      baseMotionValue: base,
      /** 이 히트의 최종 계수(증가·상승 반영). 표시용. */
      motionValue: mv,
      /** 올림 전 원본. 합계를 낼 때 쓴다. */
      raw,
      normalDamage: hitNormal,
      criticalDamage: hitCrit,
      expectedDamage: ceilDamage(hitNormal * (1 - rate) + hitCrit * rate),
    };
  });

  const normal = hits.reduce((sum, hit) => sum + hit.raw, 0);
  const crit = normal * critMultiplier;
  const fixed = a.fixedDamage ?? 0; // 모든 배율과 무관, 크리티컬 영향 없음

  // 소수점이 남으면 올린다. 기대 피해는 올림이 끝난 두 값으로 다시 섞는다.
  // 합계는 올림 전 원본을 다 더한 뒤 한 번만 올린다 — 히트별 값을 더한 것과
  // 최대 (히트 수 - 1) 만큼 차이가 날 수 있다.
  const normalDamage = ceilDamage(normal + fixed);
  const criticalDamage = ceilDamage(crit + fixed);

  return {
    /** 일반 피해식으로 낸 결과. 이상 효과 쪽과 구분하는 판별자다. */
    kind: "normal" as const,
    normalDamage,
    criticalDamage,
    expectedDamage: ceilDamage(normalDamage * (1 - rate) + criticalDamage * rate),
    hits,
    hitCount: a.hits.length,
    fixedDamage: fixed,
    activeBuffs: b,
    /**
     * 상세보기용 중간값. 계산에는 쓰이지 않고, 위에서 이미 구한 값을 그대로 담기만 한다
     * — 화면에 뜬 숫자와 여기 적힌 숫자가 어긋날 일이 없도록.
     */
    breakdown: {
      scalingStat: a.scalingStat,
      attr,
      category: categoryOf(a),
      element: a.element,
      skillLevel: a.skillLevel,
      // 계수
      motionValueAmplify: s.motionValueAmplify,
      motionValueIncrease: s.motionValueIncrease,
      // 피해증가 그룹
      allDamageBonus: s.allDamageBonus,
      categoryDamageBonus: categoryDamageBonus(a, s),
      elementDamageBonus: s[ELEMENT_BONUS_KEY[a.element]],
      dmgBonus,
      // 부스트 그룹
      allBoost: s.allBoost,
      categoryBoost: categoryBoost(a, s),
      elementBoost: elementBoost(a, s),
      boost,
      // 크리티컬
      critRate: rate,
      critDamage: s.critDamage,
      critMultiplier,
      // 속성저항
      baseRes,
      sameElement: a.element === e.element,
      resPen: s.resPen,
      resReduction: s.resReduction,
      resPenTotal,
      resMult,
      // 방어저항
      charLevel: c.level,
      enemyLevel: e.level,
      defIgnore: s.defIgnore,
      defReduction: s.defReduction,
      defMult,
      // 적 감소
      enemyDamageReduction: e.damageReduction,
      drMult,
      // 받는피해 · 최종피해
      enemyDamageTakenBonus: e.damageTakenBonus ?? 0,
      selfDamageTakenBonus: s.damageTakenBonus,
      dmgTaken,
      totalDamageBonus: s.totalDamageBonus,
      totalDmg,
      // 위 배율을 전부 곱한 것
      multiplierChain,
      /** 올림 전 히트 합계. normalDamage = ⌈rawTotal + 고정피해⌉ */
      rawTotal: normal,
    },
  };
}
