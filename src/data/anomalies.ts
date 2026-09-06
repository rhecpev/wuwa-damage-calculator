import type { Attack, Element } from "../types/game";

/**
 * 이상 효과(Anomaly) — 속성별로 적에게 쌓이는 상태이상.
 *
 * 피해가 일반 공격과 완전히 다른 식으로 나온다. 공격력·스킬 계수를 전혀 타지 않고
 * 「공명자 레벨별 기준값 × 원소 계수」로 정해진 고정 기초값에서 출발한다.
 * 계산식과 수치의 출처는 docs/조화도-이상-대미지-공식.md — phro.love에서 받아 적은 것이다.
 *
 * 유형이 셋이다.
 *   tick   스택이 유지되는 동안 일정 간격으로 터지고, 터질 때마다 스택을 1 소모한다
 *   burst  스택이 최대치에 닿으면 단발 대형 피해로 터진다
 *   debuff 피해가 없고 방어력만 깎는다(암흑 효과)
 */

export type AnomalyKind =
  | "AeroErosion"
  | "SpectroFrazzle"
  | "ElectroFlare"
  | "FrostChafe"
  | "FusionBurst"
  | "HavocBane";

export interface AnomalyDef {
  id: AnomalyKind;
  /** 게임에 뜨는 이름. 「풍식 효과」의 앞 두 글자다. */
  name: string;
  /** 이 이상 효과가 입히는 피해의 속성. 적 속성 저항은 이걸로 본다. */
  element: Element;
  type: "tick" | "burst" | "debuff";
  /** 게임이 정한 최대 스택. 폭발형은 여기 닿아야 터진다. */
  maxStacks: number;
  /**
   * 그 스택에서의 이상 기초값(90레벨 기준).
   * 피해가 없는 debuff형은 늘 0이다.
   */
  baseDamage: (stacks: number) => number;
  /** 화면에 그대로 띄우는 산출 근거 한 줄. */
  formula: string;
  /** 게임 속성 아이콘. 버프 목록처럼 이름만으로는 눈에 안 들어오는 자리에 쓴다. */
  icon: string;
}

/** 속성 아이콘 주소. 파일 이름만 다르고 앞부분은 같다. */
const ATTR_ICON = (name: string) =>
  `https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconAttribute/T_Iconproperty${name}_UI.webp`;

/**
 * 공명자 레벨별 이상 기준값 B(L). 90레벨 값만 알려져 있다.
 *
 * 3674.3은 아르카 정리글(2026-09-03)의 값이다. 그 글이 실은 데미지 표를 이 값과
 * 아래 배율표로 되짚어 보면 한 자리도 어긋나지 않는다 — 예를 들어 광학 10스택을
 * 몹레벨 90 · 속저 10%로 계산하면 3674.3 × 2.4949 × 0.50132 × 0.9 = 4136으로
 * 표의 4136과 같다. 그래서 예전에 쓰던 3674 대신 이 값을 쓴다.
 */
export const ANOMALY_BASE_LV90 = 3674.3;

/**
 * 스택별 **이상 배율**. 기초값에 이걸 곱한 것이 이상 피해의 출발점이다.
 *
 * 스택 1부터 차례로 담는다(배열 첫 칸이 1스택). 게임이 표로 못 박아 둔 값이라
 * 식으로 줄이지 않고 그대로 적는다 — 예전에는 「898 × (n−1)」 같은 근사식을 썼는데
 * 실제 표와 두 배 가까이 어긋나는 구간이 있었다.
 *
 * 출처: 아르카 「기록용 이상효과 계산식 재정리 & 속성별 이상배율 총정리」(2026-09-03).
 * 기본 최대 스택을 넘는 구간(광학·서리·전자 11~13, 불꽃 13)은 팀 버프로 상한을
 * 올렸을 때만 닿는다. 13스택이 10스택의 정확히 두 배가 되는 것이 네 효과의 공통 규칙이다.
 */
