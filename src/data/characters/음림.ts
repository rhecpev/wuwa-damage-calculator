import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";
import { emptyStats } from "../../types/stats";

/**
 * 음림 (Id 1302, 5성, 전도, 증폭기)
 * 출처: encore.moe API v2 (api/characters/1302.json)
 * 작성 절차: docs/character-workflow.md
 *
 * hits는 SkillAttributes의 *N 표기로 히트 개수를 잡고 레벨 1~10 값을 그대로 옮겼다.
 * 판정(damageBonusType)은 DamageList의 Type을 따랐다 — 공중 공격과 회피 반격이
 * 「일반 공격」으로, 공명 회로의 심판의 뇌전이 「공명 스킬」로 잡힌다.
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
  hp: 11000,
  atk: 400,
  def: 1283.331,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

// 기본 공격 — 공중 공격 · 회피 반격은 모션만 따로고 판정은 일반 공격이다
const basicSkillAttacks: Attack[] = [
  {
    id: "1001501_1",
    name: "일반 공격 1단 피해",
    type: "Basic",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1449, 0.1568, 0.1687, 0.1853, 0.1972, 0.2109, 0.2299, 0.2489, 0.2679, 0.2881],
    ],
  },
  {
    id: "1001501_2",
    name: "일반 공격 2단 피해",
    type: "Basic",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1701, 0.1841, 0.198, 0.2176, 0.2315, 0.2476, 0.2699, 0.2922, 0.3145, 0.3382],
      [0.1701, 0.1841, 0.198, 0.2176, 0.2315, 0.2476, 0.2699, 0.2922, 0.3145, 0.3382],
    ],
  },
  {
    id: "1001501_3",
    name: "일반 공격 3단 피해",
    type: "Basic",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.0704, 0.0762, 0.0819, 0.09, 0.0958, 0.1024, 0.1116, 0.1209, 0.1301, 0.1399],
      [0.0704, 0.0762, 0.0819, 0.09, 0.0958, 0.1024, 0.1116, 0.1209, 0.1301, 0.1399],
      [0.0704, 0.0762, 0.0819, 0.09, 0.0958, 0.1024, 0.1116, 0.1209, 0.1301, 0.1399],
      [0.0704, 0.0762, 0.0819, 0.09, 0.0958, 0.1024, 0.1116, 0.1209, 0.1301, 0.1399],
      [0.0704, 0.0762, 0.0819, 0.09, 0.0958, 0.1024, 0.1116, 0.1209, 0.1301, 0.1399],
      [0.0704, 0.0762, 0.0819, 0.09, 0.0958, 0.1024, 0.1116, 0.1209, 0.1301, 0.1399],
      [0.0704, 0.0762, 0.0819, 0.09, 0.0958, 0.1024, 0.1116, 0.1209, 0.1301, 0.1399],
    ],
  },
  {
    id: "1001501_4",
    name: "일반 공격 4단 피해",
    type: "Basic",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.378, 0.409, 0.44, 0.4834, 0.5144, 0.5501, 0.5997, 0.6493, 0.6989, 0.7516],
    ],
  },
  {
    id: "1001501_5",
    name: "강공격 피해",
    type: "Heavy",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.15, 0.1623, 0.1746, 0.1919, 0.2042, 0.2183, 0.238, 0.2577, 0.2774, 0.2983],
      [0.15, 0.1623, 0.1746, 0.1919, 0.2042, 0.2183, 0.238, 0.2577, 0.2774, 0.2983],
    ],
  },
  {
    id: "1001501_6",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.62, 0.6709, 0.7217, 0.7929, 0.8437, 0.9022, 0.9836, 1.0649, 1.1462, 1.2327],
    ],
  },
  {
    id: "1001501_7",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1218, 0.1318, 0.1418, 0.1558, 0.1658, 0.1772, 0.1932, 0.2092, 0.2252, 0.2422],
      [0.1218, 0.1318, 0.1418, 0.1558, 0.1658, 0.1772, 0.1932, 0.2092, 0.2252, 0.2422],
      [0.1218, 0.1318, 0.1418, 0.1558, 0.1658, 0.1772, 0.1932, 0.2092, 0.2252, 0.2422],
      [0.1218, 0.1318, 0.1418, 0.1558, 0.1658, 0.1772, 0.1932, 0.2092, 0.2252, 0.2422],
      [0.1218, 0.1318, 0.1418, 0.1558, 0.1658, 0.1772, 0.1932, 0.2092, 0.2252, 0.2422],
      [0.1218, 0.1318, 0.1418, 0.1558, 0.1658, 0.1772, 0.1932, 0.2092, 0.2252, 0.2422],
      [0.1218, 0.1318, 0.1418, 0.1558, 0.1658, 0.1772, 0.1932, 0.2092, 0.2252, 0.2422],
    ],
  },
];

const basicSkill: Skill = {
  id: "1001501",
  category: "Basic",
  name: "현사의 칼춤",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorMagic.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["14.49%", "15.68%", "16.87%", "18.53%", "19.72%", "21.09%", "22.99%", "24.89%", "26.79%", "28.81%", "31.19%", "33.57%", "35.94%", "38.32%", "40.69%", "43.07%", "45.45%", "47.82%", "50.2%", "52.58%"] },
    { attributeName: "2단 피해", description: "", values: ["17.01%*2", "18.41%*2", "19.8%*2", "21.76%*2", "23.15%*2", "24.76%*2", "26.99%*2", "29.22%*2", "31.45%*2", "33.82%*2", "36.61%*2", "39.4%*2", "42.19%*2", "44.98%*2", "47.77%*2", "50.56%*2", "53.35%*2", "56.14%*2", "58.93%*2", "61.72%*2"] },
    { attributeName: "3단 피해", description: "", values: ["7.04%*7", "7.62%*7", "8.19%*7", "9%*7", "9.58%*7", "10.24%*7", "11.16%*7", "12.09%*7", "13.01%*7", "13.99%*7", "15.15%*7", "16.3%*7", "17.45%*7", "18.61%*7", "19.76%*7", "20.91%*7", "22.07%*7", "23.22%*7", "24.37%*7", "25.53%*7"] },
    { attributeName: "4단 피해", description: "", values: ["37.8%", "40.9%", "44%", "48.34%", "51.44%", "55.01%", "59.97%", "64.93%", "69.89%", "75.16%", "81.35%", "87.55%", "93.75%", "99.95%", "106.15%", "112.35%", "118.55%", "124.75%", "130.95%", "137.15%"] },
    { attributeName: "강공격 피해", description: "", values: ["15%*2", "16.23%*2", "17.46%*2", "19.19%*2", "20.42%*2", "21.83%*2", "23.8%*2", "25.77%*2", "27.74%*2", "29.83%*2", "32.29%*2", "34.75%*2", "37.21%*2", "39.67%*2", "42.13%*2", "44.59%*2", "47.05%*2", "49.51%*2", "51.97%*2", "54.43%*2"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공중 공격 피해", description: "", values: ["62%", "67.09%", "72.17%", "79.29%", "84.37%", "90.22%", "98.36%", "106.49%", "114.62%", "123.27%", "133.44%", "143.6%", "153.77%", "163.94%", "174.11%", "184.28%", "194.44%", "204.61%", "214.78%", "224.95%"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "회피 반격 피해", description: "", values: ["12.18%*7", "13.18%*7", "14.18%*7", "15.58%*7", "16.58%*7", "17.72%*7", "19.32%*7", "20.92%*7", "22.52%*7", "24.22%*7", "26.21%*7", "28.21%*7", "30.21%*7", "32.2%*7", "34.2%*7", "36.2%*7", "38.2%*7", "40.19%*7", "42.19%*7", "44.19%*7"] },
  ],
};

// 공명 스킬
const resonanceSkillAttacks: Attack[] = [
  {
    id: "1001502_1",
    name: "자기장의 포효 피해",
    type: "Skill",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
      [0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965],
    ],
  },
  {
    id: "1001502_2",
    name: "천둥의 폭발 피해",
    type: "Skill",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.45, 0.4869, 0.5238, 0.5755, 0.6124, 0.6548, 0.7139, 0.7729, 0.832, 0.8947],
      [0.45, 0.4869, 0.5238, 0.5755, 0.6124, 0.6548, 0.7139, 0.7729, 0.832, 0.8947],
      [0.45, 0.4869, 0.5238, 0.5755, 0.6124, 0.6548, 0.7139, 0.7729, 0.832, 0.8947],
      [0.45, 0.4869, 0.5238, 0.5755, 0.6124, 0.6548, 0.7139, 0.7729, 0.832, 0.8947],
    ],
  },
  {
    id: "1001502_3",
    name: "자기장의 폭발 피해",
    type: "Skill",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1, 0.1082, 0.1164, 0.1279, 0.1361, 0.1456, 0.1587, 0.1718, 0.1849, 0.1989],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1001502",
  category: "Skill",
  name: "자기장의 포효",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYinlin/SP_IconYinlinB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "자기장의 포효 피해", description: "", values: ["30%*3", "32.46%*3", "34.92%*3", "38.37%*3", "40.83%*3", "43.66%*3", "47.59%*3", "51.53%*3", "55.47%*3", "59.65%*3", "64.57%*3", "69.49%*3", "74.41%*3", "79.33%*3", "84.25%*3", "89.17%*3", "94.09%*3", "99.01%*3", "103.93%*3", "108.85%*3"] },
    { attributeName: "천둥의 폭발 피해", description: "", values: ["45%*4", "48.69%*4", "52.38%*4", "57.55%*4", "61.24%*4", "65.48%*4", "71.39%*4", "77.29%*4", "83.2%*4", "89.47%*4", "96.85%*4", "104.23%*4", "111.61%*4", "118.99%*4", "126.37%*4", "133.75%*4", "141.13%*4", "148.51%*4", "155.89%*4", "163.27%*4"] },
    { attributeName: "자기장의 폭발 피해", description: "", values: ["10%", "10.82%", "11.64%", "12.79%", "13.61%", "14.56%", "15.87%", "17.18%", "18.49%", "19.89%", "21.53%", "23.17%", "24.81%", "26.45%", "28.09%", "29.73%", "31.37%", "33.01%", "34.65%", "36.29%"] },
    { attributeName: "쿨타임", description: "", values: ["12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12", "12"] },
    { attributeName: "자기장의 포효로 회복하는 협주 에너지", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "천둥의 폭발로 회복하는 협주 에너지", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "자기장의 폭발로 회복하는 협주 에너지", description: "", values: ["5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5"] },
    { attributeName: "「죽음의 자석」 상태 지속 시간", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};

// 공명 해방
const liberationSkillAttacks: Attack[] = [
  {
    id: "1001503_1",
    name: "스킬 피해",
    type: "Liberation",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.5863, 0.6344, 0.6825, 0.7498, 0.7979, 0.8532, 0.9301, 1.007, 1.0839, 1.1656],
      [0.5863, 0.6344, 0.6825, 0.7498, 0.7979, 0.8532, 0.9301, 1.007, 1.0839, 1.1656],
      [0.5863, 0.6344, 0.6825, 0.7498, 0.7979, 0.8532, 0.9301, 1.007, 1.0839, 1.1656],
      [0.5863, 0.6344, 0.6825, 0.7498, 0.7979, 0.8532, 0.9301, 1.007, 1.0839, 1.1656],
      [0.5863, 0.6344, 0.6825, 0.7498, 0.7979, 0.8532, 0.9301, 1.007, 1.0839, 1.1656],
      [0.5863, 0.6344, 0.6825, 0.7498, 0.7979, 0.8532, 0.9301, 1.007, 1.0839, 1.1656],
      [0.5863, 0.6344, 0.6825, 0.7498, 0.7979, 0.8532, 0.9301, 1.007, 1.0839, 1.1656],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1001503",
  category: "Liberation",
  name: "파천의 뇌격",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYinlin/SP_IconYinlinC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["58.63%*7", "63.44%*7", "68.25%*7", "74.98%*7", "79.79%*7", "85.32%*7", "93.01%*7", "100.7%*7", "108.39%*7", "116.56%*7", "126.18%*7", "135.79%*7", "145.41%*7", "155.02%*7", "164.64%*7", "174.25%*7", "183.87%*7", "193.49%*7", "203.1%*7", "212.72%*7"] },
    { attributeName: "쿨타임", description: "", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 변주 스킬
const variationSkillAttacks: Attack[] = [
  {
    id: "1001506_1",
    name: "스킬 피해",
    type: "Variation",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.072, 0.078, 0.0839, 0.0921, 0.098, 0.1048, 0.1143, 0.1237, 0.1332, 0.1432],
      [0.072, 0.078, 0.0839, 0.0921, 0.098, 0.1048, 0.1143, 0.1237, 0.1332, 0.1432],
      [0.072, 0.078, 0.0839, 0.0921, 0.098, 0.1048, 0.1143, 0.1237, 0.1332, 0.1432],
      [0.072, 0.078, 0.0839, 0.0921, 0.098, 0.1048, 0.1143, 0.1237, 0.1332, 0.1432],
      [0.072, 0.078, 0.0839, 0.0921, 0.098, 0.1048, 0.1143, 0.1237, 0.1332, 0.1432],
      [0.072, 0.078, 0.0839, 0.0921, 0.098, 0.1048, 0.1143, 0.1237, 0.1332, 0.1432],
      [0.072, 0.078, 0.0839, 0.0921, 0.098, 0.1048, 0.1143, 0.1237, 0.1332, 0.1432],
      [0.072, 0.078, 0.0839, 0.0921, 0.098, 0.1048, 0.1143, 0.1237, 0.1332, 0.1432],
      [0.072, 0.078, 0.0839, 0.0921, 0.098, 0.1048, 0.1143, 0.1237, 0.1332, 0.1432],
      [0.072, 0.078, 0.0839, 0.0921, 0.098, 0.1048, 0.1143, 0.1237, 0.1332, 0.1432],
    ],
  },
];

const variationSkill: Skill = {
  id: "1001506",
  category: "Variation",
  name: "광풍의 뇌정",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYinlin/SP_IconYinlinQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["7.2%*10", "7.8%*10", "8.39%*10", "9.21%*10", "9.8%*10", "10.48%*10", "11.43%*10", "12.37%*10", "13.32%*10", "14.32%*10", "15.5%*10", "16.68%*10", "17.86%*10", "19.04%*10", "20.22%*10", "21.4%*10", "22.58%*10", "23.77%*10", "24.95%*10", "26.13%*10"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};

// 공명 회로 — 천면 매혹은 강공격을 대체하는 모션이라 강공격 판정,
// 심판의 뇌전은 인장이 붙은 목표에 자동으로 떨어지는 낙뢰라 공명 스킬 판정이다.
const circuitSkillAttacks: Attack[] = [
  {
    id: "1001507_1",
    name: "천면 매혹 피해",
    type: "Heavy",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.9, 0.9738, 1.0476, 1.151, 1.2248, 1.3096, 1.4277, 1.5458, 1.6639, 1.7893],
      [0.9, 0.9738, 1.0476, 1.151, 1.2248, 1.3096, 1.4277, 1.5458, 1.6639, 1.7893],
    ],
  },
  {
    id: "1001507_2",
    name: "심판의 뇌전 피해",
    type: "Skill",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3956, 0.428, 0.4605, 0.5059, 0.5383, 0.5756, 0.6275, 0.6794, 0.7313, 0.7864],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1001507",
  category: "Circuit",
  name: "천면 매혹",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYinlin/SP_IconYinlinY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "천면 매혹 피해", description: "", values: ["90%*2", "97.38%*2", "104.76%*2", "115.1%*2", "122.48%*2", "130.96%*2", "142.77%*2", "154.58%*2", "166.39%*2", "178.93%*2", "193.69%*2", "208.45%*2", "223.21%*2", "237.97%*2", "252.73%*2", "267.49%*2", "282.25%*2", "297.01%*2", "311.77%*2", "326.53%*2"] },
    { attributeName: "심판의 뇌전 피해", description: "", values: ["39.56%", "42.8%", "46.05%", "50.59%", "53.83%", "57.56%", "62.75%", "67.94%", "73.13%", "78.64%", "85.13%", "91.62%", "98.1%", "104.59%", "111.08%", "117.56%", "124.05%", "130.54%", "137.02%", "143.51%"] },
  ],
};
const passive1504: Skill = {
  id: "1001504",
  category: "Passive",
  name: "과도한 통증",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYinlin/SP_IconYinlinD1.webp",
  attacks: [],
};

const passive1505: Skill = {
  id: "1001505",
  category: "Passive",
  name: "명확한 목표",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYinlin/SP_IconYinlinD2.webp",
  attacks: [],
};

const passive1508: Skill = {
  id: "1001508",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld4.webp",
  attacks: [],
};

const passive1509: Skill = {
  id: "1001509",
  category: "Intro",
  name: "전기의 편달",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconYinlin/SP_IconYinlinT.webp",
  attacks: [],
};

const passive1510: Skill = {
  id: "1001510",
  category: "Sync",
  name: "조화도 파괴 · 증폭기",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakMagic.webp",
  attacks: [],
};

/**
 * 고유 스킬 · 반주 스킬 · 공명체인 6개를 계산 가능한 버프로 옮긴 것.
 * 게이지·에너지 회복처럼 피해와 무관한 것은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 고유 스킬 ──
  {
    label: "과도한 통증 · 크리티컬",
    inherentSkillId: "1001504",
    target: "critRate",
    damageType: "All",
    value: 0.15, // 15% 증가
    uptime: "active",
    scope: "self",
    condition: "공명 스킬 자기장의 포효 사용 후 5초간",
  },
  {
    label: "명확한 목표 · 천둥의 폭발 피해",
    inherentSkillId: "1001505",
    target: "damageBonus",
    damageType: "All",
    // 천둥의 폭발 한 공격에만 걸린다.
    attackIds: ["1001502_2"],
    value: 0.1, // 10% 증가
    uptime: "active",
    scope: "self",
    condition: "천둥의 폭발이 「죄악의 표식」이 붙은 목표를 명중했을 때",
  },
  {
    label: "명확한 목표 · 공격력",
    inherentSkillId: "1001505",
    target: "atkPercent",
    damageType: "All",
    value: 0.1, // 10% 증가
    uptime: "active",
    scope: "self",
    condition: "위 효과가 발동한 뒤 4초간",
  },

  // ── 반주 스킬 「전기의 편달」 — 다음에 등장하는 캐릭터에게 걸린다 ──
  {
    label: "전기의 편달 · 전도 피해 부스트",
    target: "boost",
    damageType: "Electro",
    value: 0.2, // 20% 부스트
    uptime: "active",
    scope: "party",
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },
  {
    label: "전기의 편달 · 공명 해방 피해 부스트",
    target: "boost",
    damageType: "Liberation",
    value: 0.25, // 25% 부스트
    uptime: "active",
    scope: "party",
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },

  // ── 공명체인 ──
  {
    label: "1체인 · 자기장의 포효 · 천둥의 폭발 피해",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1001502_1", "1001502_2"],
    value: 0.7, // 70% 증가
    uptime: "passive", // 조건이 없어 늘 걸린다
    scope: "self",
    resonanceChain: 1,
  },
  // 3체인은 「피해 배율이 55% 상승」 — 피해 보너스가 아니라 계수 자체가 커진다.
  // DamageList에도 39.56% 옆에 61.31%(= 39.56 × 1.55) 엔트리가 따로 들어 있어
  // 배율 상승이 맞다. 그래서 motionValue + amplify로 적는다.
  {
    label: "3체인 · 심판의 뇌전 배율 상승",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1001507_2"],
    value: 0.55, // 배율 55% 상승
    modifier: "amplify",
    uptime: "passive", // 조건이 없어 늘 걸린다
    scope: "self",
    resonanceChain: 3,
  },
  {
    label: "4체인 · 파티 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 4,
    condition: "심판의 뇌전 명중 시 12초간, 파티 전원",
  },
  {
    label: "5체인 · 파천의 뇌격 피해",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1001503_1"],
    value: 1, // 100% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 5,
    condition: "「죄악의 표식」 또는 「징벌의 인장」이 붙은 목표를 명중했을 때",
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   2체인 「뒤얽힌 포로」  자기장의 폭발 명중 시 「심판 게이지」 5pt · 공명 에너지 5pt 회복
//   6체인 「정의의 이행」  파천의 뇌격 후 30초간 일반 공격 명중 시 「불길 같은 분노」가
//                        공격력 419.59%의 전도 피해(공명 스킬 판정, 단마다 1회 · 최대 4회)
//                        — 공격이 새로 생기는 형태라 속성표에 없다
//   고유 「요리의 달인」   요리 확률 효과

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive1504,
  passive1505,
  passive1508,
  passive1509,
  passive1510,
];

export const yinlin: Character = {
  id: "yinlin",
  name: "음림",
  level: 90,
  element: "Electro",
  weaponType: "Rectifier",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id(1302)가 아니라 별도 번호(17)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_17.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_17_UI.webp",
  echoIds: [],
};
