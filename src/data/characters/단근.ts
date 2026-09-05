import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";
import { emptyStats } from "../../types/stats";

/**
 * 단근 (Id 1602, 4성, 인멸, 직검)
 * 출처: encore.moe API v2 (api-v2.encore.moe/api/ko/character/1602)
 * 작성 절차: docs/character-workflow.md
 *
 * hits는 SkillAttributes로 히트 개수를 잡고 DamageList의 RateLv(레벨 1~10)로 값을 채웠다.
 * 두 배열이 1:1이 아니다 — DamageList가 같은 값 히트를 하나로 합쳐 놓은 경우가 있어
 * (예: 강공격 18.67%*3 → 엔트리 1개) SkillAttributes의 *N 표기를 기준으로 펼쳤다.
 *
 * 공명 모드가 없는 캐릭터라 resonanceModes는 생략한다(SkillBranches 비어 있음).
 * Properties의 GrowthValues 중 level 90 값 사용.
 */
/**
 * 스킬 트리(SkillTree) 노드 8개. 전부 고정 스탯이고 만렙이면 항상 켜져 있어서
 * 조건 없이 baseStats에 그대로 합친다.
 *   공격력       1.80 + 1.80 + 4.20 + 4.20 = 12%
 *   인멸 피해 보너스 1.80 + 1.80 + 4.20 + 4.20 = 12%
 */
// 스킬 트리 스탯 노드(공격력 12% · 인멸 피해 보너스 12%)는 여기 넣지 않는다.
// 노드 하나하나가 src/data/characterNodes.json 에 있고, 켜고 끈 결과를
// nodeStats()가 합산해 스탯에 얹는다. 전부 켜면 예전 상수와 같은 값이 된다.
const baseStats = {
  ...emptyStats(),
  hp: 9437.5,
  atk: 262.5,
  def: 1148.89,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

// 기본 공격
const basicSkillAttacks: Attack[] = [
  {
    id: "1000801_1",
    name: "일반 공격 1단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.288, 0.3117, 0.3353, 0.3683, 0.392, 0.4191, 0.4569, 0.4947, 0.5325, 0.5726],
    ],
  },
  {
    id: "1000801_2",
    name: "일반 공격 2단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.296, 0.3203, 0.3446, 0.3786, 0.4028, 0.4308, 0.4696, 0.5084, 0.5473, 0.5885],
    ],
  },
  {
    id: "1000801_3",
    name: "일반 공격 3단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953],
    ],
  },
  {
    id: "1000801_4",
    name: "강공격 피해",
    type: "Heavy",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1867, 0.202, 0.2173, 0.2388, 0.2541, 0.2717, 0.2962, 0.3206, 0.3451, 0.3712],
      [0.1867, 0.202, 0.2173, 0.2388, 0.2541, 0.2717, 0.2962, 0.3206, 0.3451, 0.3712],
      [0.1867, 0.202, 0.2173, 0.2388, 0.2541, 0.2717, 0.2962, 0.3206, 0.3451, 0.3712],
    ],
  },
  {
    id: "1000801_5",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.496, 0.5367, 0.5774, 0.6343, 0.675, 0.7218, 0.7869, 0.8519, 0.917, 0.9861],
    ],
  },
  {
    id: "1000801_6",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.32, 0.3463, 0.3725, 0.4093, 0.4355, 0.4657, 0.5077, 0.5496, 0.5916, 0.6362],
      [0.32, 0.3463, 0.3725, 0.4093, 0.4355, 0.4657, 0.5077, 0.5496, 0.5916, 0.6362],
      [0.32, 0.3463, 0.3725, 0.4093, 0.4355, 0.4657, 0.5077, 0.5496, 0.5916, 0.6362],
    ],
  },
];

