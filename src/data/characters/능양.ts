import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";
import { emptyStats } from "../../types/stats";

/**
 * 능양 (Id 1104, 5성, 응결, 권갑)
 * 출처: encore.moe API v2 (api/characters/1104.json)
 * 작성 절차: docs/character-workflow.md
 *
 * hits는 SkillAttributes의 *N 표기로 히트 개수를 잡고 레벨 1~10 값을 그대로 옮겼다.
 * "10.27%*5+21.99%"처럼 +로 이어진 것은 앞뒤가 서로 다른 값이라 각각 제 행을 갖는다.
 * 판정(damageBonusType)은 DamageList의 Type을 따랐다 — 공중 공격 · 회피 반격이
 * 「일반 공격」으로, 공명 회로 대부분이 「일반 공격」으로 잡힌다.
 *
 * 공명 모드가 없는 캐릭터라 resonanceModes는 생략한다(SkillBranches 비어 있음).
 * Properties의 GrowthValues 중 level 90 값 사용.
 */
/**
 * 스킬 트리(SkillTree) 노드 8개는 여기 넣지 않는다.
 *   공격력          1.80 + 1.80 + 4.20 + 4.20 = 12%
 *   응결 피해 보너스 1.80 + 1.80 + 4.20 + 4.20 = 12%
 * 노드 하나하나가 src/data/characterNodes.json 에 있고, 켜고 끈 결과를
 * nodeStats()가 합산해 스탯에 얹는다. 전부 켜면 위 합계와 같은 값이 된다.
 */
const baseStats = {
  ...emptyStats(),
  hp: 10387.5,
  atk: 437.5,
  def: 1209.9978,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

// 기본 공격 — 공중 공격 · 회피 반격은 모션만 따로고 판정은 일반 공격이다
const basicSkillAttacks: Attack[] = [
  {
    id: "1001801_1",
    name: "일반 공격 1단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
    ],
  },
  {
    id: "1001801_2",
    name: "일반 공격 2단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953],
    ],
  },
  {
    id: "1001801_3",
    name: "일반 공격 3단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3665, 0.3966, 0.4267, 0.4687, 0.4988, 0.5333, 0.5814, 0.6295, 0.6776, 0.7287],
      [0.3665, 0.3966, 0.4267, 0.4687, 0.4988, 0.5333, 0.5814, 0.6295, 0.6776, 0.7287],
    ],
  },
  {
    id: "1001801_4",
    name: "일반 공격 4단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1027, 0.1111, 0.1195, 0.1313, 0.1397, 0.1494, 0.1628, 0.1763, 0.1898, 0.2041],
      [0.1027, 0.1111, 0.1195, 0.1313, 0.1397, 0.1494, 0.1628, 0.1763, 0.1898, 0.2041],
      [0.1027, 0.1111, 0.1195, 0.1313, 0.1397, 0.1494, 0.1628, 0.1763, 0.1898, 0.2041],
      [0.1027, 0.1111, 0.1195, 0.1313, 0.1397, 0.1494, 0.1628, 0.1763, 0.1898, 0.2041],
      [0.1027, 0.1111, 0.1195, 0.1313, 0.1397, 0.1494, 0.1628, 0.1763, 0.1898, 0.2041],
      [0.2199, 0.238, 0.256, 0.2813, 0.2993, 0.32, 0.3489, 0.3777, 0.4066, 0.4372],
    ],
  },
  {
    id: "1001801_5",
    name: "일반 공격 5단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.767, 0.8299, 0.8928, 0.9809, 1.0438, 1.1161, 1.2167, 1.3174, 1.418, 1.5249],
    ],
  },
  {
    id: "1001801_6",
    name: "붕권·사자의 포효 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953],
      [0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953],
    ],
  },
  {
    id: "1001801_7",
    name: "강공격 피해",
    type: "Heavy",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.733, 0.7932, 0.8533, 0.9374, 0.9975, 1.0666, 1.1628, 1.259, 1.3551, 1.4573],
    ],
  },
  {
    id: "1001801_8",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.62, 0.6709, 0.7217, 0.7929, 0.8437, 0.9022, 0.9836, 1.0649, 1.1462, 1.2327],
    ],
  },
  {
    id: "1001801_9",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.634, 0.686, 0.738, 0.8108, 0.8628, 0.9226, 1.0058, 1.0889, 1.1721, 1.2605],
      [0.634, 0.686, 0.738, 0.8108, 0.8628, 0.9226, 1.0058, 1.0889, 1.1721, 1.2605],
    ],
  },
];

