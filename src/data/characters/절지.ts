import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";
import { emptyStats } from "../../types/stats";

/**
 * 절지 (Id 1105, 5성, 응결, 증폭기)
 * 출처: encore.moe API v2 (api/characters/1105.json)
 * 작성 절차: docs/character-workflow.md
 *
 * hits는 SkillAttributes의 *N 표기로 히트 개수를 잡고 레벨 1~10 값을 그대로 옮겼다.
 * "12.55%*5+52.70%"처럼 +로 이어진 것은 앞뒤가 서로 다른 값이라 각각 제 행을 갖는다.
 *
 * 두루미를 소환해 때리는 캐릭터라 판정이 대부분 일반 공격이다.
 * 공명 해방의 재두루미도, 공명 회로의 붓놀림 둘도 DamageList Type이 「일반 공격」이다.
 *
 * 공명 모드가 없는 캐릭터라 resonanceModes는 생략한다(SkillBranches 비어 있음).
 * Properties의 GrowthValues 중 level 90 값 사용.
 */
/**
 * 스킬 트리(SkillTree) 노드 8개는 여기 넣지 않는다.
 *   공격력   1.80 + 1.80 + 4.20 + 4.20 = 12%
 *   크리티컬 1.20 + 1.20 + 2.80 + 2.80 = 8%
 * 노드 하나하나가 src/data/characterNodes.json 에 있고, 켜고 끈 결과를
 * nodeStats()가 합산해 스탯에 얹는다. 전부 켜면 위 합계와 같은 값이 된다.
 */
const baseStats = {
  ...emptyStats(),
  hp: 12250,
  atk: 375,
  def: 1197.7756,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

// 기본 공격 — 공중 공격 · 회피 반격은 모션만 따로고 판정은 일반 공격이다
const basicSkillAttacks: Attack[] = [
  {
    id: "1002201_1",
    name: "일반 공격 1단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.21, 0.2273, 0.2445, 0.2686, 0.2858, 0.3056, 0.3332, 0.3607, 0.3883, 0.4176],
      [0.21, 0.2273, 0.2445, 0.2686, 0.2858, 0.3056, 0.3332, 0.3607, 0.3883, 0.4176],
    ],
  },
  {
    id: "1002201_2",
    name: "일반 공격 2단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1034, 0.1118, 0.1203, 0.1322, 0.1406, 0.1504, 0.1639, 0.1775, 0.1911, 0.2055],
      [0.1034, 0.1118, 0.1203, 0.1322, 0.1406, 0.1504, 0.1639, 0.1775, 0.1911, 0.2055],
      [0.1034, 0.1118, 0.1203, 0.1322, 0.1406, 0.1504, 0.1639, 0.1775, 0.1911, 0.2055],
      [0.1034, 0.1118, 0.1203, 0.1322, 0.1406, 0.1504, 0.1639, 0.1775, 0.1911, 0.2055],
      [0.1034, 0.1118, 0.1203, 0.1322, 0.1406, 0.1504, 0.1639, 0.1775, 0.1911, 0.2055],
    ],
  },
  {
    id: "1002201_3",
    name: "일반 공격 3단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.672, 0.7272, 0.7823, 0.8594, 0.9145, 0.9779, 1.066, 1.1542, 1.2424, 1.3361],
    ],
  },
  {
    id: "1002201_4",
    name: "강공격 피해",
    type: "Heavy",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.567, 0.6135, 0.66, 0.7251, 0.7716, 0.825, 0.8994, 0.9738, 1.0482, 1.1272],
    ],
  },
  {
    id: "1002201_5",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1255, 0.1358, 0.1461, 0.1605, 0.1708, 0.1826, 0.1991, 0.2155, 0.232, 0.2495],
      [0.1255, 0.1358, 0.1461, 0.1605, 0.1708, 0.1826, 0.1991, 0.2155, 0.232, 0.2495],
      [0.1255, 0.1358, 0.1461, 0.1605, 0.1708, 0.1826, 0.1991, 0.2155, 0.232, 0.2495],
      [0.1255, 0.1358, 0.1461, 0.1605, 0.1708, 0.1826, 0.1991, 0.2155, 0.232, 0.2495],
      [0.1255, 0.1358, 0.1461, 0.1605, 0.1708, 0.1826, 0.1991, 0.2155, 0.232, 0.2495],
      [0.527, 0.5703, 0.6135, 0.674, 0.7172, 0.7669, 0.836, 0.9052, 0.9743, 1.0478],
    ],
  },
  {
    id: "1002201_6",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1462, 0.1582, 0.1702, 0.187, 0.199, 0.2128, 0.232, 0.2511, 0.2703, 0.2907],
      [0.1462, 0.1582, 0.1702, 0.187, 0.199, 0.2128, 0.232, 0.2511, 0.2703, 0.2907],
      [0.1462, 0.1582, 0.1702, 0.187, 0.199, 0.2128, 0.232, 0.2511, 0.2703, 0.2907],
      [0.1462, 0.1582, 0.1702, 0.187, 0.199, 0.2128, 0.232, 0.2511, 0.2703, 0.2907],
      [0.1462, 0.1582, 0.1702, 0.187, 0.199, 0.2128, 0.232, 0.2511, 0.2703, 0.2907],
    ],
  },
];

