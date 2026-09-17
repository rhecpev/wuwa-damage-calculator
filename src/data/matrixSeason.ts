import type { DamageElement, Element } from "../types/game";
import type { AnomalyKind } from "./anomalies";

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
 *
 * 몬스터마다 붙는 **매트릭스 전용 시스템**(feature)은 API의 `Waves[].RecommendTeamFeature`에서
 * 그대로 옮겼다. 몹이 디버프를 달고 나오는 것이 아니라, 파티가 암흑 · 조화 밀집을 걸면 그 몬스터가
 * 받는 피해가 오르는 규칙이다. 미믹의 「전체 속성 저항 동일」도 같은 자리에 적혀 있다.
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
  /** 저항 속성 — 이 속성으로 때리면 저항이 높다. uniformRes면 뜻이 없고 아이콘 색에만 쓴다. */
  element: Element;
  icon: string;
  defaultHp: number;
  /** 이 몬스터를 잡고 받는 점수(표의 分数). */
  score: number;
  /**
   * 속성 저항이 전부 같은 몬스터. 「매트릭스 미믹」이 그렇다 —
   * 어느 속성으로 때려도 기본 저항(20%)이고, 같은 속성이라고 60%로 오르지 않는다.
   */
  uniformRes?: true;
  /**
   * 그 몬스터에만 걸린 **매트릭스 전용 시스템**(API의 `Waves[].RecommendTeamFeature`).
   * 몬스터가 스스로 디버프를 달고 나오는 것이 **아니라**, 파티가 특정 상태를 걸면 그 몬스터가
   * 받는 최종 피해가 오르는 규칙이다. 그래서 파티 구성에 따라 걸리기도 하고 안 걸리기도 한다.
   *
   *   name       화면에 띄울 이름(「이상 효과 시스템」 · 「조화도 파괴 시스템」)
   *   desc       원문 그대로. 조건과 수치가 다 들어 있다.
   *   damageTaken 조건을 다 채웠을 때의 받는 최종 피해 배수. 계산에 자동으로 걸지는 않는다 —
   *              파티가 그 상태를 걸 수 있어야 성립해서다.
   */
  feature?: {
    name: string;
    desc: string;
    /** 조건을 다 채웠을 때의 받는 최종 피해 배수. 꼬리표에 적는 값이다. */
    damageTaken?: number;
    /**
     * 그 배수를 **공격 트리거로 켜는 규칙**(data/attackTriggers.ts의 trigger를 본다).
     *   anomaly 그 이상 효과를 붙이면 스택마다 오르고, 태우면 onConsume이 따로 붙는다
     *   status  그 상태를 붙인 뒤부터 bonus가 붙는다
     * 파티 순서 탭이 사이클을 훑으며 이 규칙대로 배수를 켠다.
     */
    rule?:
      | { kind: "anomaly"; anomaly: AnomalyKind; perStack: number; maxStacks: number; onConsume: number }
      | {
          kind: "status";
          statuses: string[];
          /** 그 상태를 붙인 뒤부터 붙는 받는 피해 증가. */
          bonus: number;
          /**
           * 이 몬스터가 늘려 주는 「조화 밀집 · 간섭」 스택 상한.
           * 간섭은 곧 피해다 — 스택 1마다 「조화도 파괴 증폭 1pt당 최종 피해 perStackPerAmp」가 붙는다.
           * 늘어난 상한만큼 실제로 채운다고 보고 그 몫을 같이 곱한다.
           */
          extraStacks?: number;
          perStackPerAmp?: number;
        };
  };
  /** 그 몬스터를 잡을 때만 따로 붙는 점수(API의 KillScore). 미믹만 1000이다. */
  killScore?: number;
  /** 피해 점수 환산 배율(API의 DamegaRate, 1000 = ×1.0). 라운드마다 오른다. */
  scoreRate?: number;
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
    // 암흑을 **걸면** 받는 피해가 오르는 몬스터다(몹이 달고 나오는 것이 아니다).
    feature: {
      name: "이상 효과 시스템",
      desc: "암흑 효과 추가 시 받는 최종 피해 +5%(최대 5스택 · 30초), 추가한 암흑 효과가 소모될 시 받는 최종 피해 +20%(30초)",
      damageTaken: 1.25,
      rule: { kind: "anomaly", anomaly: "HavocBane", perStack: 0.05, maxStacks: 5, onConsume: 0.2 },
    },
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
    // 조화 밀집을 **걸면** 받는 피해가 오르는 몬스터다.
    feature: {
      name: "조화도 파괴 시스템",
      desc: "「조화 밀집 · 이탈」 또는 「조화 밀집 · 간섭」 보유 중 받는 피해 +20%, 「조화 밀집 · 간섭」 스택 상한 +2, 「조화 밀집 · 이탈」 상태에서 조화도 파괴에 맞으면 「조화 밀집 · 간섭」 2스택 추가(전투당 1회)",
      damageTaken: 1.2,
      rule: {
        kind: "status",
        statuses: ["조화 밀집 · 이탈", "조화 밀집 · 간섭"],
        bonus: 0.2,
        extraStacks: 2,
        perStackPerAmp: 0.0012,
      },
    },
    icon: `${BOSS_ICON}T_Boss_33010.webp`,
    hp: [5612519, 9541514, 19388951, 20358399],
    score: [4677, 9144, 20197, 21207],
  },
  {
    monsterId: 401800000,
    handbookId: 310000480,
    name: "매트릭스 미믹",
    // 속성 저항이 넷 다 같다 — 어느 속성으로 때려도 20%다. element는 아이콘 색으로만 남는다.
    // API도 그렇게 적어 두었다: 「매트릭스 미믹의 전체 속성 저항은 동일하며, 해당 적에게 피해를
    // 입힐 시 1.1배의 포인트를 획득한다. 격파 시 추가로 1000pt를 획득한다」
    element: "Spectro",
    uniformRes: true,
    killScore: 1000,
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
 * (피해 보너스 합연산 자리가 아니다).
 *
 *   33 공용 강화          받는 피해 ×1.2, 강공격 피해 ×1.2 더 — 조건 없음
 *   30 이상 효과 강화      받는 피해 ×1.25(**이상 효과를 건 뒤부터**), 서리 효과 피해 ×1.8 더
 *   31 에코 어빌리티 강화  에코 어빌리티 ×1.3, 인멸 피해 ×1.2, 공명 스킬 ×1.2 — 겹치면 곱한다. 조건 없음
 *   32 조화도 파괴 강화    ×1.25(**「이탈」을 붙인 뒤부터**), 조화 밀집 · 이탈이면 ×1.3 더
 *
 * 조건부 두 줄(30 · 32)은 사이클이 실제로 그것을 붙였는지 **공격 트리거로 따라간다**
 * — 몬스터 전용 시스템(feature)과 같은 자료(data/attackTriggers.ts)를 같은 규칙으로 읽는다.
 * 배수는 **그 공격 앞의 상태**로 매긴다. 붙이는 그 타는 아직 덕을 보지 않는다.
 * 지속 시간(30초 · 15초)은 보지 않는다 — 사이클 한 벌 안에서는 유지되는 것으로 본다.
 */
export interface MatrixHitInfo {
  /** 피해 판정 분류(damageBonusType ?? type). */
  category: string;
  /** 공격 속성 — 물리(Physical)도 들어올 수 있다. */
  element: DamageElement;
  anomaly?: string;
}

/**
 * 사이클이 지금까지 **무엇을 붙였는지**. 조건부 스테이지 버프가 이 값을 본다.
 * 공격 트리거를 앞에서부터 훑으며 채운다(MatrixPlannerPage의 follow).
 */
export interface MatrixStageState {
  /** 이상 효과를 하나라도 붙였는지(30번의 「이상 효과 추가 시」). */
  anomalyOn: boolean;
  /** 지금까지 붙인 부조화 「이탈」 상태 이름들(32번의 두 문장이 이걸 본다). */
  breaches: Set<string>;
}

export interface MatrixBuff {
  id: number;
  name: string;
  desc: string;
  multiplier: (hit: MatrixHitInfo, state: MatrixStageState) => number;
  /** 조건이 붙는 버프인지 — 화면에서 「아직 안 켜짐」을 알려 주려고 표시해 둔다. */
  conditional?: boolean;
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
    // 앞 문장만 조건부다 — 서리 효과 ×1.8은 조건 없이 늘 걸린다.
    multiplier: (h, st) => (st.anomalyOn ? 1.25 : 1) * (h.anomaly === "FrostChafe" ? 1.8 : 1),
    conditional: true,
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
    // 두 문장이 따로 선다 — 아무 「이탈」이나 붙으면 ×1.25, 그게 조화 밀집 · 이탈이면 ×1.3이 더 붙는다.
    multiplier: (_h, st) =>
      (st.breaches.size > 0 ? 1.25 : 1) * (st.breaches.has("조화 밀집 · 이탈") ? 1.3 : 1),
    conditional: true,
  },
];