const basicSkill: Skill = {
  id: "1001801",
  category: "Basic",
  name: "일반·위풍당당한 펀치",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorFist.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["30.00%", "32.46%", "34.92%", "38.37%", "40.83%", "43.66%", "47.59%", "51.53%", "55.47%", "59.65%", "64.57%", "69.49%", "74.41%", "79.33%", "84.25%", "89.17%", "94.09%", "99.01%", "103.93%", "108.85%"] },
    { attributeName: "2단 피해", description: "", values: ["40.00%", "43.28%", "46.56%", "51.16%", "54.44%", "58.21%", "63.46%", "68.70%", "73.95%", "79.53%", "86.09%", "92.65%", "99.21%", "105.77%", "112.33%", "118.89%", "125.45%", "132.01%", "138.57%", "145.13%"] },
    { attributeName: "3단 피해", description: "", values: ["36.65%*2", "39.66%*2", "42.67%*2", "46.87%*2", "49.88%*2", "53.33%*2", "58.14%*2", "62.95%*2", "67.76%*2", "72.87%*2", "78.88%*2", "84.89%*2", "90.90%*2", "96.91%*2", "102.92%*2", "108.93%*2", "114.94%*2", "120.95%*2", "126.96%*2", "132.97%*2"] },
    { attributeName: "4단 피해", description: "", values: ["10.27%*5+21.99%", "11.11%*5+23.80%", "11.95%*5+25.60%", "13.13%*5+28.13%", "13.97%*5+29.93%", "14.94%*5+32.00%", "16.28%*5+34.89%", "17.63%*5+37.77%", "18.98%*5+40.66%", "20.41%*5+43.72%", "22.09%*5+47.33%", "23.77%*5+50.94%", "25.46%*5+54.54%", "27.14%*5+58.15%", "28.82%*5+61.76%", "30.50%*5+65.36%", "32.19%*5+68.97%", "33.87%*5+72.57%", "35.55%*5+76.18%", "37.24%*5+79.79%"] },
    { attributeName: "5단 피해", description: "", values: ["76.70%", "82.99%", "89.28%", "98.09%", "104.38%", "111.61%", "121.67%", "131.74%", "141.80%", "152.49%", "165.07%", "177.65%", "190.23%", "202.81%", "215.39%", "227.97%", "240.54%", "253.12%", "265.70%", "278.28%"] },
    { attributeName: "붕권·사자의 포효 피해", description: "", values: ["40.00%*2", "43.28%*2", "46.56%*2", "51.16%*2", "54.44%*2", "58.21%*2", "63.46%*2", "68.70%*2", "73.95%*2", "79.53%*2", "86.09%*2", "92.65%*2", "99.21%*2", "105.77%*2", "112.33%*2", "118.89%*2", "125.45%*2", "132.01%*2", "138.57%*2", "145.13%*2"] },
    { attributeName: "강공격 피해", description: "", values: ["73.30%", "79.32%", "85.33%", "93.74%", "99.75%", "106.66%", "116.28%", "125.90%", "135.51%", "145.73%", "157.75%", "169.78%", "181.80%", "193.82%", "205.84%", "217.86%", "229.88%", "241.90%", "253.92%", "265.94%"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공중 공격 피해", description: "", values: ["62.00%", "67.09%", "72.17%", "79.29%", "84.37%", "90.22%", "98.36%", "106.49%", "114.62%", "123.27%", "133.44%", "143.60%", "153.77%", "163.94%", "174.11%", "184.28%", "194.44%", "204.61%", "214.78%", "224.95%"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "회피 반격 피해", description: "", values: ["63.40%*2", "68.60%*2", "73.80%*2", "81.08%*2", "86.28%*2", "92.26%*2", "100.58%*2", "108.89%*2", "117.21%*2", "126.05%*2", "136.45%*2", "146.85%*2", "157.24%*2", "167.64%*2", "178.04%*2", "188.44%*2", "198.83%*2", "209.23%*2", "219.63%*2", "230.03%*2"] },
  ],
};

