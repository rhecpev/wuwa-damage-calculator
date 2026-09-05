import type { AnomalyKind } from "./anomalies";

/**
 * 이 캐릭터가 스킬로 붙일 수 있는 이상 효과.
 *
 * 이상 효과는 캐릭터 스킬 데이터(Attack)에 들어 있지 않다 — 공격이 아니라
 * 적에게 쌓이는 상태이기 때문이다. 그래서 「누가 무엇을 붙일 수 있는지」만 따로 적어둔다.
 * 공격 팔레트는 이 표를 보고 그 캐릭터에게 이상 효과 버튼을 띄운다.
 *
 * 근거는 각 캐릭터 파일의 스킬·고유효과 설명문에 나오는 「○○ 효과」 표기다
 * (src/data/characters/*.ts 를 「풍식 효과」 등으로 검색하면 그대로 나온다).
 * 지금은 캐릭터마다 하나씩이지만, 둘 이상 붙이는 캐릭터가 나오면 배열에 더 담으면 된다.
 */
export const CHARACTER_ANOMALIES: Record<string, AnomalyKind[]> = {
  // 풍식 효과 — 기류
  "rover-aero": ["AeroErosion"],
  // 「교향시 · 주음」이 색깔에 따라 갈린다 — 초록은 풍식, 노랑은 광학이다.
  ciaccona: ["AeroErosion", "SpectroFrazzle"],
  cartethyia: ["AeroErosion"],

  // 광학 효과 — 회절
  phoebe: ["SpectroFrazzle"],
  // 공명 해방 6스택 · 「공명 참격 · 선음」 2스택.
  "rover-spectro": ["SpectroFrazzle"],

  // 전자 효과 — 전도
  "rover-electro": ["ElectroFlare"],
  bochi: ["ElectroFlare"],

  // 서리 효과 — 응결
  lucila: ["FrostChafe"],
  hiyuki: ["FrostChafe"],
  // 「깨어난 봄기운」·변주·「비에 젖어들 무렵 4단」이 서리를 1회씩 붙인다.
  shushu: ["FrostChafe"],

  // 불꽃 효과 — 용융
  denia: ["FusionBurst"],
  aymes: ["FusionBurst"],

  // 암흑 효과 — 인멸
  "yangyang-xuanling": ["HavocBane"],
  chisa: ["HavocBane"],
};

/** 이 캐릭터가 붙일 수 있는 이상 효과. 없으면 빈 배열. */
export const anomaliesOf = (characterId: string): AnomalyKind[] =>
  CHARACTER_ANOMALIES[characterId] ?? [];
