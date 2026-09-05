import type {
  BuffDamageType,
  BuffModifier,
  BuffScaleStat,
  BuffScope,
  BuffTarget,
  BuffUptime,
  Element,
  StatGroup,
} from "../types/game";

/**
 * 에코의 화음(세트) 효과와 에코 어빌리티를 계산에 쓸 수 있는 형태로 손으로 옮겨 적은 것.
 *
 * src/data/echo.json · echoDetails.json은 API에서 자동 생성하는 파일이라 다시 받으면 덮어써진다.
 * 그래서 사람이 해석해야 하는 이 부분만 따로 떼어 여기에 둔다.
 *
 * 무기 쪽 WeaponBuffTemplate과 같은 모양이되, 에코에는 정련이 없어 values 5개 대신 value 하나다.
 */
export interface EchoBuffTemplate {
  label: string;
  target: BuffTarget;
  damageType: BuffDamageType;
  /** target이 "resPen"/"resReduction"일 때 어느 속성 저항인지. */
  element?: Element;
  /** 수치(소수). 10% → 0.1 */
  value: number;
  /**
   * 수치가 고정값이 아니라 스탯에 비례할 때 그 기준 스탯.
   * value는 「기준 1단위당 얼마」가 된다 — 공명 효율 1%당 공격력 0.1%면 value는 0.001이다.
   * 기준값의 단위는 게임 스탯창 표시값과 같다(공명 효율 130% → 130).
   */
  scaleFrom?: BuffScaleStat;
  /** 「N%를 초과한 만큼」이라고 적힌 효과의 그 N. */
  scaleOffset?: number;
  /** 비례분의 상한(소수 비율). 「최대 25%까지」가 0.25다. */
  maxValue?: number;
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
   * 에코 세트 효과는 스탯창에 찍히지 않고 전투 중에 붙으므로 기본이 buff다(실측 확인).
   * 에코의 주옵션·부옵션은 여기가 아니라 echoStats.ts가 다루며 그쪽은 panel이다.
   */
  statGroup?: StatGroup;
  /** 같은 이름끼리 하나만 켜지는 묶음. 동시에 성립할 수 없는 상태를 나눠 적을 때 쓴다. */
  exclusiveGroup?: string;
  /**
   * **이 공격에만** 걸리는 효과. 공격 id 목록이며 생략하면 이 에코의 공격 전부에 걸린다.
   *
   * 한 에코의 갈래 중 하나에만 붙는 것을 적을 때 쓴다 — 「길게 누르기」의 지속 타격처럼.
   * 공격 id는 echoAttackOverrides.ts에 적은 갈래의 자리로 정해진다(`echo:<도감id>#<자리>`).
   * 갈래 순서를 바꾸면 여기 적은 id도 같이 고쳐야 한다.
   */
  attackIds?: string[];
  /**
   * **이 캐릭터들이 꼈을 때만** 걸리는 효과. 캐릭터 id 목록이며 생략하면 누구에게나 걸린다.
   *
   * 「장착 캐릭터가 루시 혹은 레베카일 경우」처럼 에코가 낀 사람을 가리는 문구가 근거다.
   * condition에 적어 두는 것만으로는 부족하다 — 그건 사람이 읽는 메모라 엔진이 보지 않아서,
   * 조건에 안 맞는 캐릭터에게도 버프가 그대로 붙는다.
   */
  onlyCharacters?: string[];
}

/** 화음 세트 효과 한 줄. 몇 세트에서 열리는지를 함께 담는다. */
export interface EchoSetBuffTemplate extends EchoBuffTemplate {
  /**
   * 이 효과가 열리는 세트 수.
   * 대부분 2/5지만, 3세트 하나로 끝나는 세트(뒤틀린 피안의 꿈 등 5종)와
   * 1세트짜리(꿈을 깨뜨리는 망령의 악몽)도 있다.
   */
  setKey: 1 | 2 | 3 | 5;
}

/**
 * 화음(세트) 효과. 키는 세트 이름(echo.json의 FetterGroup.Name).
 * 수치가 채워진 원문은 echoDetails.json의 fetters에 있다.
 */