const basicSkill: Skill = {
  id: "1000801",
  category: "Basic",
  name: "검 휘두르기",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorKnife.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["28.80%", "31.17%", "33.53%", "36.83%", "39.20%", "41.91%", "45.69%", "49.47%", "53.25%", "57.26%", "61.99%", "66.71%", "71.43%", "76.16%", "80.88%", "85.60%", "90.32%", "95.05%", "99.77%", "104.49%"] },
    { attributeName: "2단 피해", description: "", values: ["29.60%", "32.03%", "34.46%", "37.86%", "40.28%", "43.08%", "46.96%", "50.84%", "54.73%", "58.85%", "63.71%", "68.56%", "73.42%", "78.27%", "83.12%", "87.98%", "92.83%", "97.69%", "102.54%", "107.40%"] },
    { attributeName: "3단 피해", description: "", values: ["40.00%", "43.28%", "46.56%", "51.16%", "54.44%", "58.21%", "63.46%", "68.70%", "73.95%", "79.53%", "86.09%", "92.65%", "99.21%", "105.77%", "112.33%", "118.89%", "125.45%", "132.01%", "138.57%", "145.13%"] },
    { attributeName: "강공격 피해", description: "", values: ["18.67%*3", "20.20%*3", "21.73%*3", "23.88%*3", "25.41%*3", "27.17%*3", "29.62%*3", "32.06%*3", "34.51%*3", "37.12%*3", "40.18%*3", "43.24%*3", "46.30%*3", "49.36%*3", "52.42%*3", "55.48%*3", "58.55%*3", "61.61%*3", "64.67%*3", "67.73%*3"] },
    { attributeName: "공중 공격 피해", description: "", values: ["49.60%", "53.67%", "57.74%", "63.43%", "67.50%", "72.18%", "78.69%", "85.19%", "91.70%", "98.61%", "106.75%", "114.88%", "123.02%", "131.15%", "139.29%", "147.42%", "155.56%", "163.69%", "171.82%", "179.96%"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "회피 반격 피해", description: "", values: ["32.00%*3", "34.63%*3", "37.25%*3", "40.93%*3", "43.55%*3", "46.57%*3", "50.77%*3", "54.96%*3", "59.16%*3", "63.62%*3", "68.87%*3", "74.12%*3", "79.37%*3", "84.62%*3", "89.86%*3", "95.11%*3", "100.36%*3", "105.61%*3", "110.86%*3", "116.10%*3"] },
  ],
};

