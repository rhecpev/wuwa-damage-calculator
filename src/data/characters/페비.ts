import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";
import { emptyStats } from "../../types/stats";

/**
 * 페비 (Id 1506, 5성, 회절, 증폭기)
 * 출처: encore.moe API v2 (api/characters/1506.json)
 * 작성 절차: docs/character-workflow.md
 *
 * hits는 SkillAttributes의 *N 표기로 히트 개수를 잡고 레벨 1~10 값을 그대로 옮겼다.
 *
 * 「사죄 상태」와 「고해 상태」가 있고 둘은 동시에 성립하지 않는다.
 * 상태에 따라 같은 공격의 배율이 달라지는 자리가 여럿이라
 * 그런 버프는 exclusiveGroup으로 묶어 하나만 켜지게 했다.
 * 상태는 공명 모드(resonanceModes)가 아니라 공명 회로가 만드는 것이라
 * 공격 데이터는 상태별로 나누지 않는다(SkillBranches도 비어 있다).
 *
 * Properties의 GrowthValues 중 level 90 값 사용.
 */
/**
 * 스킬 트리(SkillTree) 노드 8개는 여기 넣지 않는다.
 *   공격력        1.80 + 1.80 + 4.20 + 4.20 = 12%
 *   크리티컬 피해 2.40 + 2.40 + 5.60 + 5.60 = 16%
 * 노드 하나하나가 src/data/characterNodes.json 에 있고, 켜고 끈 결과를
 * nodeStats()가 합산해 스탯에 얹는다. 전부 켜면 위 합계와 같은 값이 된다.
 */