// 공명 스킬
const resonanceSkillAttacks: Attack[] = [
  {
    id: "1001802_1",
    name: "충권·반격 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.667, 0.7217, 0.7764, 0.853, 0.9077, 0.9706, 1.0581, 1.1456, 1.2331, 1.3261],
    ],
  },
  {
    id: "1001802_2",
    name: "도약·분노의 추격 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3835, 0.415, 0.4464, 0.4905, 0.5219, 0.5581, 0.6084, 0.6587, 0.709, 0.7625],
      [0.3835, 0.415, 0.4464, 0.4905, 0.5219, 0.5581, 0.6084, 0.6587, 0.709, 0.7625],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1001802",
  category: "Skill",
  name: "충권·반격",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLingyang/SP_IconLingyangB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "충권·반격 피해", description: "", values: ["66.70%", "72.17%", "77.64%", "85.30%", "90.77%", "97.06%", "105.81%", "114.56%", "123.31%", "132.61%", "143.55%", "154.49%", "165.43%", "176.37%", "187.31%", "198.24%", "209.18%", "220.12%", "231.06%", "242.00%"] },
    { attributeName: "도약·분노의 추격 피해", description: "", values: ["38.35%*2", "41.50%*2", "44.64%*2", "49.05%*2", "52.19%*2", "55.81%*2", "60.84%*2", "65.87%*2", "70.90%*2", "76.25%*2", "82.54%*2", "88.83%*2", "95.12%*2", "101.41%*2", "107.70%*2", "113.99%*2", "120.27%*2", "126.56%*2", "132.85%*2", "139.14%*2"] },
    { attributeName: "쿨타임", description: "", values: ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"] },
  ],
};

// 공명 해방
const liberationSkillAttacks: Attack[] = [
  {
    id: "1001803_1",
    name: "스킬 피해",
    type: "Liberation",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [2, 2.164, 2.328, 2.5576, 2.7216, 2.9102, 3.1726, 3.435, 3.6974, 3.9762],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1001803",
  category: "Liberation",
  name: "돌진·사자의 질주",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLingyang/SP_IconLingyangC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["200.00%", "216.40%", "232.80%", "255.76%", "272.16%", "291.02%", "317.26%", "343.50%", "369.74%", "397.62%", "430.42%", "463.22%", "496.02%", "528.82%", "561.62%", "594.42%", "627.22%", "660.02%", "692.82%", "725.62%"] },
    { attributeName: "사자 분신 지속 시간", description: "", values: ["14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14"] },
    { attributeName: "쿨타임", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 변주 스킬
const variationSkillAttacks: Attack[] = [
  {
    id: "1001806_1",
    name: "스킬 피해",
    type: "Variation",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.5, 0.541, 0.582, 0.6394, 0.6804, 0.7276, 0.7932, 0.8588, 0.9244, 0.9941],
      [0.5, 0.541, 0.582, 0.6394, 0.6804, 0.7276, 0.7932, 0.8588, 0.9244, 0.9941],
    ],
  },
];