// 공명 스킬
const resonanceSkillAttacks: Attack[] = [
  {
    id: "1000802_1",
    name: "적화 피해",
    type: "Skill",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.192, 0.2078, 0.2235, 0.2456, 0.2613, 0.2794, 0.3046, 0.3298, 0.355, 0.3818],
      [0.192, 0.2078, 0.2235, 0.2456, 0.2613, 0.2794, 0.3046, 0.3298, 0.355, 0.3818],
    ],
  },
  {
    id: "1000802_2",
    name: "주식 1단 피해",
    type: "Skill",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.324, 0.3506, 0.3772, 0.4144, 0.4409, 0.4715, 0.514, 0.5565, 0.599, 0.6442],
      [0.324, 0.3506, 0.3772, 0.4144, 0.4409, 0.4715, 0.514, 0.5565, 0.599, 0.6442],
    ],
  },
  {
    id: "1000802_3",
    name: "주식 2단 피해",
    type: "Skill",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
    ],
  },
  {
    id: "1000802_4",
    name: "신멸 1단 피해",
    type: "Skill",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.282, 0.3052, 0.3283, 0.3607, 0.3838, 0.4104, 0.4474, 0.4844, 0.5214, 0.5607],
      [0.282, 0.3052, 0.3283, 0.3607, 0.3838, 0.4104, 0.4474, 0.4844, 0.5214, 0.5607],
    ],
  },
  {
    id: "1000802_5",
    name: "신멸 2단 피해",
    type: "Skill",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.216, 0.2338, 0.2515, 0.2763, 0.294, 0.3144, 0.3427, 0.371, 0.3994, 0.4295],
      [0.216, 0.2338, 0.2515, 0.2763, 0.294, 0.3144, 0.3427, 0.371, 0.3994, 0.4295],
      [0.216, 0.2338, 0.2515, 0.2763, 0.294, 0.3144, 0.3427, 0.371, 0.3994, 0.4295],
    ],
  },
  {
    id: "1000802_6",
    name: "신멸 3단 피해",
    type: "Skill",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.324, 0.3506, 0.3772, 0.4144, 0.4409, 0.4715, 0.514, 0.5565, 0.599, 0.6442],
      [0.324, 0.3506, 0.3772, 0.4144, 0.4409, 0.4715, 0.514, 0.5565, 0.599, 0.6442],
      [0.324, 0.3506, 0.3772, 0.4144, 0.4409, 0.4715, 0.514, 0.5565, 0.599, 0.6442],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1000802",
  category: "Skill",
  name: "주화잔장",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMicai/SP_IconMicaiB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "적화 피해", description: "", values: ["19.20%*2", "20.78%*2", "22.35%*2", "24.56%*2", "26.13%*2", "27.94%*2", "30.46%*2", "32.98%*2", "35.50%*2", "38.18%*2", "41.33%*2", "44.47%*2", "47.62%*2", "50.77%*2", "53.92%*2", "57.07%*2", "60.22%*2", "63.37%*2", "66.52%*2", "69.66%*2"] },
    { attributeName: "주식 1단 피해", description: "", values: ["32.40%*2", "35.06%*2", "37.72%*2", "41.44%*2", "44.09%*2", "47.15%*2", "51.40%*2", "55.65%*2", "59.90%*2", "64.42%*2", "69.73%*2", "75.05%*2", "80.36%*2", "85.67%*2", "90.99%*2", "96.30%*2", "101.61%*2", "106.93%*2", "112.24%*2", "117.56%*2"] },
    { attributeName: "주식 2단 피해", description: "", values: ["30.00%*2", "32.46%*2", "34.92%*2", "38.37%*2", "40.83%*2", "43.66%*2", "47.59%*2", "51.53%*2", "55.47%*2", "59.65%*2", "64.57%*2", "69.49%*2", "74.41%*2", "79.33%*2", "84.25%*2", "89.17%*2", "94.09%*2", "99.01%*2", "103.93%*2", "108.85%*2"] },
    { attributeName: "신멸 1단 피해", description: "", values: ["28.20%*2", "30.52%*2", "32.83%*2", "36.07%*2", "38.38%*2", "41.04%*2", "44.74%*2", "48.44%*2", "52.14%*2", "56.07%*2", "60.69%*2", "65.32%*2", "69.94%*2", "74.57%*2", "79.19%*2", "83.82%*2", "88.44%*2", "93.07%*2", "97.69%*2", "102.32%*2"] },
    { attributeName: "신멸 2단 피해", description: "", values: ["21.60%*3", "23.38%*3", "25.15%*3", "27.63%*3", "29.40%*3", "31.44%*3", "34.27%*3", "37.10%*3", "39.94%*3", "42.95%*3", "46.49%*3", "50.03%*3", "53.58%*3", "57.12%*3", "60.66%*3", "64.20%*3", "67.74%*3", "71.29%*3", "74.83%*3", "78.37%*3"] },
    { attributeName: "신멸 3단 피해", description: "", values: ["32.40%*3", "35.06%*3", "37.72%*3", "41.44%*3", "44.09%*3", "47.15%*3", "51.40%*3", "55.65%*3", "59.90%*3", "64.42%*3", "69.73%*3", "75.05%*3", "80.36%*3", "85.67%*3", "90.99%*3", "96.30%*3", "101.61%*3", "106.93%*3", "112.24%*3", "117.56%*3"] },
    { attributeName: "주식의 각인 지속 시간", description: "초", values: ["12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12"] },
    { attributeName: "쿨타임", description: "초", values: ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"] },
  ],
};