const baseStats = {
  ...emptyStats(),
  hp: 10825,
  atk: 412.5,
  def: 1258.8866,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

// 기본 공격 — 공중 공격 · 회피 반격은 모션만 따로고 판정은 일반 공격이다
const basicSkillAttacks: Attack[] = [
  {
    id: "1003001_1",
    name: "일반 공격 1단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1485, 0.1607, 0.1729, 0.19, 0.2021, 0.2161, 0.2356, 0.2551, 0.2746, 0.2953],
    ],
  },
  {
    id: "1003001_2",
    name: "일반 공격 2단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1125, 0.1218, 0.131, 0.1439, 0.1531, 0.1637, 0.1785, 0.1933, 0.208, 0.2237],
      [0.1375, 0.1488, 0.1601, 0.1759, 0.1872, 0.2001, 0.2182, 0.2362, 0.2542, 0.2734],
    ],
  },
  {
    id: "1003001_3",
    name: "일반 공격 3단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.0717, 0.0775, 0.0834, 0.0916, 0.0975, 0.1043, 0.1137, 0.1231, 0.1325, 0.1424],
      [0.0717, 0.0775, 0.0834, 0.0916, 0.0975, 0.1043, 0.1137, 0.1231, 0.1325, 0.1424],
      [0.0717, 0.0775, 0.0834, 0.0916, 0.0975, 0.1043, 0.1137, 0.1231, 0.1325, 0.1424],
      [0.0717, 0.0775, 0.0834, 0.0916, 0.0975, 0.1043, 0.1137, 0.1231, 0.1325, 0.1424],
      [0.0717, 0.0775, 0.0834, 0.0916, 0.0975, 0.1043, 0.1137, 0.1231, 0.1325, 0.1424],
      [0.0717, 0.0775, 0.0834, 0.0916, 0.0975, 0.1043, 0.1137, 0.1231, 0.1325, 0.1424],
      [0.0717, 0.0775, 0.0834, 0.0916, 0.0975, 0.1043, 0.1137, 0.1231, 0.1325, 0.1424],
      [0.0717, 0.0775, 0.0834, 0.0916, 0.0975, 0.1043, 0.1137, 0.1231, 0.1325, 0.1424],
    ],
  },
  {
    id: "1003001_4",
    name: "강공격 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.208, 0.225, 0.2421, 0.266, 0.283, 0.3026, 0.3299, 0.3572, 0.3845, 0.4135],
      [0.208, 0.225, 0.2421, 0.266, 0.283, 0.3026, 0.3299, 0.3572, 0.3845, 0.4135],
      [0.208, 0.225, 0.2421, 0.266, 0.283, 0.3026, 0.3299, 0.3572, 0.3845, 0.4135],
      [0.208, 0.225, 0.2421, 0.266, 0.283, 0.3026, 0.3299, 0.3572, 0.3845, 0.4135],
    ],
  },
  {
    id: "1003001_5",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2325, 0.2516, 0.2707, 0.2974, 0.3164, 0.3384, 0.3689, 0.3994, 0.4299, 0.4623],
      [0.2325, 0.2516, 0.2707, 0.2974, 0.3164, 0.3384, 0.3689, 0.3994, 0.4299, 0.4623],
    ],
  },
  {
    id: "1003001_6",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1086, 0.1175, 0.1264, 0.1389, 0.1478, 0.158, 0.1722, 0.1865, 0.2007, 0.2158],
      [0.1086, 0.1175, 0.1264, 0.1389, 0.1478, 0.158, 0.1722, 0.1865, 0.2007, 0.2158],
      [0.1086, 0.1175, 0.1264, 0.1389, 0.1478, 0.158, 0.1722, 0.1865, 0.2007, 0.2158],
      [0.1086, 0.1175, 0.1264, 0.1389, 0.1478, 0.158, 0.1722, 0.1865, 0.2007, 0.2158],
      [0.1086, 0.1175, 0.1264, 0.1389, 0.1478, 0.158, 0.1722, 0.1865, 0.2007, 0.2158],
      [0.1086, 0.1175, 0.1264, 0.1389, 0.1478, 0.158, 0.1722, 0.1865, 0.2007, 0.2158],
      [0.1086, 0.1175, 0.1264, 0.1389, 0.1478, 0.158, 0.1722, 0.1865, 0.2007, 0.2158],
      [0.1086, 0.1175, 0.1264, 0.1389, 0.1478, 0.158, 0.1722, 0.1865, 0.2007, 0.2158],
    ],
  },
  {
    id: "1003001_7",
    name: "샤무엘의 별 · 회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2205, 0.2386, 0.2567, 0.282, 0.3001, 0.3209, 0.3498, 0.3788, 0.4077, 0.4384],
      [0.2205, 0.2386, 0.2567, 0.282, 0.3001, 0.3209, 0.3498, 0.3788, 0.4077, 0.4384],
      [0.2205, 0.2386, 0.2567, 0.282, 0.3001, 0.3209, 0.3498, 0.3788, 0.4077, 0.4384],
      [0.2205, 0.2386, 0.2567, 0.282, 0.3001, 0.3209, 0.3498, 0.3788, 0.4077, 0.4384],
      [0.2205, 0.2386, 0.2567, 0.282, 0.3001, 0.3209, 0.3498, 0.3788, 0.4077, 0.4384],
      [0.2205, 0.2386, 0.2567, 0.282, 0.3001, 0.3209, 0.3498, 0.3788, 0.4077, 0.4384],
    ],
  },
];

