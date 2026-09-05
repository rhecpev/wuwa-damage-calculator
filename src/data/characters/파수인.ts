import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";
import { emptyStats } from "../../types/stats";

/**
 * 파수인 (Id 1505, 5성, 회절, 증폭기)
 * 출처: encore.moe API v2 (api/characters/1505.json)
 * 작성 절차: docs/character-workflow.md
 *
 * 치료 담당이라 피해 배율이 적고, 배율 기준도 갈린다.
 * 변주 스킬 통찰만 HP 배율이고(DamageList PropertyName = HP) 나머지는 공격력 배율이다.
 * 공명 해방은 별의 영역을 펼치기만 해서 피해 배율이 아예 없다.
 *
 * hits는 SkillAttributes의 *N 표기로 히트 개수를 잡고 레벨 1~10 값을 그대로 옮겼다.
 * 치료량(660+3.00% 같은 꼴)은 피해가 아니라 회복 수치라 attributes에만 남겨둔다.
 *
 * 공명 모드가 없는 캐릭터라 resonanceModes는 생략한다(SkillBranches 비어 있음).
 * Properties의 GrowthValues 중 level 90 값 사용.
 */
/**
 * 스킬 트리(SkillTree) 노드 8개는 여기 넣지 않는다.
 *   HP             1.80 + 1.80 + 4.20 + 4.20 = 12%
 *   치료 효과 보너스 1.80 + 1.80 + 4.20 + 4.20 = 12%
 * 치료 담당이라 공격력 노드 대신 HP · 치료 효과 노드가 붙는다.
 * 노드 하나하나가 src/data/characterNodes.json 에 있고, 켜고 끈 결과를
 * nodeStats()가 합산해 스탯에 얹는다. 전부 켜면 위 합계와 같은 값이 된다.
 */
const baseStats = {
  ...emptyStats(),
  hp: 16712.5,
  atk: 287.5,
  def: 1099.998,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

// 기본 공격 — 낙하 공격 · 회피 반격은 모션만 따로고 판정은 일반 공격이다
const basicSkillAttacks: Attack[] = [
  {
    id: "1002501_1",
    name: "일반 공격 1단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1599, 0.173, 0.1861, 0.2045, 0.2176, 0.2326, 0.2536, 0.2746, 0.2955, 0.3178],
    ],
  },
  {
    id: "1002501_2",
    name: "일반 공격 2단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.12, 0.1299, 0.1397, 0.1535, 0.1633, 0.1747, 0.1904, 0.2061, 0.2219, 0.2386],
      [0.12, 0.1299, 0.1397, 0.1535, 0.1633, 0.1747, 0.1904, 0.2061, 0.2219, 0.2386],
    ],
  },
  {
    id: "1002501_3",
    name: "일반 공격 3단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1173, 0.1269, 0.1366, 0.15, 0.1596, 0.1707, 0.1861, 0.2015, 0.2169, 0.2332],
      [0.1173, 0.1269, 0.1366, 0.15, 0.1596, 0.1707, 0.1861, 0.2015, 0.2169, 0.2332],
      [0.1173, 0.1269, 0.1366, 0.15, 0.1596, 0.1707, 0.1861, 0.2015, 0.2169, 0.2332],
    ],
  },
  {
    id: "1002501_4",
    name: "일반 공격 4단 피해",
    type: "Basic",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3658, 0.3958, 0.4258, 0.4678, 0.4978, 0.5323, 0.5803, 0.6282, 0.6762, 0.7272],
    ],
  },
  {
    id: "1002501_5",
    name: "강공격 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2304, 0.2493, 0.2682, 0.2947, 0.3136, 0.3353, 0.3655, 0.3958, 0.426, 0.4581],
    ],
  },
  {
    id: "1002501_6",
    name: "낙하 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.372, 0.4026, 0.4331, 0.4758, 0.5063, 0.5413, 0.5902, 0.639, 0.6878, 0.7396],
    ],
  },
  {
    id: "1002501_7",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.44, 0.4761, 0.5122, 0.5627, 0.5988, 0.6403, 0.698, 0.7557, 0.8135, 0.8748],
      [0.44, 0.4761, 0.5122, 0.5627, 0.5988, 0.6403, 0.698, 0.7557, 0.8135, 0.8748],
    ],
  },
];

