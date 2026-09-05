import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";
import { emptyStats } from "../../types/stats";

/**
 * 복링 (Id 1307, 5성, 전도, 증폭기)
 * 출처: encore.moe API v2 (api/characters/1307.json)
 * 작성 절차: docs/character-workflow.md
 *
 * 치료 담당이라 피해 배율이 적다. 강공격 넷 중 둘(간위산 · 진위뢰)은
 * 속성표에 치료량만 있고 피해 배율이 없어 공격으로 담지 않았다.
 *
 * hits는 SkillAttributes의 *N 표기로 히트 개수를 잡고 레벨 1~10 값을 그대로 옮겼다.
 *
 * 공명 모드가 없는 캐릭터라 resonanceModes는 생략한다(SkillBranches 비어 있음).
 * Properties의 GrowthValues 중 level 90 값 사용.
 */
/**
 * 스킬 트리(SkillTree) 노드 8개는 여기 넣지 않는다.
 *   공격력          1.80 + 1.80 + 4.20 + 4.20 = 12%
 *   치료 효과 보너스 1.80 + 1.80 + 4.20 + 4.20 = 12%
 * 치료 담당이라 속성 피해 노드 대신 치료 효과 노드가 붙는다.
 * 노드 하나하나가 src/data/characterNodes.json 에 있고, 켜고 끈 결과를
 * nodeStats()가 합산해 스탯에 얹는다. 전부 켜면 위 합계와 같은 값이 된다.
 */
const baseStats = {
  ...emptyStats(),
  hp: 10625,
  atk: 225,
  def: 1258.8866,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

// 기본 공격 — 강공격이 괘에 따라 넷으로 갈리는데 그중 둘(간위산 · 진위뢰)은
// 치료량만 있고 피해 배율이 없어 공격으로 담지 않았다.
const basicSkillAttacks: Attack[] = [
  {
    id: "1004301_1",
    name: "일반 공격 1단 피해",
    type: "Basic",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1043, 0.1128, 0.1214, 0.1334, 0.1419, 0.1517, 0.1654, 0.1791, 0.1928, 0.2073],
      [0.1043, 0.1128, 0.1214, 0.1334, 0.1419, 0.1517, 0.1654, 0.1791, 0.1928, 0.2073],
    ],
  },
  {
    id: "1004301_2",
    name: "일반 공격 2단 피해",
    type: "Basic",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1683, 0.1821, 0.1959, 0.2152, 0.229, 0.2449, 0.2669, 0.289, 0.3111, 0.3345],
      [0.1683, 0.1821, 0.1959, 0.2152, 0.229, 0.2449, 0.2669, 0.289, 0.3111, 0.3345],
    ],
  },
  {
    id: "1004301_3",
    name: "일반 공격 3단 피해",
    type: "Basic",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1183, 0.128, 0.1377, 0.1513, 0.161, 0.1721, 0.1876, 0.2031, 0.2187, 0.2351],
      [0.1183, 0.128, 0.1377, 0.1513, 0.161, 0.1721, 0.1876, 0.2031, 0.2187, 0.2351],
    ],
  },
  {
    id: "1004301_4",
    name: "일반 공격 4단 피해",
    type: "Basic",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.471, 0.5097, 0.5483, 0.6024, 0.641, 0.6854, 0.7472, 0.809, 0.8708, 0.9364],
    ],
  },
  {
    id: "1004301_5",
    name: "강공격 · 산뢰이(山雷颐) 피해",
    type: "Heavy",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.9, 0.9738, 1.0476, 1.151, 1.2248, 1.3096, 1.4277, 1.5458, 1.6639, 1.7893],
    ],
  },
  {
    id: "1004301_6",
    name: "강공격 · 뇌산소과(雷山小過) 피해",
    type: "Heavy",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.45, 0.4869, 0.5238, 0.5755, 0.6124, 0.6548, 0.7139, 0.7729, 0.832, 0.8947],
    ],
  },
  {
    id: "1004301_7",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.372, 0.4026, 0.4331, 0.4758, 0.5063, 0.5413, 0.5902, 0.639, 0.6878, 0.7396],
    ],
  },
  {
    id: "1004301_8",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1183, 0.128, 0.1377, 0.1513, 0.161, 0.1721, 0.1876, 0.2031, 0.2187, 0.2351],
      [0.1183, 0.128, 0.1377, 0.1513, 0.161, 0.1721, 0.1876, 0.2031, 0.2187, 0.2351],
    ],
  },
];