const basicSkill: Skill = {
  id: "1003001",
  category: "Basic",
  name: "찬란한 빛을 내려주소서!",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorMagic.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["14.85%", "16.07%", "17.29%", "19.00%", "20.21%", "21.61%", "23.56%", "25.51%", "27.46%", "29.53%", "31.96%", "34.40%", "36.83%", "39.27%", "41.71%", "44.14%", "46.58%", "49.01%", "51.45%", "53.88%"] },
    { attributeName: "2단 피해", description: "", values: ["11.25%+13.75%", "12.18%+14.88%", "13.10%+16.01%", "14.39%+17.59%", "15.31%+18.72%", "16.37%+20.01%", "17.85%+21.82%", "19.33%+23.62%", "20.80%+25.42%", "22.37%+27.34%", "24.22%+29.60%", "26.06%+31.85%", "27.91%+34.11%", "29.75%+36.36%", "31.60%+38.62%", "33.44%+40.87%", "35.29%+43.13%", "37.13%+45.38%", "38.98%+47.64%", "40.82%+49.89%"] },
    { attributeName: "3단 피해", description: "", values: ["7.17%*8", "7.75%*8", "8.34%*8", "9.16%*8", "9.75%*8", "10.43%*8", "11.37%*8", "12.31%*8", "13.25%*8", "14.24%*8", "15.42%*8", "16.59%*8", "17.77%*8", "18.94%*8", "20.12%*8", "21.29%*8", "22.47%*8", "23.64%*8", "24.82%*8", "25.99%*8"] },
    { attributeName: "강공격 피해", description: "", values: ["20.80%*4", "22.50%*4", "24.21%*4", "26.60%*4", "28.30%*4", "30.26%*4", "32.99%*4", "35.72%*4", "38.45%*4", "41.35%*4", "44.76%*4", "48.17%*4", "51.58%*4", "54.99%*4", "58.40%*4", "61.81%*4", "65.22%*4", "68.63%*4", "72.04%*4", "75.45%*4"] },
    { attributeName: "공중 공격 피해", description: "", values: ["23.25%*2", "25.16%*2", "27.07%*2", "29.74%*2", "31.64%*2", "33.84%*2", "36.89%*2", "39.94%*2", "42.99%*2", "46.23%*2", "50.04%*2", "53.85%*2", "57.67%*2", "61.48%*2", "65.29%*2", "69.11%*2", "72.92%*2", "76.73%*2", "80.55%*2", "84.36%*2"] },
    { attributeName: "회피 반격 피해", description: "", values: ["10.86%*8", "11.75%*8", "12.64%*8", "13.89%*8", "14.78%*8", "15.80%*8", "17.22%*8", "18.65%*8", "20.07%*8", "21.58%*8", "23.36%*8", "25.15%*8", "26.93%*8", "28.71%*8", "30.49%*8", "32.27%*8", "34.05%*8", "35.83%*8", "37.61%*8", "39.39%*8"] },
    { attributeName: "샤무엘의 별 · 회피 반격 피해", description: "", values: ["22.05%*6", "23.86%*6", "25.67%*6", "28.20%*6", "30.01%*6", "32.09%*6", "34.98%*6", "37.88%*6", "40.77%*6", "43.84%*6", "47.46%*6", "51.08%*6", "54.69%*6", "58.31%*6", "61.92%*6", "65.54%*6", "69.16%*6", "72.77%*6", "76.39%*6", "80.00%*6"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "공중 강공격 스태미나 소모", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 공명 스킬 — 샤무엘의 별 3단은 스킬 안에 들어 있지만 일반 공격 모션 · 판정이고,
// 「거울의 고리」 반사만 판정이 일반 공격으로 갈린다(DamageList Type 기준).
const resonanceSkillAttacks: Attack[] = [
  {
    id: "1003002_1",
    name: "찬란한 빛을 찾아서 피해",
    type: "Skill",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.315, 0.3409, 0.3667, 0.4029, 0.4287, 0.4584, 0.4997, 0.5411, 0.5824, 0.6263],
      [0.315, 0.3409, 0.3667, 0.4029, 0.4287, 0.4584, 0.4997, 0.5411, 0.5824, 0.6263],
    ],
  },
  {
    id: "1003002_2",
    name: "「거울의 고리」 반사 피해",
    type: "Skill",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.075, 0.0812, 0.0873, 0.096, 0.1021, 0.1092, 0.119, 0.1289, 0.1387, 0.1492],
      [0.075, 0.0812, 0.0873, 0.096, 0.1021, 0.1092, 0.119, 0.1289, 0.1387, 0.1492],
    ],
  },
  {
    id: "1003002_3",
    name: "샤무엘의 별 1단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2985, 0.323, 0.3475, 0.3818, 0.4062, 0.4344, 0.4736, 0.5127, 0.5519, 0.5935],
    ],
  },
  {
    id: "1003002_4",
    name: "샤무엘의 별 2단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2, 0.2164, 0.2328, 0.2558, 0.2722, 0.2911, 0.3173, 0.3435, 0.3698, 0.3977],
      [0.2, 0.2164, 0.2328, 0.2558, 0.2722, 0.2911, 0.3173, 0.3435, 0.3698, 0.3977],
    ],
  },
  {
    id: "1003002_5",
    name: "샤무엘의 별 3단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1455, 0.1575, 0.1694, 0.1861, 0.198, 0.2118, 0.2309, 0.2499, 0.269, 0.2893],
      [0.1455, 0.1575, 0.1694, 0.1861, 0.198, 0.2118, 0.2309, 0.2499, 0.269, 0.2893],
      [0.1455, 0.1575, 0.1694, 0.1861, 0.198, 0.2118, 0.2309, 0.2499, 0.269, 0.2893],
      [0.1455, 0.1575, 0.1694, 0.1861, 0.198, 0.2118, 0.2309, 0.2499, 0.269, 0.2893],
      [0.1455, 0.1575, 0.1694, 0.1861, 0.198, 0.2118, 0.2309, 0.2499, 0.269, 0.2893],
      [0.1455, 0.1575, 0.1694, 0.1861, 0.198, 0.2118, 0.2309, 0.2499, 0.269, 0.2893],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1003002",
  category: "Skill",
  name: "찬란한 빛을 찾아서",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconFeibi/SP_IconFeibiB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["31.50%*2", "34.09%*2", "36.67%*2", "40.29%*2", "42.87%*2", "45.84%*2", "49.97%*2", "54.11%*2", "58.24%*2", "62.63%*2", "67.80%*2", "72.96%*2", "78.13%*2", "83.29%*2", "88.46%*2", "93.63%*2", "98.79%*2", "103.96%*2", "109.12%*2", "114.29%*2"] },
    { attributeName: "「거울의 고리」: 신성한 광채 반사 피해", description: "", values: ["7.50%*2", "8.12%*2", "8.73%*2", "9.60%*2", "10.21%*2", "10.92%*2", "11.90%*2", "12.89%*2", "13.87%*2", "14.92%*2", "16.15%*2", "17.38%*2", "18.61%*2", "19.84%*2", "21.07%*2", "22.30%*2", "23.53%*2", "24.76%*2", "25.99%*2", "27.22%*2"] },
    { attributeName: "샤무엘의 별 1단 피해", description: "", values: ["29.85%", "32.30%", "34.75%", "38.18%", "40.62%", "43.44%", "47.36%", "51.27%", "55.19%", "59.35%", "64.25%", "69.14%", "74.04%", "78.93%", "83.83%", "88.72%", "93.62%", "98.51%", "103.41%", "108.30%"] },
    { attributeName: "샤무엘의 별 2단 피해", description: "", values: ["20.00%*2", "21.64%*2", "23.28%*2", "25.58%*2", "27.22%*2", "29.11%*2", "31.73%*2", "34.35%*2", "36.98%*2", "39.77%*2", "43.05%*2", "46.33%*2", "49.61%*2", "52.89%*2", "56.17%*2", "59.45%*2", "62.73%*2", "66.01%*2", "69.29%*2", "72.57%*2"] },
    { attributeName: "샤무엘의 별 3단 피해", description: "", values: ["14.55%*6", "15.75%*6", "16.94%*6", "18.61%*6", "19.80%*6", "21.18%*6", "23.09%*6", "24.99%*6", "26.90%*6", "28.93%*6", "31.32%*6", "33.70%*6", "36.09%*6", "38.48%*6", "40.86%*6", "43.25%*6", "45.64%*6", "48.02%*6", "50.41%*6", "52.79%*6"] },
    { attributeName: "쿨타임", description: "", values: ["12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12"] },
  ],
};

