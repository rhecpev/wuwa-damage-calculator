import { emptyStats } from "../../types/stats";
import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";

/**
 * 벨리나 — encore.moe API v2 원본(api/characters/1503.json)에서 옮겨 적은 것.
 * 절차와 규칙은 docs/character-workflow.md 참고.
 *
 * 치료 중심 캐릭터라 파티에 거는 버프가 많다(scope: "party").
 * 치료량 항목(「자라난 초목 치료량」 등)은 공격이 아니라 attacks에 넣지 않았다.
 */

// 스킬 트리 스탯 노드는 여기 넣지 않는다.
// src/data/characterNodes.json 이 노드 8개를 들고 있고, 켜고 끈 결과를 계산이 합산한다.
const baseStats = {
  ...emptyStats(),
  hp: 14237.5,
  atk: 337.5,
  def: 1099.998,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

const basicSkillAttacks: Attack[] = [
  {
    id: "1000301_1",
    name: "1단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1904, 0.2061, 0.2217, 0.2435, 0.2591, 0.2771, 0.3021, 0.327, 0.352, 0.3786],
    ],
  },
  {
    id: "1000301_2",
    name: "2단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2573, 0.2784, 0.2995, 0.3291, 0.3502, 0.3744, 0.4082, 0.4419, 0.4757, 0.5116],
    ],
  },
  {
    id: "1000301_3",
    name: "3단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1287, 0.1392, 0.1498, 0.1646, 0.1751, 0.1872, 0.2041, 0.221, 0.2379, 0.2558],
      [0.1287, 0.1392, 0.1498, 0.1646, 0.1751, 0.1872, 0.2041, 0.221, 0.2379, 0.2558],
    ],
  },
  {
    id: "1000301_4",
    name: "4단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3386, 0.3664, 0.3942, 0.433, 0.4608, 0.4927, 0.5372, 0.5816, 0.626, 0.6732],
    ],
  },
  {
    id: "1000301_5",
    name: "5단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3603, 0.3898, 0.4193, 0.4607, 0.4902, 0.5242, 0.5714, 0.6187, 0.666, 0.7162],
    ],
  },
  {
    id: "1000301_6",
    name: "강공격 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.5, 0.541, 0.582, 0.6394, 0.6804, 0.7276, 0.7932, 0.8588, 0.9244, 0.9941],
    ],
  },
  {
    id: "1000301_7",
    name: "공중 공격 1단 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2835, 0.3068, 0.33, 0.3626, 0.3858, 0.4126, 0.4498, 0.487, 0.5242, 0.5637],
    ],
  },
  {
    id: "1000301_8",
    name: "공중 공격 2단 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2675, 0.2895, 0.3114, 0.3421, 0.3641, 0.3893, 0.4244, 0.4595, 0.4946, 0.5319],
    ],
  },
  {
    id: "1000301_9",
    name: "공중 공격 3단 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1279, 0.1384, 0.1488, 0.1635, 0.174, 0.1861, 0.2028, 0.2196, 0.2364, 0.2542],
      [0.1279, 0.1384, 0.1488, 0.1635, 0.174, 0.1861, 0.2028, 0.2196, 0.2364, 0.2542],
      [0.1279, 0.1384, 0.1488, 0.1635, 0.174, 0.1861, 0.2028, 0.2196, 0.2364, 0.2542],
    ],
  },
  {
    id: "1000301_10",
    name: "공중 강공격 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.31, 0.3355, 0.3609, 0.3965, 0.4219, 0.4511, 0.4918, 0.5325, 0.5731, 0.6164],
    ],
  },
  {
    id: "1000301_11",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.65, 0.7033, 0.7566, 0.8313, 0.8846, 0.9459, 1.0311, 1.1164, 1.2017, 1.2923],
    ],
  },
];

