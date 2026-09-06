export interface Stats {
  hp: number;
  hpPercent: number;
  atk: number;
  atkPercent: number;
  def: number;
  defPercent: number;
  /**
   * 전투 중 버프에서 오는 공격력·HP·방어력 %.
   *
   * 게임은 스탯창 값을 먼저 확정(버림)한 뒤 그 위에 버프분을 얹는다.
   *   스탯 = ⌊ ⌊기초 × (1 + Σ패널%)⌋ + 기초 × Σ버프% + Σ깡수치 ⌋
   * 그래서 같은 "공격력 %"라도 어느 묶음에서 왔는지를 갈라 담아야 한다.
   *   atkPercent    (패널) = 스킬 트리 · 무기 부옵션 · 무기 효과 · 에코 옵션
   *   atkPercentBuff (버프) = 공명체인 · 파티 버프 · 에코 세트 효과
   * 실측 9건으로 확인한 규칙이다(calculateFinalStats 주석 참고).
   */
  atkPercentBuff: number;
  hpPercentBuff: number;
  defPercentBuff: number;
  critRate: number;
  critDamage: number;
  // 공명 효율 — 표시 전용. 해방 회전율에만 영향을 주고 피해 계산식에는 들어가지 않는다.
  //   critDamage와 같은 방식으로 "기본 100%를 뺀 보너스분"만 담는다(표시값 = 1 + energyRegen).
  energyRegen: number;
  // 피해증가(DMG Bonus) 그룹 — 전부 가산 후 (1+Σ)로 한번에 곱연산
  allDamageBonus: number;
  basicDamageBonus: number;
  heavyDamageBonus: number;
  skillDamageBonus: number;
  liberationDamageBonus: number;
  introDamageBonus: number;
  outroDamageBonus: number;
  coordinatedDamageBonus: number;
  echoDamageBonus: number;
  glacioDamageBonus: number;
  fusionDamageBonus: number;
  aeroDamageBonus: number;
  electroDamageBonus: number;
  spectroDamageBonus: number;
  havocDamageBonus: number;
  // 부스트(Boost) 그룹 — 피해증가와는 별개의 독립 곱연산 그룹(주로 반주 스킬발 버프)
  allBoost: number; // 분류를 가리지 않는 부스트. 버프가 조건 판정을 통과한 뒤 여기에 얹힌다.
  basicBoost: number;
  heavyBoost: number;
  skillBoost: number;
  liberationBoost: number;
  glacioBoost: number;
  fusionBoost: number;
  aeroBoost: number;
  electroBoost: number;
  spectroBoost: number;
  havocBoost: number;
  // 이상 효과(Anomaly) 부스트 — 이상 피해에만 곱해지는 독립 배율.
  // 일반 피해의 boost 그룹과는 별개다. 무기가 「「광학 효과」 피해 30% 부스트」처럼 준다.
  //   anomalyBoost         효과를 가리지 않는 것
  //   <효과>Boost          그 이상 효과에만 걸리는 것
  anomalyBoost: number;
  aeroErosionBoost: number;
  spectroFrazzleBoost: number;
  electroFlareBoost: number;
  frostChafeBoost: number;
  fusionBurstBoost: number;
  havocBaneBoost: number;
  // 이상 효과의 크리티컬. 기본값은 둘 다 0 — 이상 피해는 원래 크리티컬이 없다.
  // 에이메스 6체인처럼 「크리티컬을 발생시킬 수 있고 확률 80% · 피해 275%로 고정」을
  // 주는 효과가 있어서 자리를 만들어 뒀다. 배율은 1 + 확률 × 피해증가분이다.
  //   anomalyCritRate   확률(0.8 = 80%)
  //   anomalyCritDamage 1.0을 넘는 부분(275% → 1.75)
  anomalyCritRate: number;
  anomalyCritDamage: number;
  // 이상 효과 피해의 배율 상승. 기초값에 (1 + 이 값)이 곱해진다.
  // 데니아의 「폭발 배율 200% 상승」처럼 이상 피해 자체를 키우는 효과가 여기 온다.
  anomalyAmplify: number;
  // 방어/저항 관통
  defIgnore: number;
  defReduction: number;
  // 속성 저항 무시와 속성 저항 감소는 서로 다른 출처지만 계산 자리는 같다.
  // 둘을 합연산으로 더한 값을 적 저항에서 한 번에 빼고, 그 결과로 저항 배율을 낸다.
  //   R = 적 저항 - (resPen + resReduction)
  resPen: number;
  resReduction: number;
  // 최종피해(Total DMG) — 밀집(strain) 유형 버프 등, 모든 배율과 별개로 마지막 단에 곱연산
  totalDamageBonus: number;
  // 스킬 배율(motion value) 자체를 건드리는 두 가지 — "증가"와 "상승"은 서로 다르다.
  //   상승: 계수 × (1 + 상승률)   — 곱연산
  //   증가: 계수 + 증가율         — 합연산(퍼센트포인트를 그대로 더한다)
  // 예) 500% 계수에 25%를 걸면 상승은 625%, 증가는 525%.
  // 최종 계수 = 계수 × (1 + motionValueAmplify) + motionValueIncrease
  // 받는피해(DMG Taken) — 적 쪽 damageTakenBonus와 같은 그룹에 합연산으로 얹힌다.
  damageTakenBonus: number;
  motionValueIncrease: number; // 증가분의 합. 계수와 같은 단위(25% → 0.25). 0이면 변화 없음.
  motionValueAmplify: number; // 상승률의 합. 0이면 변화 없음.
  // ── 표시 전용 ──
  // 게임 「속성 상세정보」에는 있지만 지금 피해 계산식에는 들어가지 않는 값들.
  // 스탯창을 게임과 같은 줄로 채우려고 자리만 만들어 둔다.
  physicalDamageBonus: number; // 물리 피해 보너스. Element에는 물리가 없어 따로 둔다.
  syncAmplify: number; // 조화도 파괴 증폭
  discordEfficiency: number; // 부조화 수치 누적 효율
  healingBonus: number; // 치료 효과 보너스
  // 내가 받는 속성 피해 저항. 적 저항(Enemy.baseRes)과는 다른 값이다.
  physicalRes: number;
  glacioRes: number;
  fusionRes: number;
  electroRes: number;
  aeroRes: number;
  spectroRes: number;
  havocRes: number;
}
/**
 * 공격력·HP·방어력은 모두
 *   (기초 스탯 + 무기 공격력) × (1 + Σ ~Per) + Σ ~Plus
 * 로 구한다. 어떤 수치가 그중 어느 자리로 들어가는지는 계산기가 추측하지 않고
 * 데이터(무기 부옵션의 subStatDmgCalType, 에코 옵션의 dmgCalType)에 직접 적힌
 * 이 값을 그대로 따른다.
 *   ~Per  = 백분율 합산 자리(전부 더한 뒤 1을 얹어 한 번만 곱한다)
 *   ~Plus = 깡수치 자리(퍼센트를 다 곱한 뒤 마지막에 더한다)
 */