// 공명 해방
const liberationSkillAttacks: Attack[] = [
  {
    id: "1003003_1",
    name: "스킬 피해",
    type: "Liberation",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [2.02, 2.1857, 2.3513, 2.5832, 2.7489, 2.9394, 3.2044, 3.4694, 3.7344, 4.016],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1003003",
  category: "Liberation",
  name: "샛별의 소원",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconFeibi/SP_IconFeibiC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["202.00%", "218.57%", "235.13%", "258.32%", "274.89%", "293.94%", "320.44%", "346.94%", "373.44%", "401.60%", "434.73%", "467.86%", "500.99%", "534.11%", "567.24%", "600.37%", "633.50%", "666.63%", "699.75%", "732.88%"] },
    { attributeName: "쿨타임", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 변주 스킬
const variationSkillAttacks: Attack[] = [
  {
    id: "1003006_1",
    name: "스킬 피해",
    type: "Variation",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1, 1.082, 1.164, 1.2788, 1.3608, 1.4551, 1.5863, 1.7175, 1.8487, 1.9881],
    ],
  },
];

const variationSkill: Skill = {
  id: "1003006",
  category: "Variation",
  name: "금빛의 은혜",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconFeibi/SP_IconFeibiQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["100.00%", "108.20%", "116.40%", "127.88%", "136.08%", "145.51%", "158.63%", "171.75%", "184.87%", "198.81%", "215.21%", "231.61%", "248.01%", "264.41%", "280.81%", "297.21%", "313.61%", "330.01%", "346.41%", "362.81%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};

// 공명 회로 — 「기원」을 모아 사죄의 기도(강공격)나 현명한 고해(공명 스킬) 중
// 하나를 골라 발동하고, 그에 맞는 상태에 들어간다. 두 상태는 동시에 존재하지 않는다.
const circuitSkillAttacks: Attack[] = [
  {
    id: "1003007_1",
    name: "강공격 · 별빛 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4159, 0.45, 0.4841, 0.5319, 0.566, 0.6052, 0.6598, 0.7143, 0.7689, 0.8269],
      [0.4159, 0.45, 0.4841, 0.5319, 0.566, 0.6052, 0.6598, 0.7143, 0.7689, 0.8269],
      [0.4159, 0.45, 0.4841, 0.5319, 0.566, 0.6052, 0.6598, 0.7143, 0.7689, 0.8269],
    ],
  },
  {
    id: "1003007_2",
    name: "강공격 · 사죄의 기도 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [3.21, 3.4733, 3.7365, 4.105, 4.3682, 4.6709, 5.0921, 5.5132, 5.9344, 6.3819],
    ],
  },
  {
    id: "1003007_3",
    name: "공명 스킬 · 현명한 고해 피해",
    type: "Skill",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.945, 1.0225, 1.1, 1.2085, 1.286, 1.3751, 1.4991, 1.6231, 1.7471, 1.8788],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1003007",
  category: "Circuit",
  name: "얽혀 있는 별빛의 축복",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconFeibi/SP_IconFeibiY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "강공격 · 별빛 피해", description: "", values: ["41.59%*3", "45.00%*3", "48.41%*3", "53.19%*3", "56.60%*3", "60.52%*3", "65.98%*3", "71.43%*3", "76.89%*3", "82.69%*3", "89.51%*3", "96.33%*3", "103.15%*3", "109.97%*3", "116.79%*3", "123.61%*3", "130.43%*3", "137.25%*3", "144.07%*3", "150.89%*3"] },
    { attributeName: "강공격 · 별빛 스태미나 소모", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "사죄의 기도 피해", description: "", values: ["321.00%", "347.33%", "373.65%", "410.50%", "436.82%", "467.09%", "509.21%", "551.32%", "593.44%", "638.19%", "690.83%", "743.47%", "796.12%", "848.76%", "901.41%", "954.05%", "1006.69%", "1059.34%", "1111.98%", "1164.63%"] },
    { attributeName: "현명한 고해 피해", description: "", values: ["94.50%", "102.25%", "110.00%", "120.85%", "128.60%", "137.51%", "149.91%", "162.31%", "174.71%", "187.88%", "203.38%", "218.88%", "234.37%", "249.87%", "265.37%", "280.87%", "296.37%", "311.86%", "327.36%", "342.86%"] },
    { attributeName: "사죄의 기도로 회복하는 협주 에너지", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "현명한 고해로 회복하는 협주 에너지", description: "", values: ["40", "40", "40", "40", "40", "40", "40", "40", "40", "40", "40", "40", "40", "40", "40", "40", "40", "40", "40", "40"] },
  ],
};
const passive3004: Skill = {
  id: "1003004",
  category: "Passive",
  name: "존재",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconFeibi/SP_IconFeibiD1.webp",
  attacks: [],
};