export const ANOMALY_RATES: Record<AnomalyKind, number[]> = {
  // 풍식 — 기본 3스택이 상한. 3스택부터는 스택당 +112.5%p로 곧게 는다.
  AeroErosion: [0.45, 1.125, 2.25, 3.375, 4.4999, 5.6249, 6.7496, 7.8746, 8.9993],
  // 광학 — 10스택까지 스택당 약 +24.38%p. 11~13은 10스택 배율의 4/3 · 5/3 · 2배다.
  SpectroFrazzle: [
    0.3002, 0.544, 0.7878, 1.0322, 1.276, 1.5198, 1.7636, 2.0074, 2.2511, 2.4949,
    3.3266, 4.1582, 4.9898,
  ],
  // 전자 — 자기폭발분도 스택당 배율이 같아서 같은 표를 쓴다.
  ElectroFlare: [
    0.5001, 0.9066, 1.3131, 1.7196, 2.1261, 2.5326, 2.9391, 3.3456, 3.752, 4.1585,
    5.5456, 6.932, 8.3164,
  ],
  // 서리 — 부여할 때마다 그때의 스택에 해당하는 피해가 들어간다(폭발이 아니다).
  //
  // 이 줄만 실측으로 다시 세웠다. 수수 Lv.90 · 적 Lv.100 회절(저항 20%)에서 1~6스택이
  //   352 · 638 · 924 · 1210 · 1496 · 1782
  // 로 **정확히 286씩** 늘었다. 등차가 확정되므로 1스택 배율과 스택당 증가폭 두 개만
  // 맞추면 된다 — 여섯 점이 요구하는 값이 24.448~24.517% · 19.907~19.934%p다.
  //
  // 그 안에서 원문 표의 10스택(203.77%)에 맞아떨어지는 조합이 24.49% + 19.92%p다.
  // 3스택(64.33%)과 11~13스택(271.69 · 339.62 · 407.54%)도 원문과 그대로 같아진다 —
  // 원문(아르카 글 이미지 전사)은 양 끝이 맞고 중간이 어긋나 있었다.
  //   원문 24.61 · 44.47 · 64.33 · 84.18 · 104.04 · 123.90 · 143.76 · 163.62 · 183.91 · 203.77
  //   실측 24.49 · 44.41 · 64.33 · 84.25 · 104.17 · 124.09 · 144.01 · 163.93 · 183.85 · 203.77
  //   (원문 값끼리도 등차가 안 맞는다 — 24.61 + 9×19.86 = 203.35 ≠ 203.77)
  //
  // 같은 자리에서 응결 저항 감소를 걸고 잰 두 점(2스택 703 · 3스택 1017)은 이 표로
  // 감소폭이 8.08~8.10%일 때 맞는다. 게임 표기가 8%인 효과의 실제 값이 그쯤인 것으로 보인다.
  FrostChafe: [
    0.2449, 0.4441, 0.6433, 0.8425, 1.0417, 1.2409, 1.4401, 1.6393, 1.8385, 2.0377,
    2.7169, 3.3962, 4.0754,
  ],
  // 불꽃 — 최대 스택에 닿아야 터진다. 원문 표에 10스택과 13스택만 있다.
  FusionBurst: [0, 0, 0, 0, 0, 0, 0, 0, 0, 6.9863, 9.3151, 11.6438, 13.9726],
  // 암흑 — 피해가 없다. 스택은 방어력 감소로만 쓰인다.
  HavocBane: [],
};

/**
 * 스택 n의 이상 배율. 표에 없는 구간은 **끝값을 그대로 쓴다** — 0으로 떨어뜨리면
 * 상한을 올린 빌드에서 피해가 갑자기 사라진 것처럼 보인다.
 */
export function anomalyRate(kind: AnomalyKind, stacks: number): number {
  const table = ANOMALY_RATES[kind];
  if (table.length === 0) return 0;
  const n = Math.floor(stacks);
  if (n <= 0) return 0;
  return table[Math.min(n, table.length) - 1];
}

/**
 * 암흑 효과의 방어력 감소는 **버프로 담는다** — 암흑을 붙일 수 있는 캐릭터
 * (치사 · 양양 · 현령) 파일에 「암흑 효과 · 목표 방어력 감소」가 들어 있다.
 *   스택당 2% · target "defReduction" · scope "party"(적에게 걸리는 디버프라 파티 전원이 본다)
 * 상한이 3스택으로 고정이 아니라 버프로 올라가기 때문에(치사 반주 +3, 현령 3체인 +3)
 * 여기서 최대 6%로 잘라 두면 오히려 틀린다. 계산은 manualBuffs의 스택 × 2%가 맡는다.
 */

