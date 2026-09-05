import { emptyStats } from "../../types/stats";
import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";

/**
 * 설지 — encore.moe API v2 원본(api/characters/1103.json)에서 옮겨 적은 것.
 * 절차와 규칙은 docs/character-workflow.md 참고.
 *
 * 계수 스탯이 스킬마다 갈린다(DamageList PropertyName 기준).
 *   기본 공격 · 변주 스킬 → 공격력
 *   공명 스킬 · 공명 해방 → HP
 *
 * 공명 회로 「소생 순환」에는 피해 항목이 없어 공격 없이 스킬만 남겼다.
 */

// 스킬 트리 스탯 노드는 여기 넣지 않는다.
// src/data/characterNodes.json 이 노드 8개를 들고 있고, 켜고 끈 결과를 계산이 합산한다.
const baseStats = {
  ...emptyStats(),
  hp: 12812.5,
  atk: 212.5,
  def: 1002.2204,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

const basicSkillAttacks: Attack[] = [
  {
    id: "1000401_1",
    name: "1단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3294, 0.3564, 0.3834, 0.4212, 0.4482, 0.4793, 0.5225, 0.5657, 0.6089, 0.6548],
    ],
  },
  {
    id: "1000401_2",
    name: "2단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3952, 0.4276, 0.4601, 0.5054, 0.5378, 0.5751, 0.6269, 0.6788, 0.7306, 0.7857],
    ],
  },
  {
    id: "1000401_3",
    name: "3단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.0659, 0.0713, 0.0767, 0.0843, 0.0897, 0.0959, 0.1045, 0.1132, 0.1218, 0.131],
      [0.0659, 0.0713, 0.0767, 0.0843, 0.0897, 0.0959, 0.1045, 0.1132, 0.1218, 0.131],
      [0.0659, 0.0713, 0.0767, 0.0843, 0.0897, 0.0959, 0.1045, 0.1132, 0.1218, 0.131],
      [0.0659, 0.0713, 0.0767, 0.0843, 0.0897, 0.0959, 0.1045, 0.1132, 0.1218, 0.131],
      [0.0659, 0.0713, 0.0767, 0.0843, 0.0897, 0.0959, 0.1045, 0.1132, 0.1218, 0.131],
      [0.0659, 0.0713, 0.0767, 0.0843, 0.0897, 0.0959, 0.1045, 0.1132, 0.1218, 0.131],
      [0.0659, 0.0713, 0.0767, 0.0843, 0.0897, 0.0959, 0.1045, 0.1132, 0.1218, 0.131],
    ],
  },
  {
    id: "1000401_4",
    name: "4단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3952, 0.4276, 0.4601, 0.5054, 0.5378, 0.5751, 0.6269, 0.6788, 0.7306, 0.7857],
    ],
  },
  {
    id: "1000401_5",
    name: "강공격 피해",
    type: "Heavy",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2458, 0.266, 0.2861, 0.3143, 0.3345, 0.3577, 0.3899, 0.4221, 0.4544, 0.4886],
    ],
  },
  {
    id: "1000401_6",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3968, 0.4294, 0.4619, 0.5075, 0.54, 0.5774, 0.6295, 0.6816, 0.7336, 0.7889],
    ],
  },
  {
    id: "1000401_7",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.8986, 0.9723, 1.046, 1.1491, 1.2228, 1.3075, 1.4254, 1.5433, 1.6612, 1.7865],
    ],
  },
];

const basicSkill: Skill = {
  id: "1000401",
  category: "Basic",
  name: "승낙",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorMagic.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["32.94%", "35.64%", "38.34%", "42.12%", "44.82%", "47.93%", "52.25%", "56.57%", "60.89%", "65.48%", "70.88%", "76.28%", "81.68%", "87.08%", "92.48%", "97.88%", "103.29%", "108.69%", "114.09%", "119.49%"] },
    { attributeName: "2단 피해", description: "", values: ["39.52%", "42.76%", "46.01%", "50.54%", "53.78%", "57.51%", "62.69%", "67.88%", "73.06%", "78.57%", "85.05%", "91.54%", "98.02%", "104.50%", "110.98%", "117.46%", "123.94%", "130.42%", "136.90%", "143.39%"] },
    { attributeName: "3단 피해", description: "", values: ["6.59%*7", "7.13%*7", "7.67%*7", "8.43%*7", "8.97%*7", "9.59%*7", "10.45%*7", "11.32%*7", "12.18%*7", "13.10%*7", "14.18%*7", "15.26%*7", "16.34%*7", "17.42%*7", "18.50%*7", "19.58%*7", "20.66%*7", "21.74%*7", "22.82%*7", "23.90%*7"] },
    { attributeName: "4단 피해", description: "", values: ["39.52%", "42.76%", "46.01%", "50.54%", "53.78%", "57.51%", "62.69%", "67.88%", "73.06%", "78.57%", "85.05%", "91.54%", "98.02%", "104.50%", "110.98%", "117.46%", "123.94%", "130.42%", "136.90%", "143.39%"] },
    { attributeName: "공중 공격 피해", description: "", values: ["39.68%", "42.94%", "46.19%", "50.75%", "54.00%", "57.74%", "62.95%", "68.16%", "73.36%", "78.89%", "85.40%", "91.91%", "98.42%", "104.92%", "111.43%", "117.94%", "124.45%", "130.95%", "137.46%", "143.97%"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "강공격 피해", description: "", values: ["24.58%", "26.60%", "28.61%", "31.43%", "33.45%", "35.77%", "38.99%", "42.21%", "45.44%", "48.86%", "52.90%", "56.93%", "60.96%", "64.99%", "69.02%", "73.05%", "77.08%", "81.11%", "85.14%", "89.17%"] },
    { attributeName: "강공격 스태미나 소모(초당)", description: "", values: ["12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5", "12.5"] },
    { attributeName: "회피 반격 피해", description: "", values: ["89.86%", "97.23%", "104.60%", "114.91%", "122.28%", "130.75%", "142.54%", "154.33%", "166.12%", "178.65%", "193.38%", "208.12%", "222.86%", "237.59%", "252.33%", "267.07%", "281.80%", "296.54%", "311.28%", "326.01%"] },
  ],
};