// 공명 해방
const liberationSkillAttacks: Attack[] = [
  {
    id: "1000803_1",
    name: "연속 공격 피해",
    type: "Liberation",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2469, 0.2672, 0.2874, 0.3158, 0.336, 0.3593, 0.3917, 0.4241, 0.4564, 0.4909],
      [0.2469, 0.2672, 0.2874, 0.3158, 0.336, 0.3593, 0.3917, 0.4241, 0.4564, 0.4909],
      [0.2469, 0.2672, 0.2874, 0.3158, 0.336, 0.3593, 0.3917, 0.4241, 0.4564, 0.4909],
      [0.2469, 0.2672, 0.2874, 0.3158, 0.336, 0.3593, 0.3917, 0.4241, 0.4564, 0.4909],
      [0.2469, 0.2672, 0.2874, 0.3158, 0.336, 0.3593, 0.3917, 0.4241, 0.4564, 0.4909],
      [0.2469, 0.2672, 0.2874, 0.3158, 0.336, 0.3593, 0.3917, 0.4241, 0.4564, 0.4909],
      [0.2469, 0.2672, 0.2874, 0.3158, 0.336, 0.3593, 0.3917, 0.4241, 0.4564, 0.4909],
      [0.2469, 0.2672, 0.2874, 0.3158, 0.336, 0.3593, 0.3917, 0.4241, 0.4564, 0.4909],
    ],
  },
  {
    id: "1000803_2",
    name: "혈빛 폭발 피해",
    type: "Liberation",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.975, 2.137, 2.2989, 2.5257, 2.6876, 2.8739, 3.133, 3.3921, 3.6512, 3.9265],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1000803",
  category: "Liberation",
  name: "피어나는 주홍",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMicai/SP_IconMicaiC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "연속 공격 피해", description: "", values: ["24.69%*8", "26.72%*8", "28.74%*8", "31.58%*8", "33.60%*8", "35.93%*8", "39.17%*8", "42.41%*8", "45.64%*8", "49.09%*8", "53.13%*8", "57.18%*8", "61.23%*8", "65.28%*8", "69.33%*8", "73.38%*8", "77.43%*8", "81.48%*8", "85.52%*8", "89.57%*8"] },
    { attributeName: "혈빛 폭발 피해", description: "", values: ["197.50%", "213.70%", "229.89%", "252.57%", "268.76%", "287.39%", "313.30%", "339.21%", "365.12%", "392.65%", "425.04%", "457.43%", "489.82%", "522.21%", "554.60%", "586.99%", "619.38%", "651.77%", "684.16%", "716.55%"] },
    { attributeName: "쿨타임", description: "초", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 변주 스킬
const variationSkillAttacks: Attack[] = [
  {
    id: "1000806_1",
    name: "격수 피해",
    type: "Variation",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.25, 0.2705, 0.291, 0.3197, 0.3402, 0.3638, 0.3966, 0.4294, 0.4622, 0.4971],
      [0.25, 0.2705, 0.291, 0.3197, 0.3402, 0.3638, 0.3966, 0.4294, 0.4622, 0.4971],
      [0.25, 0.2705, 0.291, 0.3197, 0.3402, 0.3638, 0.3966, 0.4294, 0.4622, 0.4971],
      [0.25, 0.2705, 0.291, 0.3197, 0.3402, 0.3638, 0.3966, 0.4294, 0.4622, 0.4971],
    ],
  },
];