const variationSkill: Skill = {
  id: "1001806",
  category: "Variation",
  name: "출동·사자의 기상",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLingyang/SP_IconLingyangQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["50.00%*2", "54.10%*2", "58.20%*2", "63.94%*2", "68.04%*2", "72.76%*2", "79.32%*2", "85.88%*2", "92.44%*2", "99.41%*2", "107.61%*2", "115.81%*2", "124.01%*2", "132.21%*2", "140.41%*2", "148.61%*2", "156.81%*2", "165.01%*2", "173.21%*2", "181.41%*2"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};

// 공명 회로 「사자의 길」 — 판정이 셋으로 갈린다(DamageList Type 기준).
// 기세·대각선의 금빛은 강공격, 질주·초원을 향해는 공명 스킬,
// 나머지 곡예 · 연환 발차기 · 천근추는 일반 공격으로 잡힌다.
const circuitSkillAttacks: Attack[] = [
  {
    id: "1001807_1",
    name: "기세·대각선의 금빛 피해",
    type: "Heavy",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.867, 0.9381, 1.0092, 1.1088, 1.1799, 1.2616, 1.3754, 1.4891, 1.6029, 1.7237],
    ],
  },
  {
    id: "1001807_2",
    name: "광폭·금사자의 곡예 1단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.438, 0.474, 0.5099, 0.5602, 0.5961, 0.6374, 0.6948, 0.7523, 0.8098, 0.8708],
      [0.438, 0.474, 0.5099, 0.5602, 0.5961, 0.6374, 0.6948, 0.7523, 0.8098, 0.8708],
      [0.584, 0.6319, 0.6798, 0.7469, 0.7948, 0.8498, 0.9264, 1.0031, 1.0797, 1.1611],
    ],
  },
  {
    id: "1001807_3",
    name: "광폭·금사자의 곡예 2단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1598, 0.1729, 0.186, 0.2044, 0.2175, 0.2326, 0.2535, 0.2745, 0.2955, 0.3177],
      [0.1598, 0.1729, 0.186, 0.2044, 0.2175, 0.2326, 0.2535, 0.2745, 0.2955, 0.3177],
      [0.1598, 0.1729, 0.186, 0.2044, 0.2175, 0.2326, 0.2535, 0.2745, 0.2955, 0.3177],
      [0.1598, 0.1729, 0.186, 0.2044, 0.2175, 0.2326, 0.2535, 0.2745, 0.2955, 0.3177],
      [0.1598, 0.1729, 0.186, 0.2044, 0.2175, 0.2326, 0.2535, 0.2745, 0.2955, 0.3177],
      [0.1598, 0.1729, 0.186, 0.2044, 0.2175, 0.2326, 0.2535, 0.2745, 0.2955, 0.3177],
    ],
  },
  {
    id: "1001807_4",
    name: "질주·초원을 향해 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4169, 0.4511, 0.4853, 0.5331, 0.5673, 0.6066, 0.6613, 0.716, 0.7707, 0.8288],
      [0.4169, 0.4511, 0.4853, 0.5331, 0.5673, 0.6066, 0.6613, 0.716, 0.7707, 0.8288],
    ],
  },
  {
    id: "1001807_5",
    name: "능운·연환 발차기 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1813, 0.1961, 0.211, 0.2318, 0.2467, 0.2637, 0.2875, 0.3113, 0.3351, 0.3603],
      [0.1813, 0.1961, 0.211, 0.2318, 0.2467, 0.2637, 0.2875, 0.3113, 0.3351, 0.3603],
      [0.1813, 0.1961, 0.211, 0.2318, 0.2467, 0.2637, 0.2875, 0.3113, 0.3351, 0.3603],
      [0.1813, 0.1961, 0.211, 0.2318, 0.2467, 0.2637, 0.2875, 0.3113, 0.3351, 0.3603],
      [0.1813, 0.1961, 0.211, 0.2318, 0.2467, 0.2637, 0.2875, 0.3113, 0.3351, 0.3603],
      [0.1813, 0.1961, 0.211, 0.2318, 0.2467, 0.2637, 0.2875, 0.3113, 0.3351, 0.3603],
      [0.1813, 0.1961, 0.211, 0.2318, 0.2467, 0.2637, 0.2875, 0.3113, 0.3351, 0.3603],
      [0.1813, 0.1961, 0.211, 0.2318, 0.2467, 0.2637, 0.2875, 0.3113, 0.3351, 0.3603],
      [0.9665, 1.0458, 1.1251, 1.236, 1.3153, 1.4064, 1.5332, 1.66, 1.7868, 1.9215],
    ],
  },
  {
    id: "1001807_6",
    name: "등루·천근추 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.88, 0.9522, 1.0244, 1.1254, 1.1976, 1.2805, 1.396, 1.5114, 1.6269, 1.7496],
      [0.88, 0.9522, 1.0244, 1.1254, 1.1976, 1.2805, 1.396, 1.5114, 1.6269, 1.7496],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1001807",
  category: "Circuit",
  name: "신형합일",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLingyang/SP_IconLingyangY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "기세·대각선의 금빛 피해", description: "", values: ["86.70%", "93.81%", "100.92%", "110.88%", "117.99%", "126.16%", "137.54%", "148.91%", "160.29%", "172.37%", "186.59%", "200.81%", "215.03%", "229.25%", "243.47%", "257.69%", "271.90%", "286.12%", "300.34%", "314.56%"] },
    { attributeName: "광폭·금사자의 곡예 1단 피해", description: "", values: ["43.80%*2+58.40%", "47.40%*2+63.19%", "50.99%*2+67.98%", "56.02%*2+74.69%", "59.61%*2+79.48%", "63.74%*2+84.98%", "69.48%*2+92.64%", "75.23%*2+100.31%", "80.98%*2+107.97%", "87.08%*2+116.11%", "94.27%*2+125.69%", "101.45%*2+135.27%", "108.63%*2+144.84%", "115.82%*2+154.42%", "123.00%*2+164.00%", "130.18%*2+173.58%", "137.37%*2+183.15%", "144.55%*2+192.73%", "151.73%*2+202.31%", "158.92%*2+211.89%"] },
    { attributeName: "광폭·금사자의 곡예 2단 피해", description: "", values: ["15.98%*6", "17.29%*6", "18.60%*6", "20.44%*6", "21.75%*6", "23.26%*6", "25.35%*6", "27.45%*6", "29.55%*6", "31.77%*6", "34.39%*6", "37.01%*6", "39.63%*6", "42.26%*6", "44.88%*6", "47.50%*6", "50.12%*6", "52.74%*6", "55.36%*6", "57.98%*6"] },
    { attributeName: "질주·초원을 향해 피해", description: "", values: ["41.69%*2", "45.11%*2", "48.53%*2", "53.31%*2", "56.73%*2", "60.66%*2", "66.13%*2", "71.60%*2", "77.07%*2", "82.88%*2", "89.72%*2", "96.56%*2", "103.39%*2", "110.23%*2", "117.07%*2", "123.90%*2", "130.74%*2", "137.58%*2", "144.41%*2", "151.25%*2"] },
    { attributeName: "능운·연환 발차기 피해", description: "", values: ["18.13%*8+96.65%", "19.61%*8+104.58%", "21.10%*8+112.51%", "23.18%*8+123.60%", "24.67%*8+131.53%", "26.37%*8+140.64%", "28.75%*8+153.32%", "31.13%*8+166.00%", "33.51%*8+178.68%", "36.03%*8+192.15%", "39.01%*8+208.01%", "41.98%*8+223.86%", "44.95%*8+239.71%", "47.92%*8+255.56%", "50.89%*8+271.41%", "53.87%*8+287.26%", "56.84%*8+303.11%", "59.81%*8+318.96%", "62.78%*8+334.81%", "65.75%*8+350.66%"] },
    { attributeName: "등루·천근추 피해", description: "", values: ["88.00%*2", "95.22%*2", "102.44%*2", "112.54%*2", "119.76%*2", "128.05%*2", "139.60%*2", "151.14%*2", "162.69%*2", "174.96%*2", "189.39%*2", "203.82%*2", "218.25%*2", "232.69%*2", "247.12%*2", "261.55%*2", "275.98%*2", "290.41%*2", "304.85%*2", "319.28%*2"] },
    { attributeName: "「사자의 혼」을 소모하여 회복하는 협주 에너지", description: "", values: ["35", "35", "35", "35", "35", "35", "35", "35", "35", "35", "35", "35", "35", "35", "35", "35", "35", "35"] },
  ],
};
const passive1804: Skill = {
  id: "1001804",
  category: "Passive",
  name: "사자왕의 강림",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLingyang/SP_IconLingyangD1.webp",
  attacks: [],
};

