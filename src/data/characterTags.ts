import raw from "./characterTags.json";
import { baseCharacterId } from "./modeVariants";
import type { AttackType, DamageElement } from "../types/game";
import type { AnomalyKind } from "./anomalies";

/**
 * 캐릭터 태그 — 인게임 캐릭터 카드에 붙는 꼬리표다(API의 `Tags`).
 *
 * `characterTags.json`은 `api/characters/*.json`에서 그대로 뽑은 것이라 다시 받으면 덮어써진다.
 * 사람이 해석해야 하는 「이 태그가 계산의 무엇을 가리키는가」만 이 파일에 둔다.
 *
 * 태그는 38종이고 대략 네 묶음이다 —
 *   역할       메인 딜러 · 생존 치료 · 빠른 협주 · 협동 공격
 *   자기 피해   공명 스킬 피해 · 공명 해방 피해 · 일반 공격 피해 · 강공격 피해 · 에코 어빌리티 피해
 *   파티에 줌   ○○ 피해 부스트 · 조화도 파괴 증폭 · 부조화 수치 누적 효율 · 경직 저항력 · 공명 해방 차지
 *   이상·부조화 서리 · 불꽃 · 암흑 · 광학 · 전자 · 풍식 · 조화 밀집 대응 · 조화 파동 대응 · 해킹 대응
 */
const DATA = raw as { tags: Record<string, string>; byCharacter: Record<string, string[]> };

/** 태그 이름 → 인게임 설명. */
export const TAG_DESC: Record<string, string> = DATA.tags;

/** 이 캐릭터의 태그. 모드로 갈린 id는 원래 id로 본다. */
export function tagsOf(characterId: string): string[] {
  return DATA.byCharacter[characterId] ?? DATA.byCharacter[baseCharacterId(characterId)] ?? [];
}

export const isMainDps = (characterId: string) => tagsOf(characterId).includes("메인 딜러");

/** 「강공격 피해」처럼 **자기 피해 종류**를 가리키는 태그 → 그 피해 분류. */
export const SELF_DAMAGE_TAG: Record<string, AttackType> = {
  "일반 공격 피해": "Basic",
  "강공격 피해": "Heavy",
  "공명 스킬 피해": "Skill",
  "공명 해방 피해": "Liberation",
  "에코 어빌리티 피해": "Echo",
  "협동 공격": "Chain",
};

/** 「강공격 피해 부스트」처럼 **파티에 주는** 분류 버프 태그 → 그 피해 분류. */
export const GIVES_CATEGORY_TAG: Record<string, AttackType> = {
  "일반 공격 피해 부스트": "Basic",
  "강공격 피해 부스트": "Heavy",
  "공명 스킬 피해 부스트": "Skill",
  "공명 해방 피해 부스트": "Liberation",
  "에코 어빌리티 피해 부스트": "Echo",
  "협동 공격 피해 부스트": "Chain",
};

/** 「응결 피해 부스트」처럼 **파티에 주는** 속성 버프 태그 → 그 속성. */
export const GIVES_ELEMENT_TAG: Record<string, DamageElement> = {
  "응결 피해 부스트": "Glacio",
  "용융 피해 부스트": "Fusion",
  "전도 피해 부스트": "Electro",
  "기류 피해 부스트": "Aero",
  "회절 피해 부스트": "Spectro",
  "인멸 피해 부스트": "Havoc",
};

/** 이상 효과 태그 → 그 효과. 「이 캐릭터가 그 효과를 쓴다」는 뜻이다. */
export const ANOMALY_TAG: Record<string, AnomalyKind> = {
  서리: "FrostChafe",
  불꽃: "FusionBurst",
  암흑: "HavocBane",
  광학: "SpectroFrazzle",
  전자: "ElectroFlare",
  풍식: "AeroErosion",
};

/** 가리는 것 없이 파티 전체 피해를 올려 주는 태그. */
export const GENERIC_GIVER_TAGS = ["피해 부스트", "생존 치료", "빠른 협주"];

/** 부조화 계통 대응 태그. */
export const BREACH_TAGS = ["조화 밀집 대응", "조화 파동 대응", "해킹 대응"];