const basicSkill: Skill = {
  id: "1002201",
  category: "Basic",
  name: "수묵담채화",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorMagic.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["21.00%*2", "22.73%*2", "24.45%*2", "26.86%*2", "28.58%*2", "30.56%*2", "33.32%*2", "36.07%*2", "38.83%*2", "41.76%*2", "45.20%*2", "48.64%*2", "52.09%*2", "55.53%*2", "58.98%*2", "62.42%*2", "65.86%*2", "69.31%*2", "72.75%*2"] },
    { attributeName: "2단 피해", description: "", values: ["10.34%*5", "11.18%*5", "12.03%*5", "13.22%*5", "14.06%*5", "15.04%*5", "16.39%*5", "17.75%*5", "19.11%*5", "20.55%*5", "22.24%*5", "23.93%*5", "25.63%*5", "27.32%*5", "29.02%*5", "30.71%*5", "32.41%*5", "34.10%*5", "35.80%*5"] },
    { attributeName: "3단 피해", description: "", values: ["67.20%", "72.72%", "78.23%", "85.94%", "91.45%", "97.79%", "106.60%", "115.42%", "124.24%", "133.61%", "144.63%", "155.65%", "166.67%", "177.69%", "188.71%", "199.73%", "210.75%", "221.77%", "232.79%"] },
    { attributeName: "강공격 피해", description: "", values: ["56.70%", "61.35%", "66.00%", "72.51%", "77.16%", "82.50%", "89.94%", "97.38%", "104.82%", "112.72%", "122.02%", "131.32%", "140.61%", "149.91%", "159.21%", "168.51%", "177.81%", "187.10%", "196.40%"] },
    { attributeName: "공중 공격 피해", description: "", values: ["12.55%*5+52.70%", "13.58%*5+57.03%", "14.61%*5+61.35%", "16.05%*5+67.40%", "17.08%*5+71.72%", "18.26%*5+76.69%", "19.91%*5+83.60%", "21.55%*5+90.52%", "23.20%*5+97.43%", "24.95%*5+104.78%", "27.01%*5+113.42%", "29.06%*5+122.06%", "31.12%*5+130.71%", "33.18%*5+139.35%", "35.24%*5+147.99%", "37.29%*5+156.63%", "39.35%*5+165.28%", "41.41%*5+173.92%", "43.47%*5+182.56%"] },
    { attributeName: "회피 반격 피해", description: "", values: ["14.62%*5", "15.82%*5", "17.02%*5", "18.70%*5", "19.90%*5", "21.28%*5", "23.20%*5", "25.11%*5", "27.03%*5", "29.07%*5", "31.47%*5", "33.87%*5", "36.26%*5", "38.66%*5", "41.06%*5", "43.46%*5", "45.85%*5", "48.25%*5", "50.65%*5"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25", "5+25"] },
  ],
};