export const ANOMALIES: Record<AnomalyKind, AnomalyDef> = {
  // 틱데미지형 셋 — 스택이 유지되는 동안 주기적으로 터지고 터질 때마다 스택을 1 쓴다.
  AeroErosion: {
    id: "AeroErosion",
    name: "풍식",
    element: "Aero",
    type: "tick",
    // 기본 상한이 셋뿐이다 — 다른 효과와 달리 10이 아니다.
    maxStacks: 3,
    baseDamage: (n) => ANOMALY_BASE_LV90 * anomalyRate("AeroErosion", n),
    formula: "3674.3 × 배율표 (1스택 45% · 3스택 225% · 이후 스택당 +112.5%p)",
    icon: ATTR_ICON("redwind"),
  },
  SpectroFrazzle: {
    id: "SpectroFrazzle",
    name: "광학",
    element: "Spectro",
    type: "tick",
    maxStacks: 10,
    baseDamage: (n) => ANOMALY_BASE_LV90 * anomalyRate("SpectroFrazzle", n),
    formula: "3674.3 × 배율표 (1스택 30.02% · 10스택 249.49% · 13스택 498.98%)",
    icon: ATTR_ICON("redlight"),
  },
  ElectroFlare: {
    id: "ElectroFlare",
    name: "전자",
    element: "Electro",
    type: "tick",
    maxStacks: 10,
    baseDamage: (n) => ANOMALY_BASE_LV90 * anomalyRate("ElectroFlare", n),
    formula: "3674.3 × 배율표 (1스택 50.01% · 10스택 415.85% · 13스택 831.64%)",
    icon: ATTR_ICON("redmine"),
  },

  // 폭발·부여형 둘.
  FrostChafe: {
    id: "FrostChafe",
    name: "서리",
    element: "Glacio",
    type: "burst",
    maxStacks: 10,
    baseDamage: (n) => ANOMALY_BASE_LV90 * anomalyRate("FrostChafe", n),
    formula: "3674.3 × 배율표 (1스택 24.61% · 10스택 203.77% · 13스택 407.54%)",
    icon: ATTR_ICON("redice"),
  },
  FusionBurst: {
    id: "FusionBurst",
    name: "불꽃",
    element: "Fusion",
    type: "burst",
    maxStacks: 10,
    baseDamage: (n) => ANOMALY_BASE_LV90 * anomalyRate("FusionBurst", n),
    formula: "3674.3 × 배율표 (10스택 698.63% · 13스택 1397.26%) — 최대 스택에서만 터진다",
    icon: ATTR_ICON("redhot"),
  },

  // 디버프형 — 피해가 없다. 방어력만 깎는다.
  HavocBane: {
    id: "HavocBane",
    name: "암흑",
    element: "Havoc",
    type: "debuff",
    maxStacks: 3,
    baseDamage: () => 0,
    formula: "피해 없음 · 방어력 감소 = 스택 × 2%p (버프로 처리 · 상한은 늘어날 수 있다)",
    icon: ATTR_ICON("reddark"),
  },
};

export const ANOMALY_LIST: AnomalyDef[] = Object.values(ANOMALIES);

/** 「풍식」처럼 앞 두 글자로 찾는다. 캐릭터·무기 원문이 그 표기를 쓴다. */
export const anomalyByName = (name: string): AnomalyDef | undefined =>
  ANOMALY_LIST.find((a) => a.name === name);

/** 공격 팔레트·루틴이 쓰는 이상 효과 항목의 id. 캐릭터 공격 id와 겹치지 않는다. */
export const anomalyAttackId = (kind: AnomalyKind) => `anomaly:${kind}`;

/** 위 id에서 이상 효과를 되찾는다. 이상 항목이 아니면 undefined. */
export function anomalyFromAttackId(id: string): AnomalyDef | undefined {
  const kind = id.startsWith("anomaly:") ? (id.slice(8) as AnomalyKind) : undefined;
  return kind && kind in ANOMALIES ? ANOMALIES[kind] : undefined;
}

/**
 * 이상 효과를 계산 엔진이 먹는 공격(Attack) 모양으로 감싼다.
 *
 * 피해는 이 안의 hits·scalingStat이 아니라 calculator/anomaly.ts가 따로 낸다
 * — anomaly가 채워져 있으면 계산이 그쪽 길로 간다. 여기 담는 값들은 화면이
 * 공격과 같은 카드를 그릴 수 있게 모양만 맞춘 것이다.
 */
export function anomalyAttack(kind: AnomalyKind): Attack {
  const def = ANOMALIES[kind];
  return {
    id: anomalyAttackId(kind),
    name: `${def.name} 효과`,
    type: "Echo", // 피해 보너스 칸을 쓰지 않으므로 분류는 의미가 없다
    element: def.element,
    scalingStat: "ATK",
    hits: [],
    skillLevel: 1,
    anomaly: kind,
  };
}