const resonanceSkillAttacks: Attack[] = [
  {
    id: "1000402_1",
    name: "응급대비책 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "HP",
    skillLevel: 10,
    hits: [
      [0.0802, 0.0868, 0.0934, 0.1026, 0.1091, 0.1167, 0.1272, 0.1377, 0.1482, 0.1594],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1000402",
  category: "Skill",
  name: "응급대비책",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBailian/SP_IconBailianB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "치료량", description: "", values: ["575+2.90%", "623+3.14%", "670+3.37%", "736+3.71%", "783+3.94%", "837+4.22%", "913+4.60%", "988+4.98%", "1064+5.36%", "1144+5.76%", "1238+6.24%", "1332+6.71%", "1427+7.19%", "1521+7.66%", "1615+8.14%", "1709+8.61%", "1804+9.09%", "1898+9.56%", "1992+10.04%", "2087+10.51%"] },
    { attributeName: "스킬 피해", description: "", values: ["8.02%", "8.68%", "9.34%", "10.26%", "10.91%", "11.67%", "12.72%", "13.77%", "14.82%", "15.94%", "17.26%", "18.57%", "19.89%", "21.20%", "22.52%", "23.83%", "25.15%", "26.46%", "27.77%", "29.09%"] },
    { attributeName: "쿨타임", description: "", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const liberationSkillAttacks: Attack[] = [
  {
    id: "1000403_1",
    name: "빈틈의 울림 피해",
    type: "Liberation",
    element: "Glacio",
    scalingStat: "HP",
    skillLevel: 10,
    hits: [
      [0.0205, 0.0222, 0.0239, 0.0262, 0.0279, 0.0298, 0.0325, 0.0352, 0.0379, 0.0407],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1000403",
  category: "Liberation",
  name: "찰나의 순간",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBailian/SP_IconBailianC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "찰나의 순간 치료량", description: "", values: ["310+1.26%", "336+1.36%", "361+1.47%", "397+1.61%", "422+1.71%", "452+1.83%", "492+2.00%", "533+2.16%", "574+2.33%", "617+2.51%", "668+2.71%", "718+2.92%", "769+3.12%", "820+3.33%", "871+3.54%", "922+3.74%", "973+3.95%", "1024+4.16%", "1074+4.36%", "1125+4.57%"] },
    { attributeName: "빈틈의 울림 피해", description: "", values: ["2.05%", "2.22%", "2.39%", "2.62%", "2.79%", "2.98%", "3.25%", "3.52%", "3.79%", "4.07%", "4.41%", "4.74%", "5.08%", "5.41%", "5.75%", "6.08%", "6.42%", "6.75%", "7.09%", "7.42%"] },
    { attributeName: "빈틈의 울림 치료량", description: "", values: ["349+1.42%", "378+1.53%", "406+1.65%", "446+1.81%", "475+1.93%", "508+2.06%", "554+2.25%", "599+2.43%", "645+2.62%", "694+2.82%", "751+3.05%", "808+3.28%", "865+3.52%", "923+3.75%", "980+3.98%", "1037+4.21%", "1094+4.45%", "1151+4.68%", "1209+4.91%", "1266+5.14%"] },
    { attributeName: "쿨타임", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175", "175"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};


const variationSkillAttacks: Attack[] = [
  {
    id: "1000406_1",
    name: "뒤덮인 눈꽃 피해",
    type: "Variation",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953],
    ],
  },
];

const variationSkill: Skill = {
  id: "1000406",
  category: "Variation",
  name: "뒤덮인 눈꽃",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBailian/SP_IconBailianQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["40.00%", "43.28%", "46.56%", "51.16%", "54.44%", "58.21%", "63.46%", "68.70%", "73.95%", "79.53%", "86.09%", "92.65%", "99.21%", "105.77%", "112.33%", "118.89%", "125.45%", "132.01%", "138.57%", "145.13%"] },
    { attributeName: "뒤덮인 눈꽃 치료량", description: "", values: ["75+0.38%", "82+0.41%", "88+0.44%", "96+0.48%", "103+0.51%", "110+0.55%", "119+0.60%", "129+0.65%", "139+0.70%", "150+0.75%", "162+0.81%", "174+0.88%", "187+0.94%", "199+1.00%", "211+1.06%", "223+1.12%", "236+1.19%", "248+1.25%", "260+1.31%", "273+1.37%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const circuitSkill: Skill = {
  id: "1000407",
  category: "Circuit",
  name: "소생 순환",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBailian/SP_IconBailianY.webp",
  attacks: [],
  attributes: [
    { attributeName: "염원 치료량", description: "", values: ["32+0.16%", "34+0.17%", "37+0.18%", "40+0.20%", "43+0.21%", "46+0.23%", "50+0.25%", "54+0.27%", "58+0.29%", "63+0.31%", "68+0.34%", "73+0.36%", "78+0.39%", "83+0.42%", "88+0.44%", "93+0.47%", "99+0.49%", "104+0.52%", "109+0.55%", "114+0.57%"] },
    { attributeName: "강공격 발동 시 「염원」을 소모하여 추가로 회복하는 협주 에너지", description: "", values: ["4", "4", "4", "4", "4", "4", "4", "4", "4", "4", "4", "4", "4", "4", "4", "4", "4", "4"] },
    { attributeName: "공명 스킬 발동 시 「염원」을 소모하여 추가로 회복하는 협주 에너지", description: "", values: ["8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8", "8"] },
    { attributeName: "강공격 발동 시 「염원」을 소모하여 추가로 회복하는 공명 에너지", description: "", values: ["2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5", "2.5"] },
  ],
};


const passive0404: Skill = {
  id: "1000404",
  category: "Passive",
  name: "하모닉 구간",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBailian/SP_IconBailianD2.webp",
  attacks: [],
};


const passive0405: Skill = {
  id: "1000405",
  category: "Passive",
  name: "격려의 피드백",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBailian/SP_IconBailianD1.webp",
  attacks: [],
};


const passive0408: Skill = {
  id: "1000408",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld3.webp",
  attacks: [],
};


const introSkill: Skill = {
  id: "1000409",
  category: "Intro",
  name: "자원 수송",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconBailian/SP_IconBailianT.webp",
  attacks: [],
};


const syncSkill: Skill = {
  id: "1000410",
  category: "Sync",
  name: "조화도 파괴 · 증폭기",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakMagic.webp",
  attacks: [],
};

/**
 * 고유 효과와 공명체인을 계산 가능한 형태로 옮긴 것.
 * 치료·부활·에너지처럼 피해와 무관한 것은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 반주 스킬 ──
  {
    label: "자원 수송 · 전체 피해 부스트",
    target: "boost",
    damageType: "All",
    value: 0.15,
    uptime: "active",
    scope: "party", // 반주로 등장하는 「다음 캐릭터」에게 걸린다
    condition: "반주의 치료 효과를 받은 캐릭터에게 6초간",
  },
  // ── 고유 스킬 ──
  {
    label: "하모닉 구간 · 파티 공격력",
    inherentSkillId: "1000404",
    target: "atkPercent",
    damageType: "All",
    value: 0.15, // 15% 증가
    uptime: "active",
    scope: "party", // 「천뢰」를 주운 캐릭터에게 걸린다
    condition: "공명 스킬 발동 후 남는 「천뢰」를 주우면 20초간",
  },

  // ── 공명체인 ──
  {
    label: "2체인 · 응결 피해 보너스",
    target: "damageBonus",
    damageType: "Glacio",
    value: 0.15, // 15% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 2,
    condition: "「염원」 4pt 상태에서 공명 스킬 발동 후 12초간",
  },
  {
    label: "3체인 · HP 최대치",
    target: "hpPercent",
    damageType: "All",
    value: 0.12, // 12% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "변주 스킬 · 뒤덮인 눈꽃 발동 후 10초간",
  },
  {
    label: "6체인 · 파티 응결 피해 보너스",
    target: "damageBonus",
    damageType: "Glacio",
    value: 0.12, // 12% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 6,
    condition: "캐릭터가 「천뢰」를 주우면 20초간",
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   고유 「격려의 피드백」   강공격 명중 시 HP 회복
//   1체인 「미니멀리즘…」    공명 에너지 추가 회복
//   2체인 뒷부분           치료 효과 보너스 15%
//   4체인 「근원을 찾아서」   빈틈의 울림 타수 증가 · 치료 배율 상승 · HP 1.20% 추가 피해
//                        (배율 상승이 아니라 히트 수가 늘어나는 형태라 지금 구조로 표현 못 한다)
//   5체인 「기원에서 받은 응답」 파티원 부활

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive0404,
  passive0405,
  passive0408,
  introSkill,
  syncSkill,
];

export const baizhi: Character = {
  id: "baizhi",
  name: "설지",
  level: 90,
  element: "Glacio",
  weaponType: "Rectifier",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id가 아니라 별도 번호(6)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_6.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_6_UI.webp",
  echoIds: [],
};