// 공명 스킬
const resonanceSkillAttacks: Attack[] = [
  {
    id: "1002202_1",
    name: "짧게 누르기 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.495, 0.5356, 0.5762, 0.6331, 0.6736, 0.7203, 0.7853, 0.8502, 0.9152, 0.9842],
      [0.495, 0.5356, 0.5762, 0.6331, 0.6736, 0.7203, 0.7853, 0.8502, 0.9152, 0.9842],
      [0.495, 0.5356, 0.5762, 0.6331, 0.6736, 0.7203, 0.7853, 0.8502, 0.9152, 0.9842],
    ],
  },
  {
    id: "1002202_2",
    name: "길게 누르기 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.495, 0.5356, 0.5762, 0.6331, 0.6736, 0.7203, 0.7853, 0.8502, 0.9152, 0.9842],
      [0.495, 0.5356, 0.5762, 0.6331, 0.6736, 0.7203, 0.7853, 0.8502, 0.9152, 0.9842],
      [0.495, 0.5356, 0.5762, 0.6331, 0.6736, 0.7203, 0.7853, 0.8502, 0.9152, 0.9842],
    ],
  },
  {
    id: "1002202_3",
    name: "공중에서 짧게 누르기 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.495, 0.5356, 0.5762, 0.6331, 0.6736, 0.7203, 0.7853, 0.8502, 0.9152, 0.9842],
      [0.495, 0.5356, 0.5762, 0.6331, 0.6736, 0.7203, 0.7853, 0.8502, 0.9152, 0.9842],
      [0.495, 0.5356, 0.5762, 0.6331, 0.6736, 0.7203, 0.7853, 0.8502, 0.9152, 0.9842],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1002202",
  category: "Skill",
  name: "무형의 형상화",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhezhi/SP_IconZhezhiB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "짧게 누르기 스킬 피해", description: "", values: ["49.50%*3", "53.56%*3", "57.62%*3", "63.31%*3", "67.36%*3", "72.03%*3", "78.53%*3", "85.02%*3", "91.52%*3", "98.42%*3", "106.53%*3", "114.65%*3", "122.77%*3", "130.89%*3", "139.01%*3", "147.12%*3", "155.24%*3", "163.36%*3", "171.48%*3"] },
    { attributeName: "길게 누르기 스킬 피해", description: "", values: ["49.50%*3", "53.56%*3", "57.62%*3", "63.31%*3", "67.36%*3", "72.03%*3", "78.53%*3", "85.02%*3", "91.52%*3", "98.42%*3", "106.53%*3", "114.65%*3", "122.77%*3", "130.89%*3", "139.01%*3", "147.12%*3", "155.24%*3", "163.36%*3", "171.48%*3"] },
    { attributeName: "쿨타임", description: "", values: ["6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6"] },
    { attributeName: "짧게 누르기로 회복하는 협주 에너지", description: "", values: ["8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8"] },
    { attributeName: "길게 누르기로 회복하는 협주 에너지", description: "", values: ["8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8"] },
    { attributeName: "공중에서 짧게 누르기 피해", description: "", values: ["49.50%*3", "53.56%*3", "57.62%*3", "63.31%*3", "67.36%*3", "72.03%*3", "78.53%*3", "85.02%*3", "91.52%*3", "98.42%*3", "106.53%*3", "114.65%*3", "122.77%*3", "130.89%*3", "139.01%*3", "147.12%*3", "155.24%*3", "163.36%*3", "171.48%*3"] },
    { attributeName: "공중에서 짧게 누르기로 회복하는 협주 에너지", description: "", values: ["8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8"] },
  ],
};