const basicSkill: Skill = {
  id: "1002501",
  category: "Basic",
  name: "근원의 추구",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorMagic.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "일반 공격 1단 피해", description: "", values: ["15.99%", "17.30%", "18.61%", "20.45%", "21.76%", "23.26%", "25.36%", "27.46%", "29.55%", "31.78%", "34.40%", "37.03%", "39.65%", "42.27%", "44.89%", "47.51%", "50.13%", "52.75%", "55.38%", "58.00%"] },
    { attributeName: "일반 공격 2단 피해", description: "", values: ["12.00%*2", "12.99%*2", "13.97%*2", "15.35%*2", "16.33%*2", "17.47%*2", "19.04%*2", "20.61%*2", "22.19%*2", "23.86%*2", "25.83%*2", "27.80%*2", "29.77%*2", "31.73%*2", "33.70%*2", "35.67%*2", "37.64%*2", "39.61%*2", "41.57%*2", "43.54%*2"] },
    { attributeName: "일반 공격 3단 피해", description: "", values: ["11.73%*3", "12.69%*3", "13.66%*3", "15.00%*3", "15.96%*3", "17.07%*3", "18.61%*3", "20.15%*3", "21.69%*3", "23.32%*3", "25.24%*3", "27.17%*3", "29.09%*3", "31.02%*3", "32.94%*3", "34.86%*3", "36.79%*3", "38.71%*3", "40.63%*3", "42.56%*3"] },
    { attributeName: "일반 공격 4단 피해", description: "", values: ["36.58%", "39.58%", "42.58%", "46.78%", "49.78%", "53.23%", "58.03%", "62.82%", "67.62%", "72.72%", "78.72%", "84.72%", "90.72%", "96.72%", "102.71%", "108.71%", "114.71%", "120.71%", "126.71%", "132.71%"] },
    { attributeName: "강공격 피해", description: "", values: ["23.04%", "24.93%", "26.82%", "29.47%", "31.36%", "33.53%", "36.55%", "39.58%", "42.60%", "45.81%", "49.59%", "53.37%", "57.15%", "60.93%", "64.70%", "68.48%", "72.26%", "76.04%", "79.82%", "83.60%"] },
    { attributeName: "낙하 공격 피해", description: "", values: ["37.20%", "40.26%", "43.31%", "47.58%", "50.63%", "54.13%", "59.02%", "63.90%", "68.78%", "73.96%", "80.06%", "86.16%", "92.26%", "98.37%", "104.47%", "110.57%", "116.67%", "122.77%", "128.87%", "134.97%"] },
    { attributeName: "회피 반격 피해", description: "", values: ["44.00%*2", "47.61%*2", "51.22%*2", "56.27%*2", "59.88%*2", "64.03%*2", "69.80%*2", "75.57%*2", "81.35%*2", "87.48%*2", "94.70%*2", "101.91%*2", "109.13%*2", "116.35%*2", "123.56%*2", "130.78%*2", "137.99%*2", "145.21%*2", "152.43%*2", "159.64%*2"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "낙하 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
  ],
};