const variationSkill: Skill = {
  id: "1000806",
  category: "Variation",
  name: "격수",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMicai/SP_IconMicaiQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["25.00%*4", "27.05%*4", "29.10%*4", "31.97%*4", "34.02%*4", "36.38%*4", "39.66%*4", "42.94%*4", "46.22%*4", "49.71%*4", "53.81%*4", "57.91%*4", "62.01%*4", "66.11%*4", "70.21%*4", "74.31%*4", "78.41%*4", "82.51%*4", "86.61%*4", "90.71%*4"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};

// 공명 회로 — 발동 모션이 강공격이라 type/damageBonusType 모두 Heavy
const circuitSkillAttacks: Attack[] = [
  {
    id: "1000807_1",
    name: "강공격 · 혼란 피해",
    type: "Heavy",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
    ],
  },
  {
    id: "1000807_2",
    name: "강공격 · 분락 피해",
    type: "Heavy",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.9, 0.9738, 1.0476, 1.151, 1.2248, 1.3096, 1.4277, 1.5458, 1.6639, 1.7893],
    ],
  },
  {
    id: "1000807_3",
    name: "강공격 · 혼란 피해(풀 에너지)",
    type: "Heavy",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.72, 0.7791, 0.8381, 0.9208, 0.9798, 1.0477, 1.1422, 1.2366, 1.3311, 1.4315],
      [0.72, 0.7791, 0.8381, 0.9208, 0.9798, 1.0477, 1.1422, 1.2366, 1.3311, 1.4315],
      [0.72, 0.7791, 0.8381, 0.9208, 0.9798, 1.0477, 1.1422, 1.2366, 1.3311, 1.4315],
      [0.72, 0.7791, 0.8381, 0.9208, 0.9798, 1.0477, 1.1422, 1.2366, 1.3311, 1.4315],
      [0.72, 0.7791, 0.8381, 0.9208, 0.9798, 1.0477, 1.1422, 1.2366, 1.3311, 1.4315],
      [0.72, 0.7791, 0.8381, 0.9208, 0.9798, 1.0477, 1.1422, 1.2366, 1.3311, 1.4315],
      [0.72, 0.7791, 0.8381, 0.9208, 0.9798, 1.0477, 1.1422, 1.2366, 1.3311, 1.4315],
    ],
  },
  {
    id: "1000807_4",
    name: "강공격 · 분락 피해(풀 에너지)",
    type: "Heavy",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [2.16, 2.3372, 2.5143, 2.7623, 2.9394, 3.1431, 3.4265, 3.7098, 3.9932, 4.2943],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1000807",
  category: "Circuit",
  name: "단심소근",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMicai/SP_IconMicaiY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "혼란 피해", description: "", values: ["30.00%*7", "32.46%*7", "34.92%*7", "38.37%*7", "40.83%*7", "43.66%*7", "47.59%*7", "51.53%*7", "55.47%*7", "59.65%*7", "64.57%*7", "69.49%*7", "74.41%*7", "79.33%*7", "84.25%*7", "89.17%*7", "94.09%*7", "99.01%*7", "103.93%*7", "108.85%*7"] },
    { attributeName: "분락 피해", description: "", values: ["90.00%", "97.38%", "104.76%", "115.10%", "122.48%", "130.96%", "142.77%", "154.58%", "166.39%", "178.93%", "193.69%", "208.45%", "223.21%", "237.97%", "252.73%", "267.49%", "282.25%", "297.01%", "311.77%", "326.53%"] },
    { attributeName: "풀 에너지 혼란 피해", description: "", values: ["72.00%*7", "77.91%*7", "83.81%*7", "92.08%*7", "97.98%*7", "104.77%*7", "114.22%*7", "123.66%*7", "133.11%*7", "143.15%*7", "154.96%*7", "166.76%*7", "178.57%*7", "190.38%*7", "202.19%*7", "214.00%*7", "225.80%*7", "237.61%*7", "249.42%*7", "261.23%*7"] },
    { attributeName: "풀 에너지 분락 피해", description: "", values: ["216.00%", "233.72%", "251.43%", "276.23%", "293.94%", "314.31%", "342.65%", "370.98%", "399.32%", "429.43%", "464.86%", "500.28%", "535.71%", "571.13%", "606.55%", "641.98%", "677.40%", "712.83%", "748.25%", "783.67%"] },
    { attributeName: "혼란 치료량", description: "% HP", values: ["36", "36", "36", "36", "36", "36", "36", "36", "36", "36", "36", "36", "36", "36", "36", "36", "36", "36"] },
    { attributeName: "혼란으로 회복하는 협주 에너지", description: "", values: ["50", "50", "50", "50", "50", "50", "50", "50", "50", "50", "50", "50", "50", "50", "50", "50", "50", "50"] },
  ],
};

const passive0804: Skill = {
  id: "1000804",
  category: "Passive",
  name: "칼날의 빛",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMicai/SP_IconMicaiD1.webp",
  attacks: [],
};

const passive0805: Skill = {
  id: "1000805",
  category: "Passive",
  name: "영예",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMicai/SP_IconMicaiD2.webp",
  attacks: [],
};

const passive0808: Skill = {
  id: "1000808",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld3.webp",
  attacks: [],
};

const passive0809: Skill = {
  id: "1000809",
  category: "Intro",
  name: "소신의 해답",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMicai/SP_IconMicaiT.webp",
  attacks: [],
};

const passive0810: Skill = {
  id: "1000810",
  category: "Sync",
  name: "조화도 파괴 · 직검",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakKnife.webp",
  attacks: [],
};

