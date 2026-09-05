import { emptyStats } from "../../types/stats";
import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";

/**
 * 방랑자 · 회절 — encore.moe API v2 원본(api/characters/1501.json)에서 옮겨 적은 것.
 * 절차와 규칙은 docs/character-workflow.md 참고.
 *
 * 원본 Skills가 12개인데 둘은 값이 완전히 같은 사본이라 넣지 않았다.
 *   1000613 공명 해방 「울림의 연주」  = 1000603
 *   1000617 공명 회로 「미세한 세계」   = 1000607
 * 「소리의 연주」와 「여음」은 이름과 달리 강공격 판정이다(DamageList Type 기준).
 */

// 스킬 트리 스탯 노드는 여기 넣지 않는다.
// src/data/characterNodes.json 이 노드 8개를 들고 있고, 켜고 끈 결과를 계산이 합산한다.
const baseStats = {
  ...emptyStats(),
  hp: 11400,
  atk: 375,
  def: 1368.8864,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

const basicSkillAttacks: Attack[] = [
  {
    id: "1000601_1",
    name: "1단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2975, 0.3219, 0.3463, 0.3805, 0.4049, 0.4329, 0.472, 0.511, 0.55, 0.5915],
    ],
  },
  {
    id: "1000601_2",
    name: "2단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3825, 0.4139, 0.4453, 0.4892, 0.5206, 0.5566, 0.6068, 0.657, 0.7072, 0.7605],
    ],
  },
  {
    id: "1000601_3",
    name: "3단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.0765, 0.0828, 0.0891, 0.0979, 0.1042, 0.1114, 0.1214, 0.1314, 0.1415, 0.1521],
      [0.0765, 0.0828, 0.0891, 0.0979, 0.1042, 0.1114, 0.1214, 0.1314, 0.1415, 0.1521],
      [0.0765, 0.0828, 0.0891, 0.0979, 0.1042, 0.1114, 0.1214, 0.1314, 0.1415, 0.1521],
      [0.0765, 0.0828, 0.0891, 0.0979, 0.1042, 0.1114, 0.1214, 0.1314, 0.1415, 0.1521],
      [0.0765, 0.0828, 0.0891, 0.0979, 0.1042, 0.1114, 0.1214, 0.1314, 0.1415, 0.1521],
    ],
  },
  {
    id: "1000601_4",
    name: "4단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.6545, 0.7082, 0.7619, 0.837, 0.8907, 0.9524, 1.0383, 1.1242, 1.21, 1.3013],
    ],
  },
  {
    id: "1000601_5",
    name: "강공격 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.0969, 0.1049, 0.1128, 0.124, 0.1319, 0.141, 0.1538, 0.1665, 0.1792, 0.1927],
      [0.0969, 0.1049, 0.1128, 0.124, 0.1319, 0.141, 0.1538, 0.1665, 0.1792, 0.1927],
      [0.0969, 0.1049, 0.1128, 0.124, 0.1319, 0.141, 0.1538, 0.1665, 0.1792, 0.1927],
      [0.0969, 0.1049, 0.1128, 0.124, 0.1319, 0.141, 0.1538, 0.1665, 0.1792, 0.1927],
      [0.0969, 0.1049, 0.1128, 0.124, 0.1319, 0.141, 0.1538, 0.1665, 0.1792, 0.1927],
    ],
  },
  {
    id: "1000601_6",
    name: "소리의 연주 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3825, 0.4139, 0.4453, 0.4892, 0.5206, 0.5566, 0.6068, 0.657, 0.7072, 0.7605],
    ],
  },
  {
    id: "1000601_7",
    name: "여음 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.6375, 0.6898, 0.7421, 0.8153, 0.8676, 0.9277, 1.0113, 1.095, 1.1786, 1.2675],
    ],
  },
  {
    id: "1000601_8",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.527, 0.5703, 0.6135, 0.674, 0.7172, 0.7669, 0.836, 0.9052, 0.9743, 1.0478],
    ],
  },
  {
    id: "1000601_9",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Heavy", // DamageList Type 기준
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.9825, 1.0631, 1.1437, 1.2565, 1.337, 1.4297, 1.5586, 1.6875, 1.8164, 1.9534],
    ],
  },
];