// 공명 스킬 — 나비를 소환해 때린다. 치료량은 피해가 아니라 attributes에만 둔다.
const resonanceSkillAttacks: Attack[] = [
  {
    id: "1002502_1",
    name: "어두운 별 · 나비 피해",
    type: "Skill",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1575, 0.1704, 0.1833, 0.2014, 0.2143, 0.2291, 0.2498, 0.2705, 0.2911, 0.3131],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1002502",
  category: "Skill",
  name: "혼돈의 이론",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconShouanren/SP_IconShouanrenB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "어두운 별 · 나비 피해", description: "", values: ["15.75%", "17.04%", "18.33%", "20.14%", "21.43%", "22.91%", "24.98%", "27.05%", "29.11%", "31.31%", "33.89%", "36.47%", "39.05%", "41.63%", "44.22%", "46.80%", "49.38%", "51.96%", "54.54%", "57.13%"] },
    { attributeName: "치료량", description: "", values: ["660+3.00%", "715+3.25%", "769+3.50%", "845+3.84%", "899+4.09%", "961+4.37%", "1047+4.76%", "1134+5.16%", "1221+5.55%", "1313+5.97%", "1421+6.46%", "1529+6.95%", "1637+7.45%", "1746+7.94%", "1854+8.43%", "1962+8.92%", "2070+9.41%", "2179+9.91%", "2287+10.40%", "2395+10.89%"] },
    { attributeName: "쿨타임", description: "", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 공명 해방 — 별의 영역을 펼치는 스킬이라 피해 배율이 아예 없다.
// SkillAttributes에 치료량 · 지속 시간만 있어 공격은 비워둔다.
const liberationSkill: Skill = {
  id: "1002503",
  category: "Liberation",
  name: "결말의 순환",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconShouanren/SP_IconShouanrenC1.webp",
  attacks: [],
  attributes: [
    { attributeName: "치료량", description: "", values: ["220+1.20%", "239+1.30%", "257+1.40%", "282+1.54%", "300+1.64%", "321+1.75%", "349+1.91%", "378+2.07%", "407+2.22%", "438+2.39%", "474+2.59%", "510+2.78%", "546+2.98%", "582+3.18%", "618+3.37%", "654+3.57%", "690+3.77%", "727+3.97%", "763+4.16%", "799+4.36%"] },
    { attributeName: "별의 영역 지속 시간", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "쿨타임", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 변주 스킬 — 계발과 통찰이 서로 다르다.
// 계발은 공격력 배율 · 공명 스킬 판정, 통찰은 HP 배율 · 공명 해방 판정이다.
const variationSkillAttacks: Attack[] = [
  {
    id: "1002506_1",
    name: "계발 피해",
    type: "Variation",
    damageBonusType: "Skill", // DamageList Type = 공명 스킬
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2279, 0.2466, 0.2653, 0.2914, 0.3101, 0.3316, 0.3615, 0.3914, 0.4213, 0.453],
      [0.2279, 0.2466, 0.2653, 0.2914, 0.3101, 0.3316, 0.3615, 0.3914, 0.4213, 0.453],
      [0.2279, 0.2466, 0.2653, 0.2914, 0.3101, 0.3316, 0.3615, 0.3914, 0.4213, 0.453],
      [0.2279, 0.2466, 0.2653, 0.2914, 0.3101, 0.3316, 0.3615, 0.3914, 0.4213, 0.453],
      [0.2279, 0.2466, 0.2653, 0.2914, 0.3101, 0.3316, 0.3615, 0.3914, 0.4213, 0.453],
    ],
  },
  {
    id: "1002506_2",
    name: "통찰 피해",
    type: "Variation",
    damageBonusType: "Liberation", // DamageList Type = 공명 해방
    element: "Spectro",
    scalingStat: "HP",
    skillLevel: 10,
    hits: [
      [0.0988, 0.1069, 0.115, 0.1264, 0.1345, 0.1438, 0.1567, 0.1697, 0.1826, 0.1964],
      [0.0988, 0.1069, 0.115, 0.1264, 0.1345, 0.1438, 0.1567, 0.1697, 0.1826, 0.1964],
      [0.0988, 0.1069, 0.115, 0.1264, 0.1345, 0.1438, 0.1567, 0.1697, 0.1826, 0.1964],
    ],
  },
];

const variationSkill: Skill = {
  id: "1002506",
  category: "Variation",
  name: "진실된 증명",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconShouanren/SP_IconShouanrenQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "계발 피해", description: "", values: ["22.79%*5", "24.66%*5", "26.53%*5", "29.14%*5", "31.01%*5", "33.16%*5", "36.15%*5", "39.14%*5", "42.13%*5", "45.30%*5", "49.04%*5", "52.78%*5", "56.51%*5", "60.25%*5", "63.98%*5", "67.72%*5", "71.46%*5", "75.19%*5", "78.93%*5", "82.67%*5"] },
    { attributeName: "통찰 피해", description: "", values: ["9.88%*3", "10.69%*3", "11.50%*3", "12.64%*3", "13.45%*3", "14.38%*3", "15.67%*3", "16.97%*3", "18.26%*3", "19.64%*3", "21.26%*3", "22.88%*3", "24.50%*3", "26.12%*3", "27.74%*3", "29.36%*3", "30.98%*3", "32.60%*3", "34.22%*3", "35.84%*3"] },
    { attributeName: "계발 치료량", description: "", values: ["130+0.60%", "141+0.65%", "152+0.70%", "167+0.77%", "177+0.82%", "190+0.88%", "207+0.96%", "224+1.04%", "241+1.11%", "259+1.20%", "280+1.30%", "302+1.39%", "323+1.49%", "344+1.59%", "366+1.69%", "387+1.79%", "408+1.89%", "430+1.99%", "451+2.08%", "472+2.18%"] },
    { attributeName: "통찰 치료량", description: "", values: ["145+0.66%", "157+0.72%", "169+0.77%", "186+0.85%", "198+0.90%", "211+0.97%", "231+1.05%", "250+1.14%", "269+1.23%", "289+1.32%", "313+1.43%", "336+1.53%", "360+1.64%", "384+1.75%", "408+1.86%", "431+1.97%", "455+2.07%", "479+2.18%", "503+2.29%", "527+2.40%"] },
    { attributeName: "계발로 회복하는 협주 에너지", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "통찰로 회복하는 협주 에너지", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 공명 회로 「뭇별의 울림」 — 판정이 셋으로 갈린다(DamageList Type 기준).
// 빛나는 별 · 나비와 진화는 일반 공격, 연역만 강공격이다.
const circuitSkillAttacks: Attack[] = [
  {
    id: "1002507_1",
    name: "빛나는 별 · 나비 피해",
    type: "Skill",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1876, 0.2029, 0.2183, 0.2399, 0.2552, 0.2729, 0.2975, 0.3221, 0.3467, 0.3729],
    ],
  },
  {
    id: "1002507_2",
    name: "연역 피해",
    type: "Heavy",
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.0954, 0.1033, 0.1111, 0.122, 0.1299, 0.1389, 0.1514, 0.1639, 0.1764, 0.1897],
      [0.0954, 0.1033, 0.1111, 0.122, 0.1299, 0.1389, 0.1514, 0.1639, 0.1764, 0.1897],
      [0.0954, 0.1033, 0.1111, 0.122, 0.1299, 0.1389, 0.1514, 0.1639, 0.1764, 0.1897],
      [0.0954, 0.1033, 0.1111, 0.122, 0.1299, 0.1389, 0.1514, 0.1639, 0.1764, 0.1897],
      [0.0954, 0.1033, 0.1111, 0.122, 0.1299, 0.1389, 0.1514, 0.1639, 0.1764, 0.1897],
    ],
  },
  {
    id: "1002507_3",
    name: "진화 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Spectro",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.372, 0.4026, 0.4331, 0.4758, 0.5063, 0.5413, 0.5902, 0.639, 0.6878, 0.7396],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1002507",
  category: "Circuit",
  name: "뭇별의 울림",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconShouanren/SP_IconShouanrenY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "빛나는 별 · 나비 피해", description: "", values: ["18.76%", "20.29%", "21.83%", "23.99%", "25.52%", "27.29%", "29.75%", "32.21%", "34.67%", "37.29%", "40.36%", "43.44%", "46.51%", "49.59%", "52.66%", "55.74%", "58.81%", "61.89%", "64.96%", "68.04%"] },
    { attributeName: "연역 피해", description: "", values: ["9.54%*5", "10.33%*5", "11.11%*5", "12.20%*5", "12.99%*5", "13.89%*5", "15.14%*5", "16.39%*5", "17.64%*5", "18.97%*5", "20.54%*5", "22.10%*5", "23.67%*5", "25.23%*5", "26.79%*5", "28.36%*5", "29.92%*5", "31.49%*5", "33.05%*5", "34.62%*5"] },
    { attributeName: "진화 피해", description: "", values: ["37.20%", "40.26%", "43.31%", "47.58%", "50.63%", "54.13%", "59.02%", "63.90%", "68.78%", "73.96%", "80.06%", "86.16%", "92.26%", "98.37%", "104.47%", "110.57%", "116.67%", "122.77%", "128.87%", "134.97%"] },
    { attributeName: "연역 스태미나 소모", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "진화 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "연역으로 회복하는 협주 에너지", description: "", values: ["6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6"] },
    { attributeName: "진화로 회복하는 협주 에너지", description: "", values: ["6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6", "6"] },
  ],
};
const passive2504: Skill = {
  id: "1002504",
  category: "Passive",
  name: "흐르는 생사",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconShouanren/SP_IconShouanrenD1.webp",
  attacks: [],
};

