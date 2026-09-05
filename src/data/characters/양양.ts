import { emptyStats } from "../../types/stats";
import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";

/**
 * 양양 — encore.moe API v2 원본(api/characters/1402.json)에서 옮겨 적은 것.
 * 절차와 규칙은 docs/character-workflow.md 참고.
 *
 * 판정이 이름과 어긋나는 곳이 둘 있다(DamageList Type 기준).
 *   회피 반격  → 강공격 판정
 *   공중 공격 · 날개의 뜻 → 일반 공격 판정
 */

// 스킬 트리 스탯 노드는 여기 넣지 않는다.
// src/data/characterNodes.json 이 노드 8개를 들고 있고, 켜고 끈 결과를 계산이 합산한다.
const baseStats = {
  ...emptyStats(),
  hp: 10200,
  atk: 250,
  def: 1099.998,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

const basicSkillAttacks: Attack[] = [
  {
    id: "1000101_1",
    name: "1단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.225, 0.2434, 0.2618, 0.2877, 0.3061, 0.3273, 0.3569, 0.3864, 0.4159, 0.4473],
    ],
  },
  {
    id: "1000101_2",
    name: "2단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3, 0.3246, 0.3492, 0.3836, 0.4082, 0.4365, 0.4758, 0.5152, 0.5546, 0.5964],
    ],
  },
  {
    id: "1000101_3",
    name: "3단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2355, 0.2548, 0.2741, 0.3011, 0.3204, 0.3426, 0.3735, 0.4044, 0.4353, 0.4681],
      [0.2355, 0.2548, 0.2741, 0.3011, 0.3204, 0.3426, 0.3735, 0.4044, 0.4353, 0.4681],
    ],
  },
  {
    id: "1000101_4",
    name: "4단 피해",
    type: "Basic",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2986, 0.3231, 0.3476, 0.3819, 0.4064, 0.4345, 0.4737, 0.5129, 0.552, 0.5936],
      [0.2986, 0.3231, 0.3476, 0.3819, 0.4064, 0.4345, 0.4737, 0.5129, 0.552, 0.5936],
      [0.3981, 0.4307, 0.4633, 0.509, 0.5417, 0.5792, 0.6315, 0.6837, 0.7359, 0.7914],
    ],
  },
  {
    id: "1000101_5",
    name: "강공격 피해",
    type: "Heavy",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1, 0.1082, 0.1164, 0.1278, 0.136, 0.1455, 0.1586, 0.1717, 0.1848, 0.1988],
      [0.1, 0.1082, 0.1164, 0.1278, 0.136, 0.1455, 0.1586, 0.1717, 0.1848, 0.1988],
      [0.1, 0.1082, 0.1164, 0.1278, 0.136, 0.1455, 0.1586, 0.1717, 0.1848, 0.1988],
    ],
  },
  {
    id: "1000101_6",
    name: "바람의 찬송 피해",
    type: "Heavy",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.5362, 0.5802, 0.6241, 0.6857, 0.7297, 0.7802, 0.8506, 0.921, 0.9913, 1.0661],
    ],
  },
  {
    id: "1000101_7",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.465, 0.5031, 0.5412, 0.5946, 0.6327, 0.6766, 0.7376, 0.7986, 0.8596, 0.9244],
    ],
  },
  {
    id: "1000101_8",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Heavy", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.438, 0.4739, 0.5098, 0.5601, 0.596, 0.6373, 0.6947, 0.7522, 0.8097, 0.8707],
      [0.438, 0.4739, 0.5098, 0.5601, 0.596, 0.6373, 0.6947, 0.7522, 0.8097, 0.8707],
    ],
  },
];

