import { emptyStats } from "../../types/stats";
import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";

/**
 * 기염 — encore.moe API v2 원본(api/characters/1404.json)에서 옮겨 적은 것.
 * 절차와 규칙은 docs/character-workflow.md 참고.
 *
 * 공명 해방 「승천하는 청룡」 계열은 전부 강공격 판정이다(DamageList Type 기준).
 * 강공격 피해 보너스를 올리는 4체인이 이 공격들에도 걸리므로 판정을 그대로 살렸다.
 */

// 스킬 트리 스탯 노드는 여기 넣지 않는다.
// src/data/characterNodes.json 이 노드 8개를 들고 있고, 켜고 끈 결과를 계산이 합산한다.
const baseStats = {
  ...emptyStats(),
  hp: 10487.5,
  atk: 437.5,
  def: 1185.5534,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

const basicSkillAttacks: Attack[] = [
  {
    id: "1001101_1",
    name: "1단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.368, 0.3981, 0.4283, 0.4705, 0.5007, 0.5354, 0.5837, 0.632, 0.6803, 0.7316],
    ],
  },
  {
    id: "1001101_2",
    name: "2단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.22, 0.238, 0.256, 0.2813, 0.2993, 0.3201, 0.3489, 0.3778, 0.4067, 0.4373],
    ],
  },
  {
    id: "1001101_3",
    name: "3단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.183, 0.198, 0.213, 0.234, 0.249, 0.2662, 0.2902, 0.3143, 0.3383, 0.3638],
      [0.183, 0.198, 0.213, 0.234, 0.249, 0.2662, 0.2902, 0.3143, 0.3383, 0.3638],
      [0.183, 0.198, 0.213, 0.234, 0.249, 0.2662, 0.2902, 0.3143, 0.3383, 0.3638],
      [0.183, 0.198, 0.213, 0.234, 0.249, 0.2662, 0.2902, 0.3143, 0.3383, 0.3638],
      [0.183, 0.198, 0.213, 0.234, 0.249, 0.2662, 0.2902, 0.3143, 0.3383, 0.3638],
    ],
  },
  {
    id: "1001101_4",
    name: "4단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.333, 0.3603, 0.3876, 0.4258, 0.4531, 0.4845, 0.5282, 0.5719, 0.6156, 0.662],
      [0.333, 0.3603, 0.3876, 0.4258, 0.4531, 0.4845, 0.5282, 0.5719, 0.6156, 0.662],
    ],
  },
  {
    id: "1001101_5",
    name: "5단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1187, 0.1284, 0.1382, 0.1518, 0.1615, 0.1727, 0.1883, 0.2039, 0.2195, 0.236],
      [0.1187, 0.1284, 0.1382, 0.1518, 0.1615, 0.1727, 0.1883, 0.2039, 0.2195, 0.236],
      [0.1187, 0.1284, 0.1382, 0.1518, 0.1615, 0.1727, 0.1883, 0.2039, 0.2195, 0.236],
      [0.1187, 0.1284, 0.1382, 0.1518, 0.1615, 0.1727, 0.1883, 0.2039, 0.2195, 0.236],
      [0.1187, 0.1284, 0.1382, 0.1518, 0.1615, 0.1727, 0.1883, 0.2039, 0.2195, 0.236],
      [0.1187, 0.1284, 0.1382, 0.1518, 0.1615, 0.1727, 0.1883, 0.2039, 0.2195, 0.236],
      [0.1187, 0.1284, 0.1382, 0.1518, 0.1615, 0.1727, 0.1883, 0.2039, 0.2195, 0.236],
      [0.7718, 0.8351, 0.8984, 0.987, 1.0503, 1.1231, 1.2244, 1.3256, 1.4269, 1.5345],
      [0.7718, 0.8351, 0.8984, 0.987, 1.0503, 1.1231, 1.2244, 1.3256, 1.4269, 1.5345],
    ],
  },
  {
    id: "1001101_6",
    name: "강공격 피해",
    type: "Heavy",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1116, 0.1208, 0.1299, 0.1427, 0.1519, 0.1624, 0.1771, 0.1917, 0.2064, 0.222],
      [0.1116, 0.1208, 0.1299, 0.1427, 0.1519, 0.1624, 0.1771, 0.1917, 0.2064, 0.222],
      [0.1116, 0.1208, 0.1299, 0.1427, 0.1519, 0.1624, 0.1771, 0.1917, 0.2064, 0.222],
      [0.1116, 0.1208, 0.1299, 0.1427, 0.1519, 0.1624, 0.1771, 0.1917, 0.2064, 0.222],
      [0.1116, 0.1208, 0.1299, 0.1427, 0.1519, 0.1624, 0.1771, 0.1917, 0.2064, 0.222],
      [0.1116, 0.1208, 0.1299, 0.1427, 0.1519, 0.1624, 0.1771, 0.1917, 0.2064, 0.222],
    ],
  },
  {
    id: "1001101_7",
    name: "용의 승천 피해",
    type: "Heavy",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.533, 0.5767, 0.6204, 0.6816, 0.7253, 0.7755, 0.8454, 0.9154, 0.9853, 1.0596],
    ],
  },
  {
    id: "1001101_8",
    name: "은신참 피해",
    type: "Heavy",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.411, 0.4447, 0.4784, 0.5255, 0.5592, 0.598, 0.6519, 0.7058, 0.7598, 0.8171],
    ],
  },
  {
    id: "1001101_9",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.62, 0.6708, 0.7216, 0.7928, 0.8436, 0.9021, 0.9835, 1.0648, 1.1461, 1.2326],
    ],
  },
  {
    id: "1001101_10",
    name: "청룡의 낙하 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4, 0.4328, 0.4656, 0.5115, 0.5443, 0.582, 0.6345, 0.687, 0.7394, 0.7952],
    ],
  },
  {
    id: "1001101_11",
    name: "공중 공격 추가 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.783, 0.8472, 0.9114, 1.0013, 1.0655, 1.1393, 1.242, 1.3448, 1.4475, 1.5566],
    ],
  },
  {
    id: "1001101_12",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.633, 0.6849, 0.7368, 0.8094, 0.8613, 0.921, 1.0041, 1.0871, 1.1702, 1.2584],
      [0.633, 0.6849, 0.7368, 0.8094, 0.8613, 0.921, 1.0041, 1.0871, 1.1702, 1.2584],
    ],
  },
];

