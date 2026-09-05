import { emptyStats } from "../../types/stats";
import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";

/**
 * 치샤 — encore.moe API v2 원본(api/characters/1202.json)에서 옮겨 적은 것.
 * 절차와 규칙은 docs/character-workflow.md 참고.
 *
 * 회피 반격이 일반 공격 판정이라 damageBonusType으로 잡아두었다.
 * 공명 회로 「영웅의 불길」의 두 공격은 공명 스킬 판정이다.
 */

// 스킬 트리 스탯 노드는 여기 넣지 않는다.
// src/data/characterNodes.json 이 노드 8개를 들고 있고, 켜고 끈 결과를 계산이 합산한다.
const baseStats = {
  ...emptyStats(),
  hp: 9087.5,
  atk: 300,
  def: 953.3316,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

const basicSkillAttacks: Attack[] = [
  {
    id: "1000201_1",
    name: "1단 피해",
    type: "Basic",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.333, 0.3604, 0.3877, 0.4259, 0.4532, 0.4846, 0.5283, 0.572, 0.6157, 0.6621],
    ],
  },
  {
    id: "1000201_2",
    name: "2단 피해",
    type: "Basic",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.243, 0.263, 0.2829, 0.3108, 0.3307, 0.3536, 0.3855, 0.4174, 0.4493, 0.4832],
      [0.243, 0.263, 0.2829, 0.3108, 0.3307, 0.3536, 0.3855, 0.4174, 0.4493, 0.4832],
    ],
  },
  {
    id: "1000201_3",
    name: "3단 피해",
    type: "Basic",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1688, 0.1826, 0.1965, 0.2158, 0.2297, 0.2456, 0.2677, 0.2899, 0.312, 0.3355],
      [0.1688, 0.1826, 0.1965, 0.2158, 0.2297, 0.2456, 0.2677, 0.2899, 0.312, 0.3355],
      [0.1688, 0.1826, 0.1965, 0.2158, 0.2297, 0.2456, 0.2677, 0.2899, 0.312, 0.3355],
      [0.1688, 0.1826, 0.1965, 0.2158, 0.2297, 0.2456, 0.2677, 0.2899, 0.312, 0.3355],
    ],
  },
  {
    id: "1000201_4",
    name: "4단 피해",
    type: "Basic",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.17, 1.266, 1.3619, 1.4962, 1.5922, 1.7025, 1.856, 2.0095, 2.163, 2.3261],
    ],
  },
  {
    id: "1000201_5",
    name: "강공격 피해",
    type: "Heavy",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.18, 0.1948, 0.2096, 0.2302, 0.245, 0.262, 0.2856, 0.3092, 0.3328, 0.3579],
    ],
  },
  {
    id: "1000201_6",
    name: "풀 차지 강공격 피해",
    type: "Heavy",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.405, 0.4383, 0.4715, 0.518, 0.5512, 0.5894, 0.6425, 0.6956, 0.7488, 0.8052],
    ],
  },
  {
    id: "1000201_7",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.162, 0.1753, 0.1886, 0.2072, 0.2205, 0.2358, 0.257, 0.2783, 0.2995, 0.3221],
    ],
  },
  {
    id: "1000201_8",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.71, 1.8503, 1.9905, 2.1868, 2.327, 2.4883, 2.7126, 2.937, 3.1613, 3.3997],
    ],
  },
];