const basicSkill: Skill = {
  id: "1000601",
  category: "Basic",
  name: "소리의 변화",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorKnife.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["29.75%", "32.19%", "34.63%", "38.05%", "40.49%", "43.29%", "47.20%", "51.10%", "55.00%", "59.15%", "64.03%", "68.91%", "73.79%", "78.67%", "83.55%", "88.42%", "93.30%", "98.18%", "103.06%", "107.94%"] },
    { attributeName: "2단 피해", description: "", values: ["38.25%", "41.39%", "44.53%", "48.92%", "52.06%", "55.66%", "60.68%", "65.70%", "70.72%", "76.05%", "82.32%", "88.60%", "94.87%", "101.14%", "107.41%", "113.69%", "119.96%", "126.23%", "132.51%", "138.78%"] },
    { attributeName: "3단 피해", description: "", values: ["7.65%*5", "8.28%*5", "8.91%*5", "9.79%*5", "10.42%*5", "11.14%*5", "12.14%*5", "13.14%*5", "14.15%*5", "15.21%*5", "16.47%*5", "17.72%*5", "18.98%*5", "20.23%*5", "21.49%*5", "22.74%*5", "24.00%*5", "25.25%*5", "26.51%*5", "27.76%*5"] },
    { attributeName: "4단 피해", description: "", values: ["65.45%", "70.82%", "76.19%", "83.70%", "89.07%", "95.24%", "103.83%", "112.42%", "121.00%", "130.13%", "140.86%", "151.59%", "162.33%", "173.06%", "183.80%", "194.53%", "205.26%", "216.00%", "226.73%", "237.46%"] },
    { attributeName: "강공격 피해", description: "", values: ["9.69%*5", "10.49%*5", "11.28%*5", "12.40%*5", "13.19%*5", "14.10%*5", "15.38%*5", "16.65%*5", "17.92%*5", "19.27%*5", "20.86%*5", "22.45%*5", "24.04%*5", "25.63%*5", "27.22%*5", "28.80%*5", "30.39%*5", "31.98%*5", "33.57%*5", "35.16%*5"] },
    { attributeName: "소리의 연주 피해", description: "", values: ["38.25%", "41.39%", "44.53%", "48.92%", "52.06%", "55.66%", "60.68%", "65.70%", "70.72%", "76.05%", "82.32%", "88.60%", "94.87%", "101.14%", "107.41%", "113.69%", "119.96%", "126.23%", "132.51%", "138.78%"] },
    { attributeName: "여음 피해", description: "", values: ["63.75%", "68.98%", "74.21%", "81.53%", "86.76%", "92.77%", "101.13%", "109.50%", "117.86%", "126.75%", "137.20%", "147.66%", "158.11%", "168.57%", "179.02%", "189.48%", "199.93%", "210.39%", "220.84%", "231.30%"] },
    { attributeName: "공중 공격 피해", description: "", values: ["52.70%", "57.03%", "61.35%", "67.40%", "71.72%", "76.69%", "83.60%", "90.52%", "97.43%", "104.78%", "113.42%", "122.06%", "130.71%", "139.35%", "147.99%", "156.63%", "165.28%", "173.92%", "182.56%", "191.21%"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "회피 반격 피해", description: "", values: ["98.25%", "106.31%", "114.37%", "125.65%", "133.70%", "142.97%", "155.86%", "168.75%", "181.64%", "195.34%", "211.45%", "227.56%", "243.67%", "259.79%", "275.90%", "292.01%", "308.13%", "324.24%", "340.35%", "356.47%"] },
  ],
};