const basicSkill: Skill = {
  id: "1001101",
  category: "Basic",
  name: "고독한 창",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorSword.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["36.80%", "39.81%", "42.83%", "47.05%", "50.07%", "53.54%", "58.37%", "63.20%", "68.03%", "73.16%", "79.19%", "85.23%", "91.26%", "97.30%", "103.33%", "109.37%", "115.40%", "121.44%", "127.47%", "133.51%"] },
    { attributeName: "2단 피해", description: "", values: ["22.00%", "23.80%", "25.60%", "28.13%", "29.93%", "32.01%", "34.89%", "37.78%", "40.67%", "43.73%", "47.34%", "50.95%", "54.56%", "58.17%", "61.77%", "65.38%", "68.99%", "72.60%", "76.21%", "79.81%"] },
    { attributeName: "3단 피해", description: "", values: ["18.30%*5", "19.80%*5", "21.30%*5", "23.40%*5", "24.90%*5", "26.62%*5", "29.02%*5", "31.43%*5", "33.83%*5", "36.38%*5", "39.38%*5", "42.38%*5", "45.38%*5", "48.38%*5", "51.38%*5", "54.38%*5", "57.39%*5", "60.39%*5", "63.39%*5", "66.39%*5"] },
    { attributeName: "4단 피해", description: "", values: ["33.30%*2", "36.03%*2", "38.76%*2", "42.58%*2", "45.31%*2", "48.45%*2", "52.82%*2", "57.19%*2", "61.56%*2", "66.20%*2", "71.66%*2", "77.12%*2", "82.58%*2", "88.04%*2", "93.50%*2", "98.97%*2", "104.43%*2", "109.89%*2", "115.35%*2", "120.81%*2"] },
    { attributeName: "5단 피해", description: "", values: ["11.87%*7+77.18%*2", "12.84%*7+83.51%*2", "13.82%*7+89.84%*2", "15.18%*7+98.70%*2", "16.15%*7+105.03%*2", "17.27%*7+112.31%*2", "18.83%*7+122.44%*2", "20.39%*7+132.56%*2", "21.95%*7+142.69%*2", "23.60%*7+153.45%*2", "25.55%*7+166.11%*2", "27.50%*7+178.77%*2", "29.45%*7+191.43%*2", "31.39%*7+204.09%*2", "33.34%*7+216.75%*2", "35.29%*7+229.40%*2", "37.24%*7+242.06%*2", "39.18%*7+254.72%*2", "41.13%*7+267.38%*2", "43.06%*7+280.01%*2"] },
    { attributeName: "강공격 피해", description: "", values: ["11.16%*6", "12.08%*6", "12.99%*6", "14.27%*6", "15.19%*6", "16.24%*6", "17.71%*6", "19.17%*6", "20.64%*6", "22.20%*6", "24.03%*6", "25.86%*6", "27.69%*6", "29.52%*6", "31.35%*6", "33.18%*6", "35.01%*6", "36.85%*6", "38.68%*6", "40.48%*6"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "용의 승천 피해", description: "", values: ["53.30%", "57.67%", "62.04%", "68.16%", "72.53%", "77.55%", "84.54%", "91.54%", "98.53%", "105.96%", "114.70%", "123.44%", "132.18%", "140.93%", "149.67%", "158.41%", "167.15%", "175.89%", "184.63%", "193.37%"] },
    { attributeName: "은신참 피해", description: "", values: ["41.10%", "44.47%", "47.84%", "52.55%", "55.92%", "59.80%", "65.19%", "70.58%", "75.98%", "81.71%", "88.45%", "95.19%", "101.93%", "108.67%", "115.41%", "122.15%", "128.89%", "135.63%", "142.37%", "149.11%"] },
    { attributeName: "공중 공격 피해", description: "", values: ["62.00%", "67.08%", "72.16%", "79.28%", "84.36%", "90.21%", "98.35%", "106.48%", "114.61%", "123.26%", "133.43%", "143.59%", "153.76%", "163.93%", "174.10%", "184.27%", "194.43%", "204.60%", "214.77%", "224.94%"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "청룡의 낙하 피해", description: "", values: ["40.00%", "43.28%", "46.56%", "51.15%", "54.43%", "58.20%", "63.45%", "68.70%", "73.94%", "79.52%", "86.08%", "92.64%", "99.20%", "105.76%", "112.32%", "118.88%", "125.44%", "132.00%", "138.56%", "145.12%"] },
    { attributeName: "공중 공격 추가 공격 피해", description: "", values: ["78.30%", "84.72%", "91.14%", "100.13%", "106.55%", "113.93%", "124.20%", "134.48%", "144.75%", "155.66%", "168.50%", "181.35%", "194.19%", "207.03%", "219.87%", "232.71%", "245.55%", "258.39%", "271.23%", "284.08%"] },
    { attributeName: "회피 반격 피해", description: "", values: ["63.30%*2", "68.49%*2", "73.68%*2", "80.94%*2", "86.13%*2", "92.10%*2", "100.41%*2", "108.71%*2", "117.02%*2", "125.84%*2", "136.22%*2", "146.60%*2", "156.99%*2", "167.37%*2", "177.75%*2", "188.13%*2", "198.51%*2", "208.89%*2", "219.27%*2", "229.65%*2"] },
  ],
};


