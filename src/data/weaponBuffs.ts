import type {
  BuffDamageType,
  BuffModifier,
  BuffScope,
  BuffTarget,
  BuffUptime,
  Element,
  StatGroup,
} from "../types/game";

/**
 * 무기 스킬을 계산에 쓸 수 있는 형태로 손으로 옮겨 적은 것.
 *
 * src/data/weapons.json은 API에서 자동 생성하는 파일이라 다시 받으면 덮어써진다.
 * 그래서 사람이 해석해야 하는 이 부분만 따로 떼어 여기에 둔다. 키는 무기 id.
 *
 * values는 정련 1~5단계 값을 소수로 적는다(12% → 0.12). 무기 설명의 슬래시 순서와 같다.
 */
export interface WeaponBuffTemplate {
  label: string;
  target: BuffTarget;
  damageType: BuffDamageType;
  /** target이 "resPen"/"resReduction"일 때 어느 속성 저항인지. */
  element?: Element;
  /** 정련 1~5단계 값(소수). */
  values: [number, number, number, number, number];
  /** 기본 스택. 생략하면 1. */
  stacks?: number;
  /** 스택을 쌓을 수 있는 버프의 최대 스택. 2 이상이면 공격마다 몇 스택인지 고를 수 있다. */
  maxStacks?: number;
  /** target이 "motionValue"일 때만 의미가 있다. 생략하면 증가. */
  modifier?: BuffModifier;
  /** 발동 조건 — 엔진이 판정하지 못하는 부분을 사람이 읽도록 남겨둔다. */
  condition?: string;
  /** 상시(passive)인지 조건부(active)인지. 생략하면 passive. */
  uptime?: BuffUptime;
  /** 파티 전원(party)인지 본인만(self)인지. 생략하면 self. */
  scope?: BuffScope;
  /**
   * 공격력·HP·방어력 %가 스탯창(panel)에 얹히는지 전투 버프(buff)로 얹히는지.
   * 무기 효과는 무기를 낀 본인의 스탯창에 그대로 들어가므로 생략하면 panel이다(실측 확인).
   * 다만 파티원에게 거는 효과는 남의 스탯창에 들어갈 수 없으니 "buff"로 적는다.
   */
  statGroup?: StatGroup;
  /**
   * 같은 이름끼리 하나만 켜지는 묶음. 「출전 / 미출전」처럼 동시에 성립할 수 없는
   * 상태를 나눠 적을 때 쓴다 — 하나를 켜면 같은 묶음의 다른 것은 자동으로 꺼진다.
   */
  exclusiveGroup?: string;
}

