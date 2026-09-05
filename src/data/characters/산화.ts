import { emptyStats } from "../../types/stats";
import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";

/**
 * 산화 — encore.moe API v2 원본(api/characters/1102.json)에서 옮겨 적은 것.
 * 절차와 규칙은 docs/character-workflow.md 참고.
 *
 * 회피 반격이 강공격 판정, 공명 회로의 얼음 폭발 셋은 공명 스킬 판정이다.
 */

// 스킬 트리 스탯 노드는 여기 넣지 않는다.
// src/data/characterNodes.json 이 노드 8개를 들고 있고, 켜고 끈 결과를 계산이 합산한다.
const baseStats = {
  ...emptyStats(),
  hp: 10062.5,
  atk: 275,
  def: 941.1094,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

const basicSkillAttacks: Attack[] = [
  {
    id: "1000501_1",
    name: "1단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.245, 0.2651, 0.2852, 0.3134, 0.3334, 0.3565, 0.3887, 0.4208, 0.453, 0.4871],
    ],
  },
  {
    id: "1000501_2",
    name: "2단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.371, 0.4015, 0.4319, 0.4745, 0.5049, 0.5399, 0.5886, 0.6372, 0.6859, 0.7376],
    ],
  },
  {
    id: "1000501_3",
    name: "3단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1085, 0.1174, 0.1263, 0.1388, 0.1477, 0.1579, 0.1722, 0.1864, 0.2006, 0.2158],
      [0.1085, 0.1174, 0.1263, 0.1388, 0.1477, 0.1579, 0.1722, 0.1864, 0.2006, 0.2158],
      [0.1085, 0.1174, 0.1263, 0.1388, 0.1477, 0.1579, 0.1722, 0.1864, 0.2006, 0.2158],
      [0.1085, 0.1174, 0.1263, 0.1388, 0.1477, 0.1579, 0.1722, 0.1864, 0.2006, 0.2158],
    ],
  },
  {
    id: "1000501_4",
    name: "4단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1995, 0.2159, 0.2323, 0.2552, 0.2715, 0.2903, 0.3165, 0.3427, 0.3689, 0.3967],
      [0.1995, 0.2159, 0.2323, 0.2552, 0.2715, 0.2903, 0.3165, 0.3427, 0.3689, 0.3967],
    ],
  },
  {
    id: "1000501_5",
    name: "5단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.176, 1.2725, 1.3689, 1.5039, 1.6004, 1.7112, 1.8655, 2.0198, 2.1741, 2.3381],
    ],
  },
  {
    id: "1000501_6",
    name: "강공격 피해",
    type: "Heavy",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.112, 0.1212, 0.1304, 0.1433, 0.1525, 0.163, 0.1777, 0.1924, 0.2071, 0.2227],
      [0.112, 0.1212, 0.1304, 0.1433, 0.1525, 0.163, 0.1777, 0.1924, 0.2071, 0.2227],
      [0.112, 0.1212, 0.1304, 0.1433, 0.1525, 0.163, 0.1777, 0.1924, 0.2071, 0.2227],
      [0.112, 0.1212, 0.1304, 0.1433, 0.1525, 0.163, 0.1777, 0.1924, 0.2071, 0.2227],
      [0.112, 0.1212, 0.1304, 0.1433, 0.1525, 0.163, 0.1777, 0.1924, 0.2071, 0.2227],
    ],
  },
  {
    id: "1000501_7",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.434, 0.4696, 0.5052, 0.555, 0.5906, 0.6316, 0.6885, 0.7454, 0.8024, 0.8629],
    ],
  },
  {
    id: "1000501_8",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Heavy", // DamageList Type 기준
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.84, 0.9089, 0.9778, 1.0742, 1.1431, 1.2223, 1.3325, 1.4427, 1.553, 1.6701],
    ],
  },
];