const resonanceSkillAttacks: Attack[] = [
  {
    id: "1001102_1",
    name: "돌진의 창 피해",
    type: "Skill",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.535, 0.5788, 0.6227, 0.6841, 0.728, 0.7784, 0.8486, 0.9188, 0.989, 1.0636],
      [0.535, 0.5788, 0.6227, 0.6841, 0.728, 0.7784, 0.8486, 0.9188, 0.989, 1.0636],
      [0.535, 0.5788, 0.6227, 0.6841, 0.728, 0.7784, 0.8486, 0.9188, 0.989, 1.0636],
      [0.535, 0.5788, 0.6227, 0.6841, 0.728, 0.7784, 0.8486, 0.9188, 0.989, 1.0636],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1001102",
  category: "Skill",
  name: "돌진의 창",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJiyan/SP_IconJiyanB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["53.50%*4", "57.88%*4", "62.27%*4", "68.41%*4", "72.80%*4", "77.84%*4", "84.86%*4", "91.88%*4", "98.90%*4", "106.36%*4", "115.13%*4", "123.91%*4", "132.68%*4", "141.45%*4", "150.23%*4", "159.00%*4", "167.78%*4", "176.55%*4", "185.32%*4", "194.10%*4"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
    { attributeName: "쿨타임", description: "", values: ["7", "7", "7", "7", "7", "7", "7", "7", "7", "7", "7", "7", "7", "7", "7", "7", "7", "7", "7", "7"] },
  ],
};


