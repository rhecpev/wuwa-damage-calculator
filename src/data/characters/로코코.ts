import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";
import { emptyStats } from "../../types/stats";

/**
 * 로코코 (Id 1606, 5성, 인멸, 권갑)
 * 출처: encore.moe API v2 (api/characters/1606.json)
 * 작성 절차: docs/character-workflow.md
 *
 * hits는 SkillAttributes의 *N 표기로 히트 개수를 잡고 레벨 1~10 값을 그대로 옮겼다.
 * "17.00%*2+51.00%"처럼 +로 이어진 것은 앞뒤가 서로 다른 값이라 각각 제 행을 갖는다.
 *
 * 판정이 강공격 쪽으로 몰려 있는 캐릭터다. 공명 해방도, 공명 회로의 3단 연계도
 * DamageList Type이 「강공격」이다 — 모션만 각각 해방과 일반 공격일 뿐이다.
 *
 * 공명 모드가 없는 캐릭터라 resonanceModes는 생략한다(SkillBranches 비어 있음).
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
  hp: 12250,
  atk: 375,
  def: 1197.7756,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

// 기본 공격 — 공중 공격 · 회피 반격은 모션만 따로고 판정은 일반 공격이다
const basicSkillAttacks: Attack[] = [
  {
    id: "1002701_1",
    name: "일반 공격 1단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3681, 0.3983, 0.4285, 0.4707, 0.5009, 0.5356, 0.5839, 0.6322, 0.6805, 0.7318],
    ],
  },
  {
    id: "1002701_2",
    name: "일반 공격 2단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1919, 0.2076, 0.2233, 0.2453, 0.2611, 0.2792, 0.3043, 0.3295, 0.3547, 0.3814],
      [0.1919, 0.2076, 0.2233, 0.2453, 0.2611, 0.2792, 0.3043, 0.3295, 0.3547, 0.3814],
      [0.1919, 0.2076, 0.2233, 0.2453, 0.2611, 0.2792, 0.3043, 0.3295, 0.3547, 0.3814],
    ],
  },
  {
    id: "1002701_3",
    name: "일반 공격 3단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.17, 0.184, 0.1979, 0.2174, 0.2314, 0.2474, 0.2697, 0.292, 0.3143, 0.338],
      [0.17, 0.184, 0.1979, 0.2174, 0.2314, 0.2474, 0.2697, 0.292, 0.3143, 0.338],
      [0.51, 0.5519, 0.5937, 0.6522, 0.6941, 0.7422, 0.8091, 0.876, 0.9429, 1.014],
    ],
  },
  {
    id: "1002701_4",
    name: "일반 공격 4단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.5241, 0.567, 0.61, 0.6702, 0.7131, 0.7626, 0.8313, 0.9001, 0.9688, 1.0419],
      [0.5241, 0.567, 0.61, 0.6702, 0.7131, 0.7626, 0.8313, 0.9001, 0.9688, 1.0419],
    ],
  },
  {
    id: "1002701_5",
    name: "강공격 피해",
    type: "Heavy",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.85, 0.9197, 0.9894, 1.087, 1.1567, 1.2369, 1.3484, 1.4599, 1.5714, 1.6899],
    ],
  },
  {
    id: "1002701_6",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.527, 0.5703, 0.6135, 0.674, 0.7172, 0.7669, 0.836, 0.9052, 0.9743, 1.0478],
    ],
  },
  {
    id: "1002701_7",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3466, 0.375, 0.4034, 0.4432, 0.4716, 0.5043, 0.5497, 0.5952, 0.6407, 0.689],
      [0.3466, 0.375, 0.4034, 0.4432, 0.4716, 0.5043, 0.5497, 0.5952, 0.6407, 0.689],
      [0.3466, 0.375, 0.4034, 0.4432, 0.4716, 0.5043, 0.5497, 0.5952, 0.6407, 0.689],
    ],
  },
];

const basicSkill: Skill = {
  id: "1002701",
  category: "Basic",
  name: "펠로, 천천히",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorFist.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["36.81%", "39.83%", "42.85%", "47.07%", "50.09%", "53.56%", "58.39%", "63.22%", "68.05%", "73.18%", "79.21%", "85.25%", "91.29%", "97.32%", "103.36%", "109.39%", "115.43%", "121.47%", "127.50%", "133.54%"] },
    { attributeName: "2단 피해", description: "", values: ["19.19%*3", "20.76%*3", "22.33%*3", "24.53%*3", "26.11%*3", "27.92%*3", "30.43%*3", "32.95%*3", "35.47%*3", "38.14%*3", "41.29%*3", "44.43%*3", "47.58%*3", "50.72%*3", "53.87%*3", "57.01%*3", "60.16%*3", "63.31%*3", "66.45%*3", "69.60%*3"] },
    { attributeName: "3단 피해", description: "", values: ["17.00%*2+51.00%", "18.40%*2+55.19%", "19.79%*2+59.37%", "21.74%*2+65.22%", "23.14%*2+69.41%", "24.74%*2+74.22%", "26.97%*2+80.91%", "29.20%*2+87.60%", "31.43%*2+94.29%", "33.80%*2+101.40%", "36.59%*2+109.76%", "39.38%*2+118.13%", "42.17%*2+126.49%", "44.95%*2+134.85%", "47.74%*2+143.22%", "50.53%*2+151.58%", "53.32%*2+159.95%", "56.11%*2+168.31%", "58.89%*2+176.67%", "61.68%*2+185.04%"] },
    { attributeName: "4단 피해", description: "", values: ["52.41%*2", "56.70%*2", "61.00%*2", "67.02%*2", "71.31%*2", "76.26%*2", "83.13%*2", "90.01%*2", "96.88%*2", "104.19%*2", "112.78%*2", "121.37%*2", "129.97%*2", "138.56%*2", "147.16%*2", "155.75%*2", "164.34%*2", "172.94%*2", "181.53%*2", "190.13%*2"] },
    { attributeName: "강공격 피해", description: "", values: ["85.00%", "91.97%", "98.94%", "108.70%", "115.67%", "123.69%", "134.84%", "145.99%", "157.14%", "168.99%", "182.93%", "196.87%", "210.81%", "224.75%", "238.69%", "252.63%", "266.57%", "280.51%", "294.45%", "308.39%"] },
    { attributeName: "공중 공격 피해", description: "", values: ["52.70%", "57.03%", "61.35%", "67.40%", "71.72%", "76.69%", "83.60%", "90.52%", "97.43%", "104.78%", "113.42%", "122.06%", "130.71%", "139.35%", "147.99%", "156.63%", "165.28%", "173.92%", "182.56%", "191.21%"] },
    { attributeName: "회피 반격 피해", description: "", values: ["34.66%*3", "37.50%*3", "40.34%*3", "44.32%*3", "47.16%*3", "50.43%*3", "54.97%*3", "59.52%*3", "64.07%*3", "68.90%*3", "74.58%*3", "80.26%*3", "85.94%*3", "91.63%*3", "97.31%*3", "102.99%*3", "108.68%*3", "114.36%*3", "120.04%*3", "125.72%*3"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "강공격 차지 시 스태미나 소모(초당)", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
  ],
};

// 공명 스킬
const resonanceSkillAttacks: Attack[] = [
  {
    id: "1002702_1",
    name: "스킬 피해",
    type: "Skill",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3092, 0.3346, 0.3599, 0.3954, 0.4207, 0.4499, 0.4905, 0.531, 0.5716, 0.6147],
      [0.3092, 0.3346, 0.3599, 0.3954, 0.4207, 0.4499, 0.4905, 0.531, 0.5716, 0.6147],
      [0.3092, 0.3346, 0.3599, 0.3954, 0.4207, 0.4499, 0.4905, 0.531, 0.5716, 0.6147],
      [0.3092, 0.3346, 0.3599, 0.3954, 0.4207, 0.4499, 0.4905, 0.531, 0.5716, 0.6147],
      [0.3092, 0.3346, 0.3599, 0.3954, 0.4207, 0.4499, 0.4905, 0.531, 0.5716, 0.6147],
      [0.3092, 0.3346, 0.3599, 0.3954, 0.4207, 0.4499, 0.4905, 0.531, 0.5716, 0.6147],
      [0.3092, 0.3346, 0.3599, 0.3954, 0.4207, 0.4499, 0.4905, 0.531, 0.5716, 0.6147],
      [0.3092, 0.3346, 0.3599, 0.3954, 0.4207, 0.4499, 0.4905, 0.531, 0.5716, 0.6147],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1002702",
  category: "Skill",
  name: "고난이도 설정",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuokeke/SP_IconLuokekeB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["30.92%*8", "33.46%*8", "35.99%*8", "39.54%*8", "42.07%*8", "44.99%*8", "49.05%*8", "53.10%*8", "57.16%*8", "61.47%*8", "66.54%*8", "71.61%*8", "76.68%*8", "81.75%*8", "86.82%*8", "91.89%*8", "96.96%*8", "102.03%*8", "107.10%*8", "112.17%*8"] },
    { attributeName: "쿨타임", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 공명 해방 — 발동은 해방인데 판정은 강공격이다(DamageList Type = 강공격).
const liberationSkillAttacks: Attack[] = [
  {
    id: "1002703_1",
    name: "스킬 피해",
    type: "Liberation",
    damageBonusType: "Heavy", // DamageList Type = 강공격
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.4, 1.5148, 1.6296, 1.7904, 1.9052, 2.0372, 2.2209, 2.4045, 2.5882, 2.7834],
      [1.4, 1.5148, 1.6296, 1.7904, 1.9052, 2.0372, 2.2209, 2.4045, 2.5882, 2.7834],
      [1.4, 1.5148, 1.6296, 1.7904, 1.9052, 2.0372, 2.2209, 2.4045, 2.5882, 2.7834],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1002703",
  category: "Liberation",
  name: "즉흥 공연, 시작",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuokeke/SP_IconLuokekeC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["140.00%*3", "151.48%*3", "162.96%*3", "179.04%*3", "190.52%*3", "203.72%*3", "222.09%*3", "240.45%*3", "258.82%*3", "278.34%*3", "301.30%*3", "324.26%*3", "347.22%*3", "370.18%*3", "393.14%*3", "416.10%*3", "439.06%*3", "462.02%*3", "484.98%*3", "507.94%*3"] },
    { attributeName: "쿨타임", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 변주 스킬
const variationSkillAttacks: Attack[] = [
  {
    id: "1002706_1",
    name: "스킬 피해",
    type: "Variation",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.85, 0.9197, 0.9894, 1.087, 1.1567, 1.2369, 1.3484, 1.4599, 1.5714, 1.6899],
    ],
  },
];

const variationSkill: Skill = {
  id: "1002706",
  category: "Variation",
  name: "펠로, 도와줘",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuokeke/SP_IconLuokekeQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["85.00%", "91.97%", "98.94%", "108.70%", "115.67%", "123.69%", "134.84%", "145.99%", "157.14%", "168.99%", "182.93%", "196.87%", "210.81%", "224.75%", "238.69%", "252.63%", "266.57%", "280.51%", "294.45%", "308.39%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};

// 공명 회로 「현실에 비추는 환상」 — 일반 공격으로 나가는 3단 연계인데
// 판정은 셋 다 강공격이다(DamageList Type = 강공격).
// 로코코는 해방까지 강공격 판정이라 강공격 피해 보너스가 크게 붙는다.
const circuitSkillAttacks: Attack[] = [
  {
    id: "1002707_1",
    name: "현실에 비추는 환상 1단 피해",
    type: "Basic",
    damageBonusType: "Heavy", // DamageList Type = 강공격
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.62, 1.7529, 1.8857, 2.0717, 2.2045, 2.3573, 2.5699, 2.7824, 2.9949, 3.2208],
    ],
  },
  {
    id: "1002707_2",
    name: "현실에 비추는 환상 2단 피해",
    type: "Basic",
    damageBonusType: "Heavy", // DamageList Type = 강공격
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.71, 1.8503, 1.9905, 2.1868, 2.327, 2.4883, 2.7126, 2.937, 3.1613, 3.3997],
    ],
  },
  {
    id: "1002707_3",
    name: "현실에 비추는 환상 3단 피해",
    type: "Basic",
    damageBonusType: "Heavy", // DamageList Type = 강공격
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.8, 1.9476, 2.0952, 2.3019, 2.4495, 2.6192, 2.8554, 3.0915, 3.3277, 3.5786],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1002707",
  category: "Circuit",
  name: "소품 담당자의 자체 수양",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuokeke/SP_IconLuokekeY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["162.00%", "175.29%", "188.57%", "207.17%", "220.45%", "235.73%", "256.99%", "278.24%", "299.49%", "322.08%", "348.65%", "375.21%", "401.78%", "428.35%", "454.92%", "481.49%", "508.05%", "534.62%", "561.19%", "587.76%"] },
    { attributeName: "2단 피해", description: "", values: ["171.00%", "185.03%", "199.05%", "218.68%", "232.70%", "248.83%", "271.26%", "293.70%", "316.13%", "339.97%", "368.01%", "396.06%", "424.10%", "452.15%", "480.19%", "508.23%", "536.28%", "564.32%", "592.37%", "620.41%"] },
    { attributeName: "3단 피해", description: "", values: ["180.00%", "194.76%", "209.52%", "230.19%", "244.95%", "261.92%", "285.54%", "309.15%", "332.77%", "357.86%", "387.38%", "416.90%", "446.42%", "475.94%", "505.46%", "534.98%", "564.50%", "594.02%", "623.54%", "653.06%"] },
    { attributeName: "1단으로 회복하는 협주 에너지", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "2단으로 회복하는 협주 에너지", description: "", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
    { attributeName: "3단으로 회복하는 협주 에너지", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
  ],
};
const passive2704: Skill = {
  id: "1002704",
  category: "Passive",
  name: "몰입형 공연",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuokeke/SP_IconLuokekeD2.webp",
  attacks: [],
};

const passive2705: Skill = {
  id: "1002705",
  category: "Passive",
  name: "끌리는 진기한 상자",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuokeke/SP_IconLuokekeD1.webp",
  attacks: [],
};

const passive2708: Skill = {
  id: "1002708",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld4.webp",
  attacks: [],
};

const passive2709: Skill = {
  id: "1002709",
  category: "Intro",
  name: "뜨거운 박수",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuokeke/SP_IconLuokekeT.webp",
  attacks: [],
};

const passive2710: Skill = {
  id: "1002710",
  category: "Sync",
  name: "조화도 파괴 · 권갑",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakFist.webp",
  attacks: [],
};

/**
 * 고유 스킬 · 반주 스킬 · 공명체인 6개를 계산 가능한 버프로 옮긴 것.
 * 상상력 · 중단 저항처럼 피해와 무관한 것은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 스킬에서 오는 것 (설명문에서 옮김) ──
  {
    label: "즉흥 공연, 시작 · 파티 공격력 (크리티컬 50% 초과분)",
    target: "atkFlat",
    damageType: "All",
    scaleFrom: "CritRate",
    value: 10,
    scaleOffset: 50,
    maxValue: 200,
    uptime: "active",
    scope: "party",
    condition: "해방 발동 후 30초간 파티 전원 — 초과 0.1%당 1pt(=1%당 10pt), 최대 200pt",
  },
  // ── 고유 스킬 ──
  {
    label: "몰입형 공연 · 공격력",
    inherentSkillId: "1002704",
    target: "atkPercent",
    damageType: "All",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "self",
    condition: "공명 스킬 또는 강공격 발동 후 12초간",
  },

  // ── 반주 스킬 「뜨거운 박수」 — 다음에 등장하는 캐릭터에게 걸린다 ──
  {
    label: "뜨거운 박수 · 인멸 피해 부스트",
    target: "boost",
    damageType: "Havoc",
    value: 0.2, // 20% 부스트
    uptime: "active",
    scope: "party",
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },
  {
    label: "뜨거운 박수 · 일반 공격 피해 부스트",
    target: "boost",
    damageType: "Basic",
    value: 0.25, // 25% 부스트
    uptime: "active",
    scope: "party",
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },

  // ── 공명체인 ──
  {
    label: "2체인 · 파티 인멸 피해 보너스",
    target: "damageBonus",
    damageType: "Havoc",
    value: 0.1, // 스택당 10% 증가
    stacks: 3, // 기본값 — 공격마다 몇 스택인지 따로 고를 수 있다
    maxStacks: 3,
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 2,
    condition: "현실에 비추는 환상 발동 시 1스택, 30초 지속",
  },
  {
    label: "2체인 · 파티 인멸 피해 보너스(3스택 달성 보너스)",
    target: "damageBonus",
    damageType: "Havoc",
    value: 0.1, // 최대 스택을 찍으면 추가로 10%
    uptime: "active",
    scope: "party",
    resonanceChain: 2,
    condition: "위 버프가 3스택에 도달했을 때만. 3스택이 아니면 끈다",
  },
  {
    label: "3체인 · 크리티컬",
    target: "critRate",
    damageType: "All",
    value: 0.1, // 10% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "변주 스킬 펠로, 도와줘 발동 후 15초간",
  },
  {
    label: "3체인 · 크리티컬 피해",
    target: "critDamage",
    damageType: "All",
    value: 0.3, // 30% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "변주 스킬 펠로, 도와줘 발동 후 15초간",
  },
  // 4체인 — DamageList에 162% 옆에 259.2%(= 162 × 1.6) 엔트리가 따로 들어 있다.
  {
    label: "4체인 · 현실에 비추는 환상 배율 상승",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1002707_1", "1002707_2", "1002707_3"],
    value: 0.6, // 배율 60% 상승
    modifier: "amplify",
    uptime: "active",
    scope: "self",
    resonanceChain: 4,
    condition: "공명 스킬 고난이도 설정 발동 후 12초간",
  },
  // 5체인은 배율이 오르는 대상이 둘로 갈린다.
  //   해방  — DamageList에 140% 옆에 168%(= 140 × 1.2)
  //   강공격 — DamageList에 85% 옆에 153%(= 85 × 1.8)
  // 회로의 3단 연계는 강공격 「판정」일 뿐 강공격 자체가 아니라서 여기 들어가지 않는다
  // (회로 쪽 DamageList는 4체인의 ×1.6만 붙어 있다).
  {
    label: "5체인 · 즉흥 공연, 시작 배율 상승",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1002703_1"],
    value: 0.2, // 배율 20% 상승
    modifier: "amplify",
    uptime: "passive", // 조건이 없어 늘 걸린다
    scope: "self",
    resonanceChain: 5,
  },
  {
    label: "5체인 · 강공격 배율 상승",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1002701_5"],
    value: 0.8, // 배율 80% 상승
    modifier: "amplify",
    uptime: "passive", // 조건이 없어 늘 걸린다
    scope: "self",
    resonanceChain: 5,
  },
  {
    label: "6체인 · 현실에 비추는 환상 방어력 무시",
    target: "defIgnore",
    damageType: "All",
    attackIds: ["1002707_1", "1002707_2", "1002707_3"],
    value: 0.6, // 목표 방어력 60% 무시
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "공명 해방 발동 후 12초간",
  },
  // 6체인의 「현실 구축」은 3단 피해량의 100%가 한 번 더 나가는 형태다(강공격 판정).
  // 새 공격을 만들 자리가 없어 3단에 100%를 얹는 것으로 대신한다 — 총량은 같다.
  // DamageList에도 180%(= 3단과 같은 값) 엔트리가 따로 들어 있다.
  {
    label: "6체인 · 현실 구축 추가 타격",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1002707_3"],
    value: 1, // 3단 피해량의 100%가 한 번 더
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "해방 후 12초 내, 3단 착지 뒤 비약의 환상에서 일반 공격을 눌렀을 때",
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   고유 「끌리는 진기한 상자」 반주 후 다음 캐릭터의 탐색 도구가 「진기한 상자」로 바뀌고
//                            총 100pt의 인멸 피해 — 탐색 도구 피해라 배율이 아니다
//   1체인 「선실로 몰려오는 캄캄한 어둠」 「상상력」 100pt · 협주 에너지 10pt 회복, 중단 저항
//   고유 「요리의 달인」      요리 확률 효과

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive2704,
  passive2705,
  passive2708,
  passive2709,
  passive2710,
];

export const roccia: Character = {
  id: "roccia",
  name: "로코코",
  level: 90,
  element: "Havoc",
  weaponType: "Gauntlets",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id(1606)가 아니라 별도 번호(33)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_33_UI.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_33_UI.webp",
  echoIds: [],
};
