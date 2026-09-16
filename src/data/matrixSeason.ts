import type { DamageElement, Element } from "../types/game";

/**
 * 지금 매트릭스 시즌의 몬스터 배치.
 * 배치 · 몬스터 id · 아이콘 출처: encore.moe API v2 `/ko/dpmatrix/7`
 *   — S2 단계2 「위험한 경지의 강습」(3.8 버전까지), 특이점 확장(레벨 Id 14).
 *
 * **체력과 점수는 인게임 실측표를 그대로 옮긴 것이다** — 「s2.2矩阵 各轮次分数对应表」(3.6 매트릭스
 * boss 혈량 · 분수표, 矩7R1~r4). 예전에는 도감 LifeMax × 레벨 배율로 어림잡았는데 실제의 1/5 수준이라
 * 라운드가 언제 끝나는지 맞지 않았다. 표의 血量이 체력, 分数가 그 몬스터를 잡고 받는 점수다.
 *
 * 4라운드 20웨이브다. 라운드마다 아래 다섯이 같은 순서로 나오고, 마지막 「매트릭스 미믹」을 잡으면
 * 다음 라운드로 넘어간다. 레벨은 1 · 2 · 3라운드가 100 · 110 · 120이고, 4라운드는 표에 레벨 칸이
 * 비어 있어 120으로 둔다(체력만 3라운드보다 5%쯤 높다).
 * **레벨은 표기일 뿐 체력에만 걸린다** — 방어력을 비롯한 피해 계산은 라운드와 상관없이 레벨 100이다
 * (ENEMY_RES_PRESETS의 matrix.fixedLevel = 100. 계산 탭 · 비교 탭 · 파티 순서 탭 모두 이 값으로 묶인다).
 *
 * 3라운드 미믹은 표에서 체력이 나머지 넷과 같고 점수만 높다. 표를 고치지 않고 그대로 옮겼다.
 * 화면에서 체력을 직접 고칠 수 있게 두고, 이 값은 처음 채워 넣는 기본값으로만 쓴다.
 */
export interface MatrixMonster {
  /** 라운드(1~4). */
  round: number;
  /** 웨이브 번호 — 전체에서 나오는 순서(1~20). */
  wave: number;
  /** 라운드 안에서의 순서(1~5). */
  slot: number;
  /** 매트릭스 전용 몬스터 id. */
  monsterId: number;
  /** 도감 몬스터 id(아이콘 · 속성을 뽑은 곳). */
  handbookId: number;
  name: string;
  level: number;
  /** 저항 속성 — 이 속성으로 때리면 저항이 높다. */
  element: Element;
  icon: string;
  defaultHp: number;
  /** 이 몬스터를 잡고 받는 점수(표의 分数). */
  score: number;
}

export const MATRIX_SEASON = {
  name: "S2 단계2 · 위험한 경지의 강습",
  level: "특이점 확장",
};

const BOSS_ICON = "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/ImgBoss/";

/** 라운드마다 같은 다섯. hp · score는 1 · 2 · 3 · 4라운드 순서다(실측표 그대로). */
const LINEUP: (Omit<MatrixMonster, "round" | "wave" | "slot" | "level" | "defaultHp" | "score"> & {
  hp: [number, number, number, number];
  score: [number, number, number, number];
})[] = [
  {
    monsterId: 650000047,
    handbookId: 330000060,
    name: "애곡하는 아익스",
    element: "Spectro",
    icon: `${BOSS_ICON}T_Boss_33006.webp`,
    hp: [5612519, 9541514, 19388951, 20358399],
    score: [4677, 9144, 20197, 21207],
  },
  {
    monsterId: 243750011,
    handbookId: 340000300,
    name: "만와뢰 · 잔해",
    element: "Fusion",
    icon: `${BOSS_ICON}T_Boss_34030.webp`,
    hp: [5612519, 9541514, 19388951, 20358399],
    score: [4677, 9144, 20197, 21207],
  },
  {
    monsterId: 607750001,
    handbookId: 330000120,
    name: "이성(異性) 무장",
    element: "Glacio",
    icon: `${BOSS_ICON}T_Boss_33012.webp`,
    hp: [5612519, 9541514, 19388951, 20358399],
    score: [4677, 9144, 20197, 21207],
  },
  {
    monsterId: 650000045,
    handbookId: 330000010,
    name: "천둥의 비늘",
    element: "Electro",
    icon: `${BOSS_ICON}T_Boss_33010.webp`,
    hp: [5612519, 9541514, 19388951, 20358399],
    score: [4677, 9144, 20197, 21207],
  },
  {
    monsterId: 401800000,
    handbookId: 310000480,
    name: "매트릭스 미믹",
    element: "Spectro",
    icon: `${BOSS_ICON}T_Boss_35220.webp`,
    hp: [6173771, 12756094, 19388951, 20358399],
    score: [6659, 14447, 23217, 24327],
  },
];

// 4라운드는 표에 레벨이 비어 있다 — 3라운드와 같은 120으로 둔다(체력만 5%쯤 높다).
const ROUND_LEVELS = [100, 110, 120, 120];

/** 나오는 순서대로 20마리. */
export const MATRIX_MONSTERS: MatrixMonster[] = ROUND_LEVELS.flatMap((level, r) =>
  LINEUP.map(({ hp, score, ...m }, i) => ({
    ...m,
    round: r + 1,
    slot: i + 1,
    wave: r * LINEUP.length + i + 1,
    level,
    defaultHp: hp[r],
    score: score[r],
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