const liberationSkillAttacks: Attack[] = [
  {
    id: "1001103_1",
    name: "파진의 창 1단 피해",
    type: "Liberation",
    damageBonusType: "Heavy", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3295, 0.3566, 0.3836, 0.4214, 0.4484, 0.4795, 0.5228, 0.566, 0.6093, 0.6552],
      [0.3295, 0.3566, 0.3836, 0.4214, 0.4484, 0.4795, 0.5228, 0.566, 0.6093, 0.6552],
      [0.3295, 0.3566, 0.3836, 0.4214, 0.4484, 0.4795, 0.5228, 0.566, 0.6093, 0.6552],
      [0.3295, 0.3566, 0.3836, 0.4214, 0.4484, 0.4795, 0.5228, 0.566, 0.6093, 0.6552],
      [0.3295, 0.3566, 0.3836, 0.4214, 0.4484, 0.4795, 0.5228, 0.566, 0.6093, 0.6552],
      [0.3295, 0.3566, 0.3836, 0.4214, 0.4484, 0.4795, 0.5228, 0.566, 0.6093, 0.6552],
      [0.3295, 0.3566, 0.3836, 0.4214, 0.4484, 0.4795, 0.5228, 0.566, 0.6093, 0.6552],
      [0.3295, 0.3566, 0.3836, 0.4214, 0.4484, 0.4795, 0.5228, 0.566, 0.6093, 0.6552],
    ],
  },
  {
    id: "1001103_2",
    name: "파진의 창 2단 피해",
    type: "Liberation",
    damageBonusType: "Heavy", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3096, 0.3349, 0.3603, 0.3959, 0.4213, 0.4505, 0.4911, 0.5317, 0.5723, 0.6155],
      [0.3096, 0.3349, 0.3603, 0.3959, 0.4213, 0.4505, 0.4911, 0.5317, 0.5723, 0.6155],
      [0.3096, 0.3349, 0.3603, 0.3959, 0.4213, 0.4505, 0.4911, 0.5317, 0.5723, 0.6155],
      [0.3096, 0.3349, 0.3603, 0.3959, 0.4213, 0.4505, 0.4911, 0.5317, 0.5723, 0.6155],
      [0.3096, 0.3349, 0.3603, 0.3959, 0.4213, 0.4505, 0.4911, 0.5317, 0.5723, 0.6155],
      [0.3096, 0.3349, 0.3603, 0.3959, 0.4213, 0.4505, 0.4911, 0.5317, 0.5723, 0.6155],
      [0.3096, 0.3349, 0.3603, 0.3959, 0.4213, 0.4505, 0.4911, 0.5317, 0.5723, 0.6155],
      [0.3096, 0.3349, 0.3603, 0.3959, 0.4213, 0.4505, 0.4911, 0.5317, 0.5723, 0.6155],
    ],
  },
  {
    id: "1001103_3",
    name: "파진의 창 3단 피해",
    type: "Liberation",
    damageBonusType: "Heavy", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3358, 0.3633, 0.3908, 0.4294, 0.4569, 0.4886, 0.5327, 0.5767, 0.6208, 0.6676],
      [0.3358, 0.3633, 0.3908, 0.4294, 0.4569, 0.4886, 0.5327, 0.5767, 0.6208, 0.6676],
      [0.3358, 0.3633, 0.3908, 0.4294, 0.4569, 0.4886, 0.5327, 0.5767, 0.6208, 0.6676],
      [0.3358, 0.3633, 0.3908, 0.4294, 0.4569, 0.4886, 0.5327, 0.5767, 0.6208, 0.6676],
      [0.3358, 0.3633, 0.3908, 0.4294, 0.4569, 0.4886, 0.5327, 0.5767, 0.6208, 0.6676],
      [0.3358, 0.3633, 0.3908, 0.4294, 0.4569, 0.4886, 0.5327, 0.5767, 0.6208, 0.6676],
      [0.3358, 0.3633, 0.3908, 0.4294, 0.4569, 0.4886, 0.5327, 0.5767, 0.6208, 0.6676],
      [0.3358, 0.3633, 0.3908, 0.4294, 0.4569, 0.4886, 0.5327, 0.5767, 0.6208, 0.6676],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1001103",
  category: "Liberation",
  name: "승천하는 청룡·결정",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJiyan/SP_IconJiyanC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "파진의 창 1단 피해", description: "", values: ["32.95%*8", "35.66%*8", "38.36%*8", "42.14%*8", "44.84%*8", "47.95%*8", "52.28%*8", "56.60%*8", "60.93%*8", "65.52%*8", "70.93%*8", "76.33%*8", "81.74%*8", "87.14%*8", "92.55%*8", "97.95%*8", "103.36%*8", "108.76%*8", "114.17%*8", "119.54%*8"] },
    { attributeName: "파진의 창 2단 피해", description: "", values: ["30.96%*8", "33.49%*8", "36.03%*8", "39.59%*8", "42.13%*8", "45.05%*8", "49.11%*8", "53.17%*8", "57.23%*8", "61.55%*8", "66.62%*8", "71.70%*8", "76.78%*8", "81.86%*8", "86.93%*8", "92.01%*8", "97.09%*8", "102.17%*8", "107.24%*8", "112.32%*8"] },
    { attributeName: "파진의 창 3단 피해", description: "", values: ["33.58%*8", "36.33%*8", "39.08%*8", "42.94%*8", "45.69%*8", "48.86%*8", "53.27%*8", "57.67%*8", "62.08%*8", "66.76%*8", "72.27%*8", "77.77%*8", "83.28%*8", "88.79%*8", "94.30%*8", "99.80%*8", "105.31%*8", "110.82%*8", "116.33%*8", "121.83%*8"] },
    { attributeName: "파진 상태 지속 시간", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "쿨타임", description: "", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125"] },
  ],
};