const basicSkill: Skill = {
  id: "1000301",
  category: "Basic",
  name: "육묘",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorMagic.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["19.04%", "20.61%", "22.17%", "24.35%", "25.91%", "27.71%", "30.21%", "32.70%", "35.20%", "37.86%", "40.98%", "44.10%", "47.22%", "50.35%", "53.47%", "56.59%", "59.71%", "62.84%", "65.96%", "69.08%"] },
    { attributeName: "2단 피해", description: "", values: ["25.73%", "27.84%", "29.95%", "32.91%", "35.02%", "37.44%", "40.82%", "44.19%", "47.57%", "51.16%", "55.38%", "59.60%", "63.81%", "68.03%", "72.25%", "76.47%", "80.69%", "84.91%", "89.13%", "93.35%"] },
    { attributeName: "3단 피해", description: "", values: ["12.87%*2", "13.92%*2", "14.98%*2", "16.46%*2", "17.51%*2", "18.72%*2", "20.41%*2", "22.10%*2", "23.79%*2", "25.58%*2", "27.69%*2", "29.80%*2", "31.91%*2", "34.02%*2", "36.13%*2", "38.24%*2", "40.35%*2", "42.46%*2", "44.57%*2", "46.68%*2"] },
    { attributeName: "4단 피해", description: "", values: ["33.86%", "36.64%", "39.42%", "43.30%", "46.08%", "49.27%", "53.72%", "58.16%", "62.60%", "67.32%", "72.87%", "78.43%", "83.98%", "89.53%", "95.08%", "100.64%", "106.19%", "111.74%", "117.30%", "122.85%"] },
    { attributeName: "5단 피해", description: "", values: ["36.03%", "38.98%", "41.93%", "46.07%", "49.02%", "52.42%", "57.14%", "61.87%", "66.60%", "71.62%", "77.52%", "83.43%", "89.34%", "95.25%", "101.15%", "107.06%", "112.97%", "118.88%", "124.78%", "130.69%"] },
    { attributeName: "강공격 피해", description: "", values: ["50.00%", "54.10%", "58.20%", "63.94%", "68.04%", "72.76%", "79.32%", "85.88%", "92.44%", "99.41%", "107.61%", "115.81%", "124.01%", "132.21%", "140.41%", "148.61%", "156.81%", "165.01%", "173.21%", "181.41%"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "공중 공격 1단 피해", description: "", values: ["28.35%", "30.68%", "33.00%", "36.26%", "38.58%", "41.26%", "44.98%", "48.70%", "52.42%", "56.37%", "61.02%", "65.67%", "70.32%", "74.97%", "79.61%", "84.26%", "88.91%", "93.56%", "98.21%", "102.86%"] },
    { attributeName: "공중 공격 2단 피해", description: "", values: ["26.75%", "28.95%", "31.14%", "34.21%", "36.41%", "38.93%", "42.44%", "45.95%", "49.46%", "53.19%", "57.57%", "61.96%", "66.35%", "70.73%", "75.12%", "79.51%", "83.90%", "88.28%", "92.67%", "97.06%"] },
    { attributeName: "공중 공격 3단 피해", description: "", values: ["12.79%*3", "13.84%*3", "14.88%*3", "16.35%*3", "17.40%*3", "18.61%*3", "20.28%*3", "21.96%*3", "23.64%*3", "25.42%*3", "27.52%*3", "29.61%*3", "31.71%*3", "33.81%*3", "35.90%*3", "38.00%*3", "40.09%*3", "42.19%*3", "44.29%*3", "46.38%*3"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5"] },
    { attributeName: "공중 강공격 피해", description: "", values: ["31.00%", "33.55%", "36.09%", "39.65%", "42.19%", "45.11%", "49.18%", "53.25%", "57.31%", "61.64%", "66.72%", "71.80%", "76.89%", "81.97%", "87.06%", "92.14%", "97.22%", "102.31%", "107.39%", "112.48%"] },
    { attributeName: "공중 강공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "회피 반격 피해", description: "", values: ["65.00%", "70.33%", "75.66%", "83.13%", "88.46%", "94.59%", "103.11%", "111.64%", "120.17%", "129.23%", "139.89%", "150.55%", "161.21%", "171.87%", "182.53%", "193.19%", "203.85%", "214.51%", "225.17%", "235.83%"] },
  ],
};


const resonanceSkillAttacks: Attack[] = [
  {
    id: "1000302_1",
    name: "식물 실험 피해",
    type: "Skill",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.18, 0.1948, 0.2096, 0.2302, 0.245, 0.262, 0.2856, 0.3092, 0.3328, 0.3579],
      [0.18, 0.1948, 0.2096, 0.2302, 0.245, 0.262, 0.2856, 0.3092, 0.3328, 0.3579],
      [0.18, 0.1948, 0.2096, 0.2302, 0.245, 0.262, 0.2856, 0.3092, 0.3328, 0.3579],
      [0.36, 0.3896, 0.4191, 0.4604, 0.4899, 0.5239, 0.5711, 0.6183, 0.6656, 0.7158],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1000302",
  category: "Skill",
  name: "식물 실험",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJueyuan/SP_IconJueyuanB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["18.00%*3+36.00%", "19.48%*3+38.96%", "20.96%*3+41.91%", "23.02%*3+46.04%", "24.50%*3+48.99%", "26.20%*3+52.39%", "28.56%*3+57.11%", "30.92%*3+61.83%", "33.28%*3+66.56%", "35.79%*3+71.58%", "38.74%*3+77.48%", "41.69%*3+83.38%", "44.65%*3+89.29%", "47.60%*3+95.19%", "50.55%*3+101.10%", "53.50%*3+107.00%", "56.45%*3+112.90%", "59.41%*3+118.81%", "62.36%*3+124.71%", "65.31%*3+130.62%"] },
    { attributeName: "쿨타임", description: "", values: ["12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
  ],
};


const liberationSkillAttacks: Attack[] = [
  {
    id: "1000303_1",
    name: "자라난 초목 피해",
    type: "Liberation",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1, 1.082, 1.164, 1.2788, 1.3608, 1.4551, 1.5863, 1.7175, 1.8487, 1.9881],
    ],
  },
  {
    id: "1000303_2",
    name: "협동 공격 피해",
    type: "Chain",
    damageBonusType: "Liberation", // DamageList Type 기준
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.05, 0.0541, 0.0582, 0.064, 0.0681, 0.0728, 0.0794, 0.0859, 0.0925, 0.0995],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1000303",
  category: "Liberation",
  name: "자라난 초목",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJueyuan/SP_IconJueyuanC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["100.00%", "108.20%", "116.40%", "127.88%", "136.08%", "145.51%", "158.63%", "171.75%", "184.87%", "198.81%", "215.21%", "231.61%", "248.01%", "264.41%", "280.81%", "297.21%", "313.61%", "330.01%", "346.41%", "362.81%"] },
    { attributeName: "자라난 초목 치료량", description: "", values: ["500+11.33%", "600+13.03%", "700+14.17%", "800+15.87%", "825+17.00%", "890+18.13%", "900+19.27%", "915+20.40%", "930+21.53%", "950+23.80%", "1029+25.76%", "1107+27.73%", "1186+29.69%", "1264+31.65%", "1342+33.62%", "1421+35.58%", "1499+37.54%", "1577+39.51%", "1656+41.47%", "1734+43.43%"] },
    { attributeName: "협동 공격 피해", description: "", values: ["5.00%", "5.41%", "5.82%", "6.40%", "6.81%", "7.28%", "7.94%", "8.59%", "9.25%", "9.95%", "10.77%", "11.59%", "12.41%", "13.23%", "14.05%", "14.87%", "15.69%", "16.51%", "17.33%", "18.15%"] },
    { attributeName: "협동 공격 치료량", description: "", values: ["225+5.10%", "270+5.87%", "315+6.38%", "360+7.14%", "372+7.65%", "401+8.16%", "405+8.67%", "412+9.18%", "419+9.69%", "428+10.71%", "463+11.59%", "499+12.48%", "534+13.36%", "569+14.24%", "604+15.13%", "640+16.01%", "675+16.89%", "710+17.78%", "745+18.66%", "781+19.54%"] },
    { attributeName: "광합성 표식 지속 시간", description: "", values: ["12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12"] },
    { attributeName: "쿨타임", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};