const passive1805: Skill = {
  id: "1001805",
  category: "Passive",
  name: "꾸준한 수행",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLingyang/SP_IconLingyangD2.webp",
  attacks: [],
};

const passive1808: Skill = {
  id: "1001808",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld3.webp",
  attacks: [],
};

// 반주 스킬 — 계수가 SkillAttributes·DamageList에 없고 **설명문에만** 있다.
// 설명문: 「능양 공격력 587.94%에 해당하는 응결 피해」
// 반주는 스킬 레벨이 없어 값이 하나뿐이다 — 레벨 열 열 칸에 같은 값을 채운다.
const introSkillAttacks1001809: Attack[] = [
  {
    id: "1001809_1",
    name: "반주 스킬 피해",
    type: "Intro",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [5.8794, 5.8794, 5.8794, 5.8794, 5.8794, 5.8794, 5.8794, 5.8794, 5.8794, 5.8794],
    ],
  },
];

const passive1809: Skill = {
  id: "1001809",
  category: "Intro",
  name: "흔적·의지의 발자취",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLingyang/SP_IconLingyangT.webp",
  attacks: introSkillAttacks1001809,
};

const passive1810: Skill = {
  id: "1001810",
  category: "Sync",
  name: "조화도 파괴 · 권갑",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakFist.webp",
  attacks: [],
};