const basicSkill: Skill = {
  id: "1000501",
  category: "Basic",
  name: "차가운 빛",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorKnife.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["24.50%", "26.51%", "28.52%", "31.34%", "33.34%", "35.65%", "38.87%", "42.08%", "45.30%", "48.71%", "52.73%", "56.75%", "60.77%", "64.79%", "68.80%", "72.82%", "76.84%", "80.86%", "84.88%", "88.89%"] },
    { attributeName: "2단 피해", description: "", values: ["37.10%", "40.15%", "43.19%", "47.45%", "50.49%", "53.99%", "58.86%", "63.72%", "68.59%", "73.76%", "79.85%", "85.93%", "92.02%", "98.10%", "104.19%", "110.27%", "116.35%", "122.44%", "128.52%", "134.61%"] },
    { attributeName: "3단 피해", description: "", values: ["10.85%*4", "11.74%*4", "12.63%*4", "13.88%*4", "14.77%*4", "15.79%*4", "17.22%*4", "18.64%*4", "20.06%*4", "21.58%*4", "23.36%*4", "25.13%*4", "26.91%*4", "28.69%*4", "30.47%*4", "32.25%*4", "34.03%*4", "35.81%*4", "37.59%*4", "39.37%*4"] },
    { attributeName: "4단 피해", description: "", values: ["19.95%*2", "21.59%*2", "23.23%*2", "25.52%*2", "27.15%*2", "29.03%*2", "31.65%*2", "34.27%*2", "36.89%*2", "39.67%*2", "42.94%*2", "46.21%*2", "49.48%*2", "52.75%*2", "56.03%*2", "59.30%*2", "62.57%*2", "65.84%*2", "69.11%*2", "72.39%*2"] },
    { attributeName: "5단 피해", description: "", values: ["117.60%", "127.25%", "136.89%", "150.39%", "160.04%", "171.12%", "186.55%", "201.98%", "217.41%", "233.81%", "253.09%", "272.38%", "291.66%", "310.95%", "330.24%", "349.52%", "368.81%", "388.10%", "407.38%", "426.67%"] },
    { attributeName: "강공격 피해", description: "", values: ["11.20%*5", "12.12%*5", "13.04%*5", "14.33%*5", "15.25%*5", "16.30%*5", "17.77%*5", "19.24%*5", "20.71%*5", "22.27%*5", "24.11%*5", "25.95%*5", "27.78%*5", "29.62%*5", "31.46%*5", "33.29%*5", "35.13%*5", "36.97%*5", "38.80%*5", "40.64%*5"] },
    { attributeName: "공중 공격 피해", description: "", values: ["43.40%", "46.96%", "50.52%", "55.50%", "59.06%", "63.16%", "68.85%", "74.54%", "80.24%", "86.29%", "93.41%", "100.52%", "107.64%", "114.76%", "121.88%", "128.99%", "136.11%", "143.23%", "150.35%", "157.46%"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "회피 반격 피해", description: "", values: ["84.00%", "90.89%", "97.78%", "107.42%", "114.31%", "122.23%", "133.25%", "144.27%", "155.30%", "167.01%", "180.78%", "194.56%", "208.33%", "222.11%", "235.89%", "249.66%", "263.44%", "277.21%", "290.99%", "304.77%"] },
  ],
};


const resonanceSkillAttacks: Attack[] = [
  {
    id: "1000502_1",
    name: "만년적설 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.81, 1.9585, 2.1069, 2.3147, 2.4631, 2.6338, 2.8713, 3.1087, 3.3462, 3.5985],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1000502",
  category: "Skill",
  name: "만년적설",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconSanhua/SP_IconSanhuaB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["181.00%", "195.85%", "210.69%", "231.47%", "246.31%", "263.38%", "287.13%", "310.87%", "334.62%", "359.85%", "389.54%", "419.22%", "448.90%", "478.59%", "508.27%", "537.96%", "567.64%", "597.32%", "627.01%", "656.69%"] },
    { attributeName: "쿨타임", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
  ],
};