const variationSkillAttacks: Attack[] = [
  {
    id: "1000306_1",
    name: "확산 피해",
    type: "Variation",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.5, 0.541, 0.582, 0.6394, 0.6804, 0.7276, 0.7932, 0.8588, 0.9244, 0.9941],
    ],
  },
];

const variationSkill: Skill = {
  id: "1000306",
  category: "Variation",
  name: "확산",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJueyuan/SP_IconJueyuanQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["50.00%", "54.10%", "58.20%", "63.94%", "68.04%", "72.76%", "79.32%", "85.88%", "92.44%", "99.41%", "107.61%", "115.81%", "124.01%", "132.21%", "140.41%", "148.61%", "156.81%", "165.01%", "173.21%", "181.41%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const circuitSkillAttacks: Attack[] = [
  {
    id: "1000307_1",
    name: "강공격 · 별꽃의 개화 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3267, 0.3535, 0.3803, 0.4178, 0.4446, 0.4754, 0.5182, 0.5611, 0.604, 0.6495],
      [0.49, 0.5302, 0.5704, 0.6267, 0.6668, 0.713, 0.7773, 0.8416, 0.9059, 0.9742],
    ],
  },
  {
    id: "1000307_2",
    name: "공중 공격 · 별꽃의 개화 1단 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3402, 0.3681, 0.396, 0.4351, 0.463, 0.4951, 0.5397, 0.5843, 0.629, 0.6764],
    ],
  },
  {
    id: "1000307_3",
    name: "공중 공격 · 별꽃의 개화 2단 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.321, 0.3474, 0.3737, 0.4105, 0.4369, 0.4671, 0.5093, 0.5514, 0.5935, 0.6382],
    ],
  },
  {
    id: "1000307_4",
    name: "공중 공격 · 별꽃의 개화 3단 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1534, 0.166, 0.1786, 0.1962, 0.2088, 0.2233, 0.2434, 0.2635, 0.2836, 0.305],
      [0.1534, 0.166, 0.1786, 0.1962, 0.2088, 0.2233, 0.2434, 0.2635, 0.2836, 0.305],
      [0.1534, 0.166, 0.1786, 0.1962, 0.2088, 0.2233, 0.2434, 0.2635, 0.2836, 0.305],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1000307",
  category: "Circuit",
  name: "별꽃의 개화",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJueyuan/SP_IconJueyuanY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "강공격·별꽃의 개화 피해", description: "", values: ["32.67%+49.00%", "35.35%+53.02%", "38.03%+57.04%", "41.78%+62.67%", "44.46%+66.68%", "47.54%+71.30%", "51.82%+77.73%", "56.11%+84.16%", "60.40%+90.59%", "64.95%+97.42%", "70.31%+105.46%", "75.66%+113.49%", "81.02%+121.53%", "86.38%+129.57%", "91.74%+137.60%", "97.09%+145.64%", "102.45%+153.67%", "107.81%+161.71%", "113.17%+169.75%", "118.52%+177.78%"] },
    { attributeName: "별꽃의 개화 치료량", description: "", values: ["625+14.17%", "750+16.29%", "875+17.71%", "1000+19.83%", "1032+21.25%", "1113+22.67%", "1125+24.08%", "1144+25.50%", "1163+26.92%", "1188+29.75%", "1286+32.20%", "1384+34.66%", "1482+37.11%", "1580+39.57%", "1678+42.02%", "1776+44.47%", "1874+46.93%", "1972+49.38%", "2070+51.84%", "2168+54.29%"] },
    { attributeName: "공중 공격 · 별꽃의 개화 1단 피해", description: "", values: ["34.02%", "36.81%", "39.60%", "43.51%", "46.30%", "49.51%", "53.97%", "58.43%", "62.90%", "67.64%", "73.22%", "78.80%", "84.38%", "89.96%", "95.54%", "101.12%", "106.70%", "112.27%", "117.85%", "123.43%"] },
    { attributeName: "공중 공격 · 별꽃의 개화 2단 피해", description: "", values: ["32.10%", "34.74%", "37.37%", "41.05%", "43.69%", "46.71%", "50.93%", "55.14%", "59.35%", "63.82%", "69.09%", "74.35%", "79.62%", "84.88%", "90.15%", "95.41%", "100.67%", "105.94%", "111.20%", "116.47%"] },
    { attributeName: "공중 공격 · 별꽃의 개화 3단 피해", description: "", values: ["15.34%*3", "16.60%*3", "17.86%*3", "19.62%*3", "20.88%*3", "22.33%*3", "24.34%*3", "26.35%*3", "28.36%*3", "30.50%*3", "33.02%*3", "35.53%*3", "38.05%*3", "40.57%*3", "43.08%*3", "45.60%*3", "48.11%*3", "50.63%*3", "53.14%*3", "55.66%*3"] },
    { attributeName: "각 스택의 「광합성 에너지」가  회복하는 협주 에너지", description: "", values: ["12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12"] },
  ],
};