const basicSkill: Skill = {
  id: "1000201",
  category: "Basic",
  name: "펑펑",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorGun.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "3단 피해", description: "", values: ["16.88%*4", "18.26%*4", "19.65%*4", "21.58%*4", "22.97%*4", "24.56%*4", "26.77%*4", "28.99%*4", "31.20%*4", "33.55%*4", "36.32%*4", "39.09%*4", "41.86%*4", "44.62%*4", "47.39%*4", "50.16%*4", "52.93%*4", "55.69%*4", "58.46%*4", "61.23%*4"] },
    { attributeName: "4단 피해", description: "", values: ["117.00%", "126.60%", "136.19%", "149.62%", "159.22%", "170.25%", "185.60%", "200.95%", "216.30%", "232.61%", "251.80%", "270.99%", "290.18%", "309.36%", "328.55%", "347.74%", "366.93%", "386.12%", "405.30%", "424.49%"] },
    { attributeName: "강공격 피해", description: "", values: ["18.00%", "19.48%", "20.96%", "23.02%", "24.50%", "26.20%", "28.56%", "30.92%", "33.28%", "35.79%", "38.74%", "41.69%", "44.65%", "47.60%", "50.55%", "53.50%", "56.45%", "59.41%", "62.36%", "65.31%"] },
    { attributeName: "풀 차지 강공격 피해", description: "", values: ["40.50%", "43.83%", "47.15%", "51.80%", "55.12%", "58.94%", "64.25%", "69.56%", "74.88%", "80.52%", "87.17%", "93.81%", "100.45%", "107.09%", "113.73%", "120.38%", "127.02%", "133.66%", "140.30%", "146.94%"] },
    { attributeName: "공중 공격 피해", description: "", values: ["16.20%", "17.53%", "18.86%", "20.72%", "22.05%", "23.58%", "25.70%", "27.83%", "29.95%", "32.21%", "34.87%", "37.53%", "40.18%", "42.84%", "45.50%", "48.15%", "50.81%", "53.47%", "56.12%", "58.78%"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5"] },
    { attributeName: "1단 피해", description: "", values: ["33.30%", "36.04%", "38.77%", "42.59%", "45.32%", "48.46%", "52.83%", "57.20%", "61.57%", "66.21%", "71.67%", "77.13%", "82.59%", "88.05%", "93.51%", "98.98%", "104.44%", "109.90%", "115.36%", "120.82%"] },
    { attributeName: "2단 피해", description: "", values: ["24.30%*2", "26.30%*2", "28.29%*2", "31.08%*2", "33.07%*2", "35.36%*2", "38.55%*2", "41.74%*2", "44.93%*2", "48.32%*2", "52.30%*2", "56.29%*2", "60.27%*2", "64.26%*2", "68.24%*2", "72.23%*2", "76.21%*2", "80.20%*2", "84.18%*2", "88.17%*2"] },
    { attributeName: "회피 반격 피해", description: "", values: ["171.00%", "185.03%", "199.05%", "218.68%", "232.70%", "248.83%", "271.26%", "293.70%", "316.13%", "339.97%", "368.01%", "396.06%", "424.10%", "452.15%", "480.19%", "508.23%", "536.28%", "564.32%", "592.37%", "620.41%"] },
  ],
};