const passive3005: Skill = {
  id: "1003005",
  category: "Passive",
  name: "계시",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconFeibi/SP_IconFeibiD2.webp",
  attacks: [],
};

const passive3008: Skill = {
  id: "1003008",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld4.webp",
  attacks: [],
};

// 반주 스킬 — 계수가 SkillAttributes·DamageList에 없고 **설명문에만** 있다.
// 설명문: 「총 페비 공격력의 528.41%에 해당하는 회절 피해」
// 반주는 스킬 레벨이 없어 값이 하나뿐이다 — 레벨 열 열 칸에 같은 값을 채운다.
const introSkillAttacks1003009: Attack[] = [
  {
    id: "1003009_1",
    name: "반주 스킬 피해",
    type: "Intro",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [5.2841, 5.2841, 5.2841, 5.2841, 5.2841, 5.2841, 5.2841, 5.2841, 5.2841, 5.2841],
    ],
  },
];

const passive3009: Skill = {
  id: "1003009",
  category: "Intro",
  name: "경청하는 마음",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconFeibi/SP_IconFeibiT.webp",
  attacks: introSkillAttacks1003009,
};

const passive3010: Skill = {
  id: "1003010",
  category: "Sync",
  name: "조화도 파괴 · 증폭기",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakMagic.webp",
  attacks: [],
};