const liberationSkillAttacks: Attack[] = [
  {
    id: "1000503_1",
    name: "죽음의 눈보라 피해",
    type: "Liberation",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [4.0716, 4.4055, 4.7394, 5.2068, 5.5407, 5.9246, 6.4588, 6.993, 7.5272, 8.0948],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1000503",
  category: "Liberation",
  name: "죽음의 눈보라",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconSanhua/SP_IconSanhuaC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["407.16%", "440.55%", "473.94%", "520.68%", "554.07%", "592.46%", "645.88%", "699.30%", "752.72%", "809.48%", "876.25%", "943.03%", "1009.80%", "1076.58%", "1143.35%", "1210.13%", "1276.90%", "1343.67%", "1410.45%", "1477.22%"] },
    { attributeName: "쿨타임", description: "", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100", "100"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};


const variationSkillAttacks: Attack[] = [
  {
    id: "1000506_1",
    name: "매서운 가시 피해",
    type: "Variation",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.7, 0.7574, 0.8148, 0.8952, 0.9526, 1.0186, 1.1105, 1.2023, 1.2941, 1.3917],
    ],
  },
];

const variationSkill: Skill = {
  id: "1000506",
  category: "Variation",
  name: "매서운 가시",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconSanhua/SP_IconSanhuaQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["70.00%", "75.74%", "81.48%", "89.52%", "95.26%", "101.86%", "111.05%", "120.23%", "129.41%", "139.17%", "150.65%", "162.13%", "173.61%", "185.09%", "196.57%", "208.05%", "219.53%", "231.01%", "242.49%", "253.97%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const circuitSkillAttacks: Attack[] = [
  {
    id: "1000507_1",
    name: "강공격 · 폭발 피해",
    type: "Heavy",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.937, 1.0139, 1.0907, 1.1983, 1.2751, 1.3635, 1.4864, 1.6093, 1.7323, 1.8629],
      [0.937, 1.0139, 1.0907, 1.1983, 1.2751, 1.3635, 1.4864, 1.6093, 1.7323, 1.8629],
    ],
  },
  {
    id: "1000507_2",
    name: "얼음산 폭발 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.7, 0.7574, 0.8148, 0.8952, 0.9526, 1.0186, 1.1105, 1.2023, 1.2941, 1.3917],
    ],
  },
  {
    id: "1000507_3",
    name: "얼음 기둥 폭발 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953],
    ],
  },
  {
    id: "1000507_4",
    name: "얼음 가시 폭발 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1000507",
  category: "Circuit",
  name: "무명심음",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconSanhua/SP_IconSanhuaY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "폭발 피해", description: "", values: ["93.70%*2", "101.39%*2", "109.07%*2", "119.83%*2", "127.51%*2", "136.35%*2", "148.64%*2", "160.93%*2", "173.23%*2", "186.29%*2", "201.66%*2", "217.02%*2", "232.39%*2", "247.76%*2", "263.12%*2", "278.49%*2", "293.86%*2", "309.22%*2", "324.59%*2", "339.96%*2"] },
    { attributeName: "얼음산 폭발 피해", description: "", values: ["70.00%", "75.74%", "81.48%", "89.52%", "95.26%", "101.86%", "111.05%", "120.23%", "129.41%", "139.17%", "150.65%", "162.13%", "173.61%", "185.09%", "196.57%", "208.05%", "219.53%", "231.01%", "242.49%", "253.97%"] },
    { attributeName: "얼음 기둥 폭발 피해", description: "", values: ["40.00%", "43.28%", "46.56%", "51.16%", "54.44%", "58.21%", "63.46%", "68.70%", "73.95%", "79.53%", "86.09%", "92.65%", "99.21%", "105.77%", "112.33%", "118.89%", "125.45%", "132.01%", "138.57%", "145.13%"] },
    { attributeName: "얼음 가시 폭발 피해", description: "", values: ["30.00%", "32.46%", "34.92%", "38.37%", "40.83%", "43.66%", "47.59%", "51.53%", "55.47%", "59.65%", "64.57%", "69.49%", "74.41%", "79.33%", "84.25%", "89.17%", "94.09%", "99.01%", "103.93%", "108.85%"] },
    { attributeName: "각 스택의 투시 지속 시간", description: "", values: ["5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5"] },
    { attributeName: "폭발로 회복하는 협주 에너지", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "얼음산 폭발로 회복하는 협주 에너지", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "얼음 기둥 폭발로 회복하는 협주 에너지", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "얼음산 지속 시간", description: "", values: ["5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5"] },
    { attributeName: "얼음 기둥 지속 시간", description: "", values: ["5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5"] },
    { attributeName: "얼음 가시 지속 시간", description: "", values: ["8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8"] },
  ],
};