const resonanceSkillAttacks: Attack[] = [
  {
    id: "1000202_1",
    name: "투쟁의 마음 피해",
    type: "Skill",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181],
      [0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181],
      [0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181],
      [0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181],
      [0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181],
      [0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181],
      [0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181],
      [0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1000202",
  category: "Skill",
  name: "투쟁의 마음",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMaxiaofang/SP_IconMaxiaofangB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["16.00%*8", "17.32%*8", "18.63%*8", "20.47%*8", "21.78%*8", "23.29%*8", "25.39%*8", "27.48%*8", "29.58%*8", "31.81%*8", "34.44%*8", "37.06%*8", "39.69%*8", "42.31%*8", "44.93%*8", "47.56%*8", "50.18%*8", "52.81%*8", "55.43%*8", "58.05%*8"] },
    { attributeName: "쿨타임", description: "", values: ["9", "9", "9", "9", "9", "9", "9", "9", "9", "9", "9", "9", "9", "9", "9", "9", "9", "9"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const liberationSkillAttacks: Attack[] = [
  {
    id: "1000203_1",
    name: "뜨거운 불길 피해",
    type: "Liberation",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [4.8, 5.1936, 5.5872, 6.1383, 6.5319, 6.9845, 7.6143, 8.244, 8.8738, 9.5429],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
      [0.291, 0.3148, 0.3387, 0.3721, 0.3959, 0.4234, 0.4615, 0.4997, 0.5379, 0.5784],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1000203",
  category: "Liberation",
  name: "뜨거운 불길",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMaxiaofang/SP_IconMaxiaofangC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["480.00%+29.10%*11", "519.36%+31.48%*11", "558.72%+33.87%*11", "613.83%+37.21%*11", "653.19%+39.59%*11", "698.45%+42.34%*11", "761.43%+46.15%*11", "824.40%+49.97%*11", "887.38%+53.79%*11", "954.29%+57.84%*11", "1033.01%+62.61%*11", "1111.73%+67.38%*11", "1190.45%+72.15%*11", "1269.17%+76.92%*11", "1347.89%+81.70%*11", "1426.61%+86.47%*11", "1505.33%+91.24%*11", "1584.05%+96.01%*11", "1662.77%+100.78%*11", "1741.49%+105.55%*11"] },
    { attributeName: "쿨타임", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};


const variationSkillAttacks: Attack[] = [
  {
    id: "1000206_1",
    name: "당당히 등장 피해",
    type: "Variation",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2475, 0.2678, 0.2881, 0.3166, 0.3368, 0.3602, 0.3927, 0.4251, 0.4576, 0.4921],
      [0.2475, 0.2678, 0.2881, 0.3166, 0.3368, 0.3602, 0.3927, 0.4251, 0.4576, 0.4921],
      [0.1238, 0.1339, 0.1441, 0.1583, 0.1684, 0.1801, 0.1964, 0.2126, 0.2288, 0.2461],
      [0.1238, 0.1339, 0.1441, 0.1583, 0.1684, 0.1801, 0.1964, 0.2126, 0.2288, 0.2461],
      [0.1238, 0.1339, 0.1441, 0.1583, 0.1684, 0.1801, 0.1964, 0.2126, 0.2288, 0.2461],
      [0.1238, 0.1339, 0.1441, 0.1583, 0.1684, 0.1801, 0.1964, 0.2126, 0.2288, 0.2461],
    ],
  },
];

const variationSkill: Skill = {
  id: "1000206",
  category: "Variation",
  name: "당당히 등장",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMaxiaofang/SP_IconMaxiaofangQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["24.75%*2+12.38%*4", "26.78%*2+13.39%*4", "28.81%*2+14.41%*4", "31.66%*2+15.83%*4", "33.68%*2+16.84%*4", "36.02%*2+18.01%*4", "39.27%*2+19.64%*4", "42.51%*2+21.26%*4", "45.76%*2+22.88%*4", "49.21%*2+24.61%*4", "53.27%*2+26.64%*4", "57.33%*2+28.67%*4", "61.39%*2+30.70%*4", "65.45%*2+32.73%*4", "69.51%*2+34.76%*4", "73.56%*2+36.78%*4", "77.62%*2+38.81%*4", "81.68%*2+40.84%*4", "85.74%*2+42.87%*4", "89.80%*2+44.90%*4"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const circuitSkillAttacks: Attack[] = [
  {
    id: "1000207_1",
    name: "열압탄 피해",
    type: "Skill",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1, 0.1082, 0.1164, 0.1279, 0.1361, 0.1456, 0.1587, 0.1718, 0.1849, 0.1989],
    ],
  },
  {
    id: "1000207_2",
    name: "폭격의 천둥소리 피해",
    type: "Skill",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [2.2, 2.3804, 2.5608, 2.8134, 2.9938, 3.2013, 3.4899, 3.7785, 4.0672, 4.3739],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1000207",
  category: "Circuit",
  name: "영웅의 불길",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMaxiaofang/SP_IconMaxiaofangY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "열압탄 피해", description: "", values: ["10.00%", "10.82%", "11.64%", "12.79%", "13.61%", "14.56%", "15.87%", "17.18%", "18.49%", "19.89%", "21.53%", "23.17%", "24.81%", "26.45%", "28.09%", "29.73%", "31.37%", "33.01%", "34.65%", "36.29%"] },
    { attributeName: "폭격의 천둥소리 피해", description: "", values: ["220.00%", "238.04%", "256.08%", "281.34%", "299.38%", "320.13%", "348.99%", "377.85%", "406.72%", "437.39%", "473.47%", "509.55%", "545.63%", "581.71%", "617.79%", "653.87%", "689.95%", "726.03%", "762.11%", "798.19%"] },
    { attributeName: "열압탄 1발 당 회복하는 협주 에너지", description: "", values: ["0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5", "0.5"] },
    { attributeName: "억압으로 회복하는 협주 에너지", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const passive0204: Skill = {
  id: "1000204",
  category: "Passive",
  name: "뜨거운 탄창",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMaxiaofang/SP_IconMaxiaofangD1.webp",
  attacks: [],
};


const passive0205: Skill = {
  id: "1000205",
  category: "Passive",
  name: "극도로 매운맛",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMaxiaofang/SP_IconMaxiaofangD2.webp",
  attacks: [],
};


const passive0208: Skill = {
  id: "1000208",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconRun.webp",
  attacks: [],
};


const introSkill: Skill = {
  id: "1000209",
  category: "Intro",
  name: "도약의 불빛",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMaxiaofang/SP_IconMaxiaofangT.webp",
  attacks: [],
};


const syncSkill: Skill = {
  id: "1000210",
  category: "Sync",
  name: "조화도 파괴 · 권총",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakGun.webp",
  attacks: [],
};

/**
 * 고유 효과와 공명체인을 계산 가능한 형태로 옮긴 것.
 * 수치가 없는 것(에너지 회복·쿨타임 리셋)은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 고유 스킬 ──
  {
    label: "뜨거운 탄창 · 폭격의 천둥소리 피해",
    inherentSkillId: "1000204",
    target: "damageBonus",
    damageType: "All",
    attackId: "1000207_2",
    value: 0.5, // 50% 증가
    uptime: "passive", // 조건이 없다
    scope: "self",
  },
  {
    label: "극도로 매운맛 · 공격력",
    inherentSkillId: "1000205",
    target: "atkPercent",
    damageType: "All",
    value: 0.01, // 스택당 1%
    stacks: 30,
    maxStacks: 30,
    uptime: "active",
    scope: "self",
    condition: "공명 스킬 억압 중 「열압탄」 명중마다 1스택, 10초 지속 · 최대 30스택",
  },

  // ── 공명체인 ──
  {
    label: "1체인 · 폭격의 천둥소리 확정 크리티컬",
    target: "critRate",
    damageType: "All",
    attackId: "1000207_2",
    value: 1, // 크리티컬 확률 100%
    uptime: "passive",
    scope: "self",
    resonanceChain: 1,
  },
  {
    label: "3체인 · 뜨거운 불길 피해 (HP 50% 미만 목표)",
    target: "damageBonus",
    damageType: "All",
    attackId: "1000203_1",
    value: 0.4, // 40% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "목표 HP가 50% 미만일 때",
  },
  {
    label: "5체인 · 공격력 추가",
    target: "atkPercent",
    damageType: "All",
    value: 0.3, // 추가 30%
    uptime: "active",
    scope: "self",
    resonanceChain: 5,
    condition: "고유 스킬 「극도로 매운맛」이 30스택일 때",
  },
  {
    label: "6체인 · 파티 일반 공격 피해 보너스",
    target: "damageBonus",
    damageType: "Basic",
    value: 0.25, // 25% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 6,
    condition: "공명 스킬 · 폭격의 천둥소리 발동 후 15초간",
  },
];

// 미반영 — 피해 계산과 무관해서 뺀 것들
//   2체인 「도약의 불꽃」    해방 중 목표 격파 시 공명 에너지 회복
//   4체인 「영웅의 필살기」   해방 발동 시 열압탄 60발 획득 · 공명 스킬 쿨타임 리셋
//   고유 「뜨거운 탄창」 앞부분  「열압탄」 최대 용량 10발 증가

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive0204,
  passive0205,
  passive0208,
  introSkill,
  syncSkill,
];

export const qishar: Character = {
  id: "qishar",
  name: "치샤",
  level: 90,
  element: "Fusion",
  weaponType: "Pistols",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id가 아니라 별도 번호(2)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_2.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_2_UI.webp",
  echoIds: [],
};