const basicSkill: Skill = {
  id: "1004301",
  category: "Basic",
  name: "괘상이 부르는 오뢰",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorMagic.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["10.43%*2", "11.28%*2", "12.14%*2", "13.34%*2", "14.19%*2", "15.17%*2", "16.54%*2", "17.91%*2", "19.28%*2", "20.73%*2", "22.44%*2", "24.15%*2", "25.86%*2", "27.57%*2", "29.28%*2", "30.99%*2", "32.70%*2", "34.41%*2", "36.12%*2", "37.83%*2"] },
    { attributeName: "2단 피해", description: "", values: ["16.83%*2", "18.21%*2", "19.59%*2", "21.52%*2", "22.90%*2", "24.49%*2", "26.69%*2", "28.90%*2", "31.11%*2", "33.45%*2", "36.21%*2", "38.97%*2", "41.73%*2", "44.49%*2", "47.25%*2", "50.01%*2", "52.77%*2", "55.53%*2", "58.29%*2", "61.05%*2"] },
    { attributeName: "3단 피해", description: "", values: ["11.83%*2", "12.80%*2", "13.77%*2", "15.13%*2", "16.10%*2", "17.21%*2", "18.76%*2", "20.31%*2", "21.87%*2", "23.51%*2", "25.45%*2", "27.39%*2", "29.33%*2", "31.27%*2", "33.21%*2", "35.15%*2", "37.09%*2", "39.03%*2", "40.97%*2", "42.91%*2"] },
    { attributeName: "4단 피해", description: "", values: ["47.10%", "50.97%", "54.83%", "60.24%", "64.10%", "68.54%", "74.72%", "80.90%", "87.08%", "93.64%", "101.37%", "109.09%", "116.82%", "124.54%", "132.27%", "139.99%", "147.72%", "155.44%", "163.16%", "170.89%"] },
    { attributeName: "공중 공격 피해", description: "", values: ["37.20%", "40.26%", "43.31%", "47.58%", "50.63%", "54.13%", "59.02%", "63.90%", "68.78%", "73.96%", "80.06%", "86.16%", "92.26%", "98.37%", "104.47%", "110.57%", "116.67%", "122.77%", "128.87%", "134.97%"] },
    { attributeName: "회피 반격 피해", description: "", values: ["11.83%*2", "12.80%*2", "13.77%*2", "15.13%*2", "16.10%*2", "17.21%*2", "18.76%*2", "20.31%*2", "21.87%*2", "23.51%*2", "25.45%*2", "27.39%*2", "29.33%*2", "31.27%*2", "33.21%*2", "35.15%*2", "37.09%*2", "39.03%*2", "40.97%*2", "42.91%*2"] },
    { attributeName: "강공격 · 산뢰이(山雷颐) 피해", description: "", values: ["90.00%", "97.38%", "104.76%", "115.10%", "122.48%", "130.96%", "142.77%", "154.58%", "166.39%", "178.93%", "193.69%", "208.45%", "223.21%", "237.97%", "252.73%", "267.49%", "282.25%", "297.01%", "311.77%", "326.53%"] },
    { attributeName: "강공격 · 뇌산소과(雷山小過) 피해", description: "", values: ["45.00%", "48.69%", "52.38%", "57.55%", "61.24%", "65.48%", "71.39%", "77.29%", "83.20%", "89.47%", "96.85%", "104.23%", "111.61%", "118.99%", "126.37%", "133.75%", "141.13%", "148.51%", "155.89%", "163.27%"] },
    { attributeName: "강공격 · 간위산(艮爲山) 치료량", description: "", values: ["360+68.00%", "390+73.58%", "420+79.16%", "461+86.96%", "490+92.54%", "524+98.95%", "572+107.87%", "619+116.79%", "666+125.72%", "716+135.20%", "775+146.35%", "834+157.50%", "893+168.65%", "952+179.80%", "1011+190.96%", "1070+202.11%", "1129+213.26%", "1189+224.41%", "1248+235.56%", "1307+246.72%"] },
    { attributeName: "강공격 · 진위뢰(震為雷) 치료량", description: "", values: ["85+9.20%", "92+9.96%", "99+10.71%", "109+11.77%", "116+12.52%", "124+13.39%", "135+14.60%", "146+15.81%", "158+17.01%", "169+18.30%", "183+19.80%", "197+21.31%", "211+22.82%", "225+24.33%", "239+25.84%", "253+27.35%", "267+28.86%", "281+30.37%", "295+31.87%", "309+33.38%"] },
    { attributeName: "강공격 · 산뢰이(山雷颐) 스태미나 소모", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "강공격 · 뇌산소과(雷山小過) 스태미나 소모", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "강공격 · 간위산(艮爲山) 스태미나 소모", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "강공격 · 진위뢰(震為雷) 스태미나 소모", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "강공격 · 산뢰이(山雷颐)로 회복하는 협주 에너지", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "강공격 · 뇌산소과(雷山小過)로 회복하는 협주 에너지", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "강공격 · 간위산(艮爲山)으로 회복하는 협주 에너지", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "강공격 · 진위뢰(震為雷)로 회복하는 협주 에너지", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "강공격 · 귀문점괘(鬼門占卦) 스태미나 소모", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 공명 스킬
const resonanceSkillAttacks: Attack[] = [
  {
    id: "1004302_1",
    name: "천둥 부적 피해",
    type: "Skill",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2937, 0.3178, 0.3419, 0.3756, 0.3997, 0.4274, 0.4659, 0.5045, 0.543, 0.584],
    ],
  },
  {
    id: "1004302_2",
    name: "끌어당기기 지속 피해",
    type: "Skill",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.0294, 0.0318, 0.0342, 0.0376, 0.04, 0.0428, 0.0466, 0.0505, 0.0543, 0.0584],
      [0.0294, 0.0318, 0.0342, 0.0376, 0.04, 0.0428, 0.0466, 0.0505, 0.0543, 0.0584],
      [0.0294, 0.0318, 0.0342, 0.0376, 0.04, 0.0428, 0.0466, 0.0505, 0.0543, 0.0584],
      [0.0294, 0.0318, 0.0342, 0.0376, 0.04, 0.0428, 0.0466, 0.0505, 0.0543, 0.0584],
      [0.0294, 0.0318, 0.0342, 0.0376, 0.04, 0.0428, 0.0466, 0.0505, 0.0543, 0.0584],
      [0.0294, 0.0318, 0.0342, 0.0376, 0.04, 0.0428, 0.0466, 0.0505, 0.0543, 0.0584],
      [0.0294, 0.0318, 0.0342, 0.0376, 0.04, 0.0428, 0.0466, 0.0505, 0.0543, 0.0584],
      [0.0294, 0.0318, 0.0342, 0.0376, 0.04, 0.0428, 0.0466, 0.0505, 0.0543, 0.0584],
      [0.0294, 0.0318, 0.0342, 0.0376, 0.04, 0.0428, 0.0466, 0.0505, 0.0543, 0.0584],
      [0.0294, 0.0318, 0.0342, 0.0376, 0.04, 0.0428, 0.0466, 0.0505, 0.0543, 0.0584],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1004302",
  category: "Skill",
  name: "그림자에 숨은 오뢰",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBuling/SP_IconBulingB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "천둥 부적 피해", description: "", values: ["29.37%", "31.78%", "34.19%", "37.56%", "39.97%", "42.74%", "46.59%", "50.45%", "54.30%", "58.40%", "63.21%", "68.03%", "72.85%", "77.66%", "82.48%", "87.30%", "92.11%", "96.93%", "101.75%", "106.56%"] },
    { attributeName: "끌어당기기 지속 피해", description: "", values: ["2.94%*10", "3.18%*10", "3.42%*10", "3.76%*10", "4.00%*10", "4.28%*10", "4.66%*10", "5.05%*10", "5.43%*10", "5.84%*10", "6.33%*10", "6.81%*10", "7.29%*10", "7.77%*10", "8.25%*10", "8.73%*10", "9.22%*10", "9.70%*10", "10.18%*10", "10.66%*10"] },
    { attributeName: "쿨타임", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["23", "23", "23", "23", "23", "23", "23", "23", "23", "23", "23", "23", "23", "23", "23", "23", "23", "23", "23", "23"] },
  ],
};