const resonanceSkillAttacks: Attack[] = [
  {
    id: "1000602_1",
    name: "공명 참격 피해",
    type: "Skill",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.188, 1.2855, 1.3829, 1.5193, 1.6167, 1.7287, 1.8846, 2.0404, 2.1963, 2.3619],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1000602",
  category: "Skill",
  name: "공명 참격",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhujue/SP_IconZhujueB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["118.80%", "128.55%", "138.29%", "151.93%", "161.67%", "172.87%", "188.46%", "204.04%", "219.63%", "236.19%", "255.67%", "275.16%", "294.64%", "314.12%", "333.61%", "353.09%", "372.57%", "392.06%", "411.54%", "431.02%"] },
    { attributeName: "쿨타임", description: "", values: ["6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const liberationSkillAttacks: Attack[] = [
  {
    id: "1000603_1",
    name: "울림의 연주 피해",
    type: "Liberation",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1, 1.082, 1.164, 1.2788, 1.3608, 1.4551, 1.5863, 1.7175, 1.8487, 1.9881],
      [3.4, 3.6788, 3.9576, 4.348, 4.6268, 4.9474, 5.3935, 5.8395, 6.2856, 6.7596],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1000603",
  category: "Liberation",
  name: "울림의 연주",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhujue/SP_IconZhujueC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["100.00%+340.00%", "108.20%+367.88%", "116.40%+395.76%", "127.88%+434.80%", "136.08%+462.68%", "145.51%+494.74%", "158.63%+539.35%", "171.75%+583.95%", "184.87%+628.56%", "198.81%+675.96%", "215.21%+731.72%", "231.61%+787.48%", "248.01%+843.24%", "264.41%+899.00%", "280.81%+954.76%", "297.21%+1010.52%", "313.61%+1066.28%", "330.01%+1122.04%", "346.41%+1177.80%", "362.81%+1233.56%"] },
    { attributeName: "쿨타임", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};


const variationSkillAttacks: Attack[] = [
  {
    id: "1000606_1",
    name: "진동 소리 피해",
    type: "Variation",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.85, 0.9197, 0.9894, 1.087, 1.1567, 1.2369, 1.3484, 1.4599, 1.5714, 1.6899],
    ],
  },
];

const variationSkill: Skill = {
  id: "1000606",
  category: "Variation",
  name: "진동 소리",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhujue/SP_IconZhujueQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["85.00%", "91.97%", "98.94%", "108.70%", "115.67%", "123.69%", "134.84%", "145.99%", "157.14%", "168.99%", "182.93%", "196.87%", "210.81%", "224.75%", "238.69%", "252.63%", "266.57%", "280.51%", "294.45%", "308.39%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const circuitSkillAttacks: Attack[] = [
  {
    id: "1000607_1",
    name: "공명 참격 · 선음 피해",
    type: "Skill",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.6493, 0.7025, 0.7558, 0.8303, 0.8835, 0.9448, 1.03, 1.1151, 1.2003, 1.2908],
      [0.6493, 0.7025, 0.7558, 0.8303, 0.8835, 0.9448, 1.03, 1.1151, 1.2003, 1.2908],
    ],
  },
  {
    id: "1000607_2",
    name: "공명 참격 · 선음 비륜 피해",
    type: "Skill",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2, 0.2164, 0.2328, 0.2558, 0.2722, 0.2911, 0.3173, 0.3435, 0.3698, 0.3977],
    ],
  },
  {
    id: "1000607_3",
    name: "공명 참격 · 메아리 1단 피해",
    type: "Skill",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953],
    ],
  },
  {
    id: "1000607_4",
    name: "공명 참격 · 메아리 2단 피해",
    type: "Skill",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.8, 0.8656, 0.9312, 1.0231, 1.0887, 1.1641, 1.2691, 1.374, 1.479, 1.5905],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1000607",
  category: "Circuit",
  name: "미세한 세계",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhujue/SP_IconZhujueY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "공명 참격 · 선음 피해", description: "", values: ["64.93%*2", "70.25%*2", "75.58%*2", "83.03%*2", "88.35%*2", "94.48%*2", "103.00%*2", "111.51%*2", "120.03%*2", "129.08%*2", "139.73%*2", "150.38%*2", "161.03%*2", "171.67%*2", "182.32%*2", "192.97%*2", "203.62%*2", "214.26%*2", "224.91%*2", "235.56%*2"] },
    { attributeName: "공명 참격 · 선음 비륜 피해", description: "", values: ["20.00%", "21.64%", "23.28%", "25.58%", "27.22%", "29.11%", "31.73%", "34.35%", "36.98%", "39.77%", "43.05%", "46.33%", "49.61%", "52.89%", "56.17%", "59.45%", "62.73%", "66.01%", "69.29%", "72.57%"] },
    { attributeName: "공명 참격 · 메아리 1단 피해", description: "", values: ["40.00%", "43.28%", "46.56%", "51.16%", "54.44%", "58.21%", "63.46%", "68.70%", "73.95%", "79.53%", "86.09%", "92.65%", "99.21%", "105.77%", "112.33%", "118.89%", "125.45%", "132.01%", "138.57%", "145.13%"] },
    { attributeName: "공명 참격 · 메아리 2단 피해", description: "", values: ["80.00%", "86.56%", "93.12%", "102.31%", "108.87%", "116.41%", "126.91%", "137.40%", "147.90%", "159.05%", "172.17%", "185.29%", "198.41%", "211.53%", "224.65%", "237.77%", "250.89%", "264.01%", "277.13%", "290.25%"] },
    { attributeName: "공명 참격 · 선음으로 회복하는 협주 에너지", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "공명 참격 · 메아리로 회복하는 협주 에너지", description: "", values: ["8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8"] },
  ],
};


