import type { BuffScope, BuffTarget, BuffUptime } from "../types/game";

/**
 * 옮겨 적은 버프를 화면에 사람 말로 보여줄 때 쓰는 이름표.
 * 무기 · 캐릭터 · 에코 확인 화면이 같은 표를 그리므로 이름표도 한 곳에 모아 둔다.
 */

/** 계산의 어느 자리에 붙는지를 사람 말로. */
export const TARGET_LABEL: Record<BuffTarget, string> = {
  motionValue: "스킬 배율",
  damageBonus: "피해 보너스",
  boost: "부스트",
  critRate: "크리티컬 확률",
  critDamage: "크리티컬 피해",
  defIgnore: "방어력 무시",
  resPen: "저항 무시",
  defReduction: "방어력 감소",
  anomalyAmplify: "이상 배율 상승",
  anomalyCritRate: "이상 크리티컬",
  anomalyCritDamage: "이상 크리티컬 피해",
  resReduction: "저항 감소",
  damageTaken: "받는 피해",
  totalDamage: "최종 피해",
  anomalyBoost: "이상 효과 부스트",
  energyRegen: "공명 효율",
  syncAmplify: "조화도 파괴 증폭",
  discordEfficiency: "부조화 효율",
  atkFlat: "공격력(깡)",
  atkPercent: "공격력",
  hpPercent: "HP",
  defPercent: "방어력",
};

/** 피해 분류·속성을 사람 말로. 위 둘이 한 필드에 섞여 있어 표도 한 표로 본다. */
export const DAMAGE_TYPE_LABEL: Record<string, string> = {
  All: "전체",
  Basic: "일반 공격",
  Heavy: "강공격",
  Aerial: "공중 공격",
  DodgeCounter: "회피 반격",
  Skill: "공명 스킬",
  Liberation: "공명 해방",
  // Intro=반주, Outro=변주다. 한때 여기만 둘이 뒤바뀌어 있어서
  // 데이터 확인 화면들이 반대로 표시했다 — 다른 표(damage.ts · 계산 화면)와 맞춰 둔다.
  Intro: "반주 스킬",
  Outro: "변주 스킬",
  Echo: "에코 어빌리티",
  Ultimate: "궁극기",
  Variation: "변주",
  Chain: "연계",
  Aero: "기류",
  Glacio: "응결",
  Electro: "전도",
  Fusion: "용융",
  Havoc: "인멸",
  Spectro: "회절",
  // 이상 효과. 속성과 이름이 겹치지 않으므로 같은 표에 담아도 된다.
  AeroErosion: "풍식 효과",
  SpectroFrazzle: "광학 효과",
  ElectroFlare: "전자 효과",
  FrostChafe: "서리 효과",
  FusionBurst: "불꽃 효과",
  HavocBane: "암흑 효과",
};

export const ELEMENT_LABEL: Record<string, string> = {
  Aero: "기류",
  Glacio: "응결",
  Electro: "전도",
  Fusion: "용융",
  Havoc: "인멸",
  Spectro: "회절",
};

/**
 * 옮겨 적은 값이 비어 있을 때 계산이 쓰는 기본값.
 * derive*Buffs와 같은 규칙이다 — 조건 메모가 달려 있으면 발동형, 없으면 상시.
 * scope 기본값만 데이터 종류마다 다르므로 인자로 받는다(무기·캐릭터는 self).
 */
export function defaultsOf(
  template: { uptime?: BuffUptime; scope?: BuffScope; condition?: string },
  fallbackScope: BuffScope = "self",
): { uptime: BuffUptime; scope: BuffScope } {
  return {
    uptime: template.uptime ?? (template.condition ? "active" : "passive"),
    scope: template.scope ?? fallbackScope,
  };
}