// 공명 해방
const liberationSkillAttacks: Attack[] = [
  {
    id: "1004303_1",
    name: "비뢰결 피해",
    type: "Liberation",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.8, 1.9476, 2.0952, 2.3019, 2.4495, 2.6192, 2.8554, 3.0915, 3.3277, 3.5786],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1004303",
  category: "Liberation",
  name: "비뢰결",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBuling/SP_IconBulingC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "비뢰결 피해", description: "", values: ["180.00%", "194.76%", "209.52%", "230.19%", "244.95%", "261.92%", "285.54%", "309.15%", "332.77%", "357.86%", "387.38%", "416.90%", "446.42%", "475.94%", "505.46%", "534.98%", "564.50%", "594.02%", "623.54%", "653.06%"] },
    { attributeName: "쿨타임", description: "", values: ["24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150", "150"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 변주 스킬
const variationSkillAttacks: Attack[] = [
  {
    id: "1004306_1",
    name: "스킬 피해",
    type: "Variation",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.6594, 0.7135, 0.7676, 0.8433, 0.8974, 0.9595, 1.0461, 1.1326, 1.2191, 1.311],
    ],
  },
];

const variationSkill: Skill = {
  id: "1004306",
  category: "Variation",
  name: "귀신의 심판",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBuling/SP_IconBulingQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["65.94%", "71.35%", "76.76%", "84.33%", "89.74%", "95.95%", "104.61%", "113.26%", "121.91%", "131.10%", "141.91%", "152.73%", "163.54%", "174.36%", "185.17%", "195.99%", "206.80%", "217.61%", "228.43%", "239.24%"] },
    { attributeName: "스킬 치료량", description: "", values: ["350+40.00%", "379+43.28%", "408+46.56%", "448+51.16%", "477+54.44%", "510+58.21%", "556+63.46%", "602+68.70%", "648+73.95%", "696+79.53%", "754+86.09%", "811+92.65%", "869+99.21%", "926+105.77%", "983+112.33%", "1041+118.89%", "1098+125.45%", "1156+132.01%", "1213+138.57%", "1270+145.13%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};

// 공명 회로 「음양상생」 — 해방이 「비뢰결 · 귀일」로 대체되고
// 그 자리에 「오뢰 퇴마진」이 깔려 2초마다 지속 피해를 넣는다. 둘 다 공명 해방 판정이다.
const circuitSkillAttacks: Attack[] = [
  {
    id: "1004307_1",
    name: "비뢰결 · 귀일(歸一) 피해",
    type: "Liberation",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [2.7, 2.9214, 3.1428, 3.4528, 3.6742, 3.9288, 4.2831, 4.6373, 4.9915, 5.3679],
    ],
  },
  {
    id: "1004307_2",
    name: "오뢰 퇴마진 지속 피해",
    type: "Liberation",
    element: "Electro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1, 0.1082, 0.1164, 0.1279, 0.1361, 0.1456, 0.1587, 0.1718, 0.1849, 0.1989],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1004307",
  category: "Circuit",
  name: "오뢰의 기운, 만물의 근원",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBuling/SP_IconBulingC2.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "비뢰결 · 귀일(歸一) 피해", description: "", values: ["270.00%", "292.14%", "314.28%", "345.28%", "367.42%", "392.88%", "428.31%", "463.73%", "499.15%", "536.79%", "581.07%", "625.35%", "669.63%", "713.91%", "758.19%", "802.47%", "846.75%", "891.03%", "935.31%", "979.59%"] },
    { attributeName: "오뢰 퇴마진 지속 피해", description: "", values: ["10.00%", "10.82%", "11.64%", "12.79%", "13.61%", "14.56%", "15.87%", "17.18%", "18.49%", "19.89%", "21.53%", "23.17%", "24.81%", "26.45%", "28.09%", "29.73%", "31.37%", "33.01%", "34.65%", "36.29%"] },
  ],
};
const passive4304: Skill = {
  id: "1004304",
  category: "Passive",
  name: "길시가 되었으니, 액운은 물러가라!",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBuling/SP_IconBulingD1.webp",
  attacks: [],
};