const basicSkill: Skill = {
  id: "1000101",
  category: "Basic",
  name: "날카로운 바람",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorKnife.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["22.50%", "24.34%", "26.18%", "28.77%", "30.61%", "32.73%", "35.69%", "38.64%", "41.59%", "44.73%", "48.42%", "52.11%", "55.80%", "59.49%", "63.18%", "66.87%", "70.56%", "74.25%", "77.94%", "81.63%"] },
    { attributeName: "2단 피해", description: "", values: ["30.00%", "32.46%", "34.92%", "38.36%", "40.82%", "43.65%", "47.58%", "51.52%", "55.46%", "59.64%", "64.56%", "69.48%", "74.40%", "79.32%", "84.24%", "89.16%", "94.08%", "99.00%", "103.92%", "108.84%"] },
    { attributeName: "3단 피해", description: "", values: ["23.55%*2", "25.48%*2", "27.41%*2", "30.11%*2", "32.04%*2", "34.26%*2", "37.35%*2", "40.44%*2", "43.53%*2", "46.81%*2", "50.68%*2", "54.54%*2", "58.40%*2", "62.26%*2", "66.13%*2", "69.99%*2", "73.85%*2", "77.71%*2", "81.57%*2", "85.44%*2"] },
    { attributeName: "4단 피해", description: "", values: ["29.86%*2+39.81%", "32.31%*2+43.07%", "34.76%*2+46.33%", "38.19%*2+50.90%", "40.64%*2+54.17%", "43.45%*2+57.92%", "47.37%*2+63.15%", "51.29%*2+68.37%", "55.20%*2+73.59%", "59.36%*2+79.14%", "64.26%*2+85.67%", "69.16%*2+92.20%", "74.05%*2+98.73%", "78.95%*2+105.26%", "83.85%*2+111.79%", "88.74%*2+118.31%", "93.64%*2+124.84%", "98.54%*2+131.37%", "103.43%*2+137.90%", "108.33%*2+144.43%"] },
    { attributeName: "강공격 피해", description: "", values: ["10.00%*3", "10.82%*3", "11.64%*3", "12.78%*3", "13.60%*3", "14.55%*3", "15.86%*3", "17.17%*3", "18.48%*3", "19.88%*3", "21.52%*3", "23.16%*3", "24.80%*3", "26.44%*3", "28.08%*3", "29.72%*3", "31.36%*3", "33.00%*3", "34.64%*3", "36.28%*3"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공중 공격 피해", description: "", values: ["46.50%", "50.31%", "54.12%", "59.46%", "63.27%", "67.66%", "73.76%", "79.86%", "85.96%", "92.44%", "100.07%", "107.69%", "115.32%", "122.95%", "130.57%", "138.20%", "145.82%", "153.45%", "161.08%", "168.70%"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "바람의 찬송 피해", description: "", values: ["53.62%", "58.02%", "62.41%", "68.57%", "72.97%", "78.02%", "85.06%", "92.10%", "99.13%", "106.61%", "115.40%", "124.20%", "132.99%", "141.78%", "150.58%", "159.37%", "168.17%", "176.96%", "185.76%", "194.53%"] },
    { attributeName: "회피 반격 피해", description: "", values: ["43.80%*2", "47.39%*2", "50.98%*2", "56.01%*2", "59.60%*2", "63.73%*2", "69.47%*2", "75.22%*2", "80.97%*2", "87.07%*2", "94.26%*2", "101.44%*2", "108.62%*2", "115.81%*2", "122.99%*2", "130.17%*2", "137.36%*2", "144.54%*2", "151.72%*2", "158.91%*2"] },
  ],
};


const resonanceSkillAttacks: Attack[] = [
  {
    id: "1000102_1",
    name: "바람의 영역 피해",
    type: "Skill",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1737, 0.1879, 0.2021, 0.2221, 0.2363, 0.2527, 0.2755, 0.2983, 0.3211, 0.3453],
      [0.1737, 0.1879, 0.2021, 0.2221, 0.2363, 0.2527, 0.2755, 0.2983, 0.3211, 0.3453],
      [0.1737, 0.1879, 0.2021, 0.2221, 0.2363, 0.2527, 0.2755, 0.2983, 0.3211, 0.3453],
      [0.1737, 0.1879, 0.2021, 0.2221, 0.2363, 0.2527, 0.2755, 0.2983, 0.3211, 0.3453],
      [1.0422, 1.1276, 1.2131, 1.3327, 1.4182, 1.5165, 1.6532, 1.7899, 1.9267, 2.0719],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1000102",
  category: "Skill",
  name: "바람의 영역",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYangyang/SP_IconYangyangB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["17.37%*4+104.22%", "18.79%*4+112.76%", "20.21%*4+121.31%", "22.21%*4+133.27%", "23.63%*4+141.82%", "25.27%*4+151.65%", "27.55%*4+165.32%", "29.83%*4+178.99%", "32.11%*4+192.67%", "34.53%*4+207.19%", "37.38%*4+224.29%", "40.23%*4+241.38%", "43.07%*4+258.47%", "45.92%*4+275.56%", "48.77%*4+292.66%", "51.62%*4+309.75%", "54.47%*4+326.84%", "57.32%*4+343.93%", "60.17%*4+361.02%"] },
    { attributeName: "쿨타임", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
  ],
};