// 공명 해방 — 소환한 재두루미가 때리는 것이라 판정이 일반 공격이다.
// 재두루미 1마리분의 피해이므로 로테이션에는 소환한 마릿수만큼 담는다.
const liberationSkillAttacks: Attack[] = [
  {
    id: "1002203_1",
    name: "재두루미 피해",
    type: "Liberation",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.328, 0.3549, 0.3818, 0.4195, 0.4464, 0.4773, 0.5204, 0.5634, 0.6064, 0.6521],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1002203",
  category: "Liberation",
  name: "상상과 현실",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhezhi/SP_IconZhezhiC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "재두루미 피해", description: "", values: ["32.80%", "35.49%", "38.18%", "41.95%", "44.64%", "47.73%", "52.04%", "56.34%", "60.64%", "65.21%", "70.59%", "75.97%", "81.35%", "86.73%", "92.11%", "97.49%", "102.87%", "108.25%", "113.63%"] },
    { attributeName: "쿨타임", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 변주 스킬
const variationSkillAttacks: Attack[] = [
  {
    id: "1002206_1",
    name: "스킬 피해",
    type: "Variation",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4334, 0.4689, 0.5044, 0.5542, 0.5897, 0.6306, 0.6874, 0.7443, 0.8012, 0.8616],
      [0.4334, 0.4689, 0.5044, 0.5542, 0.5897, 0.6306, 0.6874, 0.7443, 0.8012, 0.8616],
      [0.4334, 0.4689, 0.5044, 0.5542, 0.5897, 0.6306, 0.6874, 0.7443, 0.8012, 0.8616],
    ],
  },
];

const variationSkill: Skill = {
  id: "1002206",
  category: "Variation",
  name: "붓끝의 빛",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhezhi/SP_IconZhezhiQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["43.34%*3", "46.89%*3", "50.44%*3", "55.42%*3", "58.97%*3", "63.06%*3", "68.74%*3", "74.43%*3", "80.12%*3", "86.16%*3", "93.26%*3", "100.37%*3", "107.48%*3", "114.58%*3", "121.69%*3", "128.80%*3", "135.90%*3", "143.01%*3", "150.12%*3"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};

// 공명 회로 「명작의 탄생」 — 붓놀림 둘은 공명 스킬로 발동하지만
// 두루미가 대신 때리는 것이라 판정은 일반 공격이다(DamageList Type 기준).
// 강공격 · 구성만 강공격 판정이다.
const circuitSkillAttacks: Attack[] = [
  {
    id: "1002207_1",
    name: "강공격 · 구성 피해",
    type: "Heavy",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4175, 0.4518, 0.486, 0.5339, 0.5682, 0.6076, 0.6623, 0.7171, 0.7719, 0.8301],
      [0.4175, 0.4518, 0.486, 0.5339, 0.5682, 0.6076, 0.6623, 0.7171, 0.7719, 0.8301],
      [0.4175, 0.4518, 0.486, 0.5339, 0.5682, 0.6076, 0.6623, 0.7171, 0.7719, 0.8301],
    ],
  },
  {
    id: "1002207_2",
    name: "천재의 붓놀림 피해",
    type: "Skill",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.5, 1.623, 1.746, 1.9182, 2.0412, 2.1827, 2.3795, 2.5763, 2.7731, 2.9822],
    ],
  },
  {
    id: "1002207_3",
    name: "궁극 · 천재의 붓놀림 피해",
    type: "Skill",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.6, 0.6492, 0.6984, 0.7673, 0.8165, 0.8731, 0.9518, 1.0305, 1.1093, 1.1929],
      [0.6, 0.6492, 0.6984, 0.7673, 0.8165, 0.8731, 0.9518, 1.0305, 1.1093, 1.1929],
      [0.6, 0.6492, 0.6984, 0.7673, 0.8165, 0.8731, 0.9518, 1.0305, 1.1093, 1.1929],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1002207",
  category: "Circuit",
  name: "명작의 탄생",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhezhi/SP_IconZhezhiY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "강공격 · 구성 피해", description: "", values: ["41.75%*3", "45.18%*3", "48.60%*3", "53.39%*3", "56.82%*3", "60.76%*3", "66.23%*3", "71.71%*3", "77.19%*3", "83.01%*3", "89.86%*3", "96.70%*3", "103.55%*3", "110.40%*3", "117.24%*3", "124.09%*3", "130.94%*3", "137.78%*3", "144.63%*3"] },
    { attributeName: "강공격 · 구성 스태미나 소모", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "천재의 붓놀림 피해", description: "", values: ["150.00%", "162.30%", "174.60%", "191.82%", "204.12%", "218.27%", "237.95%", "257.63%", "277.31%", "298.22%", "322.82%", "347.42%", "372.02%", "396.62%", "421.22%", "445.82%", "470.42%", "495.02%", "519.62%"] },
    { attributeName: "궁극 · 천재의 붓놀림 피해", description: "", values: ["60.00%*3", "64.92%*3", "69.84%*3", "76.73%*3", "81.65%*3", "87.31%*3", "95.18%*3", "103.05%*3", "110.93%*3", "119.29%*3", "129.13%*3", "138.97%*3", "148.81%*3", "158.65%*3", "168.49%*3", "178.33%*3", "188.17%*3", "198.01%*3", "207.85%*3"] },
    { attributeName: "천재의 붓놀림으로 회복하는 협주 에너지", description: "", values: ["13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13"] },
    { attributeName: "궁극 · 천재의 붓놀림으로 회복하는 협주 에너지", description: "", values: ["13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13", "13"] },
  ],
};
const passive2204: Skill = {
  id: "1002204",
  category: "Passive",
  name: "일필휘지",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhezhi/SP_IconZhezhiD1.webp",
  attacks: [],
};