const passive4305: Skill = {
  id: "1004305",
  category: "Passive",
  name: "내가 바로 <ano=지상선>땅 위의 신선</ano>이다",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBuling/SP_IconBulingD2.webp",
  attacks: [],
};

const passive4308: Skill = {
  id: "1004308",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld4.webp",
  attacks: [],
};

const passive4309: Skill = {
  id: "1004309",
  category: "Intro",
  name: "삿된 것을 몰아내라!",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBuling/SP_IconBulingT.webp",
  attacks: [],
};

const passive4310: Skill = {
  id: "1004310",
  category: "Sync",
  name: "조화도 파괴 · 증폭기",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakMagic.webp",
  attacks: [],
};
/**
 * 반주 스킬과 공명 회로 · 공명체인을 계산 가능한 버프로 옮긴 것.
 * 복링은 서포터라 옮겨지는 항목이 적고 대신 파티 버프가 중심이다.
 * 「뇌법」은 파티가 변주 스킬을 쓸 때마다 단계가 올라가는 상태라
 * 동시에 성립하지 않으므로 exclusiveGroup으로 묶어 하나만 켜지게 했다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 반주 스킬 「삿된 것을 몰아내라!」 ──
  {
    label: "삿된 것을 몰아내라! · 파티 전체 피해 부스트",
    target: "boost",
    damageType: "All",
    value: 0.15, // 15% 부스트
    uptime: "active",
    scope: "party", // 근처 파티 전원에게 걸린다
    condition: "반주 스킬 발동 후 30초간, 파티 전원",
  },

  // ── 공명 회로 「뇌법」 단계 ──
  {
    label: "뇌법 · 음양의 조화 (파티 공명 스킬 피해 보너스)",
    target: "damageBonus",
    damageType: "Skill",
    value: 0.1, // 10% 증가
    uptime: "active",
    scope: "party",
    exclusiveGroup: "bochi-noebeop",
    condition: "「오뢰 퇴마진」 중 파티가 변주 스킬을 1회 쓴 단계. 아래 단계와 하나만 켠다",
  },
  {
    label: "뇌법 · 천지인 합일 (파티 공명 스킬 피해 보너스)",
    target: "damageBonus",
    damageType: "Skill",
    value: 0.25, // 25% 증가
    uptime: "active",
    scope: "party",
    exclusiveGroup: "bochi-noebeop",
    condition: "파티가 변주 스킬을 2회 쓴 단계. 6체인이 있으면 아래 50% 쪽을 켠다",
  },
  {
    label: "6체인 · 뇌법 · 천지인 합일 (파티 공명 스킬 피해 보너스)",
    target: "damageBonus",
    damageType: "Skill",
    value: 0.5, // 25% -> 50%로 커진다
    uptime: "active",
    scope: "party",
    exclusiveGroup: "bochi-noebeop",
    resonanceChain: 6,
    condition: "6체인 보유 + 천지인 합일 단계. 위 25% 대신 켠다",
  },

  // ── 공명체인 ──
  {
    label: "1체인 · 비뢰결 · 귀일 크리티컬",
    target: "critRate",
    damageType: "All",
    attackIds: ["1004307_1"],
    value: 0.2, // 20% 증가
    uptime: "passive", // 귀일이 나가면 늘 붙는다
    scope: "self",
    resonanceChain: 1,
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   고유 「길시가 되었으니, 액운은 물러가라!」 HP 50% 미만 대상 치료 효과 보너스 25% 증가
//   고유 「내가 바로 땅 위의 신선이다」 변주 스킬 피해 시 「전자 효과」 4스택 부여
//   2체인 「부적 써서, 귀신 잡고」 음양상생 진입 시 공명 에너지 25pt 회복
//   3체인 「신령 부려, 천기 보아」 오뢰 퇴마진 중 HP 50% 미만 파티원 즉시 회복
//   4체인 「솔라리스, 기운 모아」 치료 효과 보너스 20% 증가
//                              — 치료 보너스는 BuffTarget에 자리가 없다
//   5체인 「차단 계정, 새로 가입」 오뢰 퇴마진 생성 시 「전자 효과」 6스택 부여
//   반주 앞부분                 1초마다 공격력 18%의 HP 회복(16초)
//   강공격 간위산 · 진위뢰       치료량만 있고 피해 배율이 없다
//   고유 「요리의 달인」        요리 확률 효과

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive4304,
  passive4305,
  passive4308,
  passive4309,
  passive4310,
];

export const bochi: Character = {
  id: "bochi",
  name: "복링",
  level: 90,
  element: "Electro",
  weaponType: "Rectifier",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id(1307)가 아니라 별도 번호(58)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_58_UI.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_58_UI.webp",
  echoIds: [],
};