const passive0304: Skill = {
  id: "1000304",
  category: "Passive",
  name: "생명의 은혜",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJueyuan/SP_IconJueyuanD1.webp",
  attacks: [],
};


const passive0305: Skill = {
  id: "1000305",
  category: "Passive",
  name: "자연의 선물",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJueyuan/SP_IconJueyuanD2.webp",
  attacks: [],
};


const passive0308: Skill = {
  id: "1000308",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld3.webp",
  attacks: [],
};


const introSkill: Skill = {
  id: "1000309",
  category: "Intro",
  name: "꽃의 만발",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconJueyuan/SP_IconJueyuanT.webp",
  attacks: [],
};


const syncSkill: Skill = {
  id: "1000310",
  category: "Sync",
  name: "조화도 파괴 · 증폭기",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakMagic.webp",
  attacks: [],
};

/**
 * 고유 효과와 공명체인을 계산 가능한 형태로 옮긴 것.
 * 치료·실드처럼 피해와 무관한 것은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 반주 스킬 ──
  {
    label: "꽃의 만발 · 파티 전체 피해 부스트",
    target: "boost",
    damageType: "All",
    value: 0.15,
    uptime: "active",
    scope: "party", // 반주로 등장하는 「다음 캐릭터」에게 걸린다
    condition: "반주 스킬 발동 후 30초간, 주변 파티 전원",
  },
  // ── 고유 스킬 ──
  {
    label: "자연의 선물 · 파티 공격력",
    inherentSkillId: "1000305",
    target: "atkPercent",
    damageType: "All",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    condition: "강공격·공중 공격 별꽃의 개화 / 공명 해방 / 반주 스킬 발동 후 20초간",
  },

  // ── 공명체인 ──
  {
    label: "4체인 · 파티 회절 피해 보너스",
    target: "damageBonus",
    damageType: "Spectro",
    value: 0.15, // 15% 증가
    uptime: "active",
    scope: "party",
    resonanceChain: 4,
    condition: "강공격·공중 공격 별꽃의 개화 / 공명 해방 / 반주 스킬 발동 후 24초간",
  },
  {
    label: "6체인 · 별꽃의 개화 피해",
    target: "damageBonus",
    damageType: "All",
    // 강공격 · 공중 공격 별꽃의 개화 넷에만 걸린다.
    attackIds: ["1000307_1", "1000307_2", "1000307_3", "1000307_4"],
    value: 0.2, // 20% 증가
    uptime: "passive", // 조건이 없다
    scope: "self",
    resonanceChain: 6,
  },
];

// 미반영 — 피해 계산과 무관해서 뺀 것들
//   고유 「생명의 은혜」    치명타 피해 시 실드(공격력 120%)
//   1체인 「싹이 트는 순간」  반주 후 파티 HP 지속 회복
//   2체인 「꽃잎의 생각」    「광합성 에너지」·협주 에너지 획득
//   3체인 「성장의 선택」    치료 효과 보너스 12% (healingBonus는 표시 전용)
//   5체인 「결실의 기적」    치료 효과 보너스 20%
//   6체인 뒷부분          협동 공격 발동 · HP 회복

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive0304,
  passive0305,
  passive0308,
  introSkill,
  syncSkill,
];

export const verina: Character = {
  id: "verina",
  name: "벨리나",
  level: 90,
  element: "Spectro",
  weaponType: "Rectifier",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id가 아니라 별도 번호(3)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_3.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_3_UI.webp",
  echoIds: [],
};
