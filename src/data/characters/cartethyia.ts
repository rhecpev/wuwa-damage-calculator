import type { Attack, Character, Skill } from "../../types/game";
import { emptyStats } from "../../types/stats";

/**
 * 출처: encore.moe API v2 (api-v2.encore.moe/api/ko/character/1409)
 * Lv.90 기준. 원본 DamageList(히트 단위)와 SkillAttributes(요약) 교차검증.
 *
 * 특이사항: PropertyName이 "HP"로 명시됨 — 카르티시아는 공격력이 아닌
 * HP 비례로 스케일링되는 캐릭터. scalingStat을 HP로 지정.
 *
 * 주의: 받은 데이터가 기본 공격/공명 스킬까지만 포함하고 공명 해방·변주·
 * 공명체인 부분은 잘려서 없음. 해당 부분은 TODO로 남김.
 */
const baseStats = {
  ...emptyStats(),
  hp: 14800,
  atk: 312.5,
  def: 611.11,
  critRate: 0.05,
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

type LevelValues = number[];

function repeat(levels: LevelValues, n: number): LevelValues[] {
  return Array.from({ length: n }, () => levels);
}

function move(
  id: string,
  name: string,
  type: Attack["type"],
  hitsPercent: LevelValues[],
  damageBonusType?: Attack["type"],
): Attack {
  return {
    id,
    name,
    type,
    ...(damageBonusType ? { damageBonusType } : {}),
    element: "Aero",
    scalingStat: "HP", // PropertyName: "HP" 확인됨
    hits: hitsPercent.map((levels) => levels.map((v) => v / 100)),
    skillLevel: 10,
  };
}

// ── 일반 공격: 내 자신을 바친 검 ──────────────────────────
// 4단 발동 후 명중 시 "풍식 효과" 스택 추가 + 검의 그림자 소환(파생 상태
// 진입은 미구현, 순수 타격 데미지만 반영)
const basicAttacks: Attack[] = [
  move("basic1", "일반 공격 1단", "Basic", [
    [2.41, 2.6, 2.8, 3.08, 3.27, 3.5, 3.82, 4.13, 4.45, 4.78],
  ]),
  move("basic2", "일반 공격 2단", "Basic", [
    [1.98, 2.14, 2.31, 2.53, 2.7, 2.88, 3.14, 3.4, 3.66, 3.94],
    [1.98, 2.14, 2.31, 2.53, 2.7, 2.88, 3.14, 3.4, 3.66, 3.94],
    [2.64, 2.86, 3.07, 3.38, 3.59, 3.84, 4.19, 4.53, 4.88, 5.25],
  ]),
  move("basic3", "일반 공격 3단", "Basic", [
    ...repeat([2.15, 2.33, 2.51, 2.75, 2.93, 3.13, 3.41, 3.7, 3.98, 4.28], 4),
  ]),
  move("basic4", "일반 공격 4단", "Basic", [
    ...repeat([1.27, 1.37, 1.48, 1.62, 1.73, 1.84, 2.01, 2.18, 2.34, 2.52], 3),
    [3.8, 4.11, 4.42, 4.85, 5.17, 5.52, 6.02, 6.52, 7.02, 7.54],
  ]),
];

// ── 강공격 ──────────────────────────────────────────────
// 명시적으로 "일반 공격 피해로 적용" — damageBonusType 오버라이드
const heavyAttacks: Attack[] = [
  move(
    "heavy",
    "강공격",
    "Heavy",
    [
      ...repeat([1.05, 1.14, 1.22, 1.34, 1.43, 1.53, 1.66, 1.8, 1.94, 2.08], 3),
      [3.14, 3.4, 3.65, 4.01, 4.27, 4.57, 4.98, 5.39, 5.8, 6.24],
    ],
    "Basic",
  ),
];

// ── 공중 공격 ────────────────────────────────────────────
// 낙하 직전까지 회수한 "검의 그림자" 개수(최대3)에 따라 피해 형태가
// 바뀌는 조건부 강화 메커니즘. 회수 검 개수별로 별도 Attack 3종 제공.
const aerialAttacks: Attack[] = [
  move("aerial_1sword", "공중 공격(검 1자루 회수)", "Aerial", [
    [2.84, 3.08, 3.31, 3.64, 3.87, 4.14, 4.51, 4.88, 5.25, 5.65],
  ]),
  move("aerial_2sword", "공중 공격(검 2자루 회수)", "Aerial", [
    ...repeat([1.66, 1.8, 1.93, 2.12, 2.26, 2.41, 2.63, 2.85, 3.07, 3.3], 3),
  ]),
  move("aerial_3sword", "공중 공격(검 3자루 회수)", "Aerial", [
    ...repeat(
      [5.68, 6.15, 6.61, 7.27, 7.73, 8.27, 9.01, 9.76, 10.5, 11.29],
      3,
    ),
  ]),
];

// ── 회피 반격 ────────────────────────────────────────────
const dodgeCounterAttacks: Attack[] = [
  move("dodge", "회피 반격", "DodgeCounter", [
    ...repeat([3.45, 3.73, 4.01, 4.41, 4.69, 5.02, 5.47, 5.92, 6.37, 6.85], 4),
  ]),
];

// ── 공명 스킬: 사람의 이름으로 바치는 검 ──────────────────
// 명시적으로 "해당 피해는 일반 공격 피해로 적용" — damageBonusType 오버라이드
const skillAttacks: Attack[] = [
  move(
    "skill",
    "공명 스킬",
    "Skill",
    [
      ...repeat([3.47, 3.75, 4.04, 4.44, 4.72, 5.05, 5.5, 5.96, 6.41, 6.89], 3),
      [4.46, 4.83, 5.19, 5.7, 6.07, 6.49, 7.07, 7.66, 8.24, 8.86],
    ],
    "Basic",
  ),
];
// TODO: 공명 해방("기사의 소원대로")은 카르티시아↔플뢰르 드 리스 변신 및
// HP 50% 소모/결의 스택/풍식 효과 배율 조작 등 매우 복잡한 상태 전환
// 메커니즘이라, 받은 데이터에 수치가 없기도 하고 전용 로직 없이는 구현 불가.
// 변주 스킬, 공명 체인도 데이터 누락 — 추후 API로 별도 확인 필요.

const skills: Skill[] = [
  { id: "basic", name: "일반 공격", attacks: basicAttacks },
  { id: "heavy", name: "강공격", attacks: heavyAttacks },
  { id: "aerial", name: "공중 공격", attacks: aerialAttacks },
  { id: "dodge", name: "회피 반격", attacks: dodgeCounterAttacks },
  { id: "skill", name: "공명 스킬", attacks: skillAttacks },
];

export const cartethyia: Character = {
  id: "cartethyia",
  name: "카르티시아",
  level: 90,
  element: "Aero",
  weaponType: "Sword",
  baseStats,
  skills,
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_40_UI.webp",
};