/**
 * 매트릭스 전용 캐릭터 강화(API의 `Roles[].EnhanceSkillDesc`) — 이 시즌에 강화받는 캐릭터.
 * 출처: encore.moe API v2 `/ko/dpmatrix/7`의 Roles. 데니아는 「추가 피로도」라 피해에 걸리지 않아 뺐다.
 *
 *   finalDamage  그 캐릭터가 준 피해에 곱하는 「최종 피해 N% 증가」(곱연산)
 *   party        그 캐릭터가 공명 해방을 쓴 **뒤부터** 파티 전원의 피해 보너스에 더하는 몫(합연산)
 *                — 스테이지 버프와 같이 「그 공격 앞의 상태」로 매기고, 지속 시간(30초)은 보지 않는다.
 */
export interface MatrixRoleBoost {
  finalDamage: number;
  party?: {
    /** 더하는 피해 보너스 자리 — 공격 분류(Skill · Liberation)나 속성(Havoc · Spectro). */
    category?: "Skill" | "Liberation";
    element?: Element;
    amount: number;
  };
  desc: string;
}

export const MATRIX_ROLE_BOOSTS: Record<string, MatrixRoleBoost> = {
  zhezhi: {
    finalDamage: 0.2,
    party: { category: "Skill", amount: 0.3 },
    desc: "최종 피해 20% 증가. 공명 해방 발동 시 파티 내 캐릭터의 공명 스킬 피해 보너스 30% 증가(30초)",
  },
  yinlin: {
    finalDamage: 0.2,
    party: { category: "Liberation", amount: 0.3 },
    desc: "최종 피해 20% 증가. 공명 해방 발동 시 파티 내 캐릭터의 공명 해방 피해 보너스 30% 증가(30초)",
  },
  roccia: {
    finalDamage: 0.2,
    party: { element: "Havoc", amount: 0.2 },
    desc: "최종 피해 20% 증가. 공명 해방 발동 시 파티 내 캐릭터의 인멸 피해 보너스 20% 증가(30초)",
  },
  phoebe: {
    finalDamage: 0.2,
    party: { element: "Spectro", amount: 0.2 },
    desc: "최종 피해 20% 증가. 공명 해방 발동 시 파티 내 캐릭터의 회절 피해 보너스 20% 증가(30초)",
  },
  jinhsi: { finalDamage: 0.25, desc: "최종 피해 25% 증가" },
  changli: { finalDamage: 0.25, desc: "최종 피해 25% 증가" },
  jiyan: { finalDamage: 0.25, desc: "최종 피해 25% 증가" },
  xiangliyao: { finalDamage: 0.25, desc: "최종 피해 25% 증가" },
  brant: { finalDamage: 0.25, desc: "최종 피해 25% 증가" },
  cantarella: { finalDamage: 0.25, desc: "최종 피해 25% 증가" },
  camellya: { finalDamage: 0.25, desc: "최종 피해 25% 증가" },
  carlotta: { finalDamage: 0.25, desc: "최종 피해 25% 증가" },
};