const liberationSkillAttacks: Attack[] = [
  {
    id: "1000103_1",
    name: "북풍의 소용돌이 피해",
    type: "Liberation",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [0.2343, 0.2535, 0.2727, 0.2996, 0.3188, 0.3409, 0.3717, 0.4024, 0.4332, 0.4658],
      [1.8746, 2.0283, 2.1821, 2.3973, 2.551, 2.7278, 2.9737, 3.2197, 3.4656, 3.727],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1000103",
  category: "Liberation",
  name: "북풍의 소용돌이",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYangyang/SP_IconYangyangC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["23.43%*12+187.46%", "25.35%*12+202.83%", "27.27%*12+218.21%", "29.96%*12+239.73%", "31.88%*12+255.10%", "34.09%*12+272.78%", "37.17%*12+297.37%", "40.24%*12+321.97%", "43.32%*12+346.56%", "46.58%*12+372.70%", "50.43%*12+403.44%", "54.27%*12+434.19%", "58.11%*12+464.93%", "61.95%*12+495.67%", "65.80%*12+526.42%", "69.64%*12+557.16%", "73.48%*12+587.91%", "77.33%*12+618.65%", "81.17%*12+649.40%", "85.00%*12+680.12%"] },
    { attributeName: "쿨타임", description: "", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100"] },
  ],
};


const variationSkillAttacks: Attack[] = [
  {
    id: "1000106_1",
    name: "다크 블루의 찬송 피해",
    type: "Variation",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4, 0.4328, 0.4656, 0.5115, 0.5443, 0.582, 0.6345, 0.687, 0.7394, 0.7952],
      [0.4, 0.4328, 0.4656, 0.5115, 0.5443, 0.582, 0.6345, 0.687, 0.7394, 0.7952],
    ],
  },
];

const variationSkill: Skill = {
  id: "1000106",
  category: "Variation",
  name: "다크 블루의 찬송",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYangyang/SP_IconYangyangQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["40.00%*2", "43.28%*2", "46.56%*2", "51.15%*2", "54.43%*2", "58.20%*2", "63.45%*2", "68.70%*2", "73.94%*2", "79.52%*2", "86.08%*2", "92.64%*2", "99.20%*2", "105.76%*2", "112.32%*2", "118.88%*2", "125.44%*2", "132.00%*2", "138.56%*2", "145.12%*2"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const circuitSkillAttacks: Attack[] = [
  {
    id: "1000107_1",
    name: "풍랑 피해",
    type: "Heavy",
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1912, 0.2069, 0.2226, 0.2445, 0.2602, 0.2782, 0.3033, 0.3284, 0.3535, 0.3802],
      [0.1912, 0.2069, 0.2226, 0.2445, 0.2602, 0.2782, 0.3033, 0.3284, 0.3535, 0.3802],
    ],
  },
  {
    id: "1000107_2",
    name: "날개의 뜻 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Aero",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1093, 0.1183, 0.1272, 0.1398, 0.1488, 0.1591, 0.1734, 0.1878, 0.2021, 0.2173],
      [0.1093, 0.1183, 0.1272, 0.1398, 0.1488, 0.1591, 0.1734, 0.1878, 0.2021, 0.2173],
      [0.1093, 0.1183, 0.1272, 0.1398, 0.1488, 0.1591, 0.1734, 0.1878, 0.2021, 0.2173],
      [0.1093, 0.1183, 0.1272, 0.1398, 0.1488, 0.1591, 0.1734, 0.1878, 0.2021, 0.2173],
      [0.1093, 0.1183, 0.1272, 0.1398, 0.1488, 0.1591, 0.1734, 0.1878, 0.2021, 0.2173],
      [0.6378, 0.6901, 0.7424, 0.8157, 0.868, 0.9281, 1.0118, 1.0955, 1.1792, 1.2681],
      [0.6378, 0.6901, 0.7424, 0.8157, 0.868, 0.9281, 1.0118, 1.0955, 1.1792, 1.2681],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1000107",
  category: "Circuit",
  name: "복성재우",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYangyang/SP_IconYangyangY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "풍랑 피해", description: "", values: ["19.12%*2", "20.69%*2", "22.26%*2", "24.45%*2", "26.02%*2", "27.82%*2", "30.33%*2", "32.84%*2", "35.35%*2", "38.02%*2", "41.15%*2", "44.29%*2", "47.43%*2", "50.56%*2", "53.70%*2", "56.84%*2", "59.97%*2", "63.11%*2", "66.25%*2", "69.36%*2"] },
    { attributeName: "날개의 뜻 피해", description: "", values: ["10.93%*5+63.78%*2", "11.83%*5+69.01%*2", "12.72%*5+74.24%*2", "13.98%*5+81.57%*2", "14.88%*5+86.80%*2", "15.91%*5+92.81%*2", "17.34%*5+101.18%*2", "18.78%*5+109.55%*2", "20.21%*5+117.92%*2", "21.73%*5+126.81%*2", "23.53%*5+137.27%*2", "25.32%*5+147.73%*2", "27.11%*5+158.19%*2", "28.91%*5+168.66%*2", "30.70%*5+179.12%*2", "32.49%*5+189.58%*2", "34.29%*5+200.04%*2", "36.08%*5+210.50%*2", "37.87%*5+220.96%*2", "39.65%*5+231.40%*2"] },
    { attributeName: "날개의 뜻으로 회복하는 협주 에너지", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
  ],
};


