import { emptyStats } from "../../types/stats";
import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";

/**
 * 알토 — encore.moe API v2 원본(api/characters/1403.json)에서 옮겨 적은 것.
 * 절차와 규칙은 docs/character-workflow.md 참고.
 *
 * 공중 공격이 공명 스킬 판정이다(DamageList Type 기준). 조준·조준 풀 차지는 강공격 판정.
 *
 * 공명 회로 「안개의 보호」의 「안개탄 피해」는 공명 스킬 「순간이동」 쪽과 **값이 완전히 같다.**
 * 한때 중복이라 보고 회로 쪽을 비워 두었는데, 게임에서는 서로 다른 스킬로 따로 나가는 것이라
 * 지금은 양쪽에 다 담는다(1001002_1 · 1001007_1). 루틴에 둘 다 담으면 두 번 세지므로
 * 실제로 쓴 쪽만 골라 담아야 한다.
 */

// 스킬 트리 스탯 노드는 여기 넣지 않는다.
// src/data/characterNodes.json 이 노드 8개를 들고 있고, 켜고 끈 결과를 계산이 합산한다.
const baseStats = {
  ...emptyStats(),
  hp: 9850,
  atk: 262.5,
  def: 1075.5536,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

const basicSkillAttacks: Attack[] = [
  {
    id: "1001001_1",
    name: "1단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181],
    ],
  },
  {
    id: "1001001_2",
    name: "2단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2667, 0.2886, 0.3104, 0.3411, 0.3629, 0.3881, 0.4231, 0.458, 0.493, 0.5302],
    ],
  },
  {
    id: "1001001_3",
    name: "3단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.24, 0.2597, 0.2794, 0.307, 0.3266, 0.3493, 0.3808, 0.4122, 0.4437, 0.4772],
      [0.24, 0.2597, 0.2794, 0.307, 0.3266, 0.3493, 0.3808, 0.4122, 0.4437, 0.4772],
    ],
  },
  {
    id: "1001001_4",
    name: "4단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2534, 0.2742, 0.2949, 0.324, 0.3448, 0.3687, 0.4019, 0.4351, 0.4684, 0.5037],
      [0.2534, 0.2742, 0.2949, 0.324, 0.3448, 0.3687, 0.4019, 0.4351, 0.4684, 0.5037],
    ],
  },
  {
    id: "1001001_5",
    name: "5단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.904, 0.9782, 1.0523, 1.1561, 1.2302, 1.3155, 1.4341, 1.5527, 1.6713, 1.7973],
    ],
  },
  {
    id: "1001001_6",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Skill", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
    ],
  },
  {
    id: "1001001_7",
    name: "조준 피해",
    type: "Heavy",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.18, 0.1948, 0.2096, 0.2302, 0.245, 0.262, 0.2856, 0.3092, 0.3328, 0.3579],
    ],
  },
  {
    id: "1001001_8",
    name: "조준 풀 차지 피해",
    type: "Heavy",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.405, 0.4383, 0.4715, 0.518, 0.5512, 0.5894, 0.6425, 0.6956, 0.7488, 0.8052],
    ],
  },
  {
    id: "1001001_9",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.077, 1.1654, 1.2537, 1.3773, 1.4656, 1.5672, 1.7085, 1.8498, 1.9911, 2.1412],
    ],
  },
];