const passive2505: Skill = {
  id: "1002505",
  category: "Passive",
  name: "자아의 이끌림",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconShouanren/SP_IconShouanrenD2.webp",
  attacks: [],
};

const passive2508: Skill = {
  id: "1002508",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld3.webp",
  attacks: [],
};

const passive2509: Skill = {
  id: "1002509",
  category: "Intro",
  name: "합쳐진 별",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconShouanren/SP_IconShouanrenT.webp",
  attacks: [],
};

const passive2510: Skill = {
  id: "1002510",
  category: "Sync",
  name: "조화도 파괴 · 증폭기",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakMagic.webp",
  attacks: [],
};

/**
 * 반주 스킬과 공명체인을 계산 가능한 버프로 옮긴 것.
 * 치료 · 부활 · 공명 효율처럼 피해식에 자리가 없는 것은 아래 「미반영」에 적어둔다.
 * 파수인은 서포터라 옮겨지는 항목이 적고, 대신 파티 버프의 비중이 크다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 반주 스킬 「합쳐진 별」 — 파티 전원에게 걸린다 ──
  {
    label: "합쳐진 별 · 전체 피해 부스트",
    target: "boost",
    damageType: "All",
    value: 0.15, // 15% 부스트
    uptime: "active",
    scope: "party",
    condition: "반주 스킬 발동 후 최대 30초간, 파티 전원",
  },

  // ── 공명체인 ──
  {
    label: "2체인 · 별의 영역 파티 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.4, // 40% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 2,
    condition: "별의 영역 · 표층 범위 안에 있는 동안, 파티 전원",
  },
  // 6체인 — DamageList에 9.88% 옆에 14.03%(= 9.88 × 1.42) 엔트리가 따로 들어 있다.
  {
    label: "6체인 · 통찰 배율 상승",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1002506_2"],
    value: 0.42, // 배율 42% 상승
    modifier: "amplify",
    uptime: "passive", // 조건이 없어 늘 걸린다
    scope: "self",
    resonanceChain: 6,
  },
  {
    label: "6체인 · 크리티컬 피해",
    target: "critDamage",
    damageType: "All",
    value: 5, // 500% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "변주 스킬 통찰 발동 시",
  },
  {
    label: "자아의 이끌림 · 공명 효율",
    target: "energyRegen",
    damageType: "All",
    value: 0.1, // 10% 증가
    uptime: "active",
    scope: "self",
    condition: "별의 영역 안에 있을 때",
  },
  // ── 별의 영역이 공명 효율에 비례해 파티에 주는 것 ──
  // scaleFrom이 공명 효율의 스탯창 표시값(100% + 보너스분)을 그대로 준다.
  // 문턱이 없는 순수 비례라 그대로 담을 수 있다.
  {
    label: "별의 영역 · 심층 파티 크리티컬 (공명 효율 비례)",
    target: "critRate",
    damageType: "All",
    value: 0.0005, // 공명 효율 0.2%마다 0.01% = 1%당 0.05%
    scaleFrom: "EnergyRegen",
    maxValue: 0.125, // 최대 12.5%
    uptime: "active",
    scope: "party",
    condition: "별의 영역 · 심층 범위 안에 있는 파티원에게",
  },
  {
    label: "별의 영역 · 해금 파티 크리티컬 피해 (공명 효율 비례)",
    target: "critDamage",
    damageType: "All",
    value: 0.001, // 공명 효율 0.1%마다 0.01% = 1%당 0.1%
    scaleFrom: "EnergyRegen",
    maxValue: 0.25, // 최대 25%
    uptime: "active",
    scope: "party",
    condition: "별의 영역 · 해금 범위 안에 있는 파티원에게",
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   고유 「흐르는 생사」    파티원이 치명적 피해를 받을 때 대신 버텨주는 효과
//   1체인 「말없는 자의 가설」 별의 영역 범위 150% · 지속 10초 증가
//   3체인 「끝없는 기다림」   해방 발동 시 협주 에너지 20pt 회복
//   4체인 「만물의 적막」    공명 스킬 발동 시 치료 효과 보너스 70% 증가
//                        — 치료 보너스도 BuffTarget에 자리가 없다
//   5체인 「침묵 속의 메아리」 일반 공격 3단 · 연역의 견인 범위 증가
//   고유 「요리의 달인」    요리 확률 효과

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive2504,
  passive2505,
  passive2508,
  passive2509,
  passive2510,
];

export const shorekeeper: Character = {
  id: "shorekeeper",
  name: "파수인",
  level: 90,
  element: "Spectro",
  weaponType: "Rectifier",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id(1505)가 아니라 별도 번호(28)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_28_UI.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_28_UI.webp",
  echoIds: [],
};