/**
 * 공격력·HP·방어력이 어떻게 나온 값인지 — 소수점을 버리기 전까지의 재료.
 *   raw = (base + 무기) × (1 + percent) + plus,  최종값 = ⌊raw⌋
 * 계산에는 쓰이지 않고 피해 공식 창에 그대로 펼쳐 보여주는 용도다.
 */
export interface StatSource {
  /** 캐릭터 기초값(소수점 버린 뒤). 공격력만 무기 공격력이 따로 붙는다. */
  base: number;
  /** 무기 공격력(소수점 버린 뒤). HP·방어력은 0. */
  weapon: number;
  /** 스탯창에 반영되는 퍼센트 합(스킬 트리 · 무기 · 에코). */
  percent: number;
  /**
   * 그중 에코 옵션에서 온 몫. 스탯창 단계에서 캐릭터 쪽과 갈라 따로 버림하기 때문에
   * (calculateFinalStats 주석 참고) 내역을 보여줄 때도 둘을 나눠 적어야 계산이 맞는다.
   */
  echoPercent: number;
  /** 전투 중 버프 퍼센트 합(공명체인 · 파티 버프 · 에코 세트). */
  buffPercent: number;
  /** 스탯창 값 = ⌊기초 × (1 + 캐릭터 쪽 %)⌋ + ⌊기초 × 에코 %⌋. 여기서 두 번 버린다. */
  panel: number;
  /** 버프분 = (기초+무기) × buffPercent. 버리지 않고 그대로 더한다. */
  buffAmount: number;
  /** 곱연산이 끝난 뒤 더해지는 깡수치. */
  plus: number;
  /** 마지막 버림 직전의 값 = panel + buffAmount + plus. */
  raw: number;
}