const basicSkill: Skill = {
  id: "1001001",
  category: "Basic",
  name: "진실과 거짓",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorGun.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["16%", "17.32%", "18.63%", "20.47%", "21.78%", "23.29%", "25.39%", "27.48%", "29.58%", "31.81%", "34.44%", "37.06%", "39.69%", "42.31%", "44.93%", "47.56%", "50.18%", "52.81%", "55.43%", "58.05%"] },
    { attributeName: "2단 피해", description: "", values: ["26.67%", "28.86%", "31.04%", "34.11%", "36.29%", "38.81%", "42.31%", "45.8%", "49.3%", "53.02%", "57.39%", "61.77%", "66.14%", "70.51%", "74.89%", "79.26%", "83.63%", "88.01%", "92.38%", "96.75%"] },
    { attributeName: "3단 피해", description: "", values: ["24%*2", "25.97%*2", "27.94%*2", "30.7%*2", "32.66%*2", "34.93%*2", "38.08%*2", "41.22%*2", "44.37%*2", "47.72%*2", "51.66%*2", "55.59%*2", "59.53%*2", "63.46%*2", "67.4%*2", "71.34%*2", "75.27%*2", "79.21%*2", "83.14%*2", "87.08%*2"] },
    { attributeName: "4단 피해", description: "", values: ["25.34%*2", "27.42%*2", "29.49%*2", "32.4%*2", "34.48%*2", "36.87%*2", "40.19%*2", "43.51%*2", "46.84%*2", "50.37%*2", "54.52%*2", "58.68%*2", "62.83%*2", "66.99%*2", "71.14%*2", "75.3%*2", "79.45%*2", "83.61%*2", "87.76%*2", "91.92%*2"] },
    { attributeName: "5단 피해", description: "", values: ["90.4%", "97.82%", "105.23%", "115.61%", "123.02%", "131.55%", "143.41%", "155.27%", "167.13%", "179.73%", "194.55%", "209.38%", "224.21%", "239.03%", "253.86%", "268.68%", "283.51%", "298.33%", "313.16%", "327.99%"] },
    { attributeName: "공중 공격", description: "", values: ["30%", "32.46%", "34.92%", "38.37%", "40.83%", "43.66%", "47.59%", "51.53%", "55.47%", "59.65%", "64.57%", "69.49%", "74.41%", "79.33%", "84.25%", "89.17%", "94.09%", "99.01%", "103.93%", "108.85%"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5"] },
    { attributeName: "조준 피해", description: "", values: ["18.00%", "19.48%", "20.96%", "23.02%", "24.50%", "26.20%", "28.56%", "30.92%", "33.28%", "35.79%", "38.74%", "41.69%", "44.65%", "47.60%", "50.55%", "53.50%", "56.45%", "59.41%", "62.30%", "65.31%"] },
    { attributeName: "조준 풀 차지 피해", description: "", values: ["40.50%", "43.83%", "47.15%", "51.80%", "55.12%", "58.94%", "64.25%", "69.56%", "74.88%", "80.52%", "87.17%", "93.81%", "100.45%", "107.09%", "113.73%", "120.38%", "127.02%", "133.66%", "140.30%", "146.94%"] },
    { attributeName: "회피 반격 피해", description: "", values: ["107.7%", "116.54%", "125.37%", "137.73%", "146.56%", "156.72%", "170.85%", "184.98%", "199.11%", "214.12%", "231.79%", "249.45%", "267.11%", "284.77%", "302.44%", "320.1%", "337.76%", "355.43%", "373.09%", "390.75%"] },
  ],
};


const resonanceSkillAttacks: Attack[] = [
  {
    id: "1001002_1",
    name: "안개탄 피해",
    type: "Skill",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1001002",
  category: "Skill",
  name: "순간이동",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconQiushui/SP_IconQiushuiB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "안개탄 피해", description: "", values: ["30%", "32.46%", "34.92%", "38.37%", "40.83%", "43.66%", "47.59%", "51.53%", "55.47%", "59.65%", "64.57%", "69.49%", "74.41%", "79.33%", "84.25%", "89.17%", "94.09%", "99.01%", "103.93%", "108.85%"] },
    { attributeName: "쿨타임", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "안개 팬텀 HP", description: "", values: ["100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%", "100%"] },
    { attributeName: "안개 팬텀 지속 시간", description: "", values: ["8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
  ],
};


const liberationSkillAttacks: Attack[] = [
  {
    id: "1001003_1",
    name: "안개속의 꽃구경 피해",
    type: "Liberation",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [2, 2.164, 2.328, 2.5576, 2.7216, 2.9102, 3.1726, 3.435, 3.6974, 3.9762],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1001003",
  category: "Liberation",
  name: "안개속의 꽃구경",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconQiushui/SP_IconQiushuiC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "허공의 문에서 증가하는 공격", description: "", values: ["10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%", "10%"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150"] },
    { attributeName: "쿨타임", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "스킬 피해", description: "", values: ["200%", "216.4%", "232.8%", "255.76%", "272.16%", "291.02%", "317.26%", "343.5%", "369.74%", "397.62%", "430.42%", "463.22%", "496.02%", "528.82%", "561.62%", "594.42%", "627.22%", "660.02%", "692.82%", "725.62%"] },
  ],
};


const variationSkillAttacks: Attack[] = [
  {
    id: "1001006_1",
    name: "허공 사격 피해",
    type: "Variation",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3334, 0.3607, 0.388, 0.4263, 0.4536, 0.4851, 0.5288, 0.5725, 0.6163, 0.6627],
      [0.3334, 0.3607, 0.388, 0.4263, 0.4536, 0.4851, 0.5288, 0.5725, 0.6163, 0.6627],
      [0.3334, 0.3607, 0.388, 0.4263, 0.4536, 0.4851, 0.5288, 0.5725, 0.6163, 0.6627],
    ],
  },
];