const passive0604: Skill = {
  id: "1000604",
  category: "Passive",
  name: "과묵",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhujue/SP_IconZhujueD1.webp",
  attacks: [],
};


const passive0605: Skill = {
  id: "1000605",
  category: "Passive",
  name: "경청",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhujue/SP_IconZhujueD2.webp",
  attacks: [],
};


const passive0608: Skill = {
  id: "1000608",
  category: "Passive",
  name: "보측명영",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconRun.webp",
  attacks: [],
};


const introSkill: Skill = {
  id: "1000609",
  category: "Intro",
  name: "일순의 빛",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhujue/SP_IconZhujueT.webp",
  attacks: [],
};


const syncSkill: Skill = {
  id: "1000610",
  category: "Sync",
  name: "조화도 파괴 · 직검",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakKnife.webp",
  attacks: [],
};

/**
 * 고유 효과와 공명체인을 계산 가능한 형태로 옮긴 것.
 * 회복·에너지처럼 피해와 무관한 것은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 고유 스킬 ──
  {
    label: "과묵 · 공명 참격 · 메아리 피해",
    inherentSkillId: "1000604",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1000607_3", "1000607_4"], // 메아리 1단 · 2단
    value: 0.6, // 60% 증가
    uptime: "passive", // 조건이 없다
    scope: "self",
  },
  {
    label: "경청 · 공격력",
    inherentSkillId: "1000605",
    target: "atkPercent",
    damageType: "All",
    value: 0.15, // 15% 증가
    uptime: "active",
    scope: "self",
    condition: "강공격 · 소리의 연주 사용 후 5초간",
  },

  // ── 공명체인 ──
  {
    label: "1체인 · 크리티컬",
    target: "critRate",
    damageType: "All",
    value: 0.15, // 15% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 1,
    condition: "공명 참격 또는 공명 참격 · 선음 발동 후 7초간",
  },
  {
    label: "2체인 · 회절 피해 보너스",
    target: "damageBonus",
    damageType: "Spectro",
    value: 0.2, // 추가 20%
    uptime: "passive", // 조건이 없다
    scope: "self",
    resonanceChain: 2,
  },
  {
    label: "5체인 · 공명 해방 피해 보너스",
    target: "damageBonus",
    damageType: "Liberation",
    value: 0.4, // 40% 증가
    uptime: "passive",
    scope: "self",
    resonanceChain: 5,
  },
  {
    label: "6체인 · 목표 회절 저항 감소",
    target: "resReduction",
    damageType: "All",
    element: "Spectro",
    value: 0.1, // 10% 감소 = 저항 무시 10%
    uptime: "active",
    scope: "party", // 적에게 걸리는 효과라 파티 전원이 덕을 본다
    resonanceChain: 6,
    condition: "공명 참격 또는 공명 참격 · 선음 명중 후 20초간",
  },
  {
    label: "3체인 · 공명 효율",
    target: "energyRegen",
    damageType: "All",
    value: 0.2, // 20% 증가
    uptime: "passive",
    scope: "self",
    resonanceChain: 3,
  },
];

// 미반영 — 피해 계산과 무관해서 뺀 것들
//   3체인 「만물의 소리」    공명 효율 20% (공명 효율은 표시 전용)
//   4체인 「현을 이어주는 음률」 해방 발동 시 파티 HP 지속 회복
//   고유 「보측명영」       설명이 비어 있다(탐사용 스킬로 보인다)

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive0604,
  passive0605,
  passive0608,
  introSkill,
  syncSkill,
];

export const roverSpectro: Character = {
  id: "rover-spectro",
  name: "방랑자 · 회절",
  level: 90,
  element: "Spectro",
  weaponType: "Sword",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id가 아니라 별도 번호(4)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_4.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_4_UI.webp",
  echoIds: [],
};