const variationSkillAttacks: Attack[] = [
  {
    id: "1001106_1",
    name: "청룡의 습격 피해",
    type: "Variation",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1, 1.082, 1.164, 1.2788, 1.3608, 1.4551, 1.5863, 1.7175, 1.8487, 1.9881],
    ],
  },
];

const variationSkill: Skill = {
  id: "1001106",
  category: "Variation",
  name: "청룡의 습격",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJiyan/SP_IconJiyanQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["100.00%", "108.20%", "116.40%", "127.88%", "136.08%", "145.51%", "158.63%", "171.75%", "184.87%", "198.81%", "215.21%", "231.61%", "248.01%", "264.41%", "280.81%", "297.21%", "313.61%", "330.01%", "346.41%", "362.81%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const circuitSkillAttacks: Attack[] = [
  {
    id: "1001107_1",
    name: "승천하는 청룡 · 처형 피해",
    type: "Liberation",
    damageBonusType: "Heavy", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.7188, 0.7777, 0.8367, 0.9192, 0.9781, 1.0459, 1.1402, 1.2345, 1.3288, 1.4291],
      [0.7188, 0.7777, 0.8367, 0.9192, 0.9781, 1.0459, 1.1402, 1.2345, 1.3288, 1.4291],
      [2.1564, 2.3333, 2.5101, 2.7577, 2.9345, 3.1378, 3.4208, 3.7037, 3.9866, 4.2873],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1001107",
  category: "Circuit",
  name: "청룡파진",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJiyan/SP_IconJiyanY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "승천하는 청룡·처형 피해", description: "", values: ["71.88%*2+215.64%", "77.77%*2+233.33%", "83.67%*2+251.01%", "91.92%*2+275.77%", "97.81%*2+293.45%", "104.59%*2+313.78%", "114.02%*2+342.08%", "123.45%*2+370.37%", "132.88%*2+398.66%", "142.91%*2+428.73%", "154.69%*2+464.09%", "166.48%*2+499.46%", "178.27%*2+534.82%", "190.06%*2+570.19%", "201.85%*2+605.56%", "213.64%*2+640.92%", "225.43%*2+676.29%", "237.22%*2+711.66%", "249.00%*2+747.02%", "260.78%*2+782.36%"] },
  ],
};


const passive1104: Skill = {
  id: "1001104",
  category: "Passive",
  name: "수천평란",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJiyan/SP_IconJiyanD1.webp",
  attacks: [],
};


const passive1105: Skill = {
  id: "1001105",
  category: "Passive",
  name: "온풍집류",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJiyan/SP_IconJiyanD2.webp",
  attacks: [],
};


const passive1108: Skill = {
  id: "1001108",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld4.webp",
  attacks: [],
};


// 반주 스킬 — 계수가 SkillAttributes·DamageList에 없고 **설명문에만** 있다.
// 설명문: 다음 등장 캐릭터가 강공격으로 명중할 때 따라 나가는 협동 공격
// 반주는 스킬 레벨이 없어 값이 하나뿐이다 — 레벨 열 열 칸에 같은 값을 채운다.
const introSkillAttacks1001109: Attack[] = [
  {
    id: "1001109_1",
    name: "극기의 각오 협동 공격",
    type: "Intro",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [3.134, 3.134, 3.134, 3.134, 3.134, 3.134, 3.134, 3.134, 3.134, 3.134],
    ],
  },
];