const variationSkill: Skill = {
  id: "1001006",
  category: "Variation",
  name: "허공 사격",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconQiushui/SP_IconQiushuiQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["33.34%*3", "36.07%*3", "38.8%*3", "42.63%*3", "45.36%*3", "48.51%*3", "52.88%*3", "57.25%*3", "61.63%*3", "66.27%*3", "71.74%*3", "77.21%*3", "82.67%*3", "88.14%*3", "93.61%*3", "99.07%*3", "104.54%*3", "110.01%*3", "115.47%*3", "120.94%*3"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


// 공명 회로 「안개의 보호」 — 「안개탄」 한 발.
// DamageList의 Type이 「공명 스킬」이라 회로 모션이지만 피해는 공명 스킬 칸을 본다.
const circuitSkillAttacks: Attack[] = [
  {
    id: "1001007_1",
    name: "안개탄 피해",
    type: "Skill",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1001007",
  category: "Circuit",
  name: "안개의 보호",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconQiushui/SP_IconQiushuiY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "이동 속도 증가", description: "", values: ["40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%"] },
    { attributeName: "안개탄 피해", description: "", values: ["30%", "32.46%", "34.92%", "38.37%", "40.83%", "43.66%", "47.59%", "51.53%", "55.47%", "59.65%", "64.57%", "69.49%", "74.41%", "79.33%", "84.25%", "89.17%", "94.09%", "99.01%", "103.93%", "108.85%"] },
  ],
};


const passive1004: Skill = {
  id: "1001004",
  category: "Passive",
  name: "퍼펙트 퍼포먼스",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconQiushui/SP_IconQiushuiD1.webp",
  attacks: [],
};


const passive1005: Skill = {
  id: "1001005",
  category: "Passive",
  name: "하프 타임",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconQiushui/SP_IconQiushuiD2.webp",
  attacks: [],
};


const passive1008: Skill = {
  id: "1001008",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld4.webp",
  attacks: [],
};


const introSkill: Skill = {
  id: "1001009",
  category: "Intro",
  name: "안개의 미로",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconQiushui/SP_IconQiushuiT.webp",
  attacks: [],
};


const syncSkill: Skill = {
  id: "1001010",
  category: "Sync",
  name: "조화도 파괴 · 권총",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakGun.webp",
  attacks: [],
};

/**
 * 고유 효과와 공명체인을 계산 가능한 형태로 옮긴 것.
 * 쿨타임·스태미나·받는 피해는 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 반주 스킬 ──
  {
    label: "안개의 미로 · 기류 피해 부스트",
    target: "boost",
    damageType: "Aero",
    value: 0.23,
    uptime: "active",
    scope: "party", // 반주로 등장하는 「다음 캐릭터」에게 걸린다
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },
  // ── 고유 스킬 ──
  {
    label: "퍼펙트 퍼포먼스 · 강공격 확정 크리티컬",
    inherentSkillId: "1001004",
    target: "critRate",
    damageType: "Heavy",
    value: 1, // 크리티컬 확률 100%
    uptime: "active",
    scope: "self",
    condition: "30초마다 1회",
  },

  // ── 공명체인 ──
  {
    label: "2체인 · 공격력 (도발당한 목표)",
    target: "atkPercent",
    damageType: "All",
    value: 0.15, // 15% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 2,
    condition: "「안개 분신」에 도발당한 목표를 공격할 때",
  },
  {
    label: "4체인 · 안개탄 피해",
    target: "damageBonus",
    damageType: "All",
    attackId: "1001002_1",
    value: 0.3, // 30% 증가
    uptime: "passive", // 조건이 없다
    scope: "self",
    resonanceChain: 4,
  },
  {
    label: "5체인 · 기류 피해 보너스",
    target: "damageBonus",
    damageType: "Aero",
    value: 0.25, // 25% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 5,
    condition: "공명 회로 「안개의 잠복」 상태에서 6초간",
  },
  {
    label: "6체인 · 크리티컬",
    target: "critRate",
    damageType: "All",
    value: 0.08, // 추가 8%
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "공명 해방 · 안개속의 꽃구경 효과 중",
  },
  {
    label: "6체인 · 강공격 피해 (「허공의 문」 통과)",
    target: "damageBonus",
    damageType: "Heavy",
    value: 0.5, // 추가 50%
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "강공격이 「허공의 문」을 통과할 때",
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   고유 「하프 타임」    안개의 잠복 진입 시 스태미나 회복
//   1체인 「장난의 시작」  공명 스킬 쿨타임 4초 감소
//   2체인 앞부분        「안개 분신」 계승 HP 100% 증가
//   3체인 「안개의 마법」  「안개」 통과 시 총알 2개 추가(일반·공중 공격 피해의 50%)
//                     — 타수가 늘어나는 형태라 지금 구조로 표현 못 한다
//   4체인 뒷부분        안개의 잠복 중 받는 피해 30% 감소
//   속성표의 「안개 팬텀 HP」·「허공의 문에서 증가하는 공격」·「이동 속도 증가」는 공격이 아니다

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive1004,
  passive1005,
  passive1008,
  introSkill,
  syncSkill,
];

export const aalto: Character = {
  id: "aalto",
  name: "알토",
  level: 90,
  element: "Aero",
  weaponType: "Pistols",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id가 아니라 별도 번호(12)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_12.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_12_UI.webp",
  echoIds: [],
};