const passive2205: Skill = {
  id: "1002205",
  category: "Passive",
  name: "화룡점정",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhezhi/SP_IconZhezhiD2.webp",
  attacks: [],
};

const passive2208: Skill = {
  id: "1002208",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld3.webp",
  attacks: [],
};

const passive2209: Skill = {
  id: "1002209",
  category: "Intro",
  name: "글레이징 기법",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconZhezhi/SP_IconZhezhiT.webp",
  attacks: [],
};

const passive2210: Skill = {
  id: "1002210",
  category: "Sync",
  name: "조화도 파괴 · 증폭기",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakMagic.webp",
  attacks: [],
};

/**
 * 고유 스킬 · 반주 스킬 · 공명체인 6개를 계산 가능한 버프로 옮긴 것.
 * 소환 수량 · 에너지처럼 피해와 무관한 것은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 스킬에서 오는 것 (설명문에서 옮김) ──
  {
    label: "명작의 탄생 · 일반 공격 피해 보너스",
    target: "damageBonus",
    damageType: "Basic",
    value: 0.18,
    uptime: "active",
    scope: "self",
    condition: "27초간",
  },
  // ── 고유 스킬 ──
  {
    label: "일필휘지 · 공격력",
    inherentSkillId: "1002204",
    target: "atkPercent",
    damageType: "All",
    value: 0.06, // 스택당 6% 증가
    stacks: 3, // 기본값 — 공격마다 몇 스택인지 따로 고를 수 있다
    maxStacks: 3,
    uptime: "active",
    scope: "self",
    condition: "천재의 붓놀림 · 궁극 · 천재의 붓놀림 발동 시 1스택, 27초 지속",
  },

  // ── 반주 스킬 「글레이징 기법」 — 다음에 등장하는 캐릭터에게 걸린다 ──
  {
    label: "글레이징 기법 · 응결 피해 부스트",
    target: "boost",
    damageType: "Glacio",
    value: 0.2, // 20% 부스트
    uptime: "active",
    scope: "party",
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },
  {
    label: "글레이징 기법 · 공명 스킬 피해 부스트",
    target: "boost",
    damageType: "Skill",
    value: 0.25, // 25% 부스트
    uptime: "active",
    scope: "party",
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },

  // ── 공명체인 ──
  {
    label: "1체인 · 크리티컬",
    target: "critRate",
    damageType: "All",
    value: 0.1, // 10% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 1,
    condition: "궁극 · 천재의 붓놀림 발동 후 27초간",
  },
  {
    label: "3체인 · 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.15, // 스택당 15% 증가
    stacks: 3, // 기본값
    maxStacks: 3,
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "무형의 형상화 · 천재의 붓놀림 · 궁극 발동 시 1스택, 27초 지속",
  },
  {
    label: "4체인 · 파티 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 4,
    condition: "공명 해방 상상과 현실 발동 후 30초간, 파티 전원",
  },
  // 5체인은 재두루미 3마리마다 140%짜리 한 마리가 더 붙는 형태다.
  // 재두루미 한 마리 기준으로 고르게 나누면 140% ÷ 3 = 46.67%가 된다
  // — 3의 배수로 소환하면 총량이 정확히 맞고, 그 사이 값은 평균으로 잡힌다.
  // DamageList에도 32.8% 옆에 45.92%(= 32.8 × 1.4) 엔트리가 따로 들어 있다.
  {
    label: "5체인 · 추가 재두루미 (마리당 평균)",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1002203_1"],
    value: 0.4667, // 140% ÷ 3마리
    uptime: "passive", // 해방이 도는 동안 늘 같이 붙는다
    scope: "self",
    resonanceChain: 5,
    condition: "재두루미 3마리를 소환할 때마다 140%짜리 1마리 추가",
  },
  // 6체인은 붓놀림 둘 다에 「천재의 붓놀림 피해량의 120%」인 흰두루미가 한 마리 붙는다.
  // 추가 피해가 항상 180%(= 150 × 1.2)로 고정이라, 원래 공격 대비 비율이 서로 다르다.
  //   천재의 붓놀림(150%)      → 180 ÷ 150 = 120% 증가
  //   궁극 · 천재의 붓놀림(180%) → 180 ÷ 180 = 100% 증가
  {
    label: "6체인 · 흰두루미 (천재의 붓놀림)",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1002207_2"],
    value: 1.2, // 원래 피해의 120%가 한 번 더
    uptime: "passive", // 조건이 없어 늘 걸린다
    scope: "self",
    resonanceChain: 6,
  },
  {
    label: "6체인 · 흰두루미 (궁극 · 천재의 붓놀림)",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1002207_3"],
    value: 1, // 추가 피해 180%가 궁극의 합계 180%와 같다
    uptime: "passive", // 조건이 없어 늘 걸린다
    scope: "self",
    resonanceChain: 6,
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   고유 「화룡점정」   반주 스킬 후 다음 캐릭터의 공명 에너지 15pt 회복
//   1체인 앞부분       궁극 · 천재의 붓놀림 발동 시 공명 에너지 15pt 회복
//   2체인 「기운생동」  재두루미 소환 가능 수량 +6
//                     — 마릿수가 늘 뿐 한 마리의 피해는 그대로다.
//                       로테이션에 재두루미를 그만큼 더 담으면 된다
//   고유 「요리의 달인」 요리 확률 효과

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive2204,
  passive2205,
  passive2208,
  passive2209,
  passive2210,
];

export const zhezhi: Character = {
  id: "zhezhi",
  name: "절지",
  level: 90,
  element: "Glacio",
  weaponType: "Rectifier",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id(1105)가 아니라 별도 번호(27)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_27_UI.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_27_UI.webp",
  echoIds: [],
};