export const weaponBuffs: Record<string, WeaponBuffTemplate[]> = {
  // ── 3성 ──────────────────────────────────────────────
  // 흑야의 직검 · 흑뢰 (직검 ★3) — 필사의 결심
  //
  // 「필사의 결심」 네 번째(대검 현명 · 권갑 흑빛 · 권총 흑성 · 직검 흑뢰). 전부 내용이 같다.
  "21020013": [
    {
      label: "변주 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 10초간",
    },
  ],

  // 흑야의 권총 · 흑성 (권총 ★3) — 필사의 결심
  //
  // 「필사의 결심」 세 번째(대검 현명 · 권갑 흑빛 · 권총 흑성). 전부 내용이 같다.
  "21030013": [
    {
      label: "변주 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 10초간",
    },
  ],

  // ── 1성 ──────────────────────────────────────────────
  // 견습용 대검 (대검 ★1) — 각고의 힘
  //
  // 조건 없는 상시 공격력 증가. 2성 「시작의 발걸음」과 같은 모양이고 수치만 낮다.
  "21010011": [
    {
      label: "공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 견습용 직검 (직검 ★1) — 각고의 힘
  //
  // 「각고의 힘」 두 번째. 대검판과 내용이 같다.
  "21020011": [
    {
      label: "공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 견습용 권총 (권총 ★1) — 각고의 힘
  //
  // 「각고의 힘」 세 번째. 대검·직검판과 내용이 같다.
  "21030011": [
    {
      label: "공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 견습용 권갑 (권갑 ★1) — 각고의 힘
  //
  // 「각고의 힘」 네 번째. 앞의 셋과 내용이 같다.
  "21040011": [
    {
      label: "공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 견습용 증폭기 (증폭기 ★1) — 각고의 힘
  //
  // 「각고의 힘」 다섯 번째로 5종이 모두 나왔다 — 전부 내용이 같다.
  "21050011": [
    {
      label: "공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // ── 2성 ──────────────────────────────────────────────
  // 태초의 대검 (대검 ★2) — 시작의 발걸음
  //
  // 조건 없는 상시 공격력 증가. 공격력%는 statGroup 기본값이 panel이라 따로 적지 않는다.
  "21010012": [
    {
      label: "공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.05, 0.0625, 0.075, 0.0875, 0.1],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 태초의 직검 (직검 ★2) — 시작의 발걸음
  //
  // 「시작의 발걸음」 두 번째. 대검판과 내용이 같다.
  "21020012": [
    {
      label: "공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.05, 0.0625, 0.075, 0.0875, 0.1],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 태초의 권총 (권총 ★2) — 시작의 발걸음
  //
  // 「시작의 발걸음」 세 번째. 대검·직검판과 내용이 같다.
  "21030012": [
    {
      label: "공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.05, 0.0625, 0.075, 0.0875, 0.1],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 태초의 권갑 (권갑 ★2) — 시작의 발걸음
  //
  // 「시작의 발걸음」 네 번째. 앞의 셋과 내용이 같다.
  "21040012": [
    {
      label: "공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.05, 0.0625, 0.075, 0.0875, 0.1],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 태초의 증폭기 (증폭기 ★2) — 시작의 발걸음
  //
  // 「시작의 발걸음」 다섯 번째로 5종이 모두 나왔다 — 전부 내용이 같다.
  "21050012": [
    {
      label: "공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.05, 0.0625, 0.075, 0.0875, 0.1],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // ── 3성 (이어서) ─────────────────────────────────────
  // 수호자의 증폭기 · 모략 (증폭기 ★3) — 상성
  //
  // 「수호자」 계열 다섯 번째. 대검 「근성」(합일)과 같이 일반 공격과 강공격 두 자리에 걸린다.
  "21050053": [
    {
      label: "일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive",
      scope: "self",
    },
  ],

  // 흑야의 증폭기 · 흑광 (증폭기 ★3) — 필사의 결심
  //
  // 「필사의 결심」 다섯 번째이자 마지막(대검 현명 · 권갑 흑빛 · 권총 흑성 · 직검 흑뢰 · 증폭기 흑광).
  "21050013": [
    {
      label: "변주 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 10초간",
    },
  ],

  // 수호자의 직검 · 기민 (직검 ★3) — 공제
  //
  // 「수호자」 계열 네 번째. 권총 「동심」과 자리(공명 스킬)도 수치도 같다.
  "21020053": [
    {
      label: "공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 수호자의 권총 · 용맹 (권총 ★3) — 동심
  //
  // 「수호자」 계열 세 번째. 조건 없는 상시 피해 보너스이고 걸리는 자리만 다르다
  //   대검 합일(일반+강공격) · 권갑 합력(공명 해방) · 권총 동심(공명 스킬)
  "21030053": [
    {
      label: "공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 흑야의 권갑 · 흑빛 (권갑 ★3) — 필사의 결심
  //
  // 대검 「흑야의 대검 · 현명」과 같은 이름의 효과이고 수치도 같다.
  "21040013": [
    {
      label: "변주 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 10초간",
    },
  ],

  // 수호자의 권갑 · 강력 (권갑 ★3) — 합력
  //
  // 대검 「수호자의 대검 · 근성」(합일)의 권갑판. 조건 없는 상시 효과이고 자리만 다르다.
  "21040053": [
    {
      label: "공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
  ],

  // 흑야의 대검 · 현명 (대검 ★3) — 필사의 결심
  "21010013": [
    {
      label: "변주 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 10초간",
    },
  ],

  // 수호자의 대검 · 근성 (대검 ★3) — 합일
  //
  // 조건 없는 상시 효과다. 한 수치가 일반 공격과 강공격 두 자리에 붙어 두 줄로 나눈다.
  "21010053": [
    {
      label: "일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive",
      scope: "self",
    },
  ],

  // ── 4성 ──────────────────────────────────────────────
  // 풍류의 우화시 (직검 ★4) — 수식
  //
  // 「수식」 다섯 번째로 5종 무기가 모두 나왔다 — 전부 내용이 같다.
  "21020094": [
    {
      label: "이상 효과 몬스터 타격 시 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08], // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "「이상 효과」가 있는 몬스터에게 피해를 입힐 시 1스택(1초당 1회), 최대 4스택 · 10초간",
    },
  ],

  // 천공의 광경 (직검 ★4) — 칼날의 질풍
  //
  // 「최대 1스택」이라 스택형이 아니라 단발이다 — stacks/maxStacks를 두지 않는다.
  // 한 수치가 일반 공격과 강공격 두 자리에 붙어 두 줄로 나눈다. 정련 5에서 각각 64%로 크다.
  "21020074": [
    {
      label: "공명 스킬 후 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.2, 0.31, 0.42, 0.53, 0.64],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 10초간 (1초당 1회)",
    },
    {
      label: "공명 스킬 후 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.2, 0.31, 0.42, 0.53, 0.64],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 10초간 (1초당 1회)",
    },
  ],

  // 예리한 날개깃 (직검 ★4) — 흑조(黑潮) 사냥의 맹세
  //
  // 권갑 「거침없는 비상」과 수치·조건·자리가 모두 같다.
  // 이 이름은 종류마다 내용이 달랐는데(권총은 스택형, 증폭기는 공명 스킬 조건),
  // 직검판은 권갑판과 동일한 쪽이다.
  "21020104": [
    {
      label: "공명 해방 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.072, 0.111, 0.151, 0.19, 0.23],
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시, 15초간",
    },
    {
      label: "공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.108, 0.167, 0.226, 0.286, 0.345],
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시, 15초간",
    },
  ],

  // 영원의 붕괴 (직검 ★4) — 피안의 눈동자
  //
  // 「피안의 눈동자」 다섯 번째로 5종 무기가 모두 나왔다 — 전부 내용이 같다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「공명 에너지 6~10pt 획득」 자원 회복이라 피해식과 무관하다
  "21020084": [
    {
      label: "공명 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 16초간 (20초당 1회)",
    },
  ],

  // 야귀의 신념 (직검 ★4) — 정면돌파
  "21020044": [
    {
      label: "변주 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.15, 0.1875, 0.225, 0.2625, 0.3],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 15초간",
    },
  ],

  // 상승의 서녘 (직검 ★4) — 천시의 끌림
  //
  // 「맹세」는 등장 시 6스택을 한 번에 얻고 2초마다 1스택씩 빠지는 소모형이다
  // (권갑 「천공의 역행」의 철갑과 같은 방향). 2~4% × 6스택 = 12~24%.
  // 실효 스택은 등장 후 경과 시간에 달렸으므로 로테이션 시점에 맞춰 골라 쓴다.
  "21020064": [
    {
      label: "맹세 · 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.02, 0.025, 0.03, 0.035, 0.04], // 스택 1개당
      stacks: 6,
      maxStacks: 6,
      uptime: "active",
      scope: "self",
      condition:
        "등장 시 6스택 획득(12초당 1회), 2초마다 1스택 감소, 목표 격파 시 6스택 추가 · 최대 6스택",
    },
  ],

  // 마음의 닻 (직검 ★4) — 냐앙!
  //
  // 「포악」은 스택형 — 2~4% × 10스택 = 20~40%. 지금까지 무기 중 스택 수가 두 번째로 많다
  // (솟아오르는 화염의 14스택 다음).
  // 10스택에 도달하면 크리티컬 확률이 따로 열려 문턱형으로 한 줄 더 둔다.
  "21020017": [
    {
      label: "포악 · 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.02, 0.025, 0.03, 0.035, 0.04], // 스택 1개당
      stacks: 10,
      maxStacks: 10,
      uptime: "active",
      scope: "self",
      condition: "피해를 입힐 시 1스택(1초당 1회), 최대 10스택 · 3초간 (퇴장 시 전부 제거)",
    },
    {
      label: "포악 10스택 · 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      values: [0.06, 0.075, 0.09, 0.105, 0.12],
      uptime: "active",
      scope: "self",
      condition: "「포악」이 10스택에 도달했을 때",
    },
  ],

  // 18형 직검 · 순간의 칼빛 (직검 ★4) — 전진의 발걸음
  //
  // 발동 HP 문턱이 정련마다 달라진다(40 / 50 / 60 / 70 / 80% 이하) — 정련을 올릴수록
  // 조건이 느슨해지는 꼴이라 수치와 함께 condition에 적어둔다.
  // 41형 대검 · 무거운 책임과 반대로 이쪽은 HP가 낮을 때 발동한다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「강공격 피해를 입힐 때 HP 5~10% 회복(8초당 1회)」 회복이라 피해식과 무관하다
  "21020034": [
    {
      label: "저체력 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.18, 0.225, 0.27, 0.315, 0.36],
      uptime: "active",
      scope: "self",
      condition: "HP가 문턱 이하일 때 (정련 1~5 순서로 40 / 50 / 60 / 70 / 80% 이하)",
    },
  ],

  // 허위의 왈츠 (증폭기 ★4) — 수식
  //
  // 「수식」 네 번째 — 대검 용서의 명상록 · 권갑 만취의 영웅지 · 권총 작별의 로맨스와 동일하다.
  "21050094": [
    {
      label: "이상 효과 몬스터 타격 시 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08], // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "「이상 효과」가 있는 몬스터에게 피해를 입힐 시 1스택(1초당 1회), 최대 4스택 · 10초간",
    },
  ],

  // 청음 (증폭기 ★4) — 강유병존
  //
  // 4성 공격력% 단일 효과 중 수치가 가장 크다(정련 5에서 48%).
  "21050074": [
    {
      label: "공명 해방 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.15, 0.2325, 0.315, 0.3975, 0.48],
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시, 15초간",
    },
  ],

  // 융합의 원반 (증폭기 ★4) — 피안의 눈동자
  //
  // 「피안의 눈동자」 네 번째 — 대검 멸망의 주파수 · 권갑 천상의 나선 · 권총 역설의 격류와 동일하다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「공명 에너지 6~10pt 획득」 자원 회복이라 피해식과 무관하다
  "21050084": [
    {
      label: "공명 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 16초간 (20초당 1회)",
    },
  ],

  // 바다의 선물 (증폭기 ★4) — 어획
  //
  // 스택형 — 6~10% × 4스택 = 24~40%.
  // 「광학 효과」가 조건으로만 쓰여서 그대로 옮길 수 있다
  //   (불빛의 심판처럼 「광학 효과」 피해 자체를 부스트하는 경우는 damageType에 자리가 없어 미반영).
  "21050027": [
    {
      label: "광학 효과 적 타격 시 회절 피해 증가",
      target: "damageBonus",
      damageType: "Spectro",
      values: [0.06, 0.07, 0.08, 0.09, 0.1], // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "「광학 효과」가 있는 적에게 피해를 입힐 시 1스택(1초당 1회), 최대 4스택 · 6초간",
    },
  ],

  // 눈부신 빛 (증폭기 ★4) — 흑조(黑潮) 사냥의 맹세
  //
  // 같은 이름이지만 종류마다 내용이 다르다 — 대검/권갑은 공명 해방 조건의 단발,
  // 권총은 일반·강공격으로 쌓는 스택형, 이 증폭기판은 공명 스킬 조건의 단발이다.
  // 한 수치가 공격력과 일반 공격 피해 보너스 두 자리에 동시에 붙어 두 줄로 나눈다.
  "21050104": [
    {
      label: "공명 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.09, 0.139, 0.189, 0.238, 0.288],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 10초간",
    },
    {
      label: "공명 스킬 후 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.09, 0.139, 0.189, 0.238, 0.288],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 10초간",
    },
  ],

  // 금주의 수호 (증폭기 ★4) — 전사의 충정
  //
  // 대검 「장야의 불빛」(공격력 + 방어력)과 같은 꼴이고, 두 번째 자리가 HP다.
  // 조건이 같은 두 효과지만 붙는 자리가 달라 각각 한 줄로 적는다.
  "21050044": [
    {
      label: "변주 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 15초간",
    },
    {
      label: "변주 스킬 후 HP",
      target: "hpPercent",
      damageType: "All",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 15초간",
    },
  ],

  // 25형 증폭기 · 울림의 멜로디 (증폭기 ★4) — 새로운 법칙
  //
  // HP 60%를 경계로 회복 / 공격력이 갈리는데, 회복 쪽은 피해식과 무관해 빠진다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「HP 60% 이하에서 공명 스킬 발동 시 HP 5~10% 회복(8초당 1회)」 회복이라 피해식과 무관하다
  "21050034": [
    {
      label: "HP 60% 이상일 때 공명 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "active",
      scope: "self",
      condition: "HP가 60% 이상인 상태에서 공명 스킬 발동 시, 10초간",
    },
  ],

  // 태양 불꽃 (권총 ★4) — 흑조(黑潮) 사냥의 맹세
  //
  // 같은 이름의 대검 「금빛 하늘」 · 권갑 「거침없는 비상」과 달리 이쪽은 스택형이다.
  // 한 스택이 공격력과 강공격 피해 보너스 두 자리에 동시에 붙어 두 줄로 나눈다.
  // 2.2~7.2% × 4스택 = 8.8~28.8%.
  "21030104": [
    {
      label: "일반·강공격 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.022, 0.034, 0.047, 0.059, 0.072], // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "일반 공격 혹은 강공격으로 피해를 입힐 시 1스택(1초당 1회), 최대 4스택 · 7초간",
    },
    {
      label: "일반·강공격 후 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.022, 0.034, 0.047, 0.059, 0.072], // 위와 같은 스택이 자리만 갈린 것
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "일반 공격 혹은 강공격으로 피해를 입힐 시 1스택(1초당 1회), 최대 4스택 · 7초간",
    },
  ],

  // 천공의 순간 (권총 ★4) — 천변만화
  //
  // 스택형 — 4~8% × 3스택 = 12~24%.
  "21030064": [
    {
      label: "돌진·회피 시 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08], // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "돌진하거나 회피할 시 1스택, 최대 3스택 · 8초간",
    },
  ],

  // 작별의 로맨스 (권총 ★4) — 수식
  //
  // 대검 「용서의 명상록」 · 권갑 「만취의 영웅지」와 같은 효과의 권총판이다.
  "21030094": [
    {
      label: "이상 효과 몬스터 타격 시 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08], // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "「이상 효과」가 있는 몬스터에게 피해를 입힐 시 1스택(1초당 1회), 최대 4스택 · 10초간",
    },
  ],

  // 역설의 격류 (권총 ★4) — 피안의 눈동자
  //
  // 대검 「멸망의 주파수」 · 권갑 「천상의 나선」과 같은 효과의 권총판이다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「공명 에너지 6~10pt 획득」 자원 회복이라 피해식과 무관하다
  "21030084": [
    {
      label: "공명 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 16초간 (20초당 1회)",
    },
  ],

  // 불멸의 성화 (권총 ★4) — 일편단심
  //
  // 권갑 「전우의 의리」와 수치·조건이 같고 걸리는 자리만 공명 해방 → 공명 스킬로 다르다.
  "21030044": [
    {
      label: "변주 스킬 후 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 15초간",
    },
  ],

  // 뇌전 (권총 ★4) — 거침없는 기세
  //
  // 스택형 — 7~23% × 3스택 = 21~69%. 일반·강공격으로 쌓아 공명 스킬을 세게 만드는 꼴이다.
  "21030074": [
    {
      label: "일반·강공격 후 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.07, 0.11, 0.15, 0.19, 0.23], // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "일반 공격이나 강공격으로 피해를 입힐 시 1스택(1초당 1회), 최대 3스택 · 10초간",
    },
  ],

  // 26형 권총 · 맹렬한 돌격 (권총 ★4) — 끝없는 탐구
  //
  // 스택형 — 6~12% × 2스택 = 12~24%. 피해를 안 맞고 버티면 5초마다 1스택씩 쌓이고,
  // 맞으면 1스택을 소모해 HP를 회복한다(회복은 미반영).
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「피해를 입으면 1스택을 소모하고 HP 5~10% 회복」 회복이라 피해식과 무관하다
  "21030034": [
    {
      label: "무피격 시 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.06, 0.075, 0.09, 0.105, 0.12], // 스택 1개당
      stacks: 2,
      maxStacks: 2,
      uptime: "active",
      scope: "self",
      condition: "피해를 입지 않은 채 5초마다 1스택, 최대 2스택 · 8초간 (피격 시 1스택 소모)",
    },
  ],

  // 황금 권갑 (권갑 ★4) — 불굴의 권갑
  //
  // 정련 간격이 9%p로 균등하고 폭이 커서(18~54%) 4성 중 수치가 높은 편이다.
  "21040074": [
    {
      label: "공명 스킬 후 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.18, 0.27, 0.36, 0.45, 0.54],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 15초간",
    },
  ],

  // 천상의 나선 (권갑 ★4) — 피안의 눈동자
  //
  // 대검 「멸망의 주파수」와 같은 이름의 효과이고 수치도 같다(무기 종류만 다르다).
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「공명 에너지 6~10pt 획득」 자원 회복이라 피해식과 무관하다
  "21040084": [
    {
      label: "공명 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 16초간 (20초당 1회)",
    },
  ],

  // 천공의 역행 (권갑 ★4) — 별의 동반
  //
  // 「철갑」은 스택형인데 한 스택이 공격력·방어력 두 자리에 동시에 붙는다 — 두 줄로 나눈다.
  // 3~5% × 3스택 = 9~15%. 공명 해방 한 번에 3스택을 다 얻고 피격할 때마다 1스택씩 줄어든다.
  "21040064": [
    {
      label: "철갑 · 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.03, 0.035, 0.04, 0.045, 0.05], // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시 3스택 획득, 최대 3스택 (피해를 입을 때마다 1스택 감소)",
    },
    {
      label: "철갑 · 방어력",
      target: "defPercent",
      damageType: "All",
      values: [0.03, 0.035, 0.04, 0.045, 0.05], // 위와 같은 스택이 자리만 갈린 것
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시 3스택 획득, 최대 3스택 (피해를 입을 때마다 1스택 감소)",
    },
  ],

  // 전우의 의리 (권갑 ★4) — 출정의 의식
  //
  // 연무 검증에 쓴 무기다(공격력 174.49 / 방어력 40.28% at Lv.50).
  // 부옵션이 방어력 61.56%(Lv.90)라 방어력 배율 캐릭터용이다 — 대검 「장야의 불빛」과 같은 계열.
  "21040044": [
    {
      label: "변주 스킬 후 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 15초간",
    },
  ],

  // 만취의 영웅지 (권갑 ★4) — 수식
  //
  // 대검 「용서의 명상록」과 같은 이름의 효과이고 수치도 조건도 같다(무기 종류만 다르다).
  "21040094": [
    {
      label: "이상 효과 몬스터 타격 시 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08], // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "「이상 효과」가 있는 몬스터에게 피해를 입힐 시 1스택(1초당 1회), 최대 4스택 · 10초간",
    },
  ],

  // 거침없는 비상 (권갑 ★4) — 흑조(黑潮) 사냥의 맹세
  //
  // 대검 「금빛 하늘」과 같은 이름의 효과이고 수치도 같다. 두 번째 효과가 걸리는 자리만
  // 강공격 → 공명 해방으로 다르다.
  "21040104": [
    {
      label: "공명 해방 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.072, 0.111, 0.151, 0.19, 0.23],
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시, 15초간",
    },
    {
      label: "공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.108, 0.167, 0.226, 0.286, 0.345],
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시, 15초간",
    },
  ],

  // 21형 권갑 · 아이언 팬텀 (권갑 ★4) — 주도면밀
  //
  // 회피 반격은 damageType "DodgeCounter"로 걸린다 — appliesTo가 공격의 분류를 그대로 본다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「회피 반격 발동 시 HP 5~10% 회복(6초당 1회)」 회복이라 피해식과 무관하다
  "21040034": [
    {
      label: "회피·돌진 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "회피 또는 돌진 시, 8초간",
    },
    {
      label: "회피 반격 피해 증가",
      target: "damageBonus",
      damageType: "DodgeCounter",
      values: [0.5, 0.625, 0.75, 0.875, 1.0],
      uptime: "active",
      scope: "self",
      condition: "회피 또는 돌진 시, 8초간",
    },
  ],

  // 저무는 동녘 (대검 ★4) — 잠재력의 상한
  //
  // 스택형 — 3~6% × 4스택 = 12~24%.
  // 시간으로 쌓고 시간으로 리셋되는 구조(공명 스킬 후 12초 창 안에서 2초마다 1스택,
  // 4스택 도달 6초 뒤 전체 리셋)라 유지 구간이 짧다. 엔진이 시간을 다루지 않아 condition에만 적는다.
  "21010064": [
    {
      label: "공명 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.03, 0.0375, 0.045, 0.0525, 0.06], // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition:
        "공명 스킬 발동 후 12초 내에 2초마다 1스택, 최대 4스택 (12초당 1회 발동, 4스택 도달 6초 뒤 전체 리셋)",
    },
  ],

  // 장야의 불빛 (대검 ★4) — 만반의 준비
  //
  // 부옵션이 방어력 61.56%인 방어력 캐릭터용 무기다(연무 검증에 쓴 전우의 의리와 같은 계열).
  // 조건이 같은 두 효과지만 붙는 자리가 달라(공격력% · 방어력%) 각각 한 줄로 적는다.
  "21010044": [
    {
      label: "변주 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 15초간",
    },
    {
      label: "변주 스킬 후 방어력",
      target: "defPercent",
      damageType: "All",
      values: [0.15, 0.1875, 0.225, 0.2625, 0.3],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 15초간",
    },
  ],

  // 용서의 명상록 (대검 ★4) — 수식
  //
  // 스택형 — 4~8% × 4스택 = 16~32%.
  "21010094": [
    {
      label: "이상 효과 몬스터 타격 시 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08], // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "「이상 효과」가 있는 몬스터에게 피해를 입힐 시 1스택(1초당 1회), 최대 4스택 · 10초간",
    },
  ],

  // 멸망의 주파수 (대검 ★4) — 피안의 눈동자
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「공명 에너지 6~10pt 획득」 자원 회복이라 피해식과 무관하다
  "21010084": [
    {
      label: "공명 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 16초간 (20초당 1회)",
    },
  ],

  // 금빛 하늘 (대검 ★4) — 흑조(黑潮) 사냥의 맹세
  //
  // 조건이 같은 두 효과지만 붙는 자리가 달라(공격력% · 강공격 피해 보너스) 각각 한 줄로 적는다.
  "21010104": [
    {
      label: "공명 해방 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.072, 0.111, 0.151, 0.19, 0.23],
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시, 15초간",
    },
    {
      label: "공명 해방 후 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.108, 0.167, 0.226, 0.286, 0.345],
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시, 15초간",
    },
  ],

  // 가을의 무늬 (대검 ★4) — 검이 가리키는 곳
  //
  // 스택형 — 4~12.8% × 5스택 = 20~64%. 본인에게 걸리는 무기 효과라 statGroup은 panel이다.
  "21010074": [
    {
      label: "일반·강공격 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.04, 0.062, 0.084, 0.106, 0.128], // 스택 1개당
      stacks: 5,
      maxStacks: 5,
      uptime: "active",
      scope: "self",
      condition: "일반 공격이나 강공격으로 피해를 입힐 시 1스택(1초당 1회), 최대 5스택 · 7초간",
    },
  ],

  // 41형 대검 · 무거운 책임 (대검 ★4) — 포용의 힘
  //
  // HP 조건은 엔진이 판정하지 못해 조건부로 두고 사람이 켠다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「HP 40~80% 이하에서 일반·강공격 시 HP 5~10% 회복(8초당 1회)」 회복이라 피해식과 무관하다
  "21010034": [
    {
      label: "HP 80% 이상일 때 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "active",
      scope: "self",
      condition: "HP가 80% 이상일 때",
    },
  ],

  // 흔들리지 않는 용기 (직검 ★5) — 웃음 바다
  //
  // 상시 효과가 공격력%가 아니라 크리티컬 확률인 드문 무기다.
  // 일반 공격 피해 보너스가 두 줄인데 조건과 지속이 달라(공명 해방 후 10초 / 일반 공격 후 4초)
  // 따로 켜고 끌 수 있어야 한다. 이름이 다른 효과라 동시에 걸리면 합산된다.
  "21020036": [
    {
      label: "크리티컬 확률 증가",
      target: "critRate",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 해방 후 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 후, 10초간",
    },
    {
      label: "일반 공격 후 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "self",
      condition: "일반 공격으로 피해를 입힐 시, 4초간",
    },
  ],

  // 혈맹의 약속 (직검 ★5) — 화음 공진
  //
  // 두 번째는 「방랑자 · 기류」 전용 효과다 — 다른 캐릭터가 끼면 발동하지 않는다.
  // 엔진이 캐릭터 조건을 판정하지 못하므로 condition에 적고 조건부로 둔다.
  // 부스트 그룹이며 대상이 등장 캐릭터라 scope는 party다.
  "21020046": [
    {
      label: "치료 시 공명 스킬 피해 증가",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.1, 0.14, 0.18, 0.22, 0.26],
      uptime: "active",
      scope: "self",
      condition: "치료 효과 발동 시, 6초간",
    },
    {
      label: "방랑자 · 기류 전용 · 파티 기류 피해 부스트",
      target: "boost",
      damageType: "Aero",
      values: [0.1, 0.14, 0.18, 0.22, 0.26],
      uptime: "active",
      scope: "party", // 근처 파티 내 등장 캐릭터
      condition: "「방랑자 · 기류」가 공명 스킬 · 허무맹랑 발동 시, 30초간 (다른 캐릭터는 발동 불가)",
    },
  ],

  // 푸른 의지 (직검 ★5) — 굳건한 의지
  //
  // 「파죽」은 스택형 — 30~60% × 2스택 = 60~120%.
  // 스택 조건이 까다롭다(변주/일반 공격 후 10초 내 에코 어빌리티, 같은 에코는 1회, 10초당 1회)
  // — 전부 condition에 적는다. 바다의 속삭임의 「부드러운 꿈」과 같은 계열이다.
  "21020066": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "파죽 · 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.3, 0.375, 0.45, 0.525, 0.6], // 스택 1개당
      stacks: 2,
      maxStacks: 2,
      uptime: "active",
      scope: "self",
      condition:
        "변주 스킬 혹은 일반 공격 후 10초 내에 에코 어빌리티 발동 시 1스택(같은 이름의 에코는 1회, 10초당 1회), 최대 2스택 · 12초간 (캐릭터 전환 시 즉시 종료)",
    },
    {
      label: "파티 에코 어빌리티 피해 보너스",
      target: "damageBonus",
      damageType: "Echo",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "party", // 파티 내 캐릭터 전원
      condition: "변주 스킬 발동 시, 30초간 (중첩 불가)",
    },
  ],

  // 천년의 회류 (직검 ★5) — 무한의 소용돌이
  //
  // 공격력은 스택형 — 6~12% × 2스택 = 12~24%. 본인에게 걸리는 무기 효과라 statGroup은 panel이다.
  // stats.ts 주석의 검증 사례(단근 Lv90 + 이 무기 Lv90)에 쓰인 그 무기다.
  //
  // 공명 효율은 피해식에 들어가지 않지만 스탯창에는 찍히는 값이라 한 줄로 넣어 둔다.
  "21020015": [
    {
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      values: [0.128, 0.16, 0.192, 0.224, 0.256],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 스킬 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.06, 0.075, 0.09, 0.105, 0.12], // 스택 1개당
      stacks: 2,
      maxStacks: 2,
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시 1스택, 최대 2스택 · 10초간",
    },
  ],

  // 옥빛 구름 (직검 ★5) — 벽사
  //
  // 기류 피해 보너스는 스택형 — 11.2~22.4% × 5스택 = 56~112%.
  // 5스택에 도달하면 지속 시간이 2초 → 30초로 늘고 방어력 무시가 추가로 열린다.
  // 시간 연장은 수치를 바꾸지 않아 condition에만 적고, 방어력 무시만 한 줄로 뺀다.
  "21020106": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "기류 피해 보너스",
      target: "damageBonus",
      damageType: "Aero",
      values: [0.112, 0.14, 0.168, 0.196, 0.224], // 스택 1개당
      stacks: 5,
      maxStacks: 5,
      uptime: "active",
      scope: "self",
      condition:
        "「조화 밀집 · 이탈」 추가 후 1스택(0.5초당 1회), 최대 5스택 · 2초간 (5스택 도달 시 지속 30초로 연장)",
    },
    {
      label: "5스택 시 기류 방어력 무시",
      target: "defIgnore",
      damageType: "Aero",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "위 효과가 5스택에 도달한 뒤 지속되는 동안",
    },
  ],

  // 아득히 푸른 하늘 (직검 ★5) — 홀로 솟은 깃
  //
  // 조건이 같은 두 효과지만 붙는 자리가 달라(부스트 · 방어력 무시) 각각 한 줄로 적는다.
  "21020096": [
    {
      label: "전체 속성 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "강공격 피해 부스트",
      target: "boost",
      damageType: "Heavy",
      values: [0.36, 0.45, 0.54, 0.63, 0.72],
      uptime: "active",
      scope: "self",
      condition: "암흑 효과 추가 후, 8초간",
    },
    {
      label: "강공격 방어력 무시",
      target: "defIgnore",
      damageType: "Heavy",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "active",
      scope: "self",
      condition: "암흑 효과 추가 후, 8초간",
    },
  ],

  // 숙명에 맞서는 관 (직검 ★5) — 자유기사의 독무
  //
  // 부스트 쪽은 조건이 한 겹 더 깊다 — 15초 창 안이면서 목표가 풍식 효과를 들고 있어야 한다.
  // 「목표에게 입히는 피해」라 분류를 가리지 않으므로 damageType은 All이다.
  "21020056": [
    {
      label: "HP 증가",
      target: "hpPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "방어력 무시",
      target: "defIgnore",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 혹은 일반 공격 발동 후 15초 내",
    },
    {
      label: "풍식 효과 보유 목표에게 피해 부스트",
      target: "boost",
      damageType: "All",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "self",
      condition: "위 15초 창 안에서, 목표가 1스택 이상의 풍식 효과를 보유했을 때",
    },
  ],

  // 솟아오르는 화염 (직검 ★5) — 불사조의 깃털
  //
  // 「빛나는 깃털」은 스택형 — 4~8% × 14스택 = 56~112%. 지금까지 나온 무기 중 스택 수가 가장 많다.
  // 쌓는 절차(피해 시 0.5초당 1스택, 공명 스킬 발동 시 +5스택)와
  // 14스택 도달 12초 뒤 전체 리셋은 엔진이 시간을 다루지 않아 condition에만 남긴다.
  "21020016": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "빛나는 깃털 · 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.04, 0.05, 0.06, 0.07, 0.08], // 스택 1개당
      stacks: 14,
      maxStacks: 14,
      uptime: "active",
      scope: "self",
      condition:
        "피해를 입힐 시 1스택(0.5초당 1회), 공명 스킬 발동 시 추가 5스택, 최대 14스택 (14스택 도달 12초 후 전체 리셋)",
    },
  ],

  // 서린 불꽃 (직검 ★5) — 다시는 나란 존재가 없기를
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「서리 효과 피해 20~40% 부스트」 BuffDamageType에 「서리 효과」 자리가 없다.
  //   응결(Glacio)로 뭉뚱그리면 이 캐릭터의 다른 응결 피해까지 같이 부스트돼 과대평가된다
  //   (불빛의 심판의 「광학 효과」와 같은 이유).
  "21020086": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "응결 피해 부스트",
      target: "boost",
      damageType: "Glacio",
      values: [0.28, 0.35, 0.42, 0.49, 0.56],
      uptime: "active",
      scope: "self",
      condition: "서리 효과 추가 후, 6초간 (같은 이름은 더 높은 수치가 적용)",
    },
    {
      label: "공명 해방 방어력 무시",
      target: "defIgnore",
      damageType: "Liberation",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "서리 효과 추가 후, 6초간",
    },
    {
      // 앞의 응결 피해 부스트(Glacio)와는 다른 것이다 — 이쪽은 「서리 효과」가 입히는
      // 이상 피해 자체를 키운다. 걸리는 자리가 아예 다르므로 따로 한 줄로 적는다.
      label: "서리 효과 피해 부스트",
      target: "anomalyBoost",
      damageType: "FrostChafe",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "party", // 「일정 범위 내의 목표가 받는」 — 누가 붙인 서리든 세진다
      condition: "자신이 파티 내 등장 캐릭터일 때, 6초간 (같은 이름은 더 높은 수치가 적용)",
    },
  ],

  // 레이저 변형 (직검 ★5) — 선지자
  //
  // 에너지 절단(대검)과 같은 「조화 밀집 · 간섭」 계열이고, 걸리는 자리만 공명 스킬로 다르다.
  "21020045": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.24, 0.27, 0.3, 0.33, 0.36],
      uptime: "active",
      scope: "self",
      condition: "「조화 밀집 · 간섭」 상태의 목표에게 피해를 입힌 후, 3초간 (중복 시 지속 시간 리셋)",
    },
  ],

  // 날카로운 봄 (직검 ★5) — 시작과 끝
  //
  // 일반 공격 피해 보너스가 두 줄인데 조건이 다르다 — 하나는 일반 공격으로 쌓는 스택
  // (10~20% × 3스택 = 30~60%), 다른 하나는 협주 에너지를 쓸 때 붙는 별도 증가분이다.
  // 이름이 다른 효과라 동시에 걸리면 합산된다.
  "21020026": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.1, 0.125, 0.15, 0.175, 0.2], // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "일반 공격으로 피해를 입힐 시 1스택(1초당 1회), 최대 3스택 · 14초간",
    },
    {
      label: "협주 에너지 소모 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.4, 0.5, 0.6, 0.7, 0.8],
      uptime: "active",
      scope: "self",
      condition: "협주 에너지 소모 시, 10초간 (1초당 1회, 캐릭터 전환 시 즉시 종료)",
    },
  ],

  // 프리즈 프레임 (증폭기 ★5) — 페이드 아웃
  //
  // 원문이 「서리 효과 추가 후 …」 한 문장에 두 효과를 이어 붙였다 — 파티 공격력도 같은 조건에서
  // 열리는 것으로 읽고 condition을 같이 적는다(지속 시간만 12초 / 30초로 다르다).
  // 파티에 거는 공격력%라 statGroup은 buff다.
  "21050086": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "응결 피해 보너스",
      target: "damageBonus",
      damageType: "Glacio",
      values: [0.3, 0.375, 0.45, 0.525, 0.6],
      uptime: "active",
      scope: "self",
      condition: "서리 효과 추가 후, 12초간",
    },
    {
      label: "파티 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "party", // 파티 내 캐릭터 전원
      statGroup: "buff",
      condition: "서리 효과 추가 후, 30초간 (중첩 불가)",
    },
  ],

  // 파도의 기록 (증폭기 ★5) — 끝없는 물결
  //
  // 스택형 — 3.2~6.4% × 5스택 = 16~32%.
  //
  // 공명 효율은 피해식에 들어가지 않지만 스탯창에는 찍히는 값이라 한 줄로 넣어 둔다.
  "21050015": [
    {
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      values: [0.128, 0.16, 0.192, 0.224, 0.256],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.032, 0.04, 0.048, 0.056, 0.064], // 스택 1개당
      stacks: 5,
      maxStacks: 5,
      uptime: "active",
      scope: "self",
      condition: "일반 공격으로 피해를 입힐 시 1스택(0.5초당 1회), 최대 5스택 · 8초간",
    },
  ],

  // 잊혀진 피안의 슬픈 악장 (증폭기 ★5) — 진혼곡
  //
  // 에코 어빌리티 한 번으로 세 효과가 같이 열린다. 조건은 같지만 붙는 자리가 전부 달라
  // (피해증가 · 부스트 · 방어력 무시) 각각 한 줄로 적는다.
  "21050066": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.32, 0.4, 0.48, 0.56, 0.64],
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 피해를 입힌 후, 12초간",
    },
    {
      label: "에코 어빌리티 피해 부스트",
      target: "boost",
      damageType: "Echo",
      values: [0.32, 0.4, 0.48, 0.56, 0.64],
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 피해를 입힌 후, 12초간",
    },
    {
      label: "방어력 무시",
      target: "defIgnore",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 피해를 입힌 후, 12초간",
    },
  ],

  // 위조된 작은별 (증폭기 ★5) — 적막
  //
  // 파티 공격력은 위 공명 해방 버프가 걸려 있는 동안에만 열려 조건이 한 겹 더 깊다.
  // 남의 스탯창에는 들어갈 수 없는 값이라 statGroup은 buff다.
  "21050076": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.36, 0.45, 0.54, 0.63, 0.72],
      uptime: "active",
      scope: "self",
      condition: "불꽃 효과 혹은 「조화 밀집 · 이탈」 추가 후, 5초간",
    },
    {
      label: "파티 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "party", // 조건을 만족한 그 캐릭터에게 걸린다
      statGroup: "buff",
      condition:
        "위 효과가 걸려 있는 동안 파티 내 캐릭터가 불꽃 효과 혹은 「조화 밀집 · 이탈」 추가 시, 15초간 (중첩 불가)",
    },
  ],

  // 옥수 비단 (증폭기 ★5) — 그림 외의 경지
  //
  // 두 효과는 「출전 / 미출전」이라 한 공격에 동시에 성립할 수 없다 — exclusiveGroup으로 묶어
  // 하나를 켜면 다른 쪽이 꺼지게 한다.
  // 앞의 것은 스택형(12~24% × 3스택), 뒤의 것은 그 3스택을 소모해 얻는 큰 한 방이다.
  "21050026": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "출전 중 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.12, 0.15, 0.18, 0.21, 0.24], // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      exclusiveGroup: "옥수 비단 · 출전 상태",
      condition: "출전 상태에서 공명 스킬 발동 시 1스택, 최대 3스택 · 6초간",
    },
    {
      label: "미출전 중 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.52, 0.65, 0.78, 0.91, 1.04],
      uptime: "active",
      scope: "self",
      exclusiveGroup: "옥수 비단 · 출전 상태",
      condition: "3스택 상태에서 반주 스킬 발동 시 전 스택을 소모, 미출전 상태에서 27초간",
    },
  ],

  // 보손 관측기 (증폭기 ★5) — 관측자
  //
  // 위상의 파동과 같은 「조화도 파괴」 계열이다 — 조건은 파티원이 만들어주고 효과는 자신에게 걸린다.
  // 조건이 같은 두 효과지만 붙는 자리가 달라(공격력% · 일반 공격 피해 보너스) 각각 한 줄로 적는다.
  "21050045": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "조화도 파괴 후 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.135, 0.15, 0.165, 0.18],
      uptime: "active",
      scope: "self",
      condition: "파티 내 캐릭터가 「조화도 파괴 스킬」을 발동한 후, 14초간",
    },
    {
      label: "조화도 파괴 후 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.12, 0.135, 0.15, 0.165, 0.18],
      uptime: "active",
      scope: "self",
      condition: "파티 내 캐릭터가 「조화도 파괴 스킬」을 발동한 후, 14초간",
    },
  ],

  // 바다의 속삭임 (증폭기 ★5) — 바닷속에서
  //
  // 「부드러운 꿈」은 스택마다 같은 값이 쌓이는 게 아니라 스택 수가 문턱이 되어 다른 효과가 열린다.
  //   1스택 → 일반 공격 피해 보너스   2스택 → 인멸 저항 무시
  // 그래서 maxStacks로 묶지 않고 문턱별로 한 줄씩 적는다(2스택이면 둘 다 걸린다).
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   스택을 얻는 절차(변주/일반 공격 후 10초 내 에코 어빌리티, 같은 에코는 1회, 10초당 1회)
  //   다른 캐릭터로 전환 시 즉시 종료
  "21050056": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "부드러운 꿈 1스택 · 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.4, 0.5, 0.6, 0.7, 0.8],
      uptime: "active",
      scope: "self",
      condition: "「부드러운 꿈」 1스택 이상일 때, 10초간",
    },
    {
      label: "부드러운 꿈 2스택 · 인멸 저항 무시",
      target: "resPen",
      damageType: "All",
      element: "Havoc",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "active",
      scope: "self",
      condition: "「부드러운 꿈」이 2스택일 때, 10초간",
    },
  ],

  // 뭇별의 교향곡 (증폭기 ★5) — 뭇별의 법칙
  //
  // 노을에 깃든 이슬과 같은 힐러용 구성이다. 파티에 거는 공격력%라 statGroup은 buff.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「공명 해방 발동 시 협주 에너지 8~16pt 회복(20초당 1회)」 자원 회복이라 피해식과 무관하다
  "21050036": [
    {
      label: "HP 증가",
      target: "hpPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "치료 시 파티 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.14, 0.175, 0.21, 0.245, 0.28],
      uptime: "active",
      scope: "party", // 근처 파티 내 모든 캐릭터
      statGroup: "buff",
      condition: "공명 스킬로 치료 효과 발동 시, 30초간 (중첩 불가)",
    },
  ],

  // 노을에 깃든 이슬 (증폭기 ★5) — 비녀에 깃든 봄
  //
  // 「물들은 하얀 눈」·「생생한 잔물결」은 그 자체로 수치가 없는 표식이라 버프로 옮기지 않는다.
  // 둘을 동시에 들고 있을 때 열리는 파티 공격력만 계산에 들어가고, 얻는 절차는 condition에 적는다.
  // 파티에 거는 공격력%라 statGroup은 buff다 — 남의 스탯창에는 들어갈 수 없다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「공명 해방 발동 시 협주 에너지 8~16pt 회복(20초당 1회)」 자원 회복이라 피해식과 무관하다
  "21050096": [
    {
      label: "HP 증가",
      target: "hpPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "파티 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "party", // 근처 파티 내 모든 캐릭터
      statGroup: "buff",
      condition:
        "「물들은 하얀 눈」(서리 효과 추가)과 「생생한 잔물결」(치료 효과 제공)을 동시에 보유한 동안 (각 6초, 중첩 불가)",
    },
  ],

  // 꼭두각시의 손 (증폭기 ★5) — 뇌전의 증폭
  //
  // 공격력%가 두 줄인데 조건이 다르다 — 하나는 공명 스킬로 쌓는 스택(12~24% × 2스택),
  // 다른 하나는 미출전 상태에서만 붙는 별도 증가분이다. 둘 다 본인에게 걸리는 무기 효과라
  // statGroup은 기본값(panel)을 그대로 쓴다.
  "21050016": [
    {
      label: "전체 속성 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 스킬 피해 시 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24], // 스택 1개당
      stacks: 2,
      maxStacks: 2,
      uptime: "active",
      scope: "self",
      condition: "공명 스킬로 피해를 입힐 시 1스택, 최대 2스택 · 5초간",
    },
    {
      label: "미출전 시 공격력 추가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "active",
      scope: "self",
      condition: "자신이 미출전 상태일 때",
    },
  ],

  // 광휘의 찬송가 (증폭기 ★5) — 단결자의 찬가
  //
  // 「일반 공격, 강공격 피해 보너스」는 damageType이 하나뿐이라 두 줄로 나눈다.
  // 같은 효과가 갈라진 것이라 스택도 함께 움직인다 — 둘 다 같은 스택으로 두고 쓴다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「광학 효과」 피해 30~60% 부스트. BuffDamageType에 「광학 효과」 자리가 없다
  //   (불빛의 심판과 같은 이유 — 회절로 뭉뚱그리면 다른 회절 피해까지 부스트된다).
  "21050046": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.14, 0.175, 0.21, 0.245, 0.28], // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "「광학 효과」가 있는 목표에게 피해를 입힐 시 1스택, 최대 3스택 · 6초간",
    },
    {
      label: "강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.14, 0.175, 0.21, 0.245, 0.28], // 위와 같은 효과가 분류만 갈린 것
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "「광학 효과」가 있는 목표에게 피해를 입힐 시 1스택, 최대 3스택 · 6초간",
    },
    {
      // 앞의 두 줄과 달리 이건 파티 전원에게 걸리는 이상 효과 부스트다.
      // 「파티 내 등장 캐릭터 주변의 목표에게 주는」 — 누가 붙인 광학이든 다 세진다.
      label: "파티 광학 효과 피해 부스트",
      target: "anomalyBoost",
      damageType: "SpectroFrazzle",
      values: [0.3, 0.375, 0.45, 0.525, 0.6],
      uptime: "active",
      scope: "party",
      condition: "반주 스킬 발동 시, 30초간 (같은 이름의 효과는 중첩 불가)",
    },
  ],

  // 죽음과 춤 (권총 ★5) — 침묵 속의 추도사
  "21030016": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.48, 0.6, 0.72, 0.84, 0.96],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 혹은 공명 해방 발동 시, 5초간",
    },
  ],

  // 위상의 파동 (권총 ★5) — 통찰자
  //
  // 발동 조건은 파티원이 만들어주지만 효과는 「자신의」 피해 보너스라 scope는 self다.
  "21030045": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "전체 속성 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      values: [0.2, 0.225, 0.25, 0.275, 0.3],
      uptime: "active",
      scope: "self",
      condition: "파티 내 캐릭터가 「조화도 파괴 스킬」을 발동한 후, 14초간",
    },
  ],

  // 얽혀진 빛과 그림자 (권총 ★5) — 불의 귀환
  //
  // 물결의 파동처럼 두 효과가 서로를 먹여주는 꼴인데, 이쪽은 피해증가가 아니라 부스트다.
  // 「단일 공격으로 최대 24~48%」는 두 부스트가 같은 공격에 겹쳐 쌓이지 않는다는 뜻이라
  // 배타 관계로 보고 각각 한 줄씩만 둔다 — 강공격에는 두 번째 줄이, 에코에는 첫 줄이 걸린다.
  // 세 번째 방어력 무시는 두 부스트를 동시에 들고 있을 때만 열려 조건이 한 겹 더 깊다.
  "21030036": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "강공격 피해 부스트",
      target: "boost",
      damageType: "Heavy",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 피해를 입힌 후, 6초간",
    },
    {
      label: "에코 어빌리티 피해 부스트",
      target: "boost",
      damageType: "Echo",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "self",
      condition: "강공격으로 피해를 입힌 후, 6초간",
    },
    {
      label: "방어력 무시",
      target: "defIgnore",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "위 두 부스트를 동시에 보유한 동안",
    },
  ],

  // 스펙트럼 블래스터 (권총 ★5) — 출석 면제 프로토콜
  //
  // 파티 피해 증가는 스택형 — 8~16% × 3스택 = 24~48%.
  // 「입히는 피해 증가」는 분류를 가리지 않으므로 damageType은 All이다.
  "21030046": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.36, 0.45, 0.54, 0.63, 0.72],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 혹은 일반 공격으로 목표 명중 시, 4초간",
    },
    {
      label: "파티 피해 증가",
      target: "damageBonus",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16], // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "party", // 파티 내 캐릭터 전원
      condition:
        "일반 공격 스킬 발동 중 목표에게 「조화 파동 · 이탈」 또는 「조화 밀집 · 이탈」 추가 시 1스택, 최대 3스택 · 30초간 (중첩 불가)",
    },
  ],

  // 스펙트럴 트리거 (권총 ★5) — 가라앉은 꿈
  //
  // 회절 피해 보너스는 스택형 — 20~40% × 2스택 = 40~80%.
  // 「해킹 · 이탈」로 열리는 두 효과는 조건이 같지만 붙는 자리가 달라(부스트 · 방어력 무시)
  // 각각 한 줄로 적는다. 한낮의 의지와 같은 꼴이다.
  "21030056": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "회절 피해 보너스",
      target: "damageBonus",
      damageType: "Spectro",
      values: [0.2, 0.25, 0.3, 0.35, 0.4], // 스택 1개당
      stacks: 2,
      maxStacks: 2,
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시 1스택, 최대 2스택 · 14초간",
    },
    {
      label: "강공격 피해 부스트",
      target: "boost",
      damageType: "Heavy",
      values: [0.3, 0.375, 0.45, 0.525, 0.6],
      uptime: "active",
      scope: "self",
      condition: "적에게 「해킹 · 이탈」을 추가할 때마다, 14초간",
    },
    {
      label: "강공격 방어력 무시",
      target: "defIgnore",
      damageType: "Heavy",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "적에게 「해킹 · 이탈」을 추가할 때마다, 14초간",
    },
  ],

  // 스컬 스래셔 (권총 ★5) — 홀로 깨어난 자
  //
  // 일반 공격 피해 보너스가 두 줄인 이유 — 발동 조건(변주 스킬 / 「해킹 · 이탈」 추가)이 서로 달라
  // 따로 켜고 끌 수 있어야 한다. 이름이 다른 효과라 동시에 걸리면 합산된다.
  // 파티 공격력은 남의 스탯창에 못 들어가므로 statGroup을 buff로 적는다(부동의 안개와 같은 이유).
  "21030066": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "변주 스킬 후 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시, 14초간",
    },
    {
      label: "해킹 · 이탈 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "active",
      scope: "self",
      condition: "「해킹 · 이탈」 추가 시, 14초간 (중첩 불가)",
    },
    {
      label: "해킹 · 이탈 시 파티 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "party", // 파티 내 캐릭터 전원
      statGroup: "buff",
      condition: "「해킹 · 이탈」 추가 시, 30초간 (중첩 불가)",
    },
  ],

  // 숲속의 아리아 (권총 ★5) — 한여름의 찬송가
  //
  // 세 번째는 「목표의 기류 저항 감소」다. resReduction은 저항 무시(resPen)와 합연산으로 더해진 뒤
  // 적 저항에서 한 번에 빠진다 — element로 기류만 걸리게 한다. 적에게 거는 디버프라 scope는 party다.
  "21030026": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "기류 피해 보너스",
      target: "damageBonus",
      damageType: "Aero",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "self",
      condition: "목표에게 「풍식 효과」를 추가한 후, 10초간",
    },
    {
      label: "목표 기류 저항 감소",
      target: "resReduction",
      damageType: "All",
      element: "Aero",
      values: [0.1, 0.115, 0.13, 0.145, 0.16],
      uptime: "active",
      scope: "party",
      condition: "「풍식 효과」가 있는 목표를 공격으로 명중 시, 20초간 (중첩 불가)",
    },
  ],

  // 부동의 안개 (권총 ★5) — 지옥의 징벌
  //
  // 「등장 캐릭터의 공격력」이라 무기를 낀 본인이 아니라 그때 나와 있는 캐릭터에게 걸린다.
  // 남의 스탯창에는 들어갈 수 없는 값이므로 statGroup을 buff로 적는다
  //   — 무기 효과의 기본값(panel)을 그대로 두면 스탯창 단계에서 곱해져 값이 어긋난다.
  //
  // 공명 효율은 피해식에 들어가지 않지만 스탯창에는 찍히는 값이라 한 줄로 넣어 둔다.
  "21030015": [
    {
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      values: [0.128, 0.16, 0.192, 0.224, 0.256],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "반주 스킬 후 등장 캐릭터 공격력",
      target: "atkPercent",
      damageType: "All",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "party", // 무기를 낀 본인이 아니라 그때의 등장 캐릭터
      statGroup: "buff",
      condition: "반주 스킬 발동 후, 14초간 (중첩 불가)",
    },
  ],

  // 희비극 (권갑 ★5) — 우인의 노래
  "21040026": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.48, 0.6, 0.72, 0.84, 0.96],
      uptime: "active",
      scope: "self",
      condition: "일반 공격 혹은 변주 스킬 발동 시, 3초간",
    },
  ],

  // 한낮의 의지 (권갑 ★5) — 봉합된 새벽과 황혼
  //
  // 「조화 밀집 · 이탈」 추가로 열리는 두 효과는 조건이 같지만 붙는 자리가 달라(부스트 · 방어력 무시)
  // 각각 한 줄로 적는다. 두 번째 것은 「부스트」라 damageBonus가 아니라 boost다.
  "21040056": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "회절 피해 보너스",
      target: "damageBonus",
      damageType: "Spectro",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "self",
      condition: "일반 공격으로 피해를 입힌 후, 4초간",
    },
    {
      label: "일반 공격 피해 부스트",
      target: "boost",
      damageType: "Basic",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "self",
      condition: "적에게 「조화 밀집 · 이탈」을 추가한 후, 6초간",
    },
    {
      label: "일반 공격 방어력 무시",
      target: "defIgnore",
      damageType: "Basic",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "적에게 「조화 밀집 · 이탈」을 추가한 후, 6초간",
    },
  ],

  // 팔방의 천추 (권갑 ★5) — 근원의 추적
  //
  // 연장(공명 스킬로 5초씩 최대 3회)은 지속 시간만 늘릴 뿐 수치를 바꾸지 않는다.
  // 엔진이 시간을 다루지 않으므로 스택으로 옮기지 않고 condition에만 적는다.
  "21040016": [
    {
      label: "전체 속성 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.48, 0.6, 0.72, 0.84, 0.96],
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시, 8초간 (공명 스킬 발동마다 5초 연장, 최대 3회)",
    },
  ],

  // 솔스원의 해석 (권갑 ★5) — 근일점
  //
  // 두 번째 효과는 「부스트」다 — 피해증가와 별개인 독립 곱연산 그룹이라 target이 다르다.
  // damage.ts의 categoryBoost는 에코 부스트 칸이 없지만, 이 버프는 appliesTo가 에코 공격만
  // 걸러낸 뒤 allBoost에 얹히므로 결과는 같다.
  // 세 번째는 속성 조건이라 damageType에 속성(Aero)을 적는다 — 기류 공격에만 걸린다.
  "21040066": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "에코 어빌리티 피해 부스트",
      target: "boost",
      damageType: "Echo",
      values: [0.32, 0.4, 0.48, 0.56, 0.64],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 혹은 에코 어빌리티 발동 시, 15초간",
    },
    {
      label: "기류 피해 방어력 무시",
      target: "defIgnore",
      damageType: "Aero",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 피해를 입힌 후, 6초간",
    },
  ],

  // 세상 만물의 진리 (권갑 ★5) — 만물을 연결하는 달
  //
  // 천둥벼락을 다스리는 권능과 같은 꼴인데, 걸리는 자리가 강공격이 아니라 공명 해방이다.
  // 방어력 무시는 스택형 — 7.2~12% × 5스택 = 36~60%.
  // 변주 스킬을 쓰면 그 스택이 곧바로 최대치로 간주되므로, 5스택으로 두고 계산하면 된다.
  "21040046": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 해방 피해 증가",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 혹은 공명 해방 발동 시, 15초간",
    },
    {
      label: "공명 해방 방어력 무시",
      target: "defIgnore",
      damageType: "Liberation",
      values: [0.072, 0.084, 0.096, 0.108, 0.12], // 스택 1개당
      stacks: 5,
      maxStacks: 5,
      uptime: "active",
      scope: "self",
      condition:
        "실드 획득 시 1스택(0.5초당 1회), 최대 5스택 · 7초간 / 변주 스킬 발동 시 3초간 최대 스택으로 간주",
    },
  ],

  // 불빛의 심판 (권갑 ★5) — 어둠을 파괴하는 자
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「광학 효과」 피해 50~100% 부스트. target은 "boost"로 맞지만 damageType에 자리가 없다
  //   — BuffDamageType은 All · 공격 분류 · 속성뿐이고 「광학 효과」는 그 어느 쪽도 아닌
  //   별도의 피해 판정이다. 회절(Spectro)로 뭉뚱그리면 이 캐릭터의 다른 회절 피해까지
  //   같이 부스트돼 과대평가된다. 「광학 효과」를 공격 데이터에 분류로 넣은 뒤에 옮길 것.
  "21040036": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "방어력 무시",
      target: "defIgnore",
      damageType: "All",
      values: [0.08, 0.1, 0.12, 0.14, 0.16],
      uptime: "active",
      scope: "self",
      condition: "일반 공격 발동 시, 6초간 (중복 획득 시 지속 시간 리셋)",
    },
    {
      // 방어력 무시와 같은 조건에 딸린 두 번째 효과다. 이쪽은 이상 효과 피해에만 걸리므로
      // 일반 피해의 boost가 아니라 이상 전용 부스트 자리에 담는다.
      label: "광학 효과 피해 부스트",
      target: "anomalyBoost",
      damageType: "SpectroFrazzle",
      values: [0.5, 0.625, 0.75, 0.875, 1.0],
      uptime: "active",
      scope: "self", // 「자신이 직접 입히는」
      condition: "일반 공격 발동 시, 6초간 (자신이 직접 입히는 광학 효과 피해)",
    },
  ],

  // 물결의 파동 (권갑 ★5) — 죽음의 심연
  //
  // 두 효과가 서로를 먹여준다 — 공명 스킬로 때리면 일반 공격이, 일반 공격으로 때리면 공명 스킬이
  // 세진다. 걸리는 자리가 달라 동시에 성립하므로 두 줄로 나눠 적는다.
  //
  // 공명 효율은 피해식에 들어가지 않지만 스탯창에는 찍히는 값이라 한 줄로 넣어 둔다.
  "21040015": [
    {
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      values: [0.128, 0.16, 0.192, 0.224, 0.256],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬로 피해를 입힌 후, 8초간",
    },
    {
      label: "공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.1, 0.125, 0.15, 0.175, 0.2],
      uptime: "active",
      scope: "self",
      condition: "일반 공격으로 피해를 입힌 후, 8초간",
    },
  ],

  // 격동의 조력 (권갑 ★5) — 돌파자
  //
  // 일반 공격 피해 보너스는 스택형이라 values에 스택 1개당 값을 적는다 — 6~9% × 4스택 = 24~36%.
  // 스택 조건(「조화 밀집 · 간섭」 목표 타격, 0.5초당 1회)과 3초 지속은 condition에만 남긴다.
  "21040045": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      values: [0.06, 0.067, 0.075, 0.082, 0.09], // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition:
        "「조화 밀집 · 간섭」 상태의 목표에게 피해를 입힌 후 1스택(0.5초당 1회), 최대 4스택 · 3초간 (중복 시 지속 시간 리셋)",
    },
  ],

  // 푸른물결의 빛 (대검 ★5) — 밀려오는 파도
  //
  // 공명 효율은 해방 회전율에만 영향을 주고 피해식에는 들어가지 않지만, 무기가 실제로 주는
  // 수치이고 스탯창에도 찍히므로 한 줄로 넣어 둔다(target: energyRegen).
  // 12.8~25.6%를 주는 다섯 무기 — 이 무기와 천년의 회류 · 파도의 기록 · 부동의 안개 · 물결의 파동 — 가 모두 같다.
  "21010015": [
    {
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      values: [0.128, 0.16, 0.192, 0.224, 0.256],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.07, 0.0875, 0.105, 0.1225, 0.14], // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시 1스택, 최대 3스택 · 12초간",
    },
  ],

  // 태평성대 (대검 ★5) — 신의 가호
  //
  // 「가호」와 「축복」은 수치도 지속 시간도 같지만 이름이 다른 별개의 효과라 서로 겹친다.
  // 그래서 스택 하나로 묶지 않고 두 줄로 나눠 적는다 — 둘 다 켜면 48~96%가 된다.
  "21010026": [
    {
      label: "전체 속성 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "가호 · 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 시 「가호」 획득, 12초간",
    },
    {
      label: "축복 · 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시 「축복」 획득, 12초간",
    },
  ],

  // 쿠모키리(曇斬) (대검 ★5) — 생명의 현
  //
  // 공명 해방 피해 보너스는 스택형이라 values에 스택 1개당 값을 적는다 — 8~16% × 3스택 = 24~48%.
  // 파티 버프는 그 스택이 최대치에 도달한 뒤에야 열리므로 조건이 한 겹 더 깊다.
  "21010056": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.08, 0.1, 0.12, 0.14, 0.16], // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 발동 혹은 「이상 효과」 추가 시 1스택, 최대 3스택 · 15초간",
    },
    {
      label: "파티 전체 속성 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "party", // 「이상 효과」를 추가한 파티원에게 걸린다
      condition: "위 스택이 3스택일 때 파티 내 캐릭터가 「이상 효과」 추가 시, 15초간 (중첩 불가)",
    },
  ],

  // 청룡의 천장 (대검 ★5) — 용맹무쌍
  //
  // 강공격 피해 보너스는 스택형이라 values에 스택 1개당 값을 적는다 — 24~48% × 2스택 = 48~96%.
  // 스택 조건(변주 스킬 또는 공명 해방 발동)과 14초 지속은 엔진이 다루지 못해 condition에만 남긴다.
  "21010016": [
    {
      label: "전체 속성 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.24, 0.3, 0.36, 0.42, 0.48], // 스택 1개당
      stacks: 2,
      maxStacks: 2,
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 또는 공명 해방 발동마다 1스택, 최대 2스택 · 14초간",
    },
  ],

  // 천둥벼락을 다스리는 권능 (대검 ★5) — 불타오른 권력
  //
  // 방어력 무시는 스택형이라 values에 스택 1개당 값을 적는다 — 7.2~12% × 5스택 = 36~60%.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   스택을 얻는 조건(실드 획득, 0.5초당 1회)과 지속 시간(15초 / 7초)
  "21010046": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "강공격 피해 증가",
      target: "damageBonus",
      damageType: "Heavy",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 혹은 공명 스킬 발동 시, 15초간",
    },
    {
      label: "실드 획득 시 강공격 방어력 무시",
      target: "defIgnore",
      damageType: "Heavy",
      values: [0.072, 0.084, 0.096, 0.108, 0.12], // 스택 1개당
      stacks: 5,
      maxStacks: 5,
      uptime: "active",
      scope: "self",
      condition: "실드 획득 시 1스택(0.5초당 1회), 최대 5스택 · 7초간",
    },
  ],

  // 에너지 절단 (대검 ★5) — 개척자
  "21010045": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.24, 0.27, 0.3, 0.33, 0.36],
      uptime: "active",
      scope: "self",
      condition: "「조화 밀집 · 간섭」 상태의 목표에게 피해를 입힌 후, 3초간 (중복 시 지속 시간 리셋)",
    },
  ],

  // 수많은 인도 (대검 ★5) — 혼을 부르고 별을 소환해
  //
  // 「봉천」·「포용」 둘 다 스택형이라 values에 스택 1개당 값을 적고 maxStacks로 상한을 준다.
  //   봉천 4~8% × 6스택 = 24~48% (원문 최대치와 일치)
  //   포용 15~25% × 2스택 = 30~50% (강공격이 한 번에 최대 2스택을 소모한다)
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   스택을 얻는 조건(변주 스킬 발동 · 실드 획득, 0.5초당 1회)과 7초 지속
  //   다른 캐릭터로 전환 시 스택 즉시 종료
  "21010076": [
    {
      label: "전체 속성 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "봉천 · 크리티컬 피해",
      target: "critDamage",
      damageType: "All",
      values: [0.04, 0.05, 0.06, 0.07, 0.08], // 스택 1개당
      stacks: 6,
      maxStacks: 6,
      uptime: "active",
      scope: "self",
      condition: "등장 캐릭터로 변주 스킬 발동 또는 실드 획득 시 1스택, 최대 6스택 · 7초",
    },
    {
      label: "봉천 6스택 · 강공격 크리티컬 확률",
      target: "critRate",
      damageType: "Heavy",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "active",
      scope: "self",
      condition: "「봉천」이 6스택에 도달했을 때",
    },
    {
      label: "포용 · 강공격 방어력 무시",
      target: "defIgnore",
      damageType: "Heavy",
      values: [0.15, 0.175, 0.2, 0.225, 0.25], // 소모하는 스택 1개당
      stacks: 2,
      maxStacks: 2,
      uptime: "active",
      scope: "self",
      condition: "강공격 발동 시 「포용」을 최대 2스택 소모, 2초간 지속",
    },
  ],

  // 불길 (대검 ★5) — 눈부신 불빛
  //
  // 지속 시간·연장 횟수(6초 / 4초 연장 / 최대 1회)는 엔진이 시간을 다루지 않아 수치로 옮기지 않고
  // condition에 적어만 둔다. 파티 용융 피해 보너스는 「연장에 성공」이 전제라 조건이 한 겹 더 깊다.
  "21010036": [
    {
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      label: "공명 해방 피해 증가",
      target: "damageBonus",
      damageType: "Liberation",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "self",
      condition: "변주 스킬 혹은 공명 해방 발동 시, 6초간 (강공격 명중으로 4초 1회 연장 가능)",
    },
    {
      label: "파티 용융 피해 보너스",
      target: "damageBonus",
      damageType: "Fusion",
      values: [0.24, 0.3, 0.36, 0.42, 0.48],
      uptime: "active",
      scope: "party", // 파티 내 캐릭터 전원
      condition: "위 효과를 강공격으로 연장하는 데 성공 시, 30초간",
    },
  ],

  // 별하늘 연산 측정기 (대검 ★5) — 운명의 해답
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「공명 스킬 발동 시 협주 에너지 8~16pt 회복(20초당 1회)」 자원 회복이라 피해식과 무관하다
  "21010066": [
    {
      label: "방어력 증가",
      target: "defPercent",
      damageType: "All",
      values: [0.16, 0.2, 0.24, 0.28, 0.32],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      // 치료 효과가 조건이라 엔진이 판정하지 못한다 — 조건부(active)로 두고 사람이 켠다.
      label: "치료 시 파티 크리티컬 피해",
      target: "critDamage",
      damageType: "All",
      values: [0.2, 0.25, 0.3, 0.35, 0.4],
      uptime: "active",
      scope: "party", // 근처 파티 내 모든 캐릭터
      condition: "치료 효과 발동 시, 4초간 (같은 이름의 효과는 중첩 불가)",
    },
  ],

  // 영원한 샛별 (직검 ★5) — 별을 좇아서
  "21020076": [
    {
      label: "전체 속성 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      values: [0.12, 0.15, 0.18, 0.21, 0.24],
      uptime: "passive", // 조건 없이 늘 걸린다
      scope: "self", // 이 무기를 낀 캐릭터에게만
    },
    {
      label: "공명 해방 방어력 무시",
      target: "defIgnore",
      damageType: "Liberation",
      values: [0.32, 0.4, 0.48, 0.56, 0.64],
      uptime: "active",
      scope: "self",
      condition: "조화 파동 · 이탈 혹은 불꽃 효과 추가 시, 8초간",
    },
    {
      label: "공명 해방 용융 저항 무시",
      target: "resPen",
      damageType: "Liberation",
      element: "Fusion",
      values: [0.1, 0.15, 0.2, 0.25, 0.3],
      uptime: "active",
      scope: "self",
      condition: "조화 파동 · 이탈 혹은 불꽃 효과 추가 시, 8초간",
    },
  ],
};