/**
 * 어떤 출처가 어떤 스탯을 얼마나 얹었는지 한 줄.
 * 합산 결과에는 영향을 주지 않고, 상세보기에서 "이 수치가 어디서 왔는지"를 펼쳐 보이는 데 쓴다.
 */
export interface StatContribution {
  /** 화면에 그대로 뜨는 출처 이름. 예) "에코 · 명계의 사자", "무기 · 물결의 파동" */
  source: string;
  /** 그 출처가 얹은 값. 0인 칸은 담지 않는다. */
  stats: Partial<Stats>;
}

/** calculateFinalStats가 돌려주는 것 — Stats에 위 재료를 얹은 형태. */
export interface FinalStats extends Stats {
  sources: { atk: StatSource; hp: StatSource; def: StatSource };
  /** 출처별 내역. 상세보기에서 수치를 누르면 이 목록을 걸러서 보여준다. */
  contributions: StatContribution[];
}

export type DmgCalType = "atkPer" | "atkPlus" | "hpPer" | "hpPlus" | "defPer" | "defPlus";

/** dmgCalType을 담아두는 Stats 키. 합산 버킷으로만 쓴다. */
export const DMG_CAL_BUCKET: Record<DmgCalType, keyof Stats> = {
  atkPer: "atkPercent",
  atkPlus: "atk",
  hpPer: "hpPercent",
  hpPlus: "hp",
  defPer: "defPercent",
  defPlus: "def",
};

export const emptyStats = (): Stats => ({
  hp: 0,
  hpPercent: 0,
  atk: 0,
  atkPercent: 0,
  def: 0,
  defPercent: 0,
  atkPercentBuff: 0,
  hpPercentBuff: 0,
  defPercentBuff: 0,
  critRate: 0,
  critDamage: 0,
  energyRegen: 0,
  allDamageBonus: 0,
  basicDamageBonus: 0,
  heavyDamageBonus: 0,
  skillDamageBonus: 0,
  liberationDamageBonus: 0,
  introDamageBonus: 0,
  outroDamageBonus: 0,
  coordinatedDamageBonus: 0,
  echoDamageBonus: 0,
  glacioDamageBonus: 0,
  fusionDamageBonus: 0,
  aeroDamageBonus: 0,
  electroDamageBonus: 0,
  spectroDamageBonus: 0,
  havocDamageBonus: 0,
  allBoost: 0,
  basicBoost: 0,
  heavyBoost: 0,
  skillBoost: 0,
  liberationBoost: 0,
  glacioBoost: 0,
  fusionBoost: 0,
  aeroBoost: 0,
  electroBoost: 0,
  spectroBoost: 0,
  havocBoost: 0,
  anomalyBoost: 0,
  anomalyCritRate: 0,
  anomalyCritDamage: 0,
  anomalyAmplify: 0,
  aeroErosionBoost: 0,
  spectroFrazzleBoost: 0,
  electroFlareBoost: 0,
  frostChafeBoost: 0,
  fusionBurstBoost: 0,
  havocBaneBoost: 0,
  defIgnore: 0,
  defReduction: 0,
  resPen: 0,
  resReduction: 0,
  totalDamageBonus: 0,
  damageTakenBonus: 0,
  motionValueIncrease: 0,
  motionValueAmplify: 0,
  physicalDamageBonus: 0,
  syncAmplify: 0,
  discordEfficiency: 0,
  healingBonus: 0,
  physicalRes: 0,
  glacioRes: 0,
  fusionRes: 0,
  electroRes: 0,
  aeroRes: 0,
  spectroRes: 0,
  havocRes: 0,
});
