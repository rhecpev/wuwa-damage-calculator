import type { DamageElement, Element } from "../types/game";

/**
 * 지금 매트릭스 시즌의 몬스터 배치.
 * 출처: encore.moe API v2 `/ko/dpmatrix/7` — S2 단계2 「위험한 경지의 강습」(3.8 버전까지), 특이점 확장(레벨 Id 14).
 *
 * 특이점 확장은 3라운드 15웨이브다. 라운드마다 아래 다섯이 같은 순서로 나오고 레벨만 오른다(100 → 110 → 120).
 * 마지막 「매트릭스 미믹」을 잡으면 다음 라운드로 넘어간다.
 *
 * 기본 체력은 **도감 기준 추정치**다 — 도감 몬스터(`/ko/monster/{id}`)의 LifeMax × 레벨 성장 배율(LifeMaxRatio).
 * 매트릭스는 전용 몬스터 id(650000047 등)를 쓰고 그 id의 HP는 API에 없어, 실제 체력은 이보다 클 수 있다.
 * 「매트릭스 미믹」은 도감에 없어 일반 「미믹」(310000480) 값을 쓴다.
 * 화면에서 체력을 직접 고칠 수 있게 두고, 이 값은 처음 채워 넣는 기본값으로만 쓴다.
 */
export interface MatrixMonster {
  /** 라운드(1~3). */
  round: number;
  /** 웨이브 번호 — 전체에서 나오는 순서(1~15). */
  wave: number;
  /** 라운드 안에서의 순서(1~5). */
  slot: number;
  /** 매트릭스 전용 몬스터 id. */
  monsterId: number;
  /** 도감 몬스터 id(기본 HP를 뽑은 곳). */
  handbookId: number;
  name: string;
  level: number;
  /** 저항 속성 — 이 속성으로 때리면 저항이 높다. */
  element: Element;
  icon: string;
  defaultHp: number;
}

export const MATRIX_SEASON = {
  name: "S2 단계2 · 위험한 경지의 강습",
  level: "특이점 확장",
};

const BOSS_ICON = "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/ImgBoss/";

/** 라운드마다 같은 다섯. hp는 라운드 1 · 2 · 3(레벨 100 · 110 · 120)의 도감 기준 추정치. */
const LINEUP: (Omit<MatrixMonster, "round" | "wave" | "slot" | "level" | "defaultHp"> & {
  hp: [number, number, number];
})[] = [
  {
    monsterId: 650000047,
    handbookId: 330000060,
    name: "애곡하는 아익스",
    element: "Spectro",
    icon: `${BOSS_ICON}T_Boss_33006.webp`,
    hp: [1074929, 1201226, 1274673],
  },
  {
    monsterId: 243750011,
    handbookId: 340000300,
    name: "만와뢰 · 잔해",
    element: "Fusion",
    icon: `${BOSS_ICON}T_Boss_34030.webp`,
    hp: [1444699, 1614442, 1713155],
  },
  {
    monsterId: 607750001,
    handbookId: 330000120,
    name: "이성(異性) 무장",
    element: "Glacio",
    icon: `${BOSS_ICON}T_Boss_33012.webp`,
    hp: [1444699, 1614442, 1713155],
  },
  {
    monsterId: 650000045,
    handbookId: 330000010,
    name: "천둥의 비늘",
    element: "Electro",
    icon: `${BOSS_ICON}T_Boss_33010.webp`,
    hp: [912749, 1019991, 1082357],
  },
  {
    monsterId: 401800000,
    handbookId: 310000480,
    name: "매트릭스 미믹",
    element: "Spectro",
    icon: `${BOSS_ICON}T_Boss_35220.webp`,
    hp: [147908, 165286, 175393],
  },
];

const ROUND_LEVELS = [100, 110, 120];

/** 나오는 순서대로 15마리. */
export const MATRIX_MONSTERS: MatrixMonster[] = ROUND_LEVELS.flatMap((level, r) =>
  LINEUP.map(({ hp, ...m }, i) => ({
    ...m,
    round: r + 1,
    slot: i + 1,
    wave: r * LINEUP.length + i + 1,
    level,
    defaultHp: hp[r],
  })),
);

export const MATRIX_ROUND_COUNT = ROUND_LEVELS.length;

/** 체력 저장 키 — 라운드 · 라운드 안 순서. */
export const matrixHpKey = (m: Pick<MatrixMonster, "round" | "slot">) => `${m.round}-${m.slot}`;

/**
 * 스테이지 버프(NewTowerBuffs) — 파티마다 하나 고른다. 전부 「최종적으로 N% 증가」라 피해에 따로 곱한다
 * (피해 보너스 합연산 자리가 아니다). 조건부 효과(이상 효과 추가 시 · 이탈 추가 시)는 **늘 켜진 것으로** 본다.
 *
 *   33 공용 강화          받는 피해 ×1.2, 강공격 피해 ×1.2 더
 *   30 이상 효과 강화      받는 피해 ×1.25(이상 효과를 건 뒤), 서리 효과 피해 ×1.8 더
 *   31 에코 어빌리티 강화  에코 어빌리티 ×1.3, 인멸 피해 ×1.2, 공명 스킬 ×1.2 — 겹치면 곱한다
 *   32 조화도 파괴 강화    피해 ×1.25(조화도 · 이탈 추가 뒤). 조화 밀집 · 이탈의 ×1.3은 넣지 않았다
 */
export interface MatrixHitInfo {
  /** 피해 판정 분류(damageBonusType ?? type). */
  category: string;
  /** 공격 속성 — 물리(Physical)도 들어올 수 있다. */
  element: DamageElement;
  anomaly?: string;
}

export interface MatrixBuff {
  id: number;
  name: string;
  desc: string;
  multiplier: (hit: MatrixHitInfo) => number;
}

export const MATRIX_BUFFS: MatrixBuff[] = [
  {
    id: 33,
    name: "공용 강화",
    desc: "적군이 받는 피해가 최종적으로 20% 증가되고, 적군이 받는 강공격 피해가 최종적으로 20% 증가된다",
    multiplier: (h) => 1.2 * (h.category === "Heavy" ? 1.2 : 1),
  },
  {
    id: 30,
    name: "이상 효과 강화",
    desc: "캐릭터가 이상 효과 추가 시, 목표가 받는 피해를 최종적으로 25% 증가시키고, 30초간 지속된다. 적군이 받는 서리 효과의 피해가 최종적으로 80% 증가된다",
    multiplier: (h) => 1.25 * (h.anomaly === "FrostChafe" ? 1.8 : 1),
  },
  {
    id: 31,
    name: "에코 어빌리티 강화",
    desc: "아군 에코 어빌리티의 피해가 최종적으로 30% 증가되고, 인멸 피해가 최종적으로 20% 증가되며, 공명 스킬 피해가 최종적으로 20% 증가된다",
    multiplier: (h) =>
      (h.category === "Echo" ? 1.3 : 1) * (h.element === "Havoc" ? 1.2 : 1) * (h.category === "Skill" ? 1.2 : 1),
  },
  {
    id: 32,
    name: "조화도 파괴 강화",
    desc: "캐릭터가 조화도 · 이탈 상태 추가 시, 파티 전체의 피해가 최종적으로 25% 증가되며, 30초간 지속된다. 캐릭터가 조화 밀집 · 이탈 상태 추가 시, 피해가 최종적으로 30% 증가되며, 15초간 지속된다",
    multiplier: () => 1.25,
  },
];