/**
 * 고유 스킬과 공명체인 6개를 계산 가능한 버프로 옮긴 것.
 * 에너지 회복 · 경직 저항처럼 피해와 무관한 것은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 스킬에서 오는 것 (설명문에서 옮김) ──
  {
    label: "돌진 · 사자의 질주 · 응결 피해 보너스",
    target: "damageBonus",
    damageType: "Glacio",
    value: 0.5,
    uptime: "active",
    scope: "self",
    condition: "공명 해방 발동 후",
  },
  // ── 고유 스킬 ──
  {
    label: "사자왕의 강림 · 변주 스킬 피해",
    inherentSkillId: "1001804",
    target: "damageBonus",
    damageType: "Variation",
    value: 0.5, // 50% 증가
    uptime: "passive", // 조건이 없어 늘 걸린다
    scope: "self",
  },
  // 「꾸준한 수행」은 질주 · 초원을 향해가 한 번 더, 그것도 150% 배율로 떨어지는 형태다.
  // 새 공격을 만들 자리가 없어 원래 공격에 150%를 얹는 것으로 대신한다
  // — 총량은 정확히 같고(100% + 150% = 250%), 히트가 하나로 뭉쳐 보이는 차이만 남는다.
  // DamageList에도 41.69%*2 옆에 125.07%(= 83.38 × 1.5) 엔트리가 따로 들어 있다.
  {
    label: "꾸준한 수행 · 질주 추가 타격",
    inherentSkillId: "1001805",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1001807_4"],
    value: 1.5, // 원래 피해의 150%가 한 번 더
    uptime: "active",
    scope: "self",
    condition: "「사자의 길」에서 일반 공격 후 3초 내에 질주 · 초원을 향해를 쓸 때",
  },

  // ── 공명체인 ──
  {
    label: "3체인 · 일반 공격 피해 보너스",
    target: "damageBonus",
    damageType: "Basic",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "공명 해방 사자의 질주가 지속되는 동안",
  },
  {
    label: "3체인 · 공명 스킬 피해 보너스",
    target: "damageBonus",
    damageType: "Skill",
    value: 0.1, // 10% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "공명 해방 사자의 질주가 지속되는 동안",
  },
  {
    label: "4체인 · 파티 응결 피해 보너스",
    target: "damageBonus",
    damageType: "Glacio",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 4,
    condition: "반주 스킬 흔적 · 의지의 발자취 발동 후 30초간, 파티 전원",
  },
  // 5체인은 공명 해방과 같은 200% 응결 피해가 한 번 더 붙는 것이다.
  // 해방 배율이 원래 200%라 원래 공격에 100%를 얹으면 총량이 정확히 같아진다.
  {
    label: "5체인 · 사자의 질주 추가 타격",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1001803_1"],
    value: 1, // 200%가 한 번 더 = 원래 피해의 100% 증가
    uptime: "passive", // 해방을 쓰면 늘 같이 나온다
    scope: "self",
    resonanceChain: 5,
  },
  {
    label: "6체인 · 다음 일반 공격 피해 보너스",
    target: "damageBonus",
    damageType: "Basic",
    value: 1, // 100% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "「사자의 길」에서 질주 · 초원을 향해 발동 후 3초 내 일반 공격 1회에만",
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   1체인 「늘 평안하시길」      사자의 질주 동안 경직 저항 증가
//   2체인 「위풍당당한 걸음걸이」 변주 스킬 발동 시 공명 에너지 10pt 회복(20초마다 1회)
//   반주 「흔적 · 의지의 발자취」 공격력 587.94%의 응결 피해
//                              — 반주 스킬에 공격 데이터(SkillAttributes)가 없다
//   고유 「요리의 달인」          요리 확률 효과

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive1804,
  passive1805,
  passive1808,
  passive1809,
  passive1810,
];

export const lingyang: Character = {
  id: "lingyang",
  name: "능양",
  level: 90,
  element: "Glacio",
  weaponType: "Gauntlets",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id(1104)가 아니라 별도 번호(14)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_14.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_14_UI.webp",
  echoIds: [],
};