const passive0104: Skill = {
  id: "1000104",
  category: "Passive",
  name: "바람의 해석",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYangyang/SP_IconYangyangD1.webp",
  attacks: [],
};


const passive0105: Skill = {
  id: "1000105",
  category: "Passive",
  name: "근심",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYangyang/SP_IconYangyangD2.webp",
  attacks: [],
};


const passive0108: Skill = {
  id: "1000108",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconRun.webp",
  attacks: [],
};


const introSkill: Skill = {
  id: "1000109",
  category: "Intro",
  name: "숨결",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYangyang/SP_IconYangyangT.webp",
  attacks: [],
};


const syncSkill: Skill = {
  id: "1000110",
  category: "Sync",
  name: "조화도 파괴 · 직검",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakKnife.webp",
  attacks: [],
};

/**
 * 고유 효과와 공명체인을 계산 가능한 형태로 옮긴 것.
 * 수치가 없는 것(스태미나·에너지 회복)은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 고유 스킬 ──
  {
    label: "근심 · 기류 피해 보너스",
    inherentSkillId: "1000105",
    target: "damageBonus",
    damageType: "Aero",
    value: 0.08, // 8% 증가
    uptime: "active",
    scope: "self",
    condition: "변주 스킬 · 다크 블루의 찬송 발동 후 8초간",
  },

  // ── 공명체인 ──
  {
    label: "1체인 · 기류 피해 보너스 추가",
    target: "damageBonus",
    damageType: "Aero",
    value: 0.15, // 추가 15%
    uptime: "active",
    scope: "self",
    resonanceChain: 1,
    condition: "변주 스킬 · 다크 블루의 찬송 발동 후 8초간",
  },
  {
    label: "3체인 · 공명 스킬 피해 보너스",
    target: "damageBonus",
    damageType: "Skill",
    value: 0.4, // 40% 증가
    uptime: "passive", // 조건이 없다
    scope: "self",
    resonanceChain: 3,
  },
  {
    label: "4체인 · 날개의 뜻 피해",
    target: "damageBonus",
    damageType: "All",
    attackId: "1000107_2", // 공중 공격 · 날개의 뜻
    value: 0.95, // 95% 증가
    uptime: "passive",
    scope: "self",
    resonanceChain: 4,
  },
  {
    label: "5체인 · 북풍의 소용돌이 피해",
    target: "damageBonus",
    damageType: "All",
    attackId: "1000103_1",
    value: 0.85, // 85% 증가
    uptime: "passive",
    scope: "self",
    resonanceChain: 5,
  },
  {
    label: "6체인 · 파티 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 6,
    condition: "공중 공격 · 날개의 뜻 발동 후 20초간",
  },
];

// 미반영 — 피해 계산과 무관해서 뺀 것들
//   고유 「바람의 해석」   날개의 뜻 후 스태미나 30pt 회복
//   2체인 「종달새의 여행」  강공격 명중 시 공명 에너지 10pt 회복
//   3체인 뒷부분          바람 필드 견인 범위 33% 증가

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive0104,
  passive0105,
  passive0108,
  introSkill,
  syncSkill,
];

export const yangyang: Character = {
  id: "yangyang",
  name: "양양",
  level: 90,
  element: "Aero",
  weaponType: "Sword",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id가 아니라 별도 번호(1)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_1.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_1_UI.webp",
  echoIds: [],
};