export const echoSetBuffs: Record<string, EchoSetBuffTemplate[]> = {
  // 악을 씻어내는 마음
  //   2세트 기류 피해가 10% 증가된다
  //   5세트 적에게 「조화 밀집 · 이탈」 추가 시, 자신의 크리티컬 피해가 20% 증가되고
  //         기류 피해가 30% 증가되며 15초간 지속된다
  //
  // 조건이 같은 두 효과지만 붙는 자리가 달라(크리티컬 피해 · 피해 보너스) 각각 한 줄로 적는다.
  // 영광이 깃든 바람과 같은 기류 딜러형인데, 크리티컬 확률이 아니라 크리티컬 피해가 오른다.
  "악을 씻어내는 마음": [
    {
      setKey: 2,
      label: "기류 피해 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "조화 밀집 · 이탈 추가 시 크리티컬 피해",
      target: "critDamage",
      damageType: "All",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "적에게 「조화 밀집 · 이탈」 추가 시, 15초간",
    },
    {
      setKey: 5,
      label: "조화 밀집 · 이탈 추가 시 기류 피해 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.3,
      uptime: "active",
      scope: "self",
      condition: "적에게 「조화 밀집 · 이탈」 추가 시, 15초간",
    },
  ],

  // 황천길을 밝히는 등불
  //   2세트 HP가 10% 증가된다
  //   5세트 실드 획득 시 자신의 크리티컬이 5% 증가된다. 최대 4스택 중첩이 가능하고
  //         5초간 지속되며 0.5초마다 1회 발생할 수 있다.
  //         최대 스택까지 중첩 시, 자신이 입히는 용융 피해가 15% 증가된다
  //
  // 앞의 것은 스택형(5% × 4스택 = 20%), 뒤의 것은 그 4스택을 전제로 열리는 별도 효과다.
  // 영광의 칼날로 만들어진 왕관과 같은 「실드로 쌓는 스택」 계열이다.
  "황천길을 밝히는 등불": [
    {
      setKey: 2,
      label: "HP 증가",
      target: "hpPercent",
      damageType: "All",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "실드 획득 시 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 0.05, // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "실드 획득 시 1스택(0.5초당 1회), 최대 4스택 · 5초간",
    },
    {
      setKey: 5,
      label: "4스택 시 용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.15,
      uptime: "active",
      scope: "self",
      condition: "위 효과가 4스택에 도달했을 때",
    },
  ],

  // 내려앉은 깃털의 노래
  //   2세트 공명 효율이 10% 증가된다
  //   5세트 적에게 「암흑 효과」 추가 시 「현령의 깃털」을 얻는다 —
  //           자신의 크리티컬 20%, 강공격 피해 보너스 35%, 15초간
  //         적에게 「서리 효과」 추가 시 「중명조의 깃털」을 얻는다 —
  //           자신의 공명 효율 1%당 파티 내 캐릭터의 공격력 0.1%(최대 25%), 10초간
  //
  // 두 깃털은 조건이 서로 달라(암흑 / 서리) 각각 따로 켠다 — 배타가 아니다.
  // 「중명조의 깃털」은 공명 효율에 비례한다 — scaleFrom으로 스탯창의 공명 효율을 그대로 받아
  // 계산기가 수치를 알아서 정한다(공명 효율 130%면 13%, 상한 25%).
  //
  "내려앉은 깃털의 노래": [
    {
      setKey: 2,
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      value: 0.1,
      uptime: "passive", // 2세트만 맞추면 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "현령의 깃털 · 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "적에게 「암흑 효과」 추가 시, 15초간",
    },
    {
      setKey: 5,
      label: "현령의 깃털 · 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.35,
      uptime: "active",
      scope: "self",
      condition: "적에게 「암흑 효과」 추가 시, 15초간",
    },
    {
      setKey: 5,
      label: "중명조의 깃털 · 파티 공격력 (공명 효율 비례)",
      target: "atkPercent",
      damageType: "All",
      value: 0.001, // 공명 효율 1%당 공격력 0.1%
      scaleFrom: "EnergyRegen",
      maxValue: 0.25, // 최대 25%
      uptime: "active",
      scope: "party", // 파티 내 캐릭터 전원
      condition: "적에게 「서리 효과」 추가 시, 10초간",
    },
  ],

  // 꿈을 깨뜨리는 망령의 악몽
  //   1세트 적에게 「해킹 · 이탈」 추가 시, 자신의 일반 공격 피해 보너스와
  //         강공격 피해 보너스가 35% 증가되며 15초간 지속된다
  //
  // 34개 세트 중 유일하게 1세트로 끝난다.
  // 「일반 공격과 강공격」은 damageType이 하나뿐이라 두 줄로 나눈다 — 같은 효과가 갈라진 것이다.
  "꿈을 깨뜨리는 망령의 악몽": [
    {
      setKey: 1,
      label: "해킹 · 이탈 추가 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.35,
      uptime: "active",
      scope: "self",
      condition: "적에게 「해킹 · 이탈」 추가 시, 15초간",
    },
    {
      setKey: 1,
      label: "해킹 · 이탈 추가 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.35, // 위와 같은 효과가 분류만 갈린 것
      uptime: "active",
      scope: "self",
      condition: "적에게 「해킹 · 이탈」 추가 시, 15초간",
    },
  ],

  // 긴 여정을 떠나는 별
  //   2세트 용융 피해가 10% 증가된다
  //   5세트 적에게 「불꽃 효과」 혹은 「조화 파동 · 이탈」 추가 시, 자신의 크리티컬이 20%
  //         증가되고 용융 피해가 20% 증가되며, 8초간 지속된다
  //
  // 조건이 같은 두 효과지만 붙는 자리가 달라(크리티컬 확률 · 피해 보너스) 각각 한 줄로 적는다.
  // 영광이 깃든 바람(기류)과 같은 꼴이고 속성만 용융이다.
  "긴 여정을 떠나는 별": [
    {
      setKey: 2,
      label: "용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "불꽃·조화 파동 추가 시 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "적에게 「불꽃 효과」 혹은 「조화 파동 · 이탈」 추가 시, 8초간",
    },
    {
      setKey: 5,
      label: "불꽃·조화 파동 추가 시 용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "적에게 「불꽃 효과」 혹은 「조화 파동 · 이탈」 추가 시, 8초간",
    },
  ],

  // 마음을 엮은 꿈의 그림자
  //   2세트 공격력이 10% 증가된다
  //   5세트 목표에게 「조화 파동 · 이탈」 혹은 「조화 밀집 · 이탈」 추가 시,
  //         파티 내 캐릭터의 조화도 파괴 증폭이 20 증가되고, 30초간 지속된다
  //
  // 조화도 파괴 증폭은 일반 피해식에 직접 들어가지 않는다(조화도 파괴 피해는 별개 공식이다).
  // 그래도 스탯에 제대로 쌓아둔다 — 「역광 속 눈부신 서약」 5세트가 이 수치에 비례하므로,
  // 두 세트를 같이 쓰면 20pt × 0.3% = 6%가 그쪽 공격력 버프에 자동으로 얹힌다.
  "마음을 엮은 꿈의 그림자": [
    {
      setKey: 2,
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "파티 조화도 파괴 증폭",
      target: "syncAmplify",
      damageType: "All",
      value: 0.2, // 20pt. 스탯창 표시가 퍼센트라 소수 비율로 담는다
      uptime: "active",
      scope: "party",
      condition: "목표에게 「조화 파동 · 이탈」 혹은 「조화 밀집 · 이탈」 추가 시, 30초간",
    },
  ],

  // 함의의 소리를 따라
  //   2세트 기류 피해가 10% 증가된다
  //   5세트 에코 어빌리티 피해를 입힐 시, 에코 어빌리티 피해의 크리티컬이 20% 증가되고
  //         자신의 기류 피해가 15% 증가되며 5초간 지속된다
  //
  // 조건이 같은 두 효과지만 붙는 자리가 달라(크리티컬 확률 · 피해 보너스) 각각 한 줄로 적는다.
  // 크리티컬 쪽은 에코 어빌리티 피해에만 걸리므로 damageType이 Echo다.
  "함의의 소리를 따라": [
    {
      setKey: 2,
      label: "기류 피해 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "에코 어빌리티 크리티컬 확률",
      target: "critRate",
      damageType: "Echo",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 피해를 입힐 시, 5초간",
    },
    {
      setKey: 5,
      label: "에코 어빌리티 후 기류 피해 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.15,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 피해를 입힐 시, 5초간",
    },
  ],

  // 흐르는 금빛 속 진리의 답
  //   2세트 회절 피해가 10% 증가된다
  //   5세트 일반 공격으로 피해를 입힐 시 자신의 회절 피해가 10% 증가되고,
  //         3스택 중첩이 가능하며 5초간 지속된다.
  //         3스택까지 중첩 시, 공명 해방을 발동할 경우 일반 공격 피해 보너스가 40% 증가된다
  //
  // 앞의 것은 스택형(10% × 3스택 = 30%), 뒤의 것은 그 3스택을 전제로 열리는 별도 효과다.
  "흐르는 금빛 속 진리의 답": [
    {
      setKey: 2,
      label: "회절 피해 증가",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "일반 공격 후 회절 피해 증가",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.1, // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "일반 공격으로 피해를 입힐 시 1스택, 최대 3스택 · 5초간",
    },
    {
      setKey: 5,
      label: "3스택 + 공명 해방 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.4,
      uptime: "active",
      scope: "self",
      condition: "위 효과가 3스택인 상태에서 공명 해방을 발동했을 때",
    },
  ],

  // 역광 속 눈부신 서약
  //   2세트 회절 피해가 10% 증가된다
  //   5세트 반주 스킬 발동 후, 다음번 변주 스킬로 등장하는 캐릭터의 공격력이 15% 증가된다.
  //         조화도 파괴 증폭 1pt 당 공격력을 추가로 0.3% 증가시키고, 최대 15%까지 증가시키며,
  //         15초간 지속된다
  //
  // 고정분 15%와 조화도 파괴 증폭 비례분(최대 15%)은 붙는 방식이 달라 두 줄로 나눈다.
  // 비례분은 scaleFrom으로 스탯창의 조화도 파괴 증폭을 그대로 받는다
  //   — 20pt면 6%, 50pt 이상이면 상한 15%.
  // 「마음을 엮은 꿈의 그림자」 5세트가 이 수치를 20 올려주므로 두 세트를 같이 쓰면
  //   그 몫이 여기에 자동으로 반영된다.
  "역광 속 눈부신 서약": [
    {
      setKey: 2,
      label: "회절 피해 증가",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "변주 등장 캐릭터 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.15,
      uptime: "active",
      scope: "party", // 변주 스킬로 등장하는 캐릭터
      condition: "반주 스킬 발동 후 다음번 변주로 등장하는 캐릭터에게, 15초간 (캐릭터 전환 시 즉시 종료)",
    },
    {
      setKey: 5,
      label: "변주 등장 캐릭터 공격력 추가 (조화도 파괴 증폭 비례)",
      target: "atkPercent",
      damageType: "All",
      value: 0.003, // 조화도 파괴 증폭 1pt당 공격력 0.3%
      scaleFrom: "SyncAmplify",
      maxValue: 0.15, // 최대 15%
      uptime: "active",
      scope: "party",
      condition: "위와 같은 조건",
    },
  ],

  // 소리 없이 내려앉은 기도의 눈
  //   2세트 응결 피해가 10% 증가된다
  //   5세트 「서리 효과」 추가 시 응결 피해 10%(15초)와 「강설」 표식(15초, 25초당 1회)을 얻는다.
  //         「강설」을 들고 있을 때 아래 둘 중 하나가 발동하며 표식을 소모한다.
  //           · 공명 해방 피해 시 → 크리티컬 25%(6초, 해방 명중마다 4초 연장, 최대 6회)
  //           · 반주 스킬 발동 시 → 다음 변주로 등장하는 캐릭터의 응결 피해 25%(15초)
  //
  // 「강설」은 수치 없는 표식이라 버프로 넣지 않고 조건에만 적는다.
  // 두 갈래는 「강설 제거 시 동시에 1개만」이라 exclusiveGroup으로 묶는다.
  "소리 없이 내려앉은 기도의 눈": [
    {
      setKey: 2,
      label: "응결 피해 증가",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "서리 효과 추가 시 응결 피해 증가",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.1,
      uptime: "active",
      scope: "self",
      condition: "목표에게 「서리 효과」 추가 시, 15초간",
    },
    {
      setKey: 5,
      label: "강설 소모 · 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 0.25,
      uptime: "active",
      scope: "self",
      exclusiveGroup: "기도의 눈 · 강설 소모",
      condition:
        "「강설」 보유 중 공명 해방 피해를 입힐 시 표식을 소모, 6초간 (해방 명중마다 4초 연장, 최대 6회)",
    },
    {
      setKey: 5,
      label: "강설 소모 · 변주 등장 캐릭터 응결 피해 증가",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.25,
      uptime: "active",
      scope: "party", // 변주 스킬로 등장하는 캐릭터
      exclusiveGroup: "기도의 눈 · 강설 소모",
      condition: "「강설」 보유 중 반주 스킬 발동 시 표식을 소모, 다음 변주로 등장하는 캐릭터에게 15초간",
    },
  ],

  // 오색찬란한 거품
  //   2세트 용융 피해가 10% 증가된다
  //   5세트 적에게 「불꽃 효과」 추가 시 자신의 용융 피해가 10% 증가되고 15초간 지속된다.
  //         그 지속 시간 내에 반주 스킬 발동 후, 다음 변주 스킬로 등장하는 캐릭터의
  //         용융 피해를 25% 증가시키고 15초간 지속된다
  //
  // 두 번째 5세트 효과는 앞의 것이 걸려 있어야 열려 조건이 한 겹 더 깊고, 대상도 다르다
  // — 이 세트를 낀 본인이 아니라 변주로 등장하는 캐릭터에게 걸린다.
  "오색찬란한 거품": [
    {
      setKey: 2,
      label: "용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "불꽃 효과 추가 시 용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.1,
      uptime: "active",
      scope: "self",
      condition: "적에게 「불꽃 효과」 추가 시, 15초간",
    },
    {
      setKey: 5,
      label: "변주 등장 캐릭터 용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.25,
      uptime: "active",
      scope: "party", // 변주 스킬로 등장하는 캐릭터
      condition: "위 효과가 걸려 있는 동안 반주 스킬 발동 후, 다음 변주 스킬로 등장하는 캐릭터에게 15초간",
    },
  ],

  // 빛을 쫓는 별의 고리
  //   2세트 치료 효과가 10% 증가된다
  //   5세트 캐릭터가 파티원 치료 시, 자신의 부조화 수치 누적 효율 1% 당 파티 내 캐릭터의
  //         공격력을 0.2% 증가시키고, 최대 25%까지 증가시키며, 4초간 지속된다
  //
  // 부조화 수치 누적 효율에 비례한다 — scaleFrom으로 스탯창 값을 그대로 받아 계산기가 정한다
  //   (부조화 효율 30%면 6%, 125% 이상이면 상한 25%).
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   2세트 「치료 효과 10% 증가」 BuffTarget에 치료 자리가 없다(찬란한 광휘와 같은 이유).
  "빛을 쫓는 별의 고리": [
    {
      setKey: 5,
      label: "치료 시 파티 공격력 (부조화 효율 비례)",
      target: "atkPercent",
      damageType: "All",
      value: 0.002, // 부조화 수치 누적 효율 1%당 공격력 0.2%
      scaleFrom: "DiscordEfficiency",
      maxValue: 0.25, // 최대 25%
      uptime: "active",
      scope: "party", // 파티 내 캐릭터 전원
      condition: "파티원 치료 시, 4초간 (중첩 불가)",
    },
  ],

  // 영광이 깃든 바람
  //   2세트 기류 피해가 10% 증가된다
  //   5세트 공격으로 「풍식 효과」가 있는 목표 명중 시, 자신의 크리티컬이 10% 증가되고,
  //         기류 피해가 30% 증가되며, 10초간 지속된다
  //
  // 조건이 같은 두 효과지만 붙는 자리가 달라(크리티컬 확률 · 피해 보너스) 각각 한 줄로 적는다.
  "영광이 깃든 바람": [
    {
      setKey: 2,
      label: "기류 피해 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "풍식 효과 목표 명중 시 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 0.1,
      uptime: "active",
      scope: "self",
      condition: "「풍식 효과」가 있는 목표를 공격으로 명중 시, 10초간",
    },
    {
      setKey: 5,
      label: "풍식 효과 목표 명중 시 기류 피해 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.3,
      uptime: "active",
      scope: "self",
      condition: "「풍식 효과」가 있는 목표를 공격으로 명중 시, 10초간",
    },
  ],

  // 울부짖는 늑대의 불꽃
  //   2세트 용융 피해가 10% 증가된다
  //   5세트 공명 해방 발동 시, 파티 내 캐릭터의 용융 피해가 15% 증가되고,
  //         자신의 공명 해방 피해가 20% 증가되며, 35초간 지속된다
  //
  // 끝없는 하늘과 같은 파티 지원형인데, 본인 몫이 같은 속성이 아니라 다른 자리(공명 해방)다.
  "울부짖는 늑대의 불꽃": [
    {
      setKey: 2,
      label: "용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "공명 해방 후 파티 용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.15,
      uptime: "active",
      scope: "party", // 파티 내 캐릭터 전원
      condition: "공명 해방 발동 시, 35초간",
    },
    {
      setKey: 5,
      label: "공명 해방 후 본인 공명 해방 피해 증가",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시, 35초간",
    },
  ],

  // 끝없는 하늘
  //   2세트 기류 피해가 10% 증가된다
  //   5세트 캐릭터가 적에게 「풍식 효과」를 추가 시, 파티 내 캐릭터의 기류 피해가 15% 증가되고,
  //         자신의 기류 피해가 추가로 15% 증가되며, 20초간 지속된다
  //
  // 5세트는 파티분과 본인 추가분이 따로 적혀 있어 두 줄로 나눈다 — 본인은 둘 다 받아 30%가 된다.
  "끝없는 하늘": [
    {
      setKey: 2,
      label: "기류 피해 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "풍식 효과 추가 시 파티 기류 피해 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.15,
      uptime: "active",
      scope: "party", // 파티 내 캐릭터 전원
      condition: "적에게 「풍식 효과」를 추가 시, 20초간",
    },
    {
      setKey: 5,
      label: "풍식 효과 추가 시 본인 기류 피해 추가 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.15,
      uptime: "active",
      scope: "self", // 위 파티분에 더해 본인만 한 번 더 받는다
      condition: "적에게 「풍식 효과」를 추가 시, 20초간",
    },
  ],

  // 영광의 칼날로 만들어진 왕관
  //   3세트 캐릭터가 실드 획득 시, 자신의 공격력이 6% 증가되고 크리티컬 피해가 4% 증가된다.
  //         해당 효과는 최대 5스택까지 중첩이 가능하며, 4초간 지속되고
  //         0.5초마다 1회 발생할 수 있다
  //
  // 한 효과가 두 자리에 붙는다 — 스택은 같이 움직이므로 둘 다 같은 스택으로 두고 쓴다.
  // 공격력 6% × 5스택 = 30%, 크리티컬 피해 4% × 5스택 = 20%.
  "영광의 칼날로 만들어진 왕관": [
    {
      setKey: 3,
      label: "실드 획득 시 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.06, // 스택 1개당
      stacks: 5,
      maxStacks: 5,
      uptime: "active",
      scope: "self",
      condition: "실드 획득 시 1스택(0.5초당 1회), 최대 5스택 · 4초간",
    },
    {
      setKey: 3,
      label: "실드 획득 시 크리티컬 피해",
      target: "critDamage",
      damageType: "All",
      value: 0.04, // 위와 같은 효과가 자리만 갈린 것
      stacks: 5,
      maxStacks: 5,
      uptime: "active",
      scope: "self",
      condition: "실드 획득 시 1스택(0.5초당 1회), 최대 5스택 · 4초간",
    },
  ],

  // 만물의 숨결에 비롯된 울림
  //   3세트 캐릭터가 에코 어빌리티 발동 시, 자신의 강공격 피해 보너스가 30% 증가되고
  //         4초간 지속된다. 파티 내 캐릭터의 에코 어빌리티 피해 보너스가 4% 증가되고,
  //         최대 4스택 중첩이 가능하며 30초간 지속된다
  //
  // 두 번째는 파티에 걸리는 스택형 — 4% × 4스택 = 16%.
  // 스택을 쌓는 제약(같은 이름의 에코는 1회, 효과 종료 시 기록 리셋)은 condition에만 남긴다.
  "만물의 숨결에 비롯된 울림": [
    {
      setKey: 3,
      label: "에코 어빌리티 후 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.3,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티 발동 시, 4초간",
    },
    {
      setKey: 3,
      label: "파티 에코 어빌리티 피해 보너스",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.04, // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "party", // 파티 내 캐릭터 전원
      condition:
        "에코 어빌리티 발동 시 1스택(같은 이름의 에코는 1회만), 최대 4스택 · 30초간 (4스택에서 발동 시 지속 시간 리셋)",
    },
  ],

  // 운명을 붕괴시키는 현
  //   3세트 캐릭터가 적에게 「암흑 효과」 추가 시, 자신의 공격력이 20% 증가되고
  //         공명 해방 피해 보너스가 30% 증가되며 5초간 지속된다
  //
  // 조건이 같은 두 효과지만 붙는 자리가 달라(공격력% · 피해 보너스) 각각 한 줄로 적는다.
  "운명을 붕괴시키는 현": [
    {
      setKey: 3,
      label: "암흑 효과 추가 시 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "적에게 「암흑 효과」 추가 시, 5초간",
    },
    {
      setKey: 3,
      label: "암흑 효과 추가 시 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.3,
      uptime: "active",
      scope: "self",
      condition: "적에게 「암흑 효과」 추가 시, 5초간",
    },
  ],

  // 불타는 깃털을 펼친 사냥꾼의 그림자
  //   3세트 캐릭터가 에코 어빌리티 피해를 입힐 시, 강공격 피해의 크리티컬이 20% 증가되고
  //         6초간 지속된다. 강공격 피해를 입힐 시, 에코 어빌리티 피해의 크리티컬이 20%
  //         증가되고 6초간 지속된다. 두 가지 효과를 동시에 보유 시, 자신의 용융 피해가 16% 증가
  //
  // 무기 「얽혀진 빛과 그림자」와 같은 상호 순환 구조다 — 강공격과 에코 어빌리티가 서로를 먹여준다.
  // 세 번째는 두 효과를 동시에 들고 있어야 열려 조건이 한 겹 더 깊다.
  "불타는 깃털을 펼친 사냥꾼의 그림자": [
    {
      setKey: 3,
      label: "강공격 크리티컬 확률",
      target: "critRate",
      damageType: "Heavy",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 피해를 입힐 시, 6초간",
    },
    {
      setKey: 3,
      label: "에코 어빌리티 크리티컬 확률",
      target: "critRate",
      damageType: "Echo",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "강공격으로 피해를 입힐 시, 6초간",
    },
    {
      setKey: 3,
      label: "용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.16,
      uptime: "active",
      scope: "self",
      condition: "위 두 효과를 동시에 보유한 동안",
    },
  ],

  // 뒤틀린 피안의 꿈
  //   3세트 캐릭터의 공명 에너지가 0일 시, 자신의 크리티컬이 20% 증가되고,
  //         에코 어빌리티 피해 보너스가 35% 증가된다
  //
  // 3세트 하나로 끝나는 세트다(2/5 구성이 아니다).
  // 조건(공명 에너지 0)은 엔진이 자원을 다루지 않아 판정하지 못한다 — 조건부로 두고 사람이 켠다.
  "뒤틀린 피안의 꿈": [
    {
      setKey: 3,
      label: "공명 에너지 0일 때 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "캐릭터의 공명 에너지가 0일 때",
    },
    {
      setKey: 3,
      label: "공명 에너지 0일 때 에코 어빌리티 피해 보너스",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.35,
      uptime: "active",
      scope: "self",
      condition: "캐릭터의 공명 에너지가 0일 때",
    },
  ],

  // 파도에 맞선 용기
  //   2세트 공명 효율이 10% 증가된다
  //   5세트 캐릭터의 공격력이 15% 증가되고, 공명 효율이 250%에 도달한 후
  //         현재 캐릭터의 전체 속성 피해가 30% 증가된다
  //
  // 두 번째 효과의 조건은 「공명 효율 250% 도달」 — 시간이 지나면 풀리는 발동 효과가 아니라
  // 스탯이 문턱을 넘으면 그때부터 계속 붙어 있는 것이다. 이 세트를 쓰는 빌드는 애초에
  // 공명 효율 250%를 맞추고 들어가므로 상시로 둔다(사용자 확인).
  // 문턱을 못 넘긴 빌드에서는 이 줄을 꺼야 한다 — 엔진이 공명 효율로 판정하지는 않는다.
  //
  "파도에 맞선 용기": [
    {
      setKey: 2,
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      value: 0.1,
      uptime: "passive", // 2세트만 맞추면 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      value: 0.15,
      uptime: "passive", // 5세트를 맞추면 조건 없이 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "공명 효율 250% 도달 시 전체 속성 피해 증가",
      target: "damageBonus",
      damageType: "All",
      value: 0.3,
      uptime: "passive", // 문턱을 넘으면 계속 붙어 있다 — 시간제 발동이 아니다
      scope: "self",
      condition: "공명 효율이 250%에 도달한 후 (문턱을 못 넘기면 이 줄을 꺼야 한다)",
    },
  ],

  // 영원의 광채
  //   2세트 회절 피해가 10% 증가된다
  //   5세트 캐릭터가 적에게 「광학 효과」를 추가 시, 자신의 크리티컬이 20% 증가되고 15초간 지속.
  //         「광학 효과」가 10스택인 적을 공격 시, 자신의 회절 피해 보너스가 15% 증가되고
  //         15초간 지속된다
  //
  // 「광학 효과」는 적에게 쌓이는 상태라 우리 쪽 스택이 아니다 — 조건으로만 적고
  // 수치는 문턱을 넘었을 때 붙는 고정값으로 둔다.
  "영원의 광채": [
    {
      setKey: 2,
      label: "회절 피해 증가",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "광학 효과 추가 시 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "적에게 「광학 효과」를 추가 시, 15초간",
    },
    {
      setKey: 5,
      label: "광학 효과 10스택 적 공격 시 회절 피해 보너스",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.15,
      uptime: "active",
      scope: "self",
      condition: "「광학 효과」가 10스택인 적을 공격 시, 15초간",
    },
  ],

  // 어둠의 장막
  //   2세트 인멸 피해가 10% 증가된다
  //   5세트 캐릭터가 반주 스킬을 발생시키고 퇴장 시, 추가로 주변 적에게 480%의 인멸 피해를
  //         입히고, 해당 피해는 반주 스킬 피해로 적용되며, 다음에 등장하는 캐릭터의
  //         인멸 피해 보너스를 15% 증가시키고, 15초간 지속된다
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   5세트 「480% 인멸 피해」 세트가 스스로 때리는 별도 공격이라 버프가 아니다.
  //   공격 데이터(반주 스킬 피해로 판정)로 넣어야 하는 것이라 여기서는 다루지 않는다.
  "어둠의 장막": [
    {
      setKey: 2,
      label: "인멸 피해 증가",
      target: "damageBonus",
      damageType: "Havoc",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "반주 퇴장 후 등장 캐릭터 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "Havoc",
      value: 0.15,
      uptime: "active",
      scope: "party", // 이 세트를 낀 본인이 아니라 다음에 등장하는 캐릭터
      condition: "반주 스킬을 발생시키고 퇴장한 뒤 다음에 등장하는 캐릭터에게, 15초간",
    },
  ],

  // 하늘의 합주곡
  //   2세트 공명 효율이 10% 증가된다
  //   5세트 현재 캐릭터의 협동 공격이 입히는 피해가 80% 증가된다.
  //         협동 공격으로 적을 명중하여 크리티컬이 발생할 경우,
  //         파티 내 등장 캐릭터의 공격력이 20% 증가되고, 4초간 지속된다
  //
  // 협동 공격은 damageType "Chain"으로 걸린다. 다만 공격 데이터에 damageBonusType이
  // 따로 적힌 협동 공격(연무의 뇌전의 쐐기 등 공명 스킬로 판정되는 것)에는 걸리지 않는다
  // — 게임도 그 판정을 따르므로 그대로 두는 게 맞다.
  //
  "하늘의 합주곡": [
    {
      setKey: 2,
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      value: 0.1,
      uptime: "passive", // 2세트만 맞추면 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "협동 공격 피해 증가",
      target: "damageBonus",
      damageType: "Chain",
      value: 0.8,
      uptime: "passive", // 5세트를 맞추면 조건 없이 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "협동 공격 크리티컬 시 파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.2,
      uptime: "active",
      scope: "party", // 파티 내 등장 캐릭터
      condition: "협동 공격이 크리티컬로 명중했을 때, 4초간",
    },
  ],

  // 냉철한 결단
  //   2세트 공명 스킬 피해가 12% 증가된다
  //   5세트 공명 스킬 발동 시, 자신의 응결 피해가 22.5% 증가되고, 15초간 지속된다.
  //         공명 해방 발동 시, 자신의 공명 스킬 피해가 18% 증가되고, 5초간 지속되며,
  //         최대 2스택 중첩이 가능하다
  //
  // 속성 세트와 달리 분류(공명 스킬)와 속성(응결)이 섞여 있다 — 붙는 자리가 달라 각각 한 줄이다.
  // 마지막 것은 스택형 — 18% × 2스택 = 36%.
  "냉철한 결단": [
    {
      setKey: 2,
      label: "공명 스킬 피해 증가",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "공명 스킬 후 응결 피해 증가",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.225,
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 발동 시, 15초간",
    },
    {
      setKey: 5,
      label: "공명 해방 후 공명 스킬 피해 증가",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.18, // 스택 1개당
      stacks: 2,
      maxStacks: 2,
      uptime: "active",
      scope: "self",
      condition: "공명 해방 발동 시 1스택, 최대 2스택 · 5초간",
    },
  ],

  // 솟구치는 용암
  //   2세트 용융 피해가 10% 증가된다
  //   5세트 공명 스킬 사용 시, 용융 피해가 30% 증가되며, 15초 동안 지속된다
  //
  // 속성 세트 여섯 종의 마지막(용융). 스택 없이 30%가 한 번에 붙는다.
  "솟구치는 용암": [
    {
      setKey: 2,
      label: "용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "공명 스킬 후 용융 피해 증가",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.3,
      uptime: "active",
      scope: "self",
      condition: "공명 스킬 사용 시, 15초간",
    },
  ],

  // 빛나는 별
  //   2세트 회절 피해가 10% 증가된다
  //   5세트 변주 스킬을 사용하여 등장 시, 회절 피해가 30% 증가되고, 15초 동안 지속된다
  //
  // 스쳐가는 바람(기류)과 수치·조건이 같고 속성만 회절로 바뀐 세트다.
  "빛나는 별": [
    {
      setKey: 2,
      label: "회절 피해 증가",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "변주 등장 시 회절 피해 증가",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.3,
      uptime: "active",
      scope: "self",
      condition: "변주 스킬을 사용하여 등장 시, 15초간",
    },
  ],

  // 야밤의 서리
  //   2세트 응결 피해가 10% 증가된다
  //   5세트 일반 공격이나 강공격을 사용하면, 응결 피해가 10% 증가.
  //         해당 효과는 3스택 중첩이 가능하며, 15초간 지속된다
  //
  // 빛을 삼키는 해와 같은 꼴(일반·강공격으로 쌓는 속성 스택). 10% × 3스택 = 30%.
  "야밤의 서리": [
    {
      setKey: 2,
      label: "응결 피해 증가",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "일반·강공격 후 응결 피해 증가",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.1, // 스택 1개당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "일반 공격이나 강공격 사용 시 1스택, 최대 3스택 · 15초간",
    },
  ],

  // 빛을 삼키는 해
  //   2세트 인멸 피해가 10% 증가된다
  //   5세트 일반 공격 또는 강공격 사용 시, 인멸 피해가 7.5% 증가되고,
  //         해당 효과는 4스택 중첩이 가능하며, 15초 동안 지속된다
  //
  // 울려퍼지는 뇌음과 같은 속성 세트 꼴. 5세트는 스택형 — 7.5% × 4스택 = 30%.
  "빛을 삼키는 해": [
    {
      setKey: 2,
      label: "인멸 피해 증가",
      target: "damageBonus",
      damageType: "Havoc",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "일반·강공격 후 인멸 피해 증가",
      target: "damageBonus",
      damageType: "Havoc",
      value: 0.075, // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "일반 공격 또는 강공격 사용 시 1스택, 최대 4스택 · 15초간",
    },
  ],

  // 떠오르는 구름
  //   2세트 공명 효율이 10% 증가된다
  //   5세트 반주 스킬을 사용한 후, 다음에 등장하는 공명자의 공격력이 22.5% 증가하며,
  //         15초 동안 지속된다
  //
  // 공명 효율은 해방 회전율에만 영향을 주고 피해식에는 들어가지 않지만, 세트가 실제로 주는
  // 수치이고 스탯창에도 찍히므로 한 줄로 넣어 둔다(target: energyRegen).
  "떠오르는 구름": [
    {
      setKey: 2,
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      value: 0.1,
      uptime: "passive", // 2세트만 맞추면 조건 없이 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "반주 후 등장 공명자 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.225,
      uptime: "active",
      scope: "party", // 이 세트를 낀 본인이 아니라 다음에 등장하는 캐릭터
      condition: "반주 스킬 사용 후 다음에 등장하는 공명자에게, 15초간",
    },
  ],

  // 찬란한 광휘
  //   2세트 치료 효과가 10% 증가된다
  //   5세트 파티원 치료 시, 파티 전체의 공격력이 15% 증가하며, 30초간 지속된다
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   2세트 「치료 효과 10% 증가」 BuffTarget에 치료 자리가 없다. Stats에는 healingBonus가
  //   있지만 피해식에 들어가지 않아 버프로 옮길 대상이 아니다.
  "찬란한 광휘": [
    {
      setKey: 5,
      label: "치료 시 파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.15,
      uptime: "active",
      scope: "party", // 파티 전체
      condition: "파티원 치료 시, 30초간",
    },
  ],

  // 울려퍼지는 뇌음
  //   2세트 전도 피해가 10% 증가된다
  //   5세트 강공격 또는 공명 스킬 사용 시, 전도 피해가 15% 증가된다.
  //         해당 효과는 2스택 중첩이 가능하고 각 스택당 15초 동안 지속된다
  //
  // 스쳐가는 바람과 같은 속성 세트 꼴인데 5세트가 스택형이다 — 15% × 2스택 = 30%.
  "울려퍼지는 뇌음": [
    {
      setKey: 2,
      label: "전도 피해 증가",
      target: "damageBonus",
      damageType: "Electro",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "강공격·공명 스킬 후 전도 피해 증가",
      target: "damageBonus",
      damageType: "Electro",
      value: 0.15, // 스택 1개당
      stacks: 2,
      maxStacks: 2,
      uptime: "active",
      scope: "self",
      condition: "강공격 또는 공명 스킬 사용 시 1스택, 최대 2스택 · 스택마다 15초",
    },
  ],

  // 스쳐가는 바람
  //   2세트 기류 피해가 10% 증가된다
  //   5세트 변주 스킬을 사용하여 등장 시, 기류 피해가 30% 증가하고, 15초 동안 지속된다
  //
  // 속성 세트라 damageType에 속성(Aero)을 적는다 — 기류 공격에만 걸린다.
  "스쳐가는 바람": [
    {
      setKey: 2,
      label: "기류 피해 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "변주 등장 시 기류 피해 증가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.3,
      uptime: "active",
      scope: "self",
      condition: "변주 스킬을 사용하여 등장 시, 15초간",
    },
  ],

  // 끊임없는 잔향
  //   2세트 공격력이 10% 증가된다
  //   5세트 출전 시, 자신의 공격력이 1.5초마다 5% 증가하며, 최대 4스택까지 중첩된다.
  //         반주 스킬 피해가 60% 증가된다
  //
  // 5세트 공격력은 스택형이라 value에 스택 1개당 값을 적는다 — 5% × 4스택 = 20%.
  // 쌓이는 속도(1.5초마다 1스택)는 엔진이 시간을 다루지 않아 condition에만 남긴다.
  "끊임없는 잔향": [
    {
      setKey: 2,
      label: "공격력 증가",
      target: "atkPercent",
      damageType: "All",
      value: 0.1,
      uptime: "passive", // 세트만 맞추면 늘 걸린다
      scope: "self",
    },
    {
      setKey: 5,
      label: "출전 중 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.05, // 스택 1개당
      stacks: 4,
      maxStacks: 4,
      uptime: "active",
      scope: "self",
      condition: "출전 중 1.5초마다 1스택, 최대 4스택",
    },
    {
      setKey: 5,
      label: "반주 스킬 피해 증가",
      target: "damageBonus",
      damageType: "Intro",
      value: 0.6,
      uptime: "passive", // 5세트를 맞추면 조건 없이 걸린다
      scope: "self",
    },
  ],
};