/**
 * 고유 스킬과 공명체인 6개를 계산 가능한 버프로 옮긴 것.
 * 사죄 · 고해는 동시에 성립하지 않으므로, 상태에 따라 값이 갈리는 버프는
 * exclusiveGroup으로 묶어 하나만 켜지게 했다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 반주 스킬 ──
  {
    label: "경청하는 마음 · 광학 효과 피해 부스트 (고해)",
    target: "anomalyBoost",
    damageType: "SpectroFrazzle",
    value: 1.0,
    uptime: "active",
    scope: "party", // 반주로 등장하는 「다음 캐릭터」에게 걸린다
    condition: "「고해」 상태에서 반주 발동 시 파티 등장 캐릭터가 「묵념」을 얻은 뒤 30초간",
  },
  {
    label: "경청하는 마음 · 회절 저항 감소 (고해)",
    target: "resReduction",
    damageType: "All",
    element: "Spectro",
    value: 0.1,
    uptime: "active",
    scope: "party", // 반주로 등장하는 「다음 캐릭터」에게 걸린다
    condition: "「고해」 상태에서 반주 발동 시 「묵념」 범위 안의 목표에게 30초간",
  },
  // ── 고유 스킬 ──
  {
    label: "계시 · 회절 피해 보너스",
    inherentSkillId: "1003005",
    target: "damageBonus",
    damageType: "Spectro",
    value: 0.12, // 12% 증가
    uptime: "active",
    scope: "self",
    condition: "사죄 상태 또는 고해 상태일 때",
  },

  // ── 공명 해방 「샛별의 소원」의 상태 보정 ──
  // 사죄 상태에서 배율이 오른다. 1체인이 있으면 사죄 쪽 값이 통째로 바뀌고
  // 고해 쪽에도 새로 붙으므로, 셋 중 하나만 켜지도록 한 묶음에 담는다.
  // DamageList로 확인: 202% 옆에 717.1%(×3.55) · 1171.6%(×5.8) · 383.8%(×1.9)가 있다.
  {
    label: "샛별의 소원 · 사죄 상태 배율 상승",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1003003_1"],
    value: 2.55, // 배율 255% 상승
    modifier: "amplify",
    uptime: "active",
    scope: "self",
    exclusiveGroup: "phoebe-liberation-state",
    condition: "사죄 상태일 때. 1체인이 있으면 아래 480% 쪽을 켠다",
  },
  {
    label: "1체인 · 샛별의 소원 · 사죄 상태 배율 상승",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1003003_1"],
    value: 4.8, // 255% → 480%로 커진다
    modifier: "amplify",
    uptime: "active",
    scope: "self",
    exclusiveGroup: "phoebe-liberation-state",
    resonanceChain: 1,
    condition: "1체인 보유 + 사죄 상태. 위 255% 대신 켠다",
  },
  {
    label: "1체인 · 샛별의 소원 · 고해 상태 배율 상승",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1003003_1"],
    value: 0.9, // 배율 90% 상승
    modifier: "amplify",
    uptime: "active",
    scope: "self",
    exclusiveGroup: "phoebe-liberation-state",
    resonanceChain: 1,
    condition: "1체인 보유 + 고해 상태",
  },

  // ── 강공격 · 별빛의 상태 보정 ──
  {
    label: "별빛 · 사죄 상태 「광학 효과」 부스트",
    target: "boost",
    damageType: "All",
    attackIds: ["1003007_1"],
    value: 2.56, // 256% 부스트
    uptime: "active",
    scope: "self",
    condition: "사죄 상태에서 「광학 효과」가 붙은 목표를 때릴 때",
  },
  // 3체인은 상태에 따라 별빛의 배율 상승폭이 갈린다.
  // DamageList로 확인: 41.59% 옆에 79.44%(×1.91) · 145.15%(×3.49)가 있다.
  {
    label: "3체인 · 별빛 배율 상승 (사죄 상태)",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1003007_1"],
    value: 0.91, // 배율 91% 상승
    modifier: "amplify",
    uptime: "active",
    scope: "self",
    exclusiveGroup: "phoebe-starlight-state",
    resonanceChain: 3,
    condition: "사죄 상태일 때. 아래 고해 쪽과 하나만 켠다",
  },
  {
    label: "3체인 · 별빛 배율 상승 (고해 상태)",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1003007_1"],
    value: 2.49, // 배율 249% 상승
    modifier: "amplify",
    uptime: "active",
    scope: "self",
    exclusiveGroup: "phoebe-starlight-state",
    resonanceChain: 3,
    condition: "고해 상태일 때. 위 사죄 쪽과 하나만 켠다",
  },

  // ── 공명체인 ──
  {
    label: "4체인 · 회절 저항 감소",
    target: "resReduction",
    damageType: "All",
    element: "Spectro",
    value: 0.1, // 저항 10% 감소
    uptime: "active",
    scope: "party", // 적에게 거는 디버프라 파티 전원의 회절 공격에 걸린다
    resonanceChain: 4,
    condition: "일반 공격 · 샤무엘의 별 · 회피 반격으로 명중한 뒤 30초간",
  },
  {
    label: "5체인 · 회절 피해 보너스",
    target: "damageBonus",
    damageType: "Spectro",
    value: 0.12, // 12% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 5,
    condition: "변주 스킬 금빛의 은혜 발동 후 15초간",
  },
  {
    label: "6체인 · 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.1, // 10% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "사죄 · 고해 상태에서 공명 스킬로 「거울의 고리」를 소환한 뒤 20초간",
  },
  // ── 「광학 효과」 관련 ──
  // 반주 「묵념」이 거는 것과, 2체인이 상태별로 얹는 것 두 층이다.
  // 이상 효과 피해는 전용 자리(anomalyBoost)에, 일반 피해는 boost에 담아 서로 섞이지 않게 한다.
  {
    label: "묵념 · 광학 효과 피해 부스트",
    target: "anomalyBoost",
    damageType: "SpectroFrazzle",
    value: 1, // 100% 부스트
    uptime: "active",
    scope: "party", // 적이 「광학 효과」로부터 받는 피해라 파티 전원이 덕을 본다
    condition: "반주 「경청하는 마음」으로 묵념 효과를 건 뒤",
  },
  {
    // 사죄 쪽은 「광학 효과가 있는 목표에게 **입히는 피해**」라 이상 피해가 아니라 일반 피해다.
    label: "2체인 · 반주 피해 부스트 (사죄 상태)",
    target: "boost",
    damageType: "All",
    value: 1.2, // 120% 부스트
    uptime: "active",
    scope: "party",
    exclusiveGroup: "phoebe-c2-state",
    resonanceChain: 2,
    condition: "사죄 상태. 반주로 「광학 효과」가 있는 목표에게 입히는 피해 (고해 쪽과 하나만 켠다)",
  },
  {
    // 고해 쪽은 위 묵념의 광학 효과 부스트에 얹힌다 — 100% + 120% = 220%가 된다.
    label: "2체인 · 묵념 광학 효과 부스트 추가 (고해 상태)",
    target: "anomalyBoost",
    damageType: "SpectroFrazzle",
    value: 1.2, // 추가 120% 부스트
    uptime: "active",
    scope: "party",
    exclusiveGroup: "phoebe-c2-state",
    resonanceChain: 2,
    condition: "고해 상태. 위 묵념 부스트에 더해진다 (사죄 쪽과 하나만 켠다)",
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   고유 「존재」         공중 강공격 발동 가능 횟수 +1
//   반주 「경청하는 마음」 공격력 528.41%의 회절 피해와 묵념 효과
//   6체인 뒷부분         「거울의 고리」 정체 효과, 거울 위치에서 별빛 1회 추가 발동
//                       — 추가 발동분은 로테이션에 별빛을 한 번 더 담으면 된다
//   회로 「기원 · 복음」   자원 수급 규칙 — 피해식에 자리가 없다
//   고유 「요리의 달인」  요리 확률 효과

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive3004,
  passive3005,
  passive3008,
  passive3009,
  passive3010,
];

export const phoebe: Character = {
  id: "phoebe",
  name: "페비",
  level: 90,
  element: "Spectro",
  weaponType: "Rectifier",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id(1506)가 아니라 별도 번호(45)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_45_UI.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_45_UI.webp",
  echoIds: [],
};