const passive0504: Skill = {
  id: "1000504",
  category: "Passive",
  name: "빙결",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconSanhua/SP_IconSanhuaD1.webp",
  attacks: [],
};


const passive0505: Skill = {
  id: "1000505",
  category: "Passive",
  name: "폭설",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconSanhua/SP_IconSanhuaD2.webp",
  attacks: [],
};


const passive0508: Skill = {
  id: "1000508",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconRun.webp",
  attacks: [],
};


const introSkill: Skill = {
  id: "1000509",
  category: "Intro",
  name: "차가운 눈꽃",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconSanhua/SP_IconSanhuaT.webp",
  attacks: [],
};


const syncSkill: Skill = {
  id: "1000510",
  category: "Sync",
  name: "조화도 파괴 · 직검",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakKnife.webp",
  attacks: [],
};

/**
 * 고유 효과와 공명체인을 계산 가능한 형태로 옮긴 것.
 * 「얼음 파편」은 공명 회로의 얼음산·기둥·가시 폭발 셋을 가리킨다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 반주 스킬 ──
  {
    label: "차가운 눈꽃 · 일반 공격 피해 부스트",
    target: "boost",
    damageType: "Basic",
    value: 0.38,
    uptime: "active",
    scope: "party", // 반주로 등장하는 「다음 캐릭터」에게 걸린다
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },
  // ── 고유 스킬 ──
  {
    label: "빙결 · 공명 스킬 피해",
    inherentSkillId: "1000504",
    target: "damageBonus",
    damageType: "Skill",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "self",
    condition: "변주 스킬 · 매서운 가시 발동 후 8초간",
  },
  {
    label: "폭설 · 얼음 파편 피해",
    inherentSkillId: "1000505",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1000507_2", "1000507_3", "1000507_4"], // 얼음산 · 기둥 · 가시 폭발
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "self",
    condition: "일반 공격 5단 발동 후 8초간",
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
    condition: "일반 공격 5단 발동 후 10초간",
  },
  {
    label: "3체인 · 가하는 피해 (HP 70% 미만 목표)",
    target: "damageBonus",
    damageType: "All",
    value: 0.35, // 35% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "목표 HP가 70% 미만일 때",
  },
  {
    label: "4체인 · 다음 강공격 폭발 피해",
    target: "damageBonus",
    damageType: "All",
    attackId: "1000507_1", // 강공격 · 폭발
    value: 1.2, // 120% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 4,
    condition: "공명 해방 발동 후 5초 내 다음 강공격 폭발 1회",
  },
  {
    label: "5체인 · 얼음 파편 크리티컬 피해",
    target: "critDamage",
    damageType: "All",
    attackIds: ["1000507_2", "1000507_3", "1000507_4"],
    value: 1, // 100% 증가
    uptime: "passive", // 조건이 없다
    scope: "self",
    resonanceChain: 5,
  },
  {
    label: "6체인 · 파티 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.1, // 스택당 10%
    stacks: 2,
    maxStacks: 2,
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 6,
    condition: "「얼음 기둥」 또는 「얼음산」 폭발 후 20초간 · 최대 2스택",
  },
];

// 미반영 — 피해 계산과 무관해서 뺀 것들
//   2체인 「순결한 눈 결정」  스태미나 10pt 감소 · 경직 저항력 증가
//   4체인 앞부분           공명 에너지 10pt 회복
//   5체인 뒷부분           폭발 실패 시에도 사라질 때 폭발(발동 조건)

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive0504,
  passive0505,
  passive0508,
  introSkill,
  syncSkill,
];

export const sanhua: Character = {
  id: "sanhua",
  name: "산화",
  level: 90,
  element: "Glacio",
  weaponType: "Sword",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id가 아니라 별도 번호(7)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_7.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_7_UI.webp",
  echoIds: [],
};