/**
 * 에코 어빌리티(장착 · 사용 효과)에서 나오는 버프. 키는 에코 id.
 * 어빌리티의 피해 자체는 공격 데이터 쪽이고, 여기에는 버프만 담는다.
 *
 * 여기 담긴 것은 **전부 메인 슬롯(1번 자리) 전용**이다 — 예외가 없다.
 * 어빌리티를 쓸 수 있는 에코는 다섯 자리 중 첫 번째에 낀 하나뿐이라,
 *   「메인 슬롯에 장착 시 …」  장착만으로 걸리는 것
 *   「에코 어빌리티 발동 시 …」 어빌리티를 써야 걸리는 것 — 쓰려면 어차피 메인이어야 한다
 * 둘 다 2~5번 자리에 끼면 아무 것도 걸리지 않는다.
 * 그래서 개별 줄에 표시를 달지 않고 이 표 전체를 메인 전용으로 본다
 * (반대로 화음 세트 효과 echoSetBuffs는 자리를 가리지 않고 개수만 센다).
 *
 * 계산에 붙일 때는 mainEchoOf(캐릭터)가 돌려준 에코의 것만 넣어야 한다 — echoStore.ts 참고.
 */
export const echoAbilityBuffs: Record<string, EchoBuffTemplate[]> = {
  // 공명의 메아리 · 플뢰르 드 리스 (6000106)
  //   메인 슬롯에 장착 시 자신의 기류 피해 보너스 10.00% 증가
  //   장착 캐릭터가 방랑자 · 기류 혹은 카르티시아면 기류 피해 보너스가 추가로 10.00% 증가
  //
  // 처음 나온 「특정 캐릭터일 때 추가분」 꼴이다 — 기본 10%는 누구나 받고,
  // 해당 캐릭터만 10%를 한 번 더 받아 20%가 된다.
  //
  // 조건이 「누가 끼고 있느냐」뿐이라 그 캐릭터에게는 늘 붙어 있다 — 그래서 상시로 둔다(사용자 확인).
  // 낀 사람은 onlyCharacters로 못 박아 두었다. 그 둘이 아니면 이 줄은 목록에 아예 뜨지 않는다.
  //
  // 미반영 — 어빌리티 자체의 피해(「윈드 클리버」 8단 × 27.36% + 1단 136.80% 기류)는
  //   공격 데이터 쪽이다.
  "6000106": [
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.1,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "방랑자 · 기류 / 카르티시아 전용 · 기류 피해 보너스 추가",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.1,
      onlyCharacters: ["rover-aero", "cartethyia"],
      uptime: "passive", // 그 캐릭터가 끼고 있으면 늘 붙어 있다
      scope: "self",
      condition: "장착 캐릭터가 방랑자 · 기류 혹은 카르티시아일 때",
    },
  ],

  // 악몽 · 반디의 군세 (6000105)
  //   메인 슬롯에 장착 시 자신의 응결 피해 보너스 12.00%,
  //   협동 공격이 입히는 피해 30.00% 증가
  //
  // 두 번째 자리가 분류 12%가 아니라 협동 공격 30%다 — 헤카테(협동 40%)와 같은 계열이고
  // 값만 낮다. damageBonusType이 따로 적힌 협동 공격에는 걸리지 않는다.
  //
  // 미반영 — 어빌리티 자체의 피해(273.60% 응결)는 공격 데이터 쪽이다.
  "6000105": [
    {
      label: "메인 슬롯 장착 시 응결 피해 보너스",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 협동 공격 피해 증가",
      target: "damageBonus",
      damageType: "Chain",
      value: 0.3,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 카피타네우스 (6000104)
  //   메인 슬롯에 장착 시 자신의 회절 피해 보너스 12.00%, 강공격 피해 보너스 12.00% 증가
  //
  // 「장착 효과 두 자리」 표준 꼴이다(로렐라이 · 이성 무장 등과 같다).
  //
  // 미반영 — 어빌리티 자체의 피해(내려찍기 118.80%, 「매서운 판결」 4개 × 59.40% 회절)는
  //   공격 데이터 쪽이다.
  "6000104": [
    {
      label: "메인 슬롯 장착 시 회절 피해 보너스",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 삐리릭 (6010178) — 버프 없음
  //   회전 공격 5단 × 25.92% 전도 피해뿐이다. 일반판 삐리릭(6000178)과 문구·배율이 같다.
  "6010178": [],

  // 이상 · 거짓의 신왕 (6010121)
  //   메인 슬롯 장착 시 전도 피해 보너스 12.00%, 강공격 피해 보너스 12.00%
  //
  // 미반영
  //   돌진 4단 × 55.35% 전도 피해 — 어빌리티 자체 배율이라 공격 데이터 쪽이다
  //   메인 슬롯 장착 상태에서 변주 등장 시 소환되어 때리는 405.00% 전도 피해 —
  //     에코가 스스로 때리는 별도 공격이라 버프가 아니다
  //   사용 가능 횟수 2회 · 8초마다 1회 회복 — 로테이션 규칙이다
  "6010121": [
    {
      label: "메인 슬롯 장착 시 전도 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Electro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 케라사우르스 (6010112)
  //   메인 슬롯 장착 시 기류 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00%
  //
  // 미반영 — 내리치기 268.20%, 재사용 돌진 268.20% 기류 피해는
  //   어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6010112": [
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Aero",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 카피타네우스 (6010104)
  //   메인 슬롯 장착 시 회절 피해 보너스 12.00%, 강공격 피해 보너스 12.00%
  //
  // 미반영 — 내려찍기 118.80%와 「매서운 판결」 4개 × 59.40% 회절 피해는
  //   어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6010104": [
    {
      label: "메인 슬롯 장착 시 회절 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Spectro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 악몽 · 지옥불 기사 (6010091)
  //   메인 슬롯 장착 시 용융 피해 보너스 12.00%, 공명 스킬 피해 보너스 12.00%
  //
  // 미반영 — 도약 405.00%, 길게 누름(라이딩) 종료 시 283.50% 용융 피해는
  //   어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6010091": [
    {
      label: "메인 슬롯 장착 시 용융 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Fusion",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 악몽 · 크라운리스 (6010090)
  //   메인 슬롯 장착 시 인멸 피해 보너스 12.00%, 일반 공격 피해 보너스 12.00%
  //   목표 명중 후 2초간 이 에코 어빌리티 피해 20.00% 증가(중첩 불가)
  //
  // 미반영
  //   264.60% 인멸 피해 — 어빌리티 자체 배율이라 공격 데이터 쪽이다
  //   발동 가능 횟수 3회 · 12초마다 1회 회복 — 로테이션 규칙이다
  "6010090": [
    {
      label: "메인 슬롯 장착 시 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Havoc",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "명중 후 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "악몽 · 크라운리스가 목표 명중 후 2초간 (중첩 불가)",
    },
  ],

  // 이상 · 이성(異性) 무장 (6010083)
  //   메인 슬롯 장착 시 응결 피해 보너스 12.00%, 공명 스킬 피해 보너스 12.00%
  //
  // 미반영
  //   405.00% 응결 피해(기본 · 「강습 출력」 만충 시 급강하) — 어빌리티 자체 배율이라 공격 데이터 쪽이다
  //   공명 해방으로 「강습 출력」을 쌓아 쿨타임을 리셋하는 것, 급강하의 동결 —
  //     로테이션·군중 제어라 피해식에 자리가 없다
  "6010083": [
    {
      label: "메인 슬롯 장착 시 응결 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Glacio",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 로렐라이 (6010082)
  //   메인 슬롯 장착 시 인멸 피해 보너스 12.00%, 일반 공격 피해 보너스 12.00%
  //
  // 미반영 — 405.00% 인멸 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6010082": [
    {
      label: "메인 슬롯 장착 시 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Havoc",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 거대 인형 (6010081) — 버프 없음
  //   연속 공격 4단 46.98% + 1단 125.28% 물리 피해뿐인 순수 피해 어빌리티다.
  "6010081": [],

  // 이상 · 블레이드 댄서 (6010080)
  //   메인 슬롯 장착 시 전도 피해 보너스 12.00%
  //
  // 미반영 — 313.20% 전도 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6010080": [
    {
      label: "메인 슬롯 장착 시 전도 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Electro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 유령 인형 (6010079) — 버프 없음
  //   연속 공격 6단 19.26% + 1단 77.04% 용융 피해뿐인 순수 피해 어빌리티다.
  "6010079": [],

  // 이상 · 방랑 기사 (6010073) — 버프 없음
  //   내려치기 313.20% 전도 피해뿐인 순수 피해 어빌리티다.
  "6010073": [],

  // 이상 · 미믹 (6010072) — 버프 없음
  //   3단 × 64.19% 회절 피해뿐인 순수 피해 어빌리티다.
  "6010072": [],

  // 이상 · 근무 인형 (6010071) — 버프 없음
  //   회전 도약 후 내려찍기 268.20% 물리 피해뿐인 순수 피해 어빌리티다.
  "6010071": [],

  // 이상 · 구름 바다 요정 (6010068) — 버프 없음
  //   파티 등장 캐릭터의 HP를 최대 HP의 2.70%씩 최대 4회 회복시킬 뿐이다. 치료는 피해식에 자리가 없다.
  "6010068": [],

  // 이상 · 페이 이그니스 (6010067) — 버프 없음
  //   129.60% 인멸 피해뿐인 순수 피해 어빌리티다.
  "6010067": [],

  // 이상 · 돌아갈 곳이 없는 오류 (6010060)
  //   어빌리티 사용 시 20초간 파티 전원의 공격력 10% 증가
  //   에코 쪽 공격력%는 statGroup 기본값이 buff라 따로 적지 않는다.
  //
  // 미반영
  //   HP 최대치 15.86% · 길게 누름 1.58% · 최후의 일격 19.82% 회절 피해 —
  //     어빌리티 자체 배율이라 공격 데이터 쪽이다(HP에 비례한다)
  "6010060": [
    {
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      value: 0.1,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티 발동 시, 20초간",
    },
    {
      label: "파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.1,
      uptime: "active",
      scope: "party", // 파티 내 모든 캐릭터
      condition: "에코 어빌리티 사용 시, 20초간",
    },
  ],

  // 이상 · 흑월의 야수 (6010058) — 버프 없음
  //   덮치기 135.36% 회절 피해와 명중 시 생기는 「유광」 6개의 폭발 15.04% 회절 피해뿐이다.
  //   길게 눌러 유지하는 도약·공중 이동은 이동 기능이라 피해식과 무관하다.
  "6010058": [],

  // 이상 · 용비늘의 기축 (6010057) — 버프 없음
  //   가드 종료 · 반격 553.60%, 특수 스킬 격파 반격 553.60%+276.80% 응결 피해뿐이다.
  //   가드 상태 자체와 특수 스킬 격파는 피격 처리라 피해식에 자리가 없다.
  "6010057": [],

  // 이상 · 무망자 (6010053)
  //   방랑자 · 인멸 전용. 공명 해방 「임연사적」 후 5초 내에 이 에코 어빌리티 피해가 50.00% 증가
  //
  // 미반영 — 1~5회차 54.08% · 마지막 270.40% 인멸 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6010053": [
    {
      label: "방랑자 · 인멸 전용 · 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.5,
      onlyCharacters: ["rover-havoc"],
      uptime: "active",
      scope: "self",
      condition: "장착 캐릭터가 방랑자 · 인멸일 때, 공명 해방 「임연사적」 발동 후 5초 이내",
    },
  ],

  // 이상 · 음험한 백로 (6010052)
  //   변신 후 첫 명중부터 15초 내에 반주 스킬을 쓰면, 다음 교체 캐릭터의 피해가 12% 증가한다(15초).
  //   하이와티아(6000189)와 같은 변주 릴레이형이고, 속성을 가리지 않는 전체 피해다.
  //
  // 미반영
  //   내리찍기 310.56%, 길게 누름 각 단 55.73% 인멸 피해 — 어빌리티 자체 배율이라 공격 데이터 쪽이다
  //   첫 명중 시 공명 에너지 10pt 회복 — 피해식에 자리가 없다
  "6010052": [
    {
      label: "변주 등장 캐릭터 피해 증가",
      target: "damageBonus",
      damageType: "All",
      value: 0.12,
      uptime: "active",
      scope: "party", // 다음 교체(변주)로 등장하는 캐릭터
      condition: "변신 후 첫 명중부터 15초 내에 반주 스킬 발동 시, 다음 교체 캐릭터에게 15초간",
    },
  ],

  // 이상 · 딩동동 (6010051) — 버프 없음
  //   추적 후 자폭해 32.00%+64 응결 피해를 줄 뿐인 순수 피해 어빌리티다.
  "6010051": [],

  // 이상 · 크라운리스 (6010042)
  //   변신 후 15초간 인멸 피해 보너스 12.00%, 공명 스킬 피해 보너스 12.00%
  //   메인 슬롯 장착이 아니라 「변신 후」가 조건이라 uptime은 active다.
  //
  // 미반영 — 1~2회차 1단 134.08% · 3회차 2단 100.56% · 4회차 3단 67.04% 인멸 피해는
  //   어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6010042": [
    {
      label: "변신 후 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Havoc",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 변신 후 15초간",
    },
    {
      label: "변신 후 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 변신 후 15초간",
    },
  ],

  // 하늘의 기관 인형 · 겁살 (6000221)
  //   메인 슬롯 장착 시 기류 피해 보너스 10.00%
  //   목표에게 「조화 밀집 · 이탈」 추가 시 기류 피해 보너스 10.00% 추가(15초)
  //
  // 미반영 — 405.00% 기류 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6000221": [
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Aero",
      value: 0.1,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "「조화 밀집 · 이탈」 추가 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Aero",
      value: 0.1,
      uptime: "active",
      scope: "self",
      condition: "메인 슬롯 장착 상태에서 목표에게 「조화 밀집 · 이탈」 추가 시, 15초간",
    },
  ],

  // 천괴중루 (6000218)
  //   메인 슬롯 장착 시 인멸 피해 보너스 12.00%, 강공격 피해 보너스 12.00%
  //
  // 미반영
  //   109.44% 인멸 피해 — 어빌리티 자체 배율이라 공격 데이터 쪽이다
  //   「수많은 기억 속 검의 소리」 4자루가 「암흑 효과」 부여 때마다 1자루씩 소모되며
  //     터뜨리는 41.04% 인멸 피해 — 에코가 스스로 때리는 별도 공격이라 버프가 아니다
  "6000218": [
    {
      label: "메인 슬롯 장착 시 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Havoc",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 만와뢰 · 잔해 (6000217)
  //   메인 슬롯 장착 시 용융 피해 보너스 12.00%, 강공격 피해 보너스 12.00%
  //
  // 초기 타격(HP 최대치 10.20% 용융)은 공격 데이터 쪽이다 — 공격력이 아니라 HP에 비례한다.
  // 짓밟기(1회당 0.37%, 최대 19회)는 적이 경로에 있어야 들어가서 실제 횟수가 매번 다르므로
  //   여기 스택으로 두었다. 스택 수 = 짓밟은 횟수다.
  "6000217": [
    {
      label: "메인 슬롯 장착 시 용융 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Fusion",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "짓밟기 (1회당 HP 최대치 0.37%)",
      target: "motionValue",
      damageType: "Echo",
      attackIds: ["echo:6000217#0"],
      value: 0.0037,
      modifier: "increase", // 계수에 그대로 더해진다
      stacks: 19, // 원문의 최대치
      maxStacks: 19,
      uptime: "active",
      scope: "self",
      condition: "경로상의 적을 몇 번 짓밟았는지 — 최대 19회",
    },
  ],

  // 봉정계유 (6000216) — 버프 없음
  //   메인 슬롯 장착 시 치료 효과 보너스 10.00% — BuffTarget에 치료 효과 자리가 없고
  //     치료는 피해식에 들어가지 않는다
  //   237.60% 응결 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6000216": [],

  // 안개 수존 (6000215) — 버프 없음
  //   화염 7단 × 33.93% 용융 피해뿐인 순수 피해 어빌리티다. 「안개 수존」 계열의 본체.
  "6000215": [],

  // 불씨의 사냥꾼 (6000214) — 버프 없음
  //   불덩이 192.60% + 지면 명중 시 폭발 192.60% 용융 피해뿐인 순수 피해 어빌리티다.
  "6000214": [],

  // 안개 수존 · 머리 (6000213) — 버프 없음
  //   돌진 129.60% 용융 피해뿐인 순수 피해 어빌리티다.
  "6000213": [],

  // 안개 수존 · 몸 (6000212) — 버프 없음
  //   내려치기 192.60% 용융 피해뿐인 순수 피해 어빌리티다.
  "6000212": [],

  // 심월 인형 · 공(恐) (6000211) — 버프 없음
  //   1단 51.84% + 1단 77.76% 인멸 피해뿐인 순수 피해 어빌리티다. 「심월 인형」 여섯 번째.
  "6000211": [],

  // 심월 인형 · 비(悲) (6000210) — 버프 없음
  //   129.60% 회절 피해뿐인 순수 피해 어빌리티다. 「심월 인형」 다섯 번째.
  "6000210": [],

  // 심월 인형 · 사(思) (6000209) — 버프 없음
  //   2단 × 64.80% 전도 피해뿐인 순수 피해 어빌리티다. 우(憂)의 전도판.
  "6000209": [],

  // 심월 인형 · 우(憂) (6000208) — 버프 없음
  //   2단 × 64.80% 응결 피해뿐인 순수 피해 어빌리티다. 「심월 인형」 세 번째.
  "6000208": [],

  // 심월 인형 · 노(怒) (6000207) — 버프 없음
  //   129.60% 용융 피해뿐인 순수 피해 어빌리티다. 희(喜)의 용융판.
  "6000207": [],

  // 심월 인형 · 희(喜) (6000206) — 버프 없음
  //   129.60% 물리 피해뿐인 순수 피해 어빌리티다.
  "6000206": [],

  // 금정후 (6000205) — 버프 없음
  //   HP 회복(최대 HP의 0.55% × 13회 + 24pt)은 치료라 피해식에 자리가 없고,
  //   강타 153.90% 기류 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다.
  "6000205": [],

  // 석정후 (6000204) — 버프 없음
  //   129.60% 기류 피해뿐인 순수 피해 어빌리티다.
  "6000204": [],

  // 자정후 (6000203) — 버프 없음
  //   참격 2단 19.44% + 회전 돌진 7단 12.96% 기류 피해뿐인 순수 피해 어빌리티다.
  "6000203": [],

  // 분해된 전사 (6000202) — 버프 없음
  //   연속 펀치 7단 19.26% + 어퍼컷 57.78% 회절 피해뿐인 순수 피해 어빌리티다.
  "6000202": [],

  // 공명의 메아리 · 악몽 아담 · 스매셔 (6000201)
  //   메인 슬롯 장착 시, 장착 캐릭터가 루시 혹은 레베카면 크리티컬 15% 증가
  //
  // 미반영
  //   16단 10.26% 물리 피해, 루시 장착 시 273.60% 회절, 레베카 장착 시 16단 17.10% 전도 —
  //     전부 어빌리티 자체 배율이라 공격 데이터 쪽이다(장착 캐릭터에 따라 어빌리티가 통째로 바뀐다)
  //   루시의 특수 이동 상태(이동 속도 증가, 주변 목표 시간 흐름 감속) — 피해식에 자리가 없다
  "6000201": [
    {
      label: "루시 · 레베카 전용 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 0.15,
      // 낀 사람이 루시나 레베카가 아니면 아예 목록에 뜨지 않는다.
      onlyCharacters: ["lucy", "rebecca"],
      uptime: "passive", // 조건이 캐릭터 지정뿐이라 맞으면 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시, 장착 캐릭터가 루시 혹은 레베카일 경우",
    },
  ],

  // 공명의 메아리 · 데니아 (6000200)
  //   어빌리티 후 15초 내에 반주 스킬을 쓰면, 다음 변주 스킬로 등장하는 캐릭터의
  //   용융 피해 보너스가 12.00% 증가한다(15초). 글로모스(6000195)의 용융판이다.
  //
  // 미반영 — 273.60% 용융 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6000200": [
    {
      label: "변주 등장 캐릭터 용융 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Fusion",
      value: 0.12,
      uptime: "active",
      scope: "party", // 변주 스킬로 등장하는 캐릭터
      condition: "에코 어빌리티 후 15초 내에 반주 스킬 발동 시, 다음 변주 등장 캐릭터에게 15초간",
    },
  ],

  // 공명의 메아리 · 명식 · 허무의 신 (6000199)
  //   메인 슬롯 장착 시 응결 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00%
  //   레비아탄(6000167)과 같은 「명식」 계열이고 속성만 다르다.
  //
  // 미반영 — 5단 21.88% + 1단 164.16% 응결 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6000199": [
    {
      label: "메인 슬롯 장착 시 응결 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Glacio",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 보이드 모스 (6000198)
  //   어빌리티 후 15초 내에 반주 스킬을 쓰면, 다음 변주 스킬로 등장하는 캐릭터의
  //   공격력이 12.00% 증가한다(15초). 「역광 속 눈부신 서약」 5세트와 같은 변주 릴레이형이다.
  //   공격력%는 statGroup 기본값이 buff라 따로 적지 않는다.
  //
  // 미반영 — 짧게 누름 405.00%, 길게 누름 최대 12단 49.33% 회절 피해는
  //   어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6000198": [
    {
      label: "변주 등장 캐릭터 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.12,
      uptime: "active",
      scope: "party", // 변주 스킬로 등장하는 캐릭터
      condition: "에코 어빌리티 후 15초 내에 반주 스킬 발동 시, 다음 변주 등장 캐릭터에게 15초간",
    },
  ],

  // 쉐도우 스태퍼 (6000197) — 버프 없음
  //   129.60% 인멸 피해뿐인 순수 피해 어빌리티다.
  "6000197": [],

  // 아이스글린트 댄서 (6000196) — 버프 없음
  //   변신 후 205.20% 응결 피해뿐인 순수 피해 어빌리티다.
  "6000196": [],

  // 글로모스 (6000195)
  //   어빌리티 후 15초 내에 반주 스킬을 쓰면, 다음 변주 스킬로 등장하는 캐릭터의
  //   응결 피해 보너스가 12.00% 증가한다(15초). 하이와티아(6000189)와 같은 변주 릴레이형이다.
  //
  // 미반영 — 273.60% 응결 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6000195": [
    {
      label: "변주 등장 캐릭터 응결 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Glacio",
      value: 0.12,
      uptime: "active",
      scope: "party", // 변주 스킬로 등장하는 캐릭터
      condition: "에코 어빌리티 후 15초 내에 반주 스킬 발동 시, 다음 변주 등장 캐릭터에게 15초간",
    },
  ],

  // 공명의 메아리 · 크로나클라우 (6000194) — 버프 없음
  //   공중 최대 8단 8.04% + 2단 24.13%, 낙하 1단 155.55% 기류 피해뿐인 순수 피해 어빌리티다.
  "6000194": [],

  // 크로나블라이트 (6000193) — 버프 없음
  //   변신 후 낙하 공격 268.20% 전도 피해뿐인 순수 피해 어빌리티다.
  "6000193": [],

  // 이름없는 탐색자 (6000192)
  //   메인 슬롯 장착 시 기류 피해 보너스 12.00%, 에코 어빌리티 피해 보너스 20.00%
  //
  // 미반영 — 273.60% 관통 기류 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6000192": [
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Aero",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 에코 어빌리티 피해 보너스",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.2,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 시길룸 (6000191)
  //   메인 슬롯 장착 시, 장착 캐릭터가 에이메스면 공명 해방 피해 보너스 25.00% 증가
  //
  // 미반영 — 1단 68.40% + 1단 205.20% 용융 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6000191": [
    {
      label: "에이메스 전용 · 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.25,
      onlyCharacters: ["aymes"],
      uptime: "passive", // 조건이 캐릭터 지정뿐이라 맞으면 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시, 장착 캐릭터가 에이메스일 경우",
    },
  ],

  // 리액터 허스크 (6000190)
  //   메인 슬롯 장착 시 공명 효율 10.00% 증가
  //
  // 미반영 — 351.00% 용융 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6000190": [
    {
      label: "메인 슬롯 장착 시 공명 효율",
      target: "energyRegen",
      damageType: "All",
      value: 0.1,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 하이와티아 (6000189)
  //   어빌리티 후 15초 내에 반주 스킬을 쓰면, 다음 변주 스킬로 등장하는 캐릭터의
  //   전체 속성 피해 보너스가 10.00% 증가한다(15초).
  //
  // 미반영 — 10단 × 27.36% 회절 피해는 어빌리티 자체 배율이라 공격 데이터 쪽이다
  "6000189": [
    {
      label: "변주 등장 캐릭터 전체 속성 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      value: 0.1,
      uptime: "active",
      scope: "party", // 변주 스킬로 등장하는 캐릭터
      condition: "에코 어빌리티 후 15초 내에 반주 스킬 발동 시, 다음 변주 등장 캐릭터에게 15초간",
    },
  ],

  // 바람의 기생갑 (6000188) — 버프 없음
  //   변신 후 발차기 268.20% 기류 피해뿐인 순수 피해 어빌리티다.
  "6000188": [],

  // 서리의 기생갑 (6000187) — 버프 없음
  //   펀치 192.60% 응결 피해뿐인 순수 피해 어빌리티다.
  "6000187": [],

  // 세이버캣 프라울러 (6000186) — 버프 없음
  //   빛줄기 192.60% 인멸 피해뿐인 순수 피해 어빌리티다. 세이버캣 리버(6000185)의 인멸판.
  "6000186": [],

  // 세이버캣 리버 (6000185) — 버프 없음
  //   192.60% 용융 피해뿐인 순수 피해 어빌리티다.
  "6000185": [],

  // 스페이스트렉 탐색기 (6000184) — 버프 없음
  //   근처 파티 등장 캐릭터에게 소환자 최대 HP의 10% 실드를 4초간 준다. 실드는 피해식에 자리가 없다.
  "6000184": [],

  // 아이언후프 (6000183) — 버프 없음
  //   돌진 53.64% + 날려치기 3단 13.41% · 1단 174.33% 용융 피해뿐인 순수 피해 어빌리티다.
  "6000183": [],

  // 마이닝 메카 레인디어 (6000182) — 버프 없음
  //   차지 일격 237.60% 전도 피해뿐인 순수 피해 어빌리티다.
  "6000182": [],

  // 플로라 메카 레인디어 (6000181) — 버프 없음
  //   넓은 범위에 192.60% 기류 피해를 줄 뿐인 순수 피해 어빌리티다.
  "6000181": [],

  // 트윈 노바 · 콜라사르 블레이드 (6000180)
  //   네뷸러스 캐논(6000179)의 짝. 붙는 자리는 같고 속성만 전도다.
  //   메인 슬롯 장착 시 전도 피해 보너스 12.00%, 일반 공격 피해 보너스 12.00%
  //   네뷸러스 캐논과 같이 낄 때 붙는 「트윈 노바 · 율동」 스택
  //
  // 미반영
  //   5초간 각 단 2.01% 전도 피해 — 어빌리티 자체 배율이라 공격 데이터 쪽이다
  //   같이 낄 때 이 에코의 피해 유형과 위 전도 피해 보너스가 회절로 바뀌는 것 — 조건에 따라
  //     element가 통째로 갈리는 것이라 한 줄로는 담기지 않는다. 회절로 쓰려면 아래 element를 바꾼다
  //   어빌리티가 번갈아 바뀌는 것, 사용 가능 횟수 2회·8초마다 1회 회복 — 로테이션 규칙이다
  "6000180": [
    {
      label: "메인 슬롯 장착 시 전도 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Electro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시 (네뷸러스 캐논과 함께 장착 시 회절로 변경)",
    },
    {
      label: "메인 슬롯 장착 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "「트윈 노바 · 율동」 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.1, // 스택 1개당
      stacks: 6,
      maxStacks: 6,
      uptime: "active",
      scope: "self",
      condition:
        "네뷸러스 캐논과 함께 장착 시. 일반 공격 1스택 · 공명 스킬 3스택, 최대 6스택, 8초간 지속",
    },
  ],

  // 트윈 노바 · 네뷸러스 캐논 (6000179)
  //   메인 슬롯 장착 시 회절 피해 보너스 12.00%, 일반 공격 피해 보너스 12.00%
  //   콜라사르 블레이드(6000180)와 같이 낄 때 붙는 「트윈 노바 · 율동」 스택
  //
  // 미반영
  //   2단 × 80.51% 회절 피해 — 어빌리티 자체 배율이라 공격 데이터 쪽이다
  //   두 에코 어빌리티가 번갈아 바뀌는 것, 콜라사르 블레이드의 피해 유형이 회절로 바뀌는 것,
  //   사용 가능 횟수 2회로 늘고 8초마다 1회 회복되는 것 — 전부 로테이션 규칙이라 피해식에 자리가 없다
  "6000179": [
    {
      label: "메인 슬롯 장착 시 회절 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Spectro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "「트윈 노바 · 율동」 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.1, // 스택 1개당
      stacks: 6,
      maxStacks: 6,
      uptime: "active",
      scope: "self",
      condition:
        "콜라사르 블레이드와 함께 장착 시. 일반 공격 1스택 · 공명 스킬 3스택, 최대 6스택, 8초간 지속",
    },
  ],

  // 삐리릭 (6000178) — 버프 없음
  //   회전 공격 5단 × 25.92% 전도 피해뿐인 순수 피해 어빌리티다.
  "6000178": [],

  // 바위거미 S4형 (6000177) — 버프 없음
  //   1단 51.84% + 1단 77.76% 회절 피해뿐인 순수 피해 어빌리티다.
  "6000177": [],

  // 바위 호박벌 (6000176) — 버프 없음
  //   변신 후 2단 × 102.60% 인멸 피해뿐인 순수 피해 어빌리티다.
  "6000176": [],

  // 파종 호박벌 (6000175) — 버프 없음
  //   64.80% 기류 피해는 어빌리티 자체 배율이고,
  //   명중 범위 내 캐릭터 HP 회복(최대 HP의 3.60% + 160pt)은 치료라 피해식에 자리가 없다.
  "6000175": [],

  // 전율하는 전사 (6000174) — 버프 없음
  //   변신 후 강타 205.20% 전도 피해뿐인 순수 피해 어빌리티다.
  "6000174": [],

  // 악몽 · 가시장미버섯 (6000173) — 버프 없음
  //   레이저 최대 3회 × 57.07% 인멸 피해뿐인 순수 피해 어빌리티다.
  "6000173": [],

  // 악몽 · 피그미타조 (6000172) — 버프 없음
  //   추적 공격 3회 × 38.40% 물리 피해뿐인 순수 피해 어빌리티다.
  "6000172": [],

  // 악몽 · 우글글 (6000171) — 버프 없음
  //   부딪힘 68.48% / 물어뜯기 102.72% 인멸 피해뿐이다.
  //   물어뜯긴 적의 「공진 수치」가 5초간 총 5.00% 감소하는 것은 적 게이지를 깎는 효과라
  //   피해식의 어느 자리에도 들어가지 않는다.
  "6000171": [],

  // 악몽 · 가시장미버섯(유체) (6000170) — 버프 없음
  //   레이저 한 줄기로 32.00%+64 인멸 피해를 줄 뿐인 순수 피해 어빌리티다.
  "6000170": [],

  // 악몽 · 그린멜팅카멜레온(유체) (6000169) — 버프 없음
  //   변신해 제자리에서 HP를 회복할 뿐이다. 치료는 피해식에 들어가지 않아 옮길 것이 없다.
  "6000169": [],

  // 악몽 · 그린멜팅카멜레온 (6000168) — 버프 없음
  //   순수 피해 어빌리티. 10회 × 17.12% 용융 피해뿐이라 옮길 버프가 없다.
  "6000168": [],

  // 공명의 메아리 · 명식 · 레비아탄 (6000167)
  //   메인 슬롯에 장착 시 자신의 인멸 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00% 증가
  //
  //   「핵심 붕괴」 — 지속 중 파티 등장 캐릭터가 피해를 입힐 때마다 1단 24.57% 인멸이
  //     따라붙는다(15초간 8회까지, 0.5초당 1회).
  //
  // 「시야 붕괴」 2단 × 131.04%는 공격 데이터 쪽이다(echoAttackOverrides.ts).
  //
  // 핵심 붕괴를 왜 버프로 두는가 — 발동 횟수가 파티가 얼마나 때렸는지에 달려 있어서
  // 공격으로 못 박아 둘 수가 없다. 스택으로 두면 실제로 몇 번 터졌는지 골라 담을 수 있다.
  // 버프는 타격을 새로 만들지 못하므로 스킬 배율에 더하는 방식인데, 같은 인멸 · 에코
  // 피해라 크리티컬과 피해 보너스가 똑같이 걸려 결과는 같다.
  //
  // 「암흑 효과」 적에게 이 추가 피해가 100% 증가하는 것은 **한 줄 더**로 적었다.
  //   100% 증가 = 핵심 붕괴분이 한 벌 더 얹히는 것이라, 같은 24.57%를 스택만큼 또 더하면 된다.
  //   본체(131.04%)에는 걸리지 않으므로 배율을 통째로 곱하는 방식으로는 적을 수 없었다.
  //   두 줄의 스택 수는 같이 맞춰야 한다 — 같은 발동 횟수를 세는 것이라서다.
  "6000167": [
    {
      label: "메인 슬롯 장착 시 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "Havoc",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "핵심 붕괴 (1스택당 24.57% 인멸)",
      target: "motionValue",
      damageType: "Echo",
      value: 0.2457, // 1회당 24.57%
      modifier: "increase", // 계수에 그대로 더해진다
      stacks: 8, // 15초 안에 다 터진 경우
      maxStacks: 8, // 「해당 효과는 8회 발생할 수 있으며」
      uptime: "active",
      scope: "self",
      condition: "핵심 붕괴 지속 중(15초) 파티 등장 캐릭터가 피해를 입힌 횟수만큼 — 0.5초당 1회",
    },
    {
      label: "핵심 붕괴 · 암흑 효과 적용 (피해 100% 증가분)",
      target: "motionValue",
      damageType: "Echo",
      // 「100% 증가」는 핵심 붕괴분이 한 벌 더 얹히는 것이라 같은 24.57%를 한 번 더 더한다.
      // 위 「핵심 붕괴」와 **함께** 켜야 뜻이 맞고, 스택 수도 같이 맞춰야 한다.
      value: 0.2457,
      modifier: "increase",
      stacks: 8,
      maxStacks: 8,
      uptime: "active",
      scope: "self",
      condition: "적이 「암흑 효과」 상태일 때 — 위 「핵심 붕괴」와 같은 스택으로 함께 켠다",
    },
  ],

  // 악몽 · 쮸쮸복어 (6000166) — 버프 없음
  //   일반판 「쮸쮸복어」(6000047)와 문구·배율이 완전히 같다 — 「악몽」 접두만 다르다.
  //   순수 피해 어빌리티이고 격퇴는 군중 제어라 피해식과 무관하다.
  "6000166": [],

  // 악몽 · 꾹꾹복어 (6000165) — 버프 없음
  //   「거품을 5회 내뿜어 매회 23.04%의 응결 피해」 순수 피해 어빌리티다.
  //   일반판 「쮸쮸복어」(3회 × 38.40% 기류)와 같은 복어 계열이다.
  "6000165": [],

  // 악몽 · 부메랑 사냥꾼 (6000164) — 버프 없음
  //   「부메랑을 날려 명중마다 28.80%의 기류 피해, 최대 3회」 순수 피해 어빌리티다.
  //   사냥꾼 계열 세 번째이고 셋 다 쿨 8초에 버프가 없다.
  "6000164": [
    {
      label: "부메랑 추가 발사 (1회당 28.80%, 공격에 담긴 1회에 더한다)",
      target: "motionValue",
      damageType: "Echo",
      attackIds: ["echo:6000164#0"],
      value: 0.288,
      modifier: "increase",
      stacks: 2, // 세 번 다 맞힌 경우 — 공격의 1회와 합쳐 3회
      maxStacks: 2,
      uptime: "active",
      scope: "self",
      condition: "부메랑이 몇 번 더 맞았는지 — 공격에 1회가 들어 있으니 스택 2면 3회다",
    },
  ],

  // 악몽 · 경칩의 사냥꾼 (6000163) — 버프 없음
  //   「4회 × 17.28% + 마지막 1회 46.08%의 전도 피해」 순수 피해 어빌리티다.
  //   상강의 사냥꾼(응결)과 같은 사냥꾼 계열이고 속성만 다르다.
  "6000163": [],

  // 악몽 · 초록색 왜가리 (6000162) — 버프 없음
  //   「회오리 바람으로 돌진해 236.80%의 기류 피해」 순수 피해 어빌리티다.
  //   「적의 특수 스킬 격파」는 판정이라 피해식과 무관하다(용비늘의 기축과 같은 이유).
  "6000162": [],

  // 악몽 · 보라색 왜가리 (6000161) — 버프 없음
  //   「패링 후 반격 288.00% 전도 피해」 순수 피해 어빌리티다.
  //   패링 중 피격 시 협주 에너지 5pt 추가 회복은 자원이라 피해식과 무관하다.
  //   악몽 계열 중 네 번째로 장착 효과가 없다.
  "6000161": [],

  // 바다의 여인 (6000160)
  //   메인 슬롯에 장착 시 자신의 기류 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00% 증가
  //
  // 「장착 효과 두 자리」 표준 꼴(속성 + 분류)이다. 케라사우르스와 같은 조합이다.
  //
  // 미반영 — 어빌리티 자체의 피해(「파도의 소용돌이」 최대 10단 × 13.68% + 1단 164.16% 기류)는
  //   공격 데이터 쪽이다.
  "6000160": [
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 애곡하는 아익스 (6000145)
  //   변신 후 캐릭터 회절 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00% 증가 (지속 15초)
  //
  // 일반판 「애곡하는 아익스」(6000045)와 배율·버프가 완전히 같다 — 「이상」 접두만 다르다.
  // (악몽판 6000092는 장착 효과 + 광학 조건부로 달랐다)
  //
  // 미반영 — 어빌리티 자체의 피해(발톱 157.44% / 236.16% 회절)는 공격 데이터 쪽이다.
  "6000145": [
    {
      label: "변신 후 회절 피해 보너스",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 변신 후, 15초간",
    },
    {
      label: "변신 후 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 변신 후, 15초간",
    },
  ],

  // 거짓의 신왕 (6000121)
  //   메인 슬롯에 장착 시 자신의 전도 피해 보너스 12.00%, 강공격 피해 보너스 12.00% 증가
  //
  // 쿨 8초짜리에도 장착 효과가 붙은 첫 사례다(지금까지 쿨 8초는 전부 버프가 없었다).
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   사용 가능 횟수(초기 2회, 8초마다 1회 충전, 최대 2회) — 쿨 관리라 피해식과 무관하다
  //   어빌리티 자체의 피해(4단 × 55.35% 전도)와
  //   「변주 스킬로 등장 시 거짓의 신왕을 소환해 405.00% 전도 피해」는 공격 데이터 쪽이다
  //   — echoAttackOverrides.ts에 두 갈래로 나눠 적어 두었다
  "6000121": [
    {
      label: "메인 슬롯 장착 시 전도 피해 보너스",
      target: "damageBonus",
      damageType: "Electro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 코로사우루스 (6000120)
  //   메인 슬롯에 장착 시 자신의 용융 피해 보너스 12.00%,
  //   에코 어빌리티 피해 보너스 20.00% 증가
  //
  // 악몽 · 헤카테와 같은 「속성 12% + 에코 20%」 조합이다.
  //
  // 미반영 — 어빌리티 자체의 피해(273.60% 용융)는 공격 데이터 쪽이다.
  "6000120": [
    {
      label: "메인 슬롯 장착 시 용융 피해 보너스",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 에코 어빌리티 피해 보너스",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.2,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 악몽 · 초혼의 악사 (6000119) — 버프 없음
  //   「인멸 울림을 주우면 10초간 강화 효과, 명중마다 초혼의 악사가 14.40% 인멸 피해(최대 10회)」
  //   「강화 효과」에 수치가 적혀 있지 않아 버프로 옮길 게 없고, 딸려 나오는 것은 추가 피해뿐이다.
  //   그 피해는 에코가 스스로 때리는 별도 공격이라 공격 데이터 쪽이다.
  "6000119": [
    {
      label: "명중 추가 발생 (1회당 14.40%, 공격에 담긴 1회에 더한다)",
      target: "motionValue",
      damageType: "Echo",
      attackIds: ["echo:6000119#0"],
      value: 0.144,
      modifier: "increase",
      stacks: 9, // 열 번 다 터진 경우 — 공격의 1회와 합쳐 10회
      maxStacks: 9, // 원문의 최대 10회에서 공격에 담긴 1회를 뺀 만큼
      uptime: "active",
      scope: "self",
      condition: "파티가 목표를 몇 번 맞혔는지 — 공격에 1회가 들어 있으니 스택 9면 10회다",
    },
  ],

  // 악몽 · 상강의 사냥꾼 (6000118) — 버프 없음
  //   「얼음창 명중 46.08% + 축적 중 4.61% × 10회 + 폭발 23.04%의 응결 피해」
  //   순수 피해 어빌리티다. 악몽 계열 중 두 번째로 장착 효과가 없다.
  "6000118": [],

  // 악몽 · 심판하는 전사 (6000117) — 버프 없음
  //   「최대 3회 연속 사용, 1회마다 171.73%의 인멸 피해」 순수 피해 어빌리티다.
  //   악몽 계열 중 처음으로 장착 효과가 없다.
  "6000117": [
    {
      label: "연속 사용 추가분 (1회당 171.73%, 공격에 담긴 1회에 더한다)",
      target: "motionValue",
      damageType: "Echo",
      attackIds: ["echo:6000117#0"],
      value: 1.7173,
      modifier: "increase",
      stacks: 2, // 세 번 다 쓴 경우 — 공격의 1회와 합쳐 3회
      maxStacks: 2, // 원문의 최대 3회에서 공격에 담긴 1회를 뺀 만큼
      uptime: "active",
      scope: "self",
      condition: "몇 번 연속으로 썼는지 — 공격에 1회가 들어 있으니 스택 2면 3회다",
    },
  ],

  // 공명의 메아리 · 펜리코 (6000116)
  //   메인 슬롯에 장착 시 자신의 기류 피해 보너스 12.00%, 강공격 피해 보너스 12.00% 증가
  //
  // 「공명의 메아리」 계열 두 번째인데, 플뢰르 드 리스와 달리 캐릭터 전용 추가분이 없고
  // 「장착 효과 두 자리」 표준 꼴이다.
  //
  // 미반영 — 어빌리티 자체의 피해(「계율의 발톱」 273.60% 기류)는 공격 데이터 쪽이다.
  "6000116": [
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 악몽 · 헤카테 (6000115)
  //   메인 슬롯에 장착 시 자신의 인멸 피해 보너스 12.00%,
  //   에코 어빌리티 피해 보너스 20.00% 증가
  //
  // 두 번째 자리가 분류인데 「에코」다 — 장착 효과로 에코 피해 보너스가 붙은 첫 사례이고
  // 값도 12%가 아니라 20%다.
  // 일반판 「헤카테」(6000085)는 협동 공격 40%였는데 악몽판은 에코 어빌리티 쪽으로 바뀌었다.
  //
  // 미반영 — 어빌리티 자체의 피해(3단 × 152.39% 인멸)는 공격 데이터 쪽이다.
  "6000115": [
    {
      label: "메인 슬롯 장착 시 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "Havoc",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 에코 어빌리티 피해 보너스",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.2,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 영광의 사자 (6000114)
  //   메인 슬롯에 장착 시 자신의 용융 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00% 증가
  //
  // 「장착 효과 두 자리」 표준 꼴(속성 + 분류)이다.
  //
  // 미반영 — 어빌리티 자체의 피해(「영광의 폴암」 82.08% + 일정 시간 후 191.52% 용융)는
  //   공격 데이터 쪽이다.
  "6000114": [
    {
      label: "메인 슬롯 장착 시 용융 피해 보너스",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 악몽 · 켈피 (6000113)
  //   메인 슬롯에 장착 시 자신의 응결 피해 보너스 12.00%, 기류 피해 보너스 12.00% 증가
  //
  // 장착 효과 두 자리인데 둘 다 속성이다(분류가 없다) — 처음 나온 조합이다.
  //
  // 미반영 — 어빌리티 자체의 피해(405.00% 응결)와
  //   「반주 스킬 발동 후 퇴장 시 악몽 · 켈피를 소환해 405.00% 기류 피해」는 공격 데이터 쪽이다
  //   (에코 세트 「어둠의 장막」처럼 에코가 스스로 때리는 별도 공격이다).
  "6000113": [
    {
      label: "메인 슬롯 장착 시 응결 피해 보너스",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 케라사우르스 (6000112)
  //   메인 슬롯에 장착 시 자신의 기류 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00% 증가
  //
  // 「장착 효과 두 자리」 표준 꼴이다. 쿨 15초에도 이 형태가 나오는 걸 보면
  // 쿨타임과 장착 효과 유무는 상관이 없다.
  //
  // 미반영 — 어빌리티 자체의 피해(내리치기 268.20% + 재사용 돌진 268.20% 기류)는
  //   공격 데이터 쪽이다.
  "6000112": [
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 전도사의 경지 (6000111) — 버프 없음
  //   「268.20%의 기류 피해를 3회」 순수 피해 어빌리티다.
  "6000111": [],

  // 고행자의 인형 (6000110) — 버프 없음
  //   「43.20%의 기류 피해를 3회」 순수 피해 어빌리티다(드레이크 전도·회절판과 같은 구성).
  "6000110": [],

  // 드레이크 · 인멸 (6000109) — 버프 없음
  //   「129.60%의 인멸 피해」 순수 피해 어빌리티다(기류판과 타수·배율이 같다).
  //   드레이크 6속성이 이걸로 다 나왔고, 총량은 모두 129.6%로 같으며 타수만 1/3/5로 갈린다.
  "6000109": [],

  // 드레이크 · 회절 (6000108) — 버프 없음
  //   「43.20%의 회절 피해를 3회」 순수 피해 어빌리티다(전도판과 타수·배율이 같다).
  "6000108": [],

  // 드레이크 · 용융 (6000107) — 버프 없음
  //   「25.92%의 용융 피해를 5회」 순수 피해 어빌리티다(응결판과 타수·배율이 같다).
  "6000107": [],

  // 드레이크 · 응결 (6000103) — 버프 없음
  //   「25.92%의 응결 피해를 5회」 순수 피해 어빌리티다.
  //   드레이크 계열은 총량 129.6%를 속성마다 다른 타수로 나눈다(기류 1회 · 전도 3회 · 응결 5회).
  "6000103": [],

  // 드레이크 · 전도 (6000102) — 버프 없음
  //   「43.20%의 전도 피해를 3회」 순수 피해 어빌리티다.
  //   같은 드레이크 계열이라도 기류판(129.60% 1회)과 타수 구성이 다르다.
  "6000102": [],

  // 드레이크 · 기류 (6000101) — 버프 없음
  //   「129.60%의 기류 피해」 순수 피해 어빌리티다(유령 인형 계열과 같은 값, 속성만 다르다).
  "6000101": [],

  // 사체르도스 (6000100) — 버프 없음
  //   「64.80%의 기류 피해를 2회」 순수 피해 어빌리티다.
  "6000100": [],

  // 사지타리오 (6000099) — 버프 없음
  //   기본 268.20%, 이동 중 피격 시 강화 반격 268.20% + 53.64% × 5회의 회절 피해.
  //   순수 피해 어빌리티다. 「피해를 받지 않고」는 무적 판정이라 피해식과 무관하다.
  "6000099": [],

  // 라 과디어 (6000098) — 버프 없음
  //   짧게 268.20%, 길게 268.20% + 참격 17.87% × 15회의 물리 피해. 순수 피해 어빌리티다.
  "6000098": [],

  // 소용돌이 곰 (6000097) — 버프 없음
  //   「돌진 명중 156.60% + 종료 시 주먹 156.60%의 기류 피해」 순수 피해 어빌리티다.
  //   길게 누르기와 재사용은 조작 방식이라 피해식과 무관하다.
  "6000097": [],

  // 조각상을 재구성하는 돌멩이 (6000096) — 버프 없음
  //   짧게 누르면 313.20%, 길게 누르면 469.80%의 회절 피해. 순수 피해 어빌리티다.
  "6000096": [],

  // 기류 프리즘 (6000095) — 버프 없음
  //   「지속적으로 공격을 가하고 19.26%의 기류 피해」 순수 피해 어빌리티다.
  "6000095": [],

  // 유약 암괴 (6000094) — 버프 없음
  //   「근처 파티 내 캐릭터의 HP 최대치 2.52%를 회복(최대 5회)」 치료 전용이라
  //   피해식에 들어가는 것도, 옮길 버프도 없다(갈기늑대 · 바람 · 구름 바다 요정과 같은 꼴).
  "6000094": [],

  // 금석 암괴 (6000093) — 버프 없음
  //   「전방으로 돌진해 경로 위의 적에게 129.60%의 회절 피해」 순수 피해 어빌리티다.
  "6000093": [],

  // 악몽 · 애곡하는 아익스 (6000092)
  //   메인 슬롯에 장착 시 자신의 회절 피해 보너스 12.00% 증가
  //   적이 「광학 효과」 영향을 받고 있으면 이 에코가 입히는 피해가 100.00% 증가
  //
  // 두 번째는 백야 기사와 같은 자기 참조형 — damageType이 Echo다.
  // 「광학 효과」가 조건으로만 쓰여서 옮길 수 있다.
  //
  // 미반영 — 어빌리티 자체의 피해(273.60% 회절)는 공격 데이터 쪽이다.
  "6000092": [
    {
      label: "메인 슬롯 장착 시 회절 피해 보너스",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "광학 효과 적에게 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 1.0,
      uptime: "active",
      scope: "self",
      condition: "적이 「광학 효과」의 영향을 받고 있을 때",
    },
  ],

  // 악몽 · 지옥불 기사 (6000091)
  //   메인 슬롯에 장착 시 자신의 용융 피해 보너스 12.00%, 공명 스킬 피해 보너스 12.00% 증가
  //
  // 쿨 25초 악몽 계열의 표준 꼴(장착 효과 = 속성 12% + 분류 12%)이다.
  //
  // 미반영 — 어빌리티 자체의 피해(도약 405.00%, 라이딩 종료 시 283.50% 용융)는
  //   공격 데이터 쪽이다. 길게 누르기로 갈리므로 옮길 때 두 공격으로 나눠야 한다.
  "6000091": [
    {
      label: "메인 슬롯 장착 시 용융 피해 보너스",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 악몽 · 크라운리스 (6000090)
  //   메인 슬롯 장착 시 자신의 인멸 피해 보너스 12.00%, 일반 공격 피해 보너스 12.00% 증가
  //   목표 명중 후, 이 에코 어빌리티가 입히는 피해가 20.00% 증가 (2초, 중첩 불가)
  //
  // 세 번째는 자기 참조형이라 damageType이 Echo다(무망자 · 갈기늑대 눈꽃과 같은 꼴).
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   발동 가능 횟수(초기 3회, 12초마다 1회 충전, 최대 3회) — 쿨 관리라 피해식과 무관하다
  //   어빌리티 자체의 피해(264.60% 인멸)는 공격 데이터 쪽이다
  "6000090": [
    {
      label: "메인 슬롯 장착 시 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "Havoc",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "명중 후 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "악몽 · 크라운리스가 목표 명중 후, 2초간 (중첩 불가)",
    },
  ],

  // 악몽 · 천둥의 비늘 (6000089)
  //   메인 슬롯에 장착 시 자신의 전도 피해 보너스 12.00%, 공명 스킬 피해 보너스 12.00% 증가
  //
  // 일반판 「천둥의 비늘」(6000039)은 발톱 명중을 조건으로 전도 12% + 강공격 12%였는데,
  // 악몽판은 장착만 하면 걸리고 두 번째 자리가 공명 스킬로 바뀌었다.
  //
  // 미반영 — 어빌리티 자체의 피해(405.00% 전도)는 공격 데이터 쪽이다.
  "6000089": [
    {
      label: "메인 슬롯 장착 시 전도 피해 보너스",
      target: "damageBonus",
      damageType: "Electro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 악몽 · 뇌운의 비늘 (6000088)
  //   메인 슬롯에 장착 시 자신의 전도 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00% 증가
  //
  // 쿨 25초 5성 에코의 표준 꼴(장착 효과 = 속성 12% + 분류 12%)이다.
  //
  // 미반영 — 어빌리티 자체의 피해(405.00% 전도)는 공격 데이터 쪽이다.
  "6000088": [
    {
      label: "메인 슬롯 장착 시 전도 피해 보너스",
      target: "damageBonus",
      damageType: "Electro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 악몽 · 음험한 백로 (6000087)
  //   메인 슬롯에 장착 시 자신의 인멸 피해 보너스 12.00%, 강공격 피해 보너스 12.00% 증가
  //
  // 일반판 「음험한 백로」(6000052)는 반주 후 교체 캐릭터에게 피해 12%를 주는 서포터형이었는데,
  // 악몽판은 본인에게 상시로 붙는 딜러형으로 성격이 바뀌었다.
  //
  // 미반영 — 어빌리티 자체의 피해(최대 10단 × 40.50% 인멸)는 공격 데이터 쪽이다.
  "6000087": [
    {
      label: "메인 슬롯 장착 시 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "Havoc",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 악몽 · 폭주의 고릴라 (6000086)
  //   메인 슬롯에 장착 시 자신의 기류 피해 보너스 12.00%, 강공격 피해 보너스 12.00% 증가
  //
  // 일반판 「폭주의 고릴라」(6000043)는 추격 명중을 조건으로 같은 12%+12%를 줬는데,
  // 악몽판은 장착만 하면 걸리는 상시 효과다 — 조건이 사라지고 값은 그대로다.
  //
  // 미반영 — 어빌리티 자체의 피해(164.16% 기류, 「바람의 기둥」 최대 5단 × 21.89% 기류)는
  //   공격 데이터 쪽이다.
  "6000086": [
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 헤카테 (6000085)
  //   메인 슬롯에 장착 시 자신의 협동 공격이 입히는 피해가 40.00% 증가
  //
  // 장착 효과인데 속성·분류가 아니라 협동 공격(Chain)에 붙는다 — 에코 세트
  // 「하늘의 합주곡」과 같은 자리다. damageBonusType이 따로 적힌 협동 공격
  // (연무의 뇌전의 쐐기 등 공명 스킬로 판정되는 것)에는 걸리지 않는다.
  //
  // 미반영 — 어빌리티 자체의 피해(「명월의 시녀」 회전칼 45.59% 인멸)와
  //   패링 성공 시 존재 시간 리셋은 공격 데이터 · 판정 쪽이다.
  "6000085": [
    {
      label: "메인 슬롯 장착 시 협동 공격 피해 증가",
      target: "damageBonus",
      damageType: "Chain",
      value: 0.4,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 탄식의 고룡 (6000084)
  //   메인 슬롯에 장착 시 자신의 용융 피해 보너스 12.00%, 일반 공격 피해 보너스 12.00% 증가
  //
  // 로렐라이(인멸+일반공격) · 이성 무장(응결+공명스킬)과 같은 「장착 효과 두 자리」 꼴이다.
  //
  // 미반영 — 어빌리티 자체의 피해(「비통의 영역」이 주기적으로 주는 36.81% 용융)는
  //   공격 데이터 쪽이다.
  "6000084": [
    {
      label: "메인 슬롯 장착 시 용융 피해 보너스",
      target: "damageBonus",
      damageType: "Fusion",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이성(異性) 무장 (6000083)
  //   메인 슬롯에 장착 시 자신의 응결 피해 보너스 12.00%, 공명 스킬 피해 보너스 12.00% 증가
  //
  // 로렐라이와 같은 「장착 효과 두 자리」 꼴이고 속성·분류만 다르다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「강습 출력」 게이지와 그것이 가득 찼을 때의 쿨타임 리셋 — 자원·쿨 관리라 피해식과 무관하다
  //   어빌리티 자체의 피해(405.00% 응결, 급강하 405.00% 응결 + 동결)는 공격 데이터 쪽이다
  "6000083": [
    {
      label: "메인 슬롯 장착 시 응결 피해 보너스",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 로렐라이 (6000082)
  //   메인 슬롯에 장착 시 자신의 인멸 피해 보너스 12.00%, 일반 공격 피해 보너스 12.00% 증가
  //
  // 장착 효과 세 번째인데, 앞의 둘(파트리시우스 · 블레이드 댄서)과 달리 속성과 분류 두 자리에 붙는다.
  //
  // 미반영 — 어빌리티 자체의 피해(405.00% 인멸)는 공격 데이터 쪽이다.
  "6000082": [
    {
      label: "메인 슬롯 장착 시 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "Havoc",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 거대 인형 (6000081) — 버프 없음
  //   「4단 46.98% + 1단 125.28%의 물리 피해」 순수 피해 어빌리티다.
  "6000081": [],

  // 블레이드 댄서 (6000080)
  //   메인 슬롯에 이 에코를 장착하면 자신의 전도 피해 보너스가 12.00% 증가
  //
  // 파트리시우스 귀족과 같은 「장착 효과」이고 속성만 전도다.
  //
  // 미반영 — 어빌리티 자체의 피해(313.20% 전도)는 공격 데이터 쪽이다.
  "6000080": [
    {
      label: "메인 슬롯 장착 시 전도 피해 보너스",
      target: "damageBonus",
      damageType: "Electro",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 유령 인형 (6000079) — 버프 없음
  //   「6단 19.26% + 1단 77.04%의 용융 피해」 순수 피해 어빌리티다.
  "6000079": [],

  // 메르카토르 귀족 (6000078) — 버프 없음
  //   「얼음 가시 3개, 1개당 89.39%의 응결 피해」 순수 피해 어빌리티다.
  "6000078": [],

  // 글라디우스 귀족 (6000077) — 버프 없음
  //   짧게 누르면 268.20%, 길게 누르면 268.20% + 670.50%의 응결 피해.
  //   순수 피해 어빌리티라 옮길 버프가 없다(짝인 파트리시우스 귀족과 달리 장착 효과도 없다).
  "6000077": [],

  // 파트리시우스 귀족 (6000076)
  //   메인 슬롯에 이 에코를 장착하면 자신의 응결 피해 보너스가 12.00% 증가
  //
  // 처음 나온 「장착 효과」다 — 어빌리티를 쓰지 않아도 걸린다.
  // 에코 어빌리티는 메인 슬롯 에코에서만 나오므로 사실상 상시(passive)로 본다.
  //
  // 미반영 — 어빌리티 자체의 피해(268.20% 응결)는 공격 데이터 쪽이다.
  "6000076": [
    {
      label: "메인 슬롯 장착 시 응결 피해 보너스",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.12,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 흑야 기사 (6000075) — 버프 없음
  //   「도약하여 찌르고 268.20%의 인멸 피해」 순수 피해 어빌리티다.
  //   이름이 짝인 백야 기사와 달리 조건부 피해 증가가 없다.
  "6000075": [],

  // 백야 기사 (6000074)
  //   「광학 효과」의 영향을 받은 적에게 입히는 피해가 100.00% 증가
  //
  // 어빌리티 설명 안에서 피해 문장 바로 뒤에 붙어 있어, 이 에코 어빌리티가 입히는 피해로 읽었다
  // — damageType은 Echo다. 조건은 목표 상태(「광학 효과」 보유)라 엔진이 판정하지 못한다.
  // 여기서 「광학 효과」는 조건으로만 쓰여 옮길 수 있다(불빛의 심판처럼 그 피해 자체를
  // 부스트하는 경우가 아니다 — 그건 BuffDamageType에 자리가 없어 미반영이었다).
  //
  // 미반영 — 어빌리티 자체의 피해(268.20% 회절)는 공격 데이터 쪽이다.
  "6000074": [
    {
      label: "광학 효과 적에게 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 1.0,
      uptime: "active",
      scope: "self",
      condition: "목표가 「광학 효과」의 영향을 받고 있을 때",
    },
  ],

  // 방랑 기사 (6000073) — 버프 없음
  //   「내려치기로 313.20%의 전도 피해」 순수 피해 어빌리티다.
  //   쿨 20초짜리 중에서는 처음으로 버프가 없는 사례다.
  "6000073": [],

  // 미믹 (6000072) — 버프 없음
  //   「3단 64.19%의 회절 피해」 순수 피해 어빌리티다.
  "6000072": [],

  // 근무 인형 (6000071) — 버프 없음
  //   「회전하며 뛰어올라 내려찍어 268.20%의 물리 피해」 순수 피해 어빌리티다
  //   (까부는 원숭이와 같은 배율, 속성만 다르다).
  "6000071": [],

  // 쓸쓸한 아가씨 (6000070) — 버프 없음
  //   「공격을 가하고 129.60%의 회절 피해」 순수 피해 어빌리티다(유령 인형 · 레프와 같은 값).
  "6000070": [],

  // 미스터 매직 (6000069) — 버프 없음
  //   「3단 43.20%의 인멸 피해」 순수 피해 어빌리티다(갈기늑대 · 천둥과 같은 꼴, 속성만 다르다).
  "6000069": [],

  // 구름 바다 요정 (6000068) — 버프 없음
  //   「등장 캐릭터 HP 최대치 2.70%를 회복(최대 4회)」 치료 전용이라
  //   피해식에 들어가는 것도, 옮길 버프도 없다(갈기늑대 · 바람과 같은 꼴).
  "6000068": [],

  // 페이 이그니스 (6000067) — 버프 없음
  //   「공격을 가하고 129.60%의 인멸 피해」 순수 피해 어빌리티다(유령 인형 계열과 같은 문구).
  "6000067": [],

  // 유령 인형 · 라잇 (6000066) — 버프 없음
  //   「공격을 가하고 129.60%의 인멸 피해」 순수 피해 어빌리티다(헤드 · 레프와 속성만 다르다).
  "6000066": [],

  // 유령 인형 · 레프 (6000065) — 버프 없음
  //   「공격을 가하고 129.60%의 회절 피해」 순수 피해 어빌리티다(헤드와 속성만 다르다).
  "6000065": [],

  // 유령 인형 · 헤드 (6000064) — 버프 없음
  //   「공격을 가하고 129.60%의 용융 피해」 순수 피해 어빌리티다(갈기늑대 · 서리와 같은 꼴).
  "6000064": [],

  // 갈기늑대 · 서리 (6000063) — 버프 없음
  //   「공격을 가하고 129.60%의 응결 피해」 순수 피해 어빌리티다.
  "6000063": [],

  // 갈기늑대 · 천둥 (6000062) — 버프 없음
  //   「3단 공격으로 43.20%의 전도 피해」 순수 피해 어빌리티다.
  "6000062": [],

  // 갈기늑대 · 바람 (6000061) — 버프 없음
  //   「근처 파티 내 캐릭터의 HP 최대치 2.70%를 회복(최대 3회)」 치료 전용이라
  //   피해식에 들어가는 것도, 옮길 버프도 없다.
  "6000061": [],

  // 돌아갈 곳이 없는 오류 (6000060)
  //   에코 어빌리티 발동 시 자신의 공명 효율 10% 증가,
  //   파티 내 모든 캐릭터의 공격력 10% 증가 (20초간)
  //
  // 파티에 거는 공격력%도 에코 쪽은 statGroup 기본값(buff)이라 따로 적지 않는다.
  //
  // 어빌리티 자체의 피해(HP 최대치 15.86% / 1.58% / 19.82% 회절)는 공격 데이터 쪽이다
  //   — HP 비례 배율이라 scalingStat이 HP다(echoAttackOverrides.ts).
  //   그중 길게 누르기의 지속 타격(1.58%)만 여기 스택으로 두었다. 스태미나가 닳는 동안
  //   몇 번 때렸는지는 사람마다 달라서 공격에 못 박아 둘 수가 없다.
  "6000060": [
    {
      label: "공명 효율 증가",
      target: "energyRegen",
      damageType: "All",
      value: 0.1,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티 발동 시, 20초간",
    },
    {
      label: "파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.1,
      uptime: "active",
      scope: "party", // 파티 내 모든 캐릭터
      condition: "에코 어빌리티 발동 시, 20초간",
    },
    {
      label: "길게 누르기 · 지속 타격 (1회당 HP 최대치 1.58%)",
      target: "motionValue",
      damageType: "Echo",
      // 길게 누르기 갈래에만 붙는다 — 짧게 쪽에 켜지지 않게 공격을 못 박아 둔다.
      attackIds: ["echo:6000060#1"],
      value: 0.0158,
      modifier: "increase", // 계수에 그대로 더해진다
      stacks: 8,
      maxStacks: 30, // 스태미나가 닳을 때까지 — 넉넉히 잡아 둔다
      uptime: "active",
      scope: "self",
      condition: "길게 누르는 동안 때린 횟수만큼 — 스태미나가 닳는 만큼 늘어난다",
    },
  ],

  // 용의 별자리 (6000059)
  //   장착 캐릭터가 「세월의 축복」을 획득(15초). 그 동안
  //   · 자신의 공명 스킬 피해 보너스 16.00% 증가
  //   · 자신의 공명 스킬로 적을 명중 시 그 적이 초당 16.00% 회절 피해를 받음
  //     (이 피해는 캐릭터의 공명 스킬 피해로 적용, 15초 지속)
  //
  // 두 번째 항목은 버프가 아니라 도트 피해다 — 공명 스킬 피해로 판정되는 별도 공격이라
  // 공격 데이터 쪽에서 다뤄야 한다.
  //
  // 미반영 — 어빌리티 자체의 피해(승천 48.64%, 벼락 5단 × 19.46%, 회전 2회 × 48.64% 회절)와
  //   위의 초당 16.00% 회절 도트.
  "6000059": [
    {
      label: "세월의 축복 · 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.16,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티 발동으로 「세월의 축복」 획득 후, 15초간",
    },
  ],

  // 흑월의 야수 (6000058) — 버프 없음
  //   「덮쳐 135.36% 회절 피해, 명중 시 「유광」 6개 생성 후 폭발 시 각 15.04% 회절 피해」
  //   순수 피해 어빌리티다. 길게 눌러 도약하는 것은 이동기라 피해식과 무관하다.
  "6000058": [],

  // 용비늘의 기축 (6000057) — 버프 없음
  //   가드 상태에서 상황별로 반격 피해(553.60% / 553.60%+276.80% 응결)를 낼 뿐 버프가 없다.
  //   「적의 특수 스킬 격파」도 피해식과 무관하다.
  "6000057": [],

  // 갈기늑대 · 눈꽃 (6000056)
  //   공중에서 이 에코 어빌리티를 발동할 때
  //     · 가한 피해가 20.00% 증가
  //     · 착지 시 추가로 「고드름」 6개가 생성되어 각각 32.00% 응결 피해
  //
  // 조건이 발동 위치(공중)라 엔진이 판정하지 못한다 — 둘 다 조건부로 두고 사람이 켠다.
  // 이름 앞을 「공중에서 발동」으로 맞춰 두었으니 둘을 같이 켜면 된다.
  //
  // 고드름을 왜 버프로 두는가 — 버프는 타격을 새로 만들지 못해서, 6개를 합친 192%를
  // 스킬 배율에 더하는 방식으로 넣었다. 고드름도 같은 응결 · 에코 피해라 크리티컬과
  // 피해 보너스가 본체와 똑같이 걸리므로 결과는 같다.
  //   주의 — 고드름은 착지할 때 **한 번만** 생긴다. 「1회」를 루틴에 두 번 담았다면
  //   이 버프는 그중 한 줄에만 켜야 두 번 세지 않는다.
  "6000056": [
    {
      label: "공중에서 발동 · 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.2,
      uptime: "active",
      scope: "self",
      condition: "공중에서 이 에코 어빌리티를 발동했을 때",
    },
    {
      label: "공중에서 발동 · 착지 고드름 6개 (각 32%)",
      target: "motionValue",
      damageType: "Echo",
      value: 1.92, // 32.00% × 6
      modifier: "increase", // 계수에 그대로 더해진다
      uptime: "active",
      scope: "self",
      condition: "공중 발동 후 착지할 때 한 번만 — 루틴에 두 줄이면 한 줄에만 켠다",
    },
  ],

  // 피그미타조 (6000055) — 버프 없음
  //   「추적 공격으로 3회의 38.40% 물리 피해」 순수 피해 어빌리티다.
  "6000055": [],

  // 용암 벌레 (6000054) — 버프 없음
  //   「용암 벌레를 소환해 지속 공격, 매번 38.40% 용융 피해」 순수 피해 어빌리티다.
  //   소환물 유지 조건(퇴장·거리)도 피해식과 무관하다.
  "6000054": [],

  // 무망자 (6000053)
  //   방랑자 · 인멸이 공명 해방 · 임연사적 발동 후 5초 이내에,
  //   이 에코 어빌리티 피해가 50.00% 증가
  //
  // 특정 캐릭터 전용 효과다 — 다른 캐릭터가 끼면 발동하지 않는다(무기 「혈맹의 약속」과 같은 꼴).
  // 낀 사람은 onlyCharacters로 못 박아 둔다 — 그 캐릭터가 아니면 목록에 뜨지 않는다.
  // 「해당 에코 어빌리티 발동으로 인한 피해」라 damageType은 Echo다.
  //
  // 미반영 — 어빌리티 자체의 피해(1~5회 54.08%, 마지막 270.40% 인멸 피해)는 공격 데이터 쪽이다.
  "6000053": [
    {
      label: "방랑자 · 인멸 전용 · 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.5,
      onlyCharacters: ["rover-havoc"],
      uptime: "active",
      scope: "self",
      condition:
        "방랑자 · 인멸이 공명 해방 · 임연사적을 발동한 후 5초 이내",
    },
  ],

  // 음험한 백로 (6000052)
  //   변신 후 첫 명중 시 공명 에너지 10pt 회복, 이후 15초 내에 반주 스킬 발동 시
  //   다음 교체 캐릭터의 피해를 12% 증가 (지속 15초)
  //
  // 지금까지의 변신 에코와 달리 본인이 아니라 다음 교체 캐릭터에게 걸린다 — scope는 party다.
  // 「피해를 12% 증가」라 분류를 가리지 않으므로 damageType은 All이다.
  //
  // 미반영 — 계산 엔진이 다루지 못하는 것
  //   「공명 에너지 10pt 회복」 — 자원 회복이라 피해식과 무관하다
  //
  // 어빌리티 자체의 피해(내리찍기 310.56%, 화염 각 단 55.73% 인멸)는 공격 데이터 쪽이다.
  //   길게 누르기의 화염은 타수가 원문에 없어서 여기 스택으로 뒀다 — 스택 수 = 추가로 맞은 단수.
  "6000052": [
    {
      label: "반주 후 교체 캐릭터 피해 증가",
      target: "damageBonus",
      damageType: "All",
      value: 0.12,
      uptime: "active",
      scope: "party", // 다음에 교체되어 들어오는 캐릭터
      condition: "변신 후 첫 명중으로부터 15초 내에 반주 스킬 발동 시, 다음 교체 캐릭터에게 15초간",
    },
    {
      label: "길게 누르기 · 화염 추가 단수 (1단당 55.73%)",
      target: "motionValue",
      damageType: "Echo",
      attackIds: ["echo:6000052#1"], // 길게 누르기 갈래에만
      value: 0.5573,
      modifier: "increase",
      stacks: 5, // 눈대중 기본값 — 원문에 최대치가 없다
      maxStacks: 19, // 공격에 담긴 1단과 합쳐 최대 20단. 근거 있는 값이 아니라 넉넉히 잡은 것
      uptime: "active",
      scope: "self",
      condition: "길게 누르는 동안 화염을 몇 단 더 맞혔는지 — 공격에 1단이 들어 있다",
    },
  ],

  // 딩동동 (6000051) — 버프 없음
  //   「적을 추적해 자폭, 32.00%+64의 응결 피해」 순수 피해 어빌리티다.
  "6000051": [],

  // 신호등 로봇 (6000050) — 버프 없음
  //   「적을 1초 멈추게 한다」 군중 제어만 있고 피해도 버프도 없다.
  "6000050": [],

  // 경전차 로봇 (6000049) — 버프 없음
  //   「주위에 272.00%의 응결 피해 + 최대 3개의 얼음 장벽 생성」 순수 피해 어빌리티다.
  //   얼음 장벽은 적을 막는 지형물이라 피해식과 무관하다.
  "6000049": [],

  // 조립식 로봇 (6000048)
  //   에코 어빌리티 발동 후 자신의 공격력이 12.00% 증가, 15초간 지속
  //
  // 다른 변신 에코들이 속성·분류 보너스 12%를 주는 자리에 이쪽은 공격력 12%를 준다.
  // 에코 어빌리티에서 나오는 공격력%도 세트와 마찬가지로 statGroup 기본값(buff)을 쓴다
  //   — 스탯창이 아니라 전투 중에 붙는 값이다.
  //
  // 미반영 — 어빌리티 자체의 피해(48.64% / 폐기물 320.00% / 폭발 160.00% 전도 피해)는
  //   공격 데이터 쪽이다. 「폐기물 피해는 반주 스킬 피해로 간주」라는 판정도 그때 같이 옮긴다.
  "6000048": [
    {
      label: "에코 어빌리티 후 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티 발동 후, 15초간",
    },
  ],

  // 쮸쮸복어 (6000047) — 버프 없음
  //   「전방으로 3회 내뿜어 매회 38.40%의 기류 피해 + 격퇴」 순수 피해 어빌리티다.
  //   격퇴는 군중 제어라 피해식과 무관하다.
  "6000047": [],

  // 트랜스카 (6000046) — 버프 없음
  //   「회전 충격 112.00% + 마구 베기 168.00% 기류 피해」 순수 피해 어빌리티다.
  "6000046": [],

  // 애곡하는 아익스 (6000045)
  //   변신 후 캐릭터 회절 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00% 증가 (지속 15초)
  //
  // 크라운리스와 같은 「변신만 하면 걸리는」 꼴이고 속성·분류만 다르다.
  // 미반영 — 어빌리티 자체의 피해(발톱 157.44% / 236.16% 회절 피해)는 공격 데이터 쪽이다.
  "6000045": [
    {
      label: "변신 후 회절 피해 보너스",
      target: "damageBonus",
      damageType: "Spectro",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 변신 후, 15초간",
    },
    {
      label: "변신 후 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 변신 후, 15초간",
    },
  ],

  // 반디의 군세 (6000044)
  //   매번 충격마다 자신의 응결 피해 보너스 4.00%, 공명 스킬 피해 보너스 4.00% 증가 (지속 15초)
  //
  // 어빌리티를 최대 3회 연속 사용할 수 있고 충격마다 1스택씩 쌓이므로 상한을 3으로 둔다.
  // 4% × 3스택 = 12%로, 다른 변신 에코들의 12%와 총량이 같다.
  // 미반영 — 어빌리티 자체의 피해(내리찍기 200.16% ×2, 마지막 266.88% 응결 피해)와
  //   충격의 빙결 효과는 버프가 아니다.
  "6000044": [
    {
      label: "충격 후 응결 피해 보너스",
      target: "damageBonus",
      damageType: "Glacio",
      value: 0.04, // 충격 1회당
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "충격 1회마다 1스택(최대 3회 연속 사용), 최대 3스택 · 15초간",
    },
    {
      label: "충격 후 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.04, // 위와 같은 효과가 자리만 갈린 것
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "충격 1회마다 1스택(최대 3회 연속 사용), 최대 3스택 · 15초간",
    },
  ],

  // 폭주의 고릴라 (6000043)
  //   추격으로 목표 명중 후 자신의 기류 피해 보너스 12.00%,
  //   강공격 피해 보너스 12.00% 증가 (지속 15초)
  //
  // 천둥의 비늘과 같은 「명중 조건 + 속성/분류 12%」 꼴이다.
  // 미반영 — 어빌리티 자체의 피해(발차기 231.84%, 추격 283.36% 기류 피해)는
  //   버프가 아니라 공격 데이터 쪽이다.
  "6000043": [
    {
      label: "추격 명중 후 기류 피해 보너스",
      target: "damageBonus",
      damageType: "Aero",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "추격으로 목표 명중 후, 15초간",
    },
    {
      label: "추격 명중 후 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "추격으로 목표 명중 후, 15초간",
    },
  ],

  // 크라운리스 (6000042)
  //   변신 후 자신의 인멸 피해 보너스 12.00%, 공명 스킬 피해 보너스 12.00% 증가 (지속 15초)
  //
  // 천둥의 비늘과 같은 꼴 — 변신 어빌리티가 속성 보너스와 분류 보너스를 함께 준다.
  // 미반영 — 어빌리티 자체의 피해(회차별 134.08% / 100.56% / 67.04% 인멸 피해)는
  //   버프가 아니라 공격 데이터 쪽이다.
  "6000042": [
    {
      label: "변신 후 인멸 피해 보너스",
      target: "damageBonus",
      damageType: "Havoc",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 변신 후, 15초간",
    },
    {
      label: "변신 후 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "에코 어빌리티로 변신 후, 15초간",
    },
  ],

  // 결정화 전갈 (6000041) — 버프 없음
  //   「방어 상태 진입, 해제 시 반격하여 48.00%+96의 물리 피해」 순수 피해 어빌리티다.
  //   (물리 피해는 Element에 없는 속성이라 공격 데이터로 옮길 때 따로 볼 필요가 있다)
  "6000041": [],

  // 까부는 원숭이 (6000040) — 버프 없음
  //   「손벽 공격으로 268.20%의 기류 피해」 순수 피해 어빌리티라 옮길 버프가 없다.
  "6000040": [],

  // 천둥의 비늘 (6000039)
  //   발톱 공격 명중 후 캐릭터의 전도 피해 보너스 12.00%, 강공격 피해 보너스 12.00% 증가
  //   (지속 15초 / 쿨 20초)
  //
  // 미반영 — 어빌리티 자체의 피해(번개 각 단 102.48%, 발톱 175.68% 전도 피해)는
  //   버프가 아니라 공격 데이터 쪽이다.
  "6000039": [
    {
      label: "발톱 명중 후 전도 피해 보너스",
      target: "damageBonus",
      damageType: "Electro",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "발톱 공격 명중 후, 15초간",
    },
    {
      label: "발톱 명중 후 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "발톱 공격 명중 후, 15초간",
    },
  ],

  // 어린 원숭이 (6000038) — 버프 없음
  //   「전방으로 돌진하여 48.00%+96의 기류 피해」 순수 피해 어빌리티라 옮길 버프가 없다.
  //   배율 자체는 버프가 아니라 공격 데이터 쪽이다.
  "6000038": [],

  // ══ 이하 일괄 정리분 ═══════════════════════════════════════
  // 「이상」 접두판 · 환상 모드(소닉) 에코 · 새알심 · 필드 에코 원본판을 한 번에 옮겨 적었다.
  // 하나씩 옮기던 것과 규칙은 같다 — 어빌리티 자체 배율은 공격 데이터 쪽이라 담지 않고,
  // 거기서 나오는 버프만 담으며, 엔진에 자리가 없는 것(에너지·실드·치료·쿨감소·공진 수치 ·
  // 협동 공격 분류)은 주석으로만 남긴다.

  // 이상 · 트윈 노바 · 네뷸러스 캐논 (6010179)
  //   네뷸러스 캐논(6000179)과 문구·수치가 같은 「이상」 접두판이다.
  "6010179": [
    {
      label: "메인 슬롯 장착 시 회절 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Spectro",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "「트윈 노바 · 율동」 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.1,
      stacks: 6,
      maxStacks: 6,
      uptime: "active",
      scope: "self",
      condition: "콜라사르 블레이드와 함께 장착 시. 일반 공격 1스택 · 공명 스킬 3스택, 최대 6스택, 8초간 지속",
    },
  ],

  // 이상 · 트윈 노바 · 콜라사르 블레이드 (6010180)
  //   콜라사르 블레이드(6000180)와 같다. 네뷸러스 캐논과 같이 끼면 전도 → 회절로 바뀐다.
  "6010180": [
    {
      label: "메인 슬롯 장착 시 전도 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Electro",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시 (네뷸러스 캐논과 함께 장착 시 회절로 변경)",
    },
    {
      label: "메인 슬롯 장착 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "「트윈 노바 · 율동」 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.1,
      stacks: 6,
      maxStacks: 6,
      uptime: "active",
      scope: "self",
      condition: "네뷸러스 캐논와 함께 장착 시. 일반 공격 1스택 · 공명 스킬 3스택, 최대 6스택, 8초간 지속",
    },
  ],

  // 이상 · 리액터 허스크 (6010190)
  //   리액터 허스크(6000190)와 같다.
  "6010190": [
    {
      label: "메인 슬롯 장착 시 공명 효율",
      target: "energyRegen",
      damageType: "All",
      value: 0.1,
      uptime: "passive", // 메인 슬롯에 끼면 조건 없이 늘 걸린다
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 시길룸 (6010191)
  //   시길룸(6000191)과 같다.
  "6010191": [
    {
      label: "에이메스 전용 · 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.25,
      onlyCharacters: ["aymes"],
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시, 장착 캐릭터가 에이메스일 경우",
    },
  ],

  // 이상 · 크로나클라우 (6010194) — 버프 없음
  //   크로나클라우(6000194)와 같은 순수 피해 어빌리티다.
  "6010194": [],

  // 이상 · 글로모스 (6010195)
  //   글로모스(6000195)와 같은 변주 릴레이형이다.
  "6010195": [
    {
      label: "변주 등장 캐릭터 응결 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Glacio",
      value: 0.12,
      uptime: "active",
      scope: "party",
      condition: "에코 어빌리티 후 15초 내에 반주 스킬 발동 시, 다음 변주 등장 캐릭터에게 15초간",
    },
  ],

  // 이상 · 아이스글린트 댄서 (6010196) — 버프 없음
  //   아이스글린트 댄서(6000196)와 같은 순수 피해 어빌리티다.
  "6010196": [],

  // 이상 · 분해된 전사 (6010202) — 버프 없음
  //   분해된 전사(6000202)와 같은 순수 피해 어빌리티다.
  "6010202": [],

  // 이상 · 봉정계유 (6010216) — 버프 없음
  //   봉정계유(6000216)와 같다. 치료 효과 보너스는 피해식에 자리가 없다.
  "6010216": [],

  // 이상 · 만와뢰 · 잔해 (6010217)
  //   만와뢰 · 잔해(6000217)와 같다.
  "6010217": [
    {
      label: "메인 슬롯 장착 시 용융 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Fusion",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 서릿땅거북 (6020001) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020001": [],

  // 응결 프리즘 (6020002) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020002": [],

  // 경전차 로봇 (6020003) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020003": [],

  // 우글글 (6020004) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020004": [],

  // 이상 · 불굴의 호위 (6020005) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020005": [],

  // 후슈슈 (6020006) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020006": [],

  // 마접의 악사 (6020007) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020007": [],

  // 이상 · 폭주의 고릴라 (6020008) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020008": [],

  // 이상 · 음험한 백로 (6020009) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020009": [],

  // 이상 · 서릿땅거북 (6020021) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020021": [],

  // 응결 프리즘 (6020022) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020022": [],

  // 경전차 로봇 (6020023) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020023": [],

  // 후슈슈 (6020026) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020026": [],

  // 이상 · 폭주의 고릴라 (6020028) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020028": [],

  // 이상 · 음험한 백로 (6020029) — 버프 없음
  //   원본 데이터의 어빌리티 설명이 「피그미타조」 문구로 잘못 채워져 있다(이름과 내용이 맞지 않는다).
  //   옮길 수 있는 내용이 없어 비워 둔다. 데이터가 고쳐지면 다시 본다.
  "6020029": [],
  // 이상 · 불굴의 호위 (6020011) — 버프 없음
  //   728.89% 회절 피해 + 파티 실드(발동자 최대 HP의 80.00%) · 경직 저항 증가(20초).
  //   실드와 경직 저항은 피해식에 자리가 없다.
  "6020011": [],

  // 꾹꾹복어 (6020012) — 버프 없음
  //   회복 영역 — 파티 HP 25.00% + 발동자 공격력 200.00%만큼 회복, 받는 피해 50.00% 감소(20초).
  //   치료와 받는 피해 감소는 내가 주는 피해와 무관하다.
  "6020012": [],

  // 천둥의 비늘 (6020013)
  //   1299.78% 전도 피해 + 적 공진 수치 40.00% 감소. 그 때문에 적이 마비되면 이 피해가 15.00% 증가한다.
  //
  // 미반영 — 공진 수치 감소, 파티 공명 스킬 쿨타임 50.00% 감소는 피해식에 자리가 없다
  "6020013": [
    {
      label: "마비 유발 시 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.15,
      uptime: "active",
      scope: "self",
      condition: "공진 수치 감소로 적이 마비 상태에 진입했을 때",
    },
  ],

  // 무망자 (6020014)
  //   826.59% 인멸 피해 + 20초간 파티 공격력 30.00%, 마비 목표에게 주는 공명 스킬 피해 100.00% 증가
  //
  // 미반영 — 초당 3pt 협주 에너지는 피해식에 자리가 없다
  "6020014": [
    {
      label: "파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.3,
      uptime: "active",
      scope: "party",
      condition: "에코 어빌리티 사용 시, 20초간",
    },
    {
      label: "마비 목표 공명 스킬 피해 증가",
      target: "damageBonus",
      damageType: "Skill",
      value: 1.0,
      uptime: "active",
      scope: "party",
      condition: "에코 어빌리티 사용 후 20초간, 목표가 마비 상태일 때",
    },
  ],

  // 이상 · 폭주의 고릴라 (6020015)
  //   836.25% 기류 피해 + 15초간 파티 공명 해방 피해 증가 50.00%,
  //   마비 목표에게 주는 공명 해방 피해 100.00% 증가
  //
  // 미반영 — 기둥 충격파 220.80% 기류 피해(에코가 스스로 때리는 공격),
  //   공명 에너지 50pt · 해방 쿨타임 50.00% 감소는 피해식에 자리가 없다
  "6020015": [
    {
      label: "파티 공명 해방 피해 증가",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.5,
      uptime: "active",
      scope: "party",
      condition: "에코 어빌리티 사용 시, 15초간",
    },
    {
      label: "마비 목표 공명 해방 피해 증가",
      target: "damageBonus",
      damageType: "Liberation",
      value: 1.0,
      uptime: "active",
      scope: "party",
      condition: "에코 어빌리티 사용 후 15초간, 목표가 마비 상태일 때",
    },
  ],

  // 이상 · 서릿땅거북 (6020016)
  //   변신 중 적을 명중할 때마다(초당 1회) 파티 공격력 12.50%, 최대 8스택 · 20초
  //
  // 미반영 — 초당 283.20% 응결 피해, 『단단함』 5스택(받는 피해 20.00%씩 감소), 이동 속도 15.00%
  "6020016": [
    {
      label: "변신 중 명중 · 파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.125,
      stacks: 8,
      maxStacks: 8,
      uptime: "active",
      scope: "party",
      condition: "변신 중 적 명중 시 1스택(초당 1회), 최대 8스택, 20초간",
    },
  ],

  // 마접의 악사 (6020017)
  //   초혼의 악사가 뿌리는 음표를 주우면 파티 공격력 15.00%, 마비 목표에게 주는
  //   일반 공격 · 강공격 피해 150.00% 증가(20초). 음표를 하나 주울 때마다 파티 공격력이 1.00%씩 더 쌓인다.
  //
  // 미반영 — HP 10.00% 회복, 이동 속도 20.00%, 스태미나 100pt
  //   누적 공격력은 원문에 상한이 없어 20스택까지만 골라 쓸 수 있게 둔다
  "6020017": [
    {
      label: "음표 획득 · 파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.15,
      uptime: "active",
      scope: "party",
      condition: "음표를 주울 시, 20초간",
    },
    {
      label: "마비 목표 일반 공격 피해 증가",
      target: "damageBonus",
      damageType: "Basic",
      value: 1.5,
      uptime: "active",
      scope: "party",
      condition: "음표를 주운 뒤 20초간, 목표가 마비 상태일 때",
    },
    {
      label: "마비 목표 강공격 피해 증가",
      target: "damageBonus",
      damageType: "Heavy",
      value: 1.5,
      uptime: "active",
      scope: "party",
      condition: "음표를 주운 뒤 20초간, 목표가 마비 상태일 때",
    },
    {
      label: "음표 누적 · 파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.01,
      stacks: 20,
      maxStacks: 20,
      uptime: "active",
      scope: "party",
      condition: "이번 전투에서 음표 하나를 주울 때마다 1스택(원문에 상한 없음)",
    },
  ],

  // 용의 별자리 (6020018)
  //   정체 구역 안의 적은 모든 저항이 30.00% 감소한다.
  //
  // 미반영
  //   적 방어력 30.00% 감소 — BuffTarget에 방어력 감소 자리가 없다(방어력 무시와는 다른 자리다)
  //   파티 공진 수치 파괴 능력 500.00% 증가 — 피해식에 자리가 없다
  //   246.81% · 5단 47.85% · 2회 119.61% 회절 피해 — 어빌리티 자체 배율이다
  "6020018": [
    {
      label: "정체 구역 · 적 전체 저항 감소",
      target: "resReduction",
      damageType: "All",
      value: 0.3,
      uptime: "active",
      scope: "party",
      condition: "정체 구역의 영향을 받은 적에게, 5초간",
    },
  ],

  // 아즈즈 (6020019)
  //   무적 영역 안의 파티 전원이 크리티컬 확률 50.00%, 크리티컬 피해 100.00%를 얻는다(6초).
  "6020019": [
    {
      label: "무적 영역 · 파티 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 0.5,
      uptime: "active",
      scope: "party",
      condition: "무적 영역 안에 있는 동안(6초)",
    },
    {
      label: "무적 영역 · 파티 크리티컬 피해",
      target: "critDamage",
      damageType: "All",
      value: 1.0,
      uptime: "active",
      scope: "party",
      condition: "무적 영역 안에 있는 동안(6초)",
    },
  ],

  // 우글글 (6020024) — 버프 없음
  //   원본 설명이 꾹꾹복어(6020012)의 회복 영역 문구다. 치료와 받는 피해 감소뿐이라 옮길 것이 없다.
  "6020024": [],

  // 불굴의 호위 (6020025) — 버프 없음
  //   6020011과 같다. 실드와 경직 저항뿐이다.
  "6020025": [],

  // 이상 · 무망자 (6020027)
  //   무망자(6020014)와 같다.
  "6020027": [
    {
      label: "파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.3,
      uptime: "active",
      scope: "party",
      condition: "에코 어빌리티 사용 시, 20초간",
    },
    {
      label: "마비 목표 공명 스킬 피해 증가",
      target: "damageBonus",
      damageType: "Skill",
      value: 1.0,
      uptime: "active",
      scope: "party",
      condition: "에코 어빌리티 사용 후 20초간, 목표가 마비 상태일 때",
    },
  ],
  // 케라사우르스 (6020041)
  //   케라사우르스(6010112)와 같다.
  "6020041": [
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Aero",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 무망자 (6020054)
  //   이름과 달리 설명은 무망자(6010053) 본체와 같다.
  "6020054": [
    {
      label: "방랑자 · 인멸 전용 · 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.5,
      onlyCharacters: ["rover-havoc"],
      uptime: "active",
      scope: "self",
      condition: "장착 캐릭터가 방랑자 · 인멸일 때, 공명 해방 「임연사적」 발동 후 5초 이내",
    },
  ],

  // 이상 · 무망자 (6020055)
  //   이름과 달리 설명은 악몽 · 지옥불 기사(6010091)와 같다.
  "6020055": [
    {
      label: "메인 슬롯 장착 시 용융 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Fusion",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 무망자 (6020057)
  //   이름과 달리 설명은 악몽 · 지옥불 기사(6010091)와 같다.
  "6020057": [
    {
      label: "메인 슬롯 장착 시 용융 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Fusion",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이성(異性) 무장 (6020056)
  //   이상 · 이성(異性) 무장(6010083)과 같다.
  "6020056": [
    {
      label: "메인 슬롯 장착 시 응결 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Glacio",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 무망자 (6020058)
  //   이름과 달리 설명은 거짓의 신왕(6010121)과 같다.
  "6020058": [
    {
      label: "메인 슬롯 장착 시 전도 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Electro",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 이상 · 뇌운의 비늘 (6020059)
  //   마무리 한방으로 목표를 맞히면 15초간 전도 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00%
  //
  // 미반영 — 5회 132.61% · 마무리 189.44% · 낙뢰 31.57% 전도 피해는 어빌리티 자체 배율이다
  "6020059": [
    {
      label: "마무리 명중 후 전도 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Electro",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "마무리 한방으로 목표 명중 시, 15초간",
    },
    {
      label: "마무리 명중 후 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "마무리 한방으로 목표 명중 시, 15초간",
    },
  ],

  // 이상 · 불굴의 호위 (6020060) — 버프 없음
  //   이성(異性) 무장이 만드는 방어 영역 — 0.5초마다 발동자 최대 HP의 100.00% 실드와 경직 저항.
  //   실드와 경직 저항은 피해식에 자리가 없다.
  "6020060": [],

  // 꾹꾹복어 (6020061) — 버프 없음
  //   로렐라이를 불러 파티 HP를 최대 HP의 10.00%씩 5회 회복시키고 받는 피해를 30.00% 줄인다.
  //   치료와 받는 피해 감소는 내가 주는 피해와 무관하다.
  "6020061": [],

  // 천둥의 비늘 (6020062) — 버프 없음
  //   헤카테를 불러 목표를 제어하고 파티 협주 에너지를 60pt 회복시킨다.
  //   군중 제어와 에너지 회복은 피해식에 자리가 없다.
  "6020062": [],

  // 무망자 (6020063)
  //   탄식의 고룡의 「비통의 영역」이 피해를 줄 때마다 파티 일반 공격 · 강공격 피해 보너스 5.00%,
  //   최대 25스택(초당 1회)
  //
  // 미반영 — 주기적인 65.29% 용융 피해는 에코가 스스로 때리는 공격이라 공격 데이터 쪽이다
  "6020063": [
    {
      label: "「비통의 영역」 파티 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.05,
      stacks: 25,
      maxStacks: 25,
      uptime: "active",
      scope: "party",
      condition: "「비통의 영역」이 피해를 줄 때마다 1스택(초당 1회), 최대 25스택",
    },
    {
      label: "「비통의 영역」 파티 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.05,
      stacks: 25,
      maxStacks: 25,
      uptime: "active",
      scope: "party",
      condition: "「비통의 영역」이 피해를 줄 때마다 1스택(초당 1회), 최대 25스택",
    },
  ],

  // 이상 · 폭주의 고릴라 (6020064)
  //   「돌아갈 곳이 없는 오류」의 연속 펀치가 맞을 때마다 파티 공명 스킬 피해 보너스 10.00%,
  //   최대 14스택 · 15초(중복 발생 시 지속시간 리셋)
  //
  // 미반영 — 총 6858.00% 회절 피해는 어빌리티 자체 배율,
  //   파티 공명 스킬 쿨타임 5.00% 감소는 피해식에 자리가 없다
  "6020064": [
    {
      label: "연타 명중 · 파티 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.1,
      stacks: 14,
      maxStacks: 14,
      uptime: "active",
      scope: "party",
      condition: "펀치가 피해를 줄 때마다 1스택, 최대 14스택, 15초간",
    },
  ],

  // 이상 · 서릿땅거북 (6020065)
  //   미스터 매직의 강화된 악장 — 발동할 때마다 파티 공명 해방 피해 보너스 150.00%(15초)
  //
  // 미반영 — 공명 에너지 40pt 회복, 공명 해방 쿨타임 30.00% 감소는 피해식에 자리가 없다.
  //   악장은 3회 발동하지만 원문에 중첩 여부가 없어 한 줄로만 담는다.
  "6020065": [
    {
      label: "강화된 악장 · 파티 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 1.5,
      uptime: "active",
      scope: "party",
      condition: "강화된 악장 발동 시(총 3회), 15초간",
    },
  ],

  // 마접의 악사 (6020066)
  //   페이 이그니스가 「공황」을 쌓는다(기본 10스택, 70스택 이상이면 30스택).
  //   「공황」이 100스택이 되면 목표가 마비되고, 그동안 목표가 받는 피해는 반드시 크리티컬이 되며
  //   전체 속성 피해 저항이 40.00% 감소한다.
  //   「반드시 크리티컬」은 크리티컬 확률 100%로 담았다 — 엔진이 확률을 그대로 쓰므로 이러면 늘 터진다.
  //
  // 미반영 — 204.93% 인멸 피해와 공진 수치 피해는 어빌리티 자체 배율이다
  "6020066": [
    {
      label: "「공황」 100스택 · 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 1.0,
      uptime: "active",
      scope: "self",
      condition: "목표의 「공황」이 100스택에 도달해 마비된 동안",
    },
    {
      label: "「공황」 100스택 · 적 전체 저항 감소",
      target: "resReduction",
      damageType: "All",
      value: 0.4,
      uptime: "active",
      scope: "party",
      condition: "목표의 「공황」이 100스택에 도달해 마비된 동안",
    },
  ],

  // 용의 별자리 (6020067)
  //   유령 인형으로 변신해 때릴 때마다 「공황」 3스택을 쌓는다(초당 1회).
  //   「공황」이 100스택이 되면 목표가 마비되고, 그동안 목표가 받는 피해는 반드시 크리티컬이 되며
  //   전체 속성 피해 저항이 40.00% 감소한다.
  //   「반드시 크리티컬」은 크리티컬 확률 100%로 담았다 — 엔진이 확률을 그대로 쓰므로 이러면 늘 터진다.
  //
  // 미반영 — 매회 70.09% 용융 피해와 공진 수치 피해는 어빌리티 자체 배율이다
  "6020067": [
    {
      label: "「공황」 100스택 · 크리티컬 확률",
      target: "critRate",
      damageType: "All",
      value: 1.0,
      uptime: "active",
      scope: "self",
      condition: "목표의 「공황」이 100스택에 도달해 마비된 동안",
    },
    {
      label: "「공황」 100스택 · 적 전체 저항 감소",
      target: "resReduction",
      damageType: "All",
      value: 0.4,
      uptime: "active",
      scope: "party",
      condition: "목표의 「공황」이 100스택에 도달해 마비된 동안",
    },
  ],

  // 아즈즈 (6020068)
  //   미믹이 뿌리는 금화를 주우면 파티 전원이 「광란」을 얻는다(20초).
  //   「광란」: 공격력 40.00%. 6스택 이상이면 공격력 40.00%가 더 붙고,
  //   마비 상태 목표에게 주는 피해가 100.00% 증가한다.
  //
  // 미반영 — HP 8.00% · 스태미나 40 회복, 이동 속도 25.00%는 피해식에 자리가 없다
  "6020068": [
    {
      label: "「광란」 파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.4,
      uptime: "active",
      scope: "party",
      condition: "금화를 주워 「광란」을 얻은 동안(20초)",
    },
    {
      label: "「광란」 6스택 · 파티 공격력 추가",
      target: "atkPercent",
      damageType: "All",
      value: 0.4,
      uptime: "active",
      scope: "party",
      condition: "「광란」이 6스택 이상일 때",
    },
    {
      label: "「광란」 6스택 · 마비 목표 피해 증가",
      target: "damageBonus",
      damageType: "All",
      value: 1.0,
      uptime: "active",
      scope: "party",
      condition: "「광란」이 6스택 이상이고 목표가 마비 상태일 때",
    },
  ],
  // 금희 새알심 (6030010) — 버프 없음
  //   「빛줄」 폭격 1초당 1349.36% 회절 피해뿐이다. 일반 공격 200.00%도 자체 배율이다.
  "6030010": [],

  // 장리 새알심 (6030020)
  //   「이화의 화신」이 파티 공격력을 15% 올린다(16초, 3스택)
  //
  // 미반영 — 일반 공격 200.00% · 코어 스킬 2240.00% 용융 피해는 자체 배율이다
  "6030020": [
    {
      label: "「이화의 화신」 파티 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.15,
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "party",
      condition: "코어 스킬 발동 시, 16초간 · 3스택",
    },
  ],

  // 카카루 새알심 (6030030) — 버프 없음
  //   「사형 선고」 4400.00% 전도 피해뿐이다. 「환영」의 추가 발동도 자체 배율이다.
  "6030030": [],

  // 파수인 새알심 (6030040)
  //   「별의 영역」 안의 모든 캐릭터가 크리티컬 피해 50%를 얻는다(8초)
  //
  // 미반영 — 이상 효과 제거, 1초마다 최대 HP 5% 회복은 피해식에 자리가 없다
  "6030040": [
    {
      label: "「별의 영역」 파티 크리티컬 피해",
      target: "critDamage",
      damageType: "All",
      value: 0.5,
      uptime: "active",
      scope: "party",
      condition: "「별의 영역」 안에 있는 동안(8초)",
    },
  ],

  // 카멜리아 새알심 (6030050) — 버프 없음
  //   「넝쿨의 춤」 1초당 1194.68% 인멸 피해뿐이다.
  "6030050": [],

  // 카를로타 새알심 (6030060) — 버프 없음
  //   「총」 사격 총 2508.00% 응결 피해뿐이다.
  "6030060": [],

  // 로코코 새알심 (6030070) — 버프 없음
  //   「폭풍의 사고력」 1초당 896.00% 인멸 피해뿐이다.
  "6030070": [],

  // 칸타렐라 새알심 (6030090) — 버프 없음
  //   4560.00% 인멸 피해와 정체뿐이다. 정체는 군중 제어라 피해식과 무관하다.
  "6030090": [],

  // 젠니 새알심 (6030100) — 버프 없음
  //   공격마다 490.35% 회절 피해뿐이다.
  "6030100": [],

  // 카르티시아 새알심 (6030110) — 버프 없음
  //   「빗발치는 칼날」 1초당 678.00% 기류 피해뿐이다. 레벨업의 피해 증가도 자체 배율이다.
  "6030110": [],

  // 브렌트 새알심 (6030080)
  //   닻이 떨어뜨리는 「주황색 감귤」을 주우면 공격력이 20% 오른다(12초, 3스택)
  //
  // 미반영 — 2720.00% 용융 피해, 최대 HP 25% 회복
  "6030080": [
    {
      label: "「주황색 감귤」 공격력",
      target: "atkPercent",
      damageType: "All",
      value: 0.2,
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "party",
      condition: "「주황색 감귤」을 주울 시, 12초간 · 3스택",
    },
  ],

  // 페비 새알심 (6030120) — 버프 없음
  //   「신성한 광채」 1초당 560.00% 회절 피해와 실드(발동 캐릭터 최대 HP의 30%)뿐이다.
  //   실드는 피해식에 자리가 없다.
  "6030120": [],

  // 금희 (60200401) — 버프 없음
  //   「명월의 시녀」 3개가 회전칼로 45.59% 인멸 피해를 준다(패링 성공 시 지속 시간 리셋).
  //   메인 슬롯 장착 시 「협동 공격 피해 40.00% 증가」 — BuffDamageType에 협동 공격 자리가 없어 옮기지 못한다
  //   (AttackType에 Coordinated가 없다. 「광학 효과」와 같은 이유다).
  //   60200401~60200409는 쿨타임만 다르고 설명이 모두 같다.
  "60200401": [],

  // 금희 (60200402) — 버프 없음
  //   「명월의 시녀」 3개가 회전칼로 45.59% 인멸 피해를 준다(패링 성공 시 지속 시간 리셋).
  //   메인 슬롯 장착 시 「협동 공격 피해 40.00% 증가」 — BuffDamageType에 협동 공격 자리가 없어 옮기지 못한다
  //   (AttackType에 Coordinated가 없다. 「광학 효과」와 같은 이유다).
  //   60200401~60200409는 쿨타임만 다르고 설명이 모두 같다.
  "60200402": [],

  // 금희 (60200403) — 버프 없음
  //   「명월의 시녀」 3개가 회전칼로 45.59% 인멸 피해를 준다(패링 성공 시 지속 시간 리셋).
  //   메인 슬롯 장착 시 「협동 공격 피해 40.00% 증가」 — BuffDamageType에 협동 공격 자리가 없어 옮기지 못한다
  //   (AttackType에 Coordinated가 없다. 「광학 효과」와 같은 이유다).
  //   60200401~60200409는 쿨타임만 다르고 설명이 모두 같다.
  "60200403": [],

  // 금희 (60200404) — 버프 없음
  //   「명월의 시녀」 3개가 회전칼로 45.59% 인멸 피해를 준다(패링 성공 시 지속 시간 리셋).
  //   메인 슬롯 장착 시 「협동 공격 피해 40.00% 증가」 — BuffDamageType에 협동 공격 자리가 없어 옮기지 못한다
  //   (AttackType에 Coordinated가 없다. 「광학 효과」와 같은 이유다).
  //   60200401~60200409는 쿨타임만 다르고 설명이 모두 같다.
  "60200404": [],

  // 금희 (60200405) — 버프 없음
  //   「명월의 시녀」 3개가 회전칼로 45.59% 인멸 피해를 준다(패링 성공 시 지속 시간 리셋).
  //   메인 슬롯 장착 시 「협동 공격 피해 40.00% 증가」 — BuffDamageType에 협동 공격 자리가 없어 옮기지 못한다
  //   (AttackType에 Coordinated가 없다. 「광학 효과」와 같은 이유다).
  //   60200401~60200409는 쿨타임만 다르고 설명이 모두 같다.
  "60200405": [],

  // 금희 (60200406) — 버프 없음
  //   「명월의 시녀」 3개가 회전칼로 45.59% 인멸 피해를 준다(패링 성공 시 지속 시간 리셋).
  //   메인 슬롯 장착 시 「협동 공격 피해 40.00% 증가」 — BuffDamageType에 협동 공격 자리가 없어 옮기지 못한다
  //   (AttackType에 Coordinated가 없다. 「광학 효과」와 같은 이유다).
  //   60200401~60200409는 쿨타임만 다르고 설명이 모두 같다.
  "60200406": [],

  // 금희 (60200407) — 버프 없음
  //   「명월의 시녀」 3개가 회전칼로 45.59% 인멸 피해를 준다(패링 성공 시 지속 시간 리셋).
  //   메인 슬롯 장착 시 「협동 공격 피해 40.00% 증가」 — BuffDamageType에 협동 공격 자리가 없어 옮기지 못한다
  //   (AttackType에 Coordinated가 없다. 「광학 효과」와 같은 이유다).
  //   60200401~60200409는 쿨타임만 다르고 설명이 모두 같다.
  "60200407": [],

  // 금희 (60200408) — 버프 없음
  //   「명월의 시녀」 3개가 회전칼로 45.59% 인멸 피해를 준다(패링 성공 시 지속 시간 리셋).
  //   메인 슬롯 장착 시 「협동 공격 피해 40.00% 증가」 — BuffDamageType에 협동 공격 자리가 없어 옮기지 못한다
  //   (AttackType에 Coordinated가 없다. 「광학 효과」와 같은 이유다).
  //   60200401~60200409는 쿨타임만 다르고 설명이 모두 같다.
  "60200408": [],

  // 금희 (60200409) — 버프 없음
  //   「명월의 시녀」 3개가 회전칼로 45.59% 인멸 피해를 준다(패링 성공 시 지속 시간 리셋).
  //   메인 슬롯 장착 시 「협동 공격 피해 40.00% 증가」 — BuffDamageType에 협동 공격 자리가 없어 옮기지 못한다
  //   (AttackType에 Coordinated가 없다. 「광학 효과」와 같은 이유다).
  //   60200401~60200409는 쿨타임만 다르고 설명이 모두 같다.
  "60200409": [],
  // 공명의 메아리 · 펜리코 (60200701) — 버프 없음
  //   무희의 칼날 64% / 「성장」 1회 80% / 2회 160% 응결 피해와 회전 종료 587% / 734% / 1467% —
  //   전부 어빌리티 자체 배율이라 공격 데이터 쪽이다.
  //   「불면」 100스택 시 떨어지는 「불면의 별똥별」도 에코가 스스로 때리는 공격이고, 마비는 군중 제어다.
  "60200701": [],

  // 아이스글린트 댄서 (60200702) — 버프 없음
  //   아이스글린트 댄서(6000196)와 같은 순수 피해 어빌리티다.
  "60200702": [],

  // 구름 바다 요정 (60200703) — 버프 없음
  //   구름 바다 요정(6010068)과 같다. 치료뿐이다.
  "60200703": [],

  // 아이언후프 (60200704) — 버프 없음
  //   아이언후프(6000183)와 같은 순수 피해 어빌리티다.
  "60200704": [],

  // 세이버캣 리버 (60200705) — 버프 없음
  //   세이버캣 리버(6000185)와 같은 순수 피해 어빌리티다.
  "60200705": [],

  // 사체르도스 (60200706) — 버프 없음
  //   64.80% 기류 피해 2회뿐인 순수 피해 어빌리티다.
  "60200706": [],

  // 반디의 군세 (60200707)
  //   충격 한 번마다 응결 피해 보너스 4.00%, 공명 스킬 피해 보너스 4.00%(15초). 최대 3회 연속.
  //
  // 미반영 — 200.16% · 200.16% · 266.88% 응결 피해와 빙결은 어빌리티 자체 배율 · 군중 제어다
  "60200707": [
    {
      label: "충격 · 응결 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Glacio",
      value: 0.04,
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "충격 1회마다 1스택, 최대 3회 연속, 15초간",
    },
    {
      label: "충격 · 공명 스킬 피해 보너스",
      target: "damageBonus",
      damageType: "Skill",
      value: 0.04,
      stacks: 3,
      maxStacks: 3,
      uptime: "active",
      scope: "self",
      condition: "충격 1회마다 1스택, 최대 3회 연속, 15초간",
    },
  ],

  // 트윈 노바 · 네뷸러스 캐논 (60200708)
  //   네뷸러스 캐논(6000179)과 같다.
  "60200708": [
    {
      label: "메인 슬롯 장착 시 회절 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Spectro",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "「트윈 노바 · 율동」 에코 어빌리티 피해 증가",
      target: "damageBonus",
      damageType: "Echo",
      value: 0.1,
      stacks: 6,
      maxStacks: 6,
      uptime: "active",
      scope: "self",
      condition: "콜라사르 블레이드와 함께 장착 시. 일반 공격 1스택 · 공명 스킬 3스택, 최대 6스택, 8초간 지속",
    },
  ],

  // 케라사우르스 (60200709)
  //   케라사우르스(6010112)와 같다.
  "60200709": [
    {
      label: "메인 슬롯 장착 시 기류 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Aero",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
    {
      label: "메인 슬롯 장착 시 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "passive",
      scope: "self",
      condition: "메인 슬롯에 장착 시",
    },
  ],

  // 선봉 암괴 (390070051) — 버프 없음
  //   전방 돌진 32.00%+64 물리 피해뿐이다.
  "390070051": [],

  // 분열 암괴 (390070052) — 버프 없음
  //   아군 HP 2% 회복과 채집 보조뿐이다. 치료·편의 기능은 피해식에 자리가 없다.
  "390070052": [],

  // 경칩의 사냥꾼 (390070053) — 버프 없음
  //   5회 사격(17.28% ×4 + 46.08%) 전도 피해뿐이다.
  "390070053": [],

  // 오열하는 전사 (390070064) — 버프 없음
  //   패링 반격 288.00% 용융 피해뿐이다. 패링 성공 시 쿨타임 70.00% 감소는 로테이션 규칙이다.
  "390070064": [],

  // 심판하는 전사 (390070065) — 버프 없음
  //   최대 3회 × 171.73% 인멸 피해뿐이다.
  "390070065": [
    {
      label: "연속 사용 추가분 (1회당 171.73%, 공격에 담긴 1회에 더한다)",
      target: "motionValue",
      damageType: "Echo",
      attackIds: ["echo:390070065#0"],
      value: 1.7173,
      modifier: "increase",
      stacks: 2, // 세 번 다 쓴 경우 — 공격의 1회와 합쳐 3회
      maxStacks: 2, // 원문의 최대 3회에서 공격에 담긴 1회를 뺀 만큼
      uptime: "active",
      scope: "self",
      condition: "몇 번 연속으로 썼는지 — 공격에 1회가 들어 있으니 스택 2면 3회다",
    },
  ],

  // 칵찰찰 (390070066) — 버프 없음
  //   화염볼 32.00%+64 용융 피해뿐이다.
  "390070066": [],

  // 아즈즈 (390070067) — 버프 없음
  //   48.00%+96 회절 피해와 1.8초 정체 구역뿐이다. 정체는 군중 제어다.
  "390070067": [],

  // 후슈슈 (390070068) — 버프 없음
  //   51.36% + 6회 19.97% 기류 피해와 끌어당김뿐이다.
  "390070068": [],

  // 우글글 (390070069) — 버프 없음
  //   68.48% · 102.72% 인멸 피해와 공진 수치 감소뿐이다. 공진 감소는 피해식에 자리가 없다.
  "390070069": [],

  // 상강의 사냥꾼 (390070070) — 버프 없음
  //   46.08% + 10회 4.61% + 폭발 23.04% 응결 피해뿐이다.
  "390070070": [],

  // 부메랑 사냥꾼 (390070071) — 버프 없음
  //   최대 3회 × 28.80% 기류 피해뿐이다.
  "390070071": [
    {
      label: "부메랑 추가 발사 (1회당 28.80%, 공격에 담긴 1회에 더한다)",
      target: "motionValue",
      damageType: "Echo",
      attackIds: ["echo:390070071#0"],
      value: 0.288,
      modifier: "increase", // 계수에 그대로 더해진다
      stacks: 2, // 세 번 다 맞힌 경우 — 공격의 1회와 합쳐 3회
      maxStacks: 2, // 원문의 최대 3회에서 공격에 담긴 1회를 뺀 만큼
      uptime: "active",
      scope: "self",
      condition: "부메랑이 몇 번 더 맞았는지 — 공격에 1회가 들어 있으니 스택 2면 3회다",
    },
  ],

  // 순회나비 (390070074) — 버프 없음
  //   최대 HP 1.80% + 80pt 회복을 4회 할 뿐이다. 치료는 피해식에 자리가 없다.
  "390070074": [],

  // 쇄아멧돼지 (390070075) — 버프 없음
  //   날려치기 32.00%+64 물리 피해뿐이다.
  "390070075": [],

  // 꾹꾹복어 (390070076) — 버프 없음
  //   거품 5회 × 23.04% 응결 피해뿐이다.
  "390070076": [],

  // 두더지 (390070077) — 버프 없음
  //   앞으로 이동하며 피해를 받지 않는 이동기다. 피해도 버프도 없다.
  "390070077": [],

  // 그린멜팅카멜레온(유체) (390070078) — 버프 없음
  //   제자리에서 HP를 회복할 뿐이다.
  "390070078": [],

  // 가시장미버섯(유체) (390070079) — 버프 없음
  //   레이저 32.00%+64 인멸 피해뿐이다.
  "390070079": [],

  // 갈기늑대 · 불꽃 (390070100) — 버프 없음
  //   물어뜯기 32.00%+64 용융 피해뿐이다.
  "390070100": [],

  // 서릿땅거북 (390070105) — 버프 없음
  //   변신해 HP를 천천히 회복할 뿐이다.
  "390070105": [],

  // 보라색 왜가리 (390077004) — 버프 없음
  //   패링 반격 288.00% 전도 피해와 협주 에너지 5pt뿐이다. 에너지는 피해식에 자리가 없다.
  "390077004": [],

  // 초록색 왜가리 (390077005) — 버프 없음
  //   돌진 236.80% 기류 피해와 특수 스킬 격파뿐이다.
  "390077005": [],

  // 용융 프리즘 (390077012) — 버프 없음
  //   얼음 덩어리 32.00%+64 용융 피해뿐이다.
  "390077012": [],

  // 응결 프리즘 (390077013) — 버프 없음
  //   3개 × 38.40% 응결 피해뿐이다.
  "390077013": [],

  // 회절 프리즘 (390077016) — 버프 없음
  //   최대 8회 × 14.40% 회절 피해뿐이다.
  "390077016": [],

  // 인멸 프리즘 (390077017) — 버프 없음
  //   5개 × 23.04% 인멸 피해뿐이다.
  "390077017": [],

  // 거암 투사 (390077021) — 버프 없음
  //   112.64% + 168.96% 물리 피해와 최대 HP 10.00% 실드뿐이다. 실드는 피해식에 자리가 없다.
  "390077021": [],

  // 마접의 악사 (390077022)
  //   길게 누르면 레이저를 53.28% 전도로 최대 10회 쏜다.
  //
  // 피해를 늘리는 효과가 있어서 버프로 둔 것이 아니라, **타수를 고르게 하려고** 둔 것이다.
  // 공격 쪽에는 1회분만 담아 두었고(echoAttackOverrides.ts), 여기 스택이 나머지 9회를 맡는다.
  //   스택 9 = 원문대로 10회 · 스택 1 = 2회 · 버프를 끄면 1회
  // 「매회 협주 에너지 1pt 획득」은 피해식과 무관하다.
  //   10회 × 53.28% 전도 피해와 협주 에너지 1pt뿐이다.
  "390077022": [
    {
      label: "레이저 추가 타격 (1회당 53.28%, 공격에 담긴 1회에 더한다)",
      target: "motionValue",
      damageType: "Echo",
      attackIds: ["echo:390077022#0"],
      value: 0.5328,
      modifier: "increase", // 계수에 그대로 더해진다
      stacks: 9, // 끝까지 쏜 경우 — 공격의 1회와 합쳐 10회
      maxStacks: 9, // 원문의 최대 10회에서 공격에 담긴 1회를 뺀 만큼
      uptime: "active",
      scope: "self",
      condition: "레이저를 몇 회 맞혔는지 — 공격에 1회가 들어 있으니 스택 9면 10회다",
    },
  ],

  // 초혼의 악사 (390077023) — 버프 없음
  //   인멸 울림을 주우면 초혼의 악사가 14.40% 인멸 피해를 최대 10회 더한다 —
  //   에코가 스스로 때리는 별도 공격이라 버프가 아니라 공격 데이터 쪽이다.
  "390077023": [
    {
      label: "명중 추가 발생 (1회당 14.40%, 공격에 담긴 1회에 더한다)",
      target: "motionValue",
      damageType: "Echo",
      attackIds: ["echo:390077023#0"],
      value: 0.144,
      modifier: "increase",
      stacks: 9, // 열 번 다 터진 경우 — 공격의 1회와 합쳐 10회
      maxStacks: 9, // 원문의 최대 10회에서 공격에 담긴 1회를 뺀 만큼
      uptime: "active",
      scope: "self",
      condition: "파티가 목표를 몇 번 맞혔는지 — 공격에 1회가 들어 있으니 스택 9면 10회다",
    },
  ],

  // 불굴의 호위 (390077024) — 버프 없음
  //   최대 HP 비례 회절 피해(8.29% · 5.52% · 4.59%)와 실드 30%뿐이다.
  "390077024": [],

  // 심연의 위병 (390077025) — 버프 없음
  //   273.60% 인멸 피해 뒤 자신의 HP가 10.00% 줄었다가 회복될 뿐이다.
  "390077025": [],

  // 그린멜팅카멜레온 (390077028) — 버프 없음
  //   10회 × 17.12% 용융 피해뿐이다.
  "390077028": [],

  // 가시장미버섯 (390077029) — 버프 없음
  //   최대 3회 × 57.07% 인멸 피해뿐이다.
  "390077029": [],

  // 갈기늑대 · 암흑 (390077033) — 버프 없음
  //   꼬리 타격 116.64%와 추가 타격 77.76% 인멸 피해뿐이다.
  "390077033": [],

  // 화살곰 (390077038) — 버프 없음
  //   발톱 5단(29.96% ×4 + 51.36%) 물리 피해뿐이다.
  "390077038": [],

  // 이상 · 꾹꾹복어 (391070076) — 버프 없음
  //   꾹꾹복어(390070076)와 같다. 거품 5회 × 23.04% 응결 피해뿐이다.
  "391070076": [],

  // 이상 · 서릿땅거북 (391070105) — 버프 없음
  //   서릿땅거북(390070105)과 같다. HP 회복뿐이다.
  "391070105": [],

  // 이상 · 불굴의 호위 (391077024) — 버프 없음
  //   불굴의 호위(390077024)와 같다. HP 비례 피해와 실드뿐이다.
  "391077024": [],

  // 크로나블라이트 (391090203) — 버프 없음
  //   크로나블라이트(6000193)와 같은 순수 피해 어빌리티다.
  "391090203": [],

  // 공명의 메아리 · 크로나클라우 (391090204) — 버프 없음
  //   크로나클라우(6000194)와 같은 순수 피해 어빌리티다.
  "391090204": [],

  // 봉정계유 (391090205) — 버프 없음
  //   봉정계유(6000216)와 같다. 치료 효과 보너스는 피해식에 자리가 없다.
  "391090205": [],

  // 뇌운의 비늘 (390080003)
  //   마무리 한방으로 목표를 맞히면 15초간 전도 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00%
  //
  // 미반영 — 5회 132.61% · 마무리 189.44% · 낙뢰 31.57% 전도 피해는 어빌리티 자체 배율이다
  "390080003": [
    {
      label: "마무리 명중 후 전도 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Electro",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "마무리 한방으로 목표 명중 시, 15초간",
    },
    {
      label: "마무리 명중 후 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "마무리 한방으로 목표 명중 시, 15초간",
    },
  ],

  // 이상 · 뇌운의 비늘 (391080003)
  //   마무리 한방으로 목표를 맞히면 15초간 전도 피해 보너스 12.00%, 공명 해방 피해 보너스 12.00%
  //
  // 미반영 — 5회 132.61% · 마무리 189.44% · 낙뢰 31.57% 전도 피해는 어빌리티 자체 배율이다
  "391080003": [
    {
      label: "마무리 명중 후 전도 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Electro",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "마무리 한방으로 목표 명중 시, 15초간",
    },
    {
      label: "마무리 명중 후 공명 해방 피해 보너스",
      target: "damageBonus",
      damageType: "Liberation",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "마무리 한방으로 목표 명중 시, 15초간",
    },
  ],

  // 타종 거북이 (390080005)
  //   「타종의 실드」가 파티 등장 캐릭터에게 피해 증가 10.00%를 준다(15초, 3회 피격 시 사라짐)
  //
  // 미반영 — 자신의 방어력 145.92%만큼의 응결 피해는 어빌리티 자체 배율,
  //   실드와 받는 피해 50.00% 감소는 피해식에 자리가 없다
  "390080005": [
    {
      label: "「타종의 실드」 파티 피해 증가",
      target: "damageBonus",
      damageType: "All",
      value: 0.1,
      uptime: "active",
      scope: "party",
      condition: "타종의 실드를 두른 동안(15초 · 3회 피격 시 사라짐)",
    },
  ],

  // 지옥불 기사 (390080007)
  //   마지막 참격이 적에게 맞으면 15초간 용융 피해 보너스 12.00%, 일반 공격 피해 보너스 12.00%
  //
  // 미반영 — 242.40% · 282.80% · 282.80% 참격과 라이딩 종료 282.80% 용융 피해는 어빌리티 자체 배율이다
  "390080007": [
    {
      label: "마지막 참격 명중 후 용융 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Fusion",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "마지막 참격이 적에게 명중 시, 15초간",
    },
    {
      label: "마지막 참격 명중 후 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "마지막 참격이 적에게 명중 시, 15초간",
    },
  ],

  // 이상 · 지옥불 기사 (391080007)
  //   마지막 참격이 적에게 맞으면 15초간 용융 피해 보너스 12.00%, 일반 공격 피해 보너스 12.00%
  //
  // 미반영 — 242.40% · 282.80% · 282.80% 참격과 라이딩 종료 282.80% 용융 피해는 어빌리티 자체 배율이다
  "391080007": [
    {
      label: "마지막 참격 명중 후 용융 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Fusion",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "마지막 참격이 적에게 명중 시, 15초간",
    },
    {
      label: "마지막 참격 명중 후 일반 공격 피해 보너스",
      target: "damageBonus",
      damageType: "Basic",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "마지막 참격이 적에게 명중 시, 15초간",
    },
  ],

  // 이상 · 폭주의 고릴라 (390180010)
  //   추격이 목표를 맞히면 15초간 기류 피해 보너스 12.00%, 강공격 피해 보너스 12.00%
  //
  // 미반영 — 발차기 231.84%와 추격 283.36% 기류 피해는 어빌리티 자체 배율이다
  "390180010": [
    {
      label: "추격 명중 후 기류 피해 보너스",
      target: "damageBonus",
      damageType: "All",
      element: "Aero",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "추격으로 목표 명중 후, 15초간",
    },
    {
      label: "추격 명중 후 강공격 피해 보너스",
      target: "damageBonus",
      damageType: "Heavy",
      value: 0.12,
      uptime: "active",
      scope: "self",
      condition: "추격으로 목표 명중 후, 15초간",
    },
  ],
};
