export interface Stats {
  hp:number;hpPercent:number;
  atk:number;atkPercent:number;
  def:number;defPercent:number;
  critRate:number;critDamage:number;
  // 피해증가(DMG Bonus) 그룹 — 전부 가산 후 (1+Σ)로 한번에 곱연산
  allDamageBonus:number;
  basicDamageBonus:number;heavyDamageBonus:number;
  skillDamageBonus:number;liberationDamageBonus:number;
  introDamageBonus:number;outroDamageBonus:number;
  coordinatedDamageBonus:number;echoDamageBonus:number;
  glacioDamageBonus:number;fusionDamageBonus:number;aeroDamageBonus:number;
  electroDamageBonus:number;spectroDamageBonus:number;havocDamageBonus:number;
  // 부스트(Boost) 그룹 — 피해증가와는 별개의 독립 곱연산 그룹(주로 반주 스킬발 버프)
  basicBoost:number;heavyBoost:number;skillBoost:number;liberationBoost:number;
  glacioBoost:number;fusionBoost:number;aeroBoost:number;
  electroBoost:number;spectroBoost:number;havocBoost:number;
  // 방어/저항 관통
  defIgnore:number;defReduction:number;resPen:number;
  // 최종피해(Total DMG) — 밀집(strain) 유형 버프 등, 모든 배율과 별개로 마지막 단에 곱연산
  totalDamageBonus:number;
}
export const emptyStats=():Stats=>({
  hp:0,hpPercent:0,atk:0,atkPercent:0,def:0,defPercent:0,
  critRate:0,critDamage:0,
  allDamageBonus:0,
  basicDamageBonus:0,heavyDamageBonus:0,
  skillDamageBonus:0,liberationDamageBonus:0,
  introDamageBonus:0,outroDamageBonus:0,
  coordinatedDamageBonus:0,echoDamageBonus:0,
  glacioDamageBonus:0,fusionDamageBonus:0,aeroDamageBonus:0,
  electroDamageBonus:0,spectroDamageBonus:0,havocDamageBonus:0,
  basicBoost:0,heavyBoost:0,skillBoost:0,liberationBoost:0,
  glacioBoost:0,fusionBoost:0,aeroBoost:0,
  electroBoost:0,spectroBoost:0,havocBoost:0,
  defIgnore:0,defReduction:0,resPen:0,
  totalDamageBonus:0,
});