/**
 * 공명체인(ResonantChain) 6개를 계산 가능한 버프로 옮긴 것.
 * 규칙은 docs/api-data-workflow.md 3~4장 참고.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 반주 스킬 ──
  {
    label: "소신의 해답 · 인멸 피해 부스트",
    target: "boost",
    damageType: "Havoc",
    value: 0.23,
    uptime: "active",
    scope: "party", // 반주로 등장하는 「다음 캐릭터」에게 걸린다
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },
  // ── 고유 효과 (공명체인과 무관하게 늘 들고 있다) ──
  {
    label: "공명 스킬 · 주식의 각인",
    target: "damageBonus",
    damageType: "All",
    value: 0.2, // 입히는 피해 20% 증가
    uptime: "active",
    scope: "self",
    condition: "목표에 「주식의 각인」이 붙어 있을 때",
  },
  {
    label: "칼날의 빛",
    inherentSkillId: "1000804",
    target: "damageBonus",
    damageType: "All",
    // 주식 1단 · 2단 피해에만 걸린다.
    attackIds: ["1000802_2", "1000802_3"],
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "self",
  },
  {
    label: "영예",
    inherentSkillId: "1000805",
    target: "damageBonus",
    damageType: "Heavy",
    value: 0.3, // 강공격 피해 30% 증가
    uptime: "active",
    scope: "self",
  },

  // ── 공명체인 ──
  {
    label: "1체인 · 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.05, // 스택당 5%
    stacks: 6, // 기본값 — 공격마다 몇 스택인지 따로 고를 수 있다
    maxStacks: 6,
    uptime: "active",
    scope: "self",
    resonanceChain: 1,
    condition: "「주식의 각인」이 있는 목표를 공격 시, 6초 지속 · 피격 시 1스택 감소",
  },
  {
    label: "2체인 · 가한 피해 추가 증가",
    target: "damageBonus",
    damageType: "All",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 2,
    condition: "「주식의 각인」이 있는 목표를 공격 시",
  },
  {
    label: "3체인 · 공명 해방 피해 보너스",
    target: "damageBonus",
    damageType: "Liberation",
    value: 0.3, // 30% 증가
    uptime: "passive", // 조건이 없어 늘 걸린다 — 화면에서도 끄지 못한다
    scope: "self",
    resonanceChain: 3,
  },
  {
    label: "4체인 · 크리티컬",
    target: "critRate",
    damageType: "All",
    value: 0.15, // 15% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 4,
    condition: "「단화」 60pt 이상 적립 시. 강공격 · 혼란 발동 시 모두 소모하고 분락까지 유지",
  },
  // 5체인은 HP 구간에 따라 값이 갈린다. 원문은 "15% 증가 + HP 60% 미만이면 추가 15%"지만,
  // 버프가 기본 전부 켜지는 구조라 그대로 두면 두 개가 겹쳐 항상 30%가 된다.
  // 그래서 겹치지 않는 두 상태로 나눠 적어둔다 — 둘 중 하나만 켜고 나머지는 꺼야 한다.
  {
    label: "5체인 · 인멸 피해 보너스 (HP 60% 이상)",
    target: "damageBonus",
    damageType: "Havoc",
    value: 0.15, // 기본 15%
    uptime: "active",
    scope: "self",
    exclusiveGroup: "danjin-c5-hp", // 아래 「HP 60% 미만」과 하나만 켜진다
    resonanceChain: 5,
    condition: "HP 60% 이상일 때. 아래 「HP 60% 미만」과 둘 중 하나만 켠다",
  },
  {
    label: "5체인 · 인멸 피해 보너스 (HP 60% 미만)",
    target: "damageBonus",
    damageType: "Havoc",
    value: 0.3, // 기본 15% + 추가 15%
    uptime: "active",
    scope: "self",
    exclusiveGroup: "danjin-c5-hp", // 위 「HP 60% 이상」과 하나만 켜진다
    resonanceChain: 5,
    condition: "HP 60% 미만일 때. 위 「HP 60% 이상」과 둘 중 하나만 켠다",
  },
  {
    label: "6체인 · 파티 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 6,
    condition: "강공격 · 혼란 발동 후 20초간, 파티 전원",
  },
];

// 미반영 — 없음. 단근의 공명체인은 전부 스탯/피해보너스 형태라 그대로 옮겨졌다.
//   다만 발동 조건(주식의 각인, 단화 스택, HP 구간 등)은 엔진이 판정하지 못하므로
//   condition 메모로만 남기고 체크박스로 켜고 끈다.
//   5체인처럼 상태가 배타적인 경우는 겹치지 않는 값으로 나눠 적어야 한다.
//   버프는 기본으로 전부 켜지므로, 나누지 않으면 두 상태가 동시에 더해진다.

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive0804,
  passive0805,
  passive0808,
  passive0809,
  passive0810,
];

export const danjin: Character = {
  id: "danjin",
  name: "단근",
  level: 90,
  element: "Havoc",
  weaponType: "Sword",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id(1602)가 아니라 별도 번호(10)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_10.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_10_UI.webp",
  echoIds: [],
};