const introSkill: Skill = {
  id: "1001109",
  category: "Intro",
  name: "극기의 각오",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJiyan/SP_IconJiyanT.webp",
  attacks: introSkillAttacks1001109,
};


const syncSkill: Skill = {
  id: "1001110",
  category: "Sync",
  name: "조화도 파괴 · 대검",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakSword.webp",
  attacks: [],
};

/**
 * 고유 효과와 공명체인을 계산 가능한 형태로 옮긴 것.
 * 「파진치」·사용 횟수처럼 자원 쪽은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 스킬에서 오는 것 (설명문에서 옮김) ──
  {
    label: "청룡파진 · 돌진의 창 피해 증가 (파진치 소모)",
    target: "damageBonus",
    damageType: "Skill",
    value: 0.2,
    exclusiveGroup: "jiyan-charge",
    uptime: "active",
    scope: "self",
    condition: "공명 스킬 「돌진의 창」에만 — 파진치 30pt를 소모한 그 한 번",
  },
  {
    label: "청룡파진 · 돌진의 창 피해 증가 (파진 상태)",
    target: "damageBonus",
    damageType: "Skill",
    value: 0.2,
    exclusiveGroup: "jiyan-charge",
    uptime: "active",
    scope: "self",
    condition: "「파진 상태」 중 공명 스킬 「돌진의 창」에만 — 위와 하나만 켠다",
  },
  // ── 고유 스킬 ──
  {
    label: "수천평란 · 공격력",
    inherentSkillId: "1001104",
    target: "atkPercent",
    damageType: "All",
    value: 0.1, // 10% 증가
    uptime: "active",
    scope: "self",
    condition: "변주 스킬 · 청룡의 습격 발동 후 15초간",
  },
  {
    label: "온풍집류 · 크리티컬 피해",
    inherentSkillId: "1001105",
    target: "critDamage",
    damageType: "All",
    value: 0.12, // 12% 증가
    uptime: "active",
    scope: "self",
    condition: "공격으로 목표 명중 후 8초간",
  },

  // ── 공명체인 ──
  {
    label: "2체인 · 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.28, // 28% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 2,
    condition: "변주 스킬 · 청룡의 습격 발동 후 15초간 · 15초마다 1회",
  },
  {
    label: "3체인 · 크리티컬",
    target: "critRate",
    damageType: "All",
    value: 0.16, // 16% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "공명 스킬 · 공명 해방 · 변주 스킬 발동 후 8초간",
  },
  {
    label: "3체인 · 크리티컬 피해",
    target: "critDamage",
    damageType: "All",
    value: 0.32, // 32% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "공명 스킬 · 공명 해방 · 변주 스킬 발동 후 8초간",
  },
  {
    label: "4체인 · 파티 강공격 피해 보너스",
    target: "damageBonus",
    damageType: "Heavy",
    value: 0.25, // 25% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 4,
    condition: "공명 해방 승천하는 청룡 · 결정 또는 처형 발동 후 30초간",
  },
  {
    label: "5체인 · 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.03, // 스택당 3%
    stacks: 15,
    maxStacks: 15,
    uptime: "active",
    scope: "self",
    resonanceChain: 5,
    condition: "공격 명중마다 1스택, 8초 지속 · 변주 스킬 발동 시 최대치까지 · 최대 15스택",
  },
  {
    label: "6체인 · 「예리한 기세」 처형 배율 상승",
    target: "motionValue",
    damageType: "All",
    modifier: "amplify",
    attackId: "1001107_1", // 승천하는 청룡 · 처형
    value: 1.2, // 스택당 120% 상승
    stacks: 2,
    maxStacks: 2,
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "강공격 · 변주 스킬 · 공명 스킬 사용마다 1스택, 최대 2스택 · 처형 발동 시 전부 소모",
  },
];

// 미반영 — 피해 계산과 무관해서 뺀 것들
//   1체인 「구원」   공명 스킬 사용 횟수 +1 · 「파진치」 소모 15pt 감소
//   2체인 앞부분    「파진치」 30pt 획득
//   5체인 앞부분    반주 스킬 피해 배율 +120% (반주 스킬에 공격 데이터가 없다)

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive1104,
  passive1105,
  passive1108,
  introSkill,
  syncSkill,
];

export const jiyan: Character = {
  id: "jiyan",
  name: "기염",
  level: 90,
  element: "Aero",
  weaponType: "Broadblade",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id가 아니라 별도 번호(11)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_11.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_11_UI.webp",
  echoIds: [],
};
