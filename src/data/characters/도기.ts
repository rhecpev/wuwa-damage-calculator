import { emptyStats } from "../../types/stats";
import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";

/**
 * 도기 — encore.moe API v2 원본(api/characters/1601.json)에서 옮겨 적은 것.
 * 절차와 규칙은 docs/character-workflow.md 참고.
 *
 * 계수 스탯이 스킬마다 갈린다(DamageList PropertyName 기준).
 *   기본 공격 · 변주 스킬 → 공격력
 *   공명 스킬 · 공명 해방 · 공명 회로 → 방어력
 *
 * 3단 피해는 속성표가 "56%" 한 줄인데 DamageList에는 28% 두 엔트리로 갈려 있다.
 * 규약대로 속성표를 따랐다(56% 한 대). 총합은 같고 크리티컬 판정 횟수만 달라진다.
 */

// 스킬 트리 스탯 노드는 여기 넣지 않는다.
// src/data/characterNodes.json 이 노드 8개를 들고 있고, 켜고 끈 결과를 계산이 합산한다.
const baseStats = {
  ...emptyStats(),
  hp: 8950,
  atk: 225,
  def: 1564.4416,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

const basicSkillAttacks: Attack[] = [
  {
    id: "1000901_1",
    name: "1단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4534, 0.4906, 0.5278, 0.5799, 0.617, 0.6598, 0.7193, 0.7788, 0.8383, 0.9015],
    ],
  },
  {
    id: "1000901_2",
    name: "2단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4267, 0.4617, 0.4967, 0.5457, 0.5807, 0.6209, 0.6769, 0.7329, 0.7889, 0.8484],
    ],
  },
  {
    id: "1000901_3",
    name: "3단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.56, 0.606, 0.6519, 0.7162, 0.7621, 0.8149, 0.8884, 0.9618, 1.0353, 1.1134],
    ],
  },
  {
    id: "1000901_4",
    name: "4단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.36, 1.4716, 1.5831, 1.7392, 1.8507, 1.979, 2.1574, 2.3358, 2.5143, 2.7039],
    ],
  },
  {
    id: "1000901_5",
    name: "강공격 공격 피해",
    type: "Heavy",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.1084, 1.1993, 1.2902, 1.4175, 1.5084, 1.6129, 1.7583, 1.9037, 2.0491, 2.2037],
    ],
  },
  {
    id: "1000901_6",
    name: "후발제인 피해",
    type: "Heavy",
    damageBonusType: "Basic", // DamageList Type = 일반 공격 (모션만 강공격)
    element: "Havoc",
    // 공명 회로에 있는 공격이라 DamageList PropertyName이 방어력이다.
    scalingStat: "DEF",
    skillLevel: 10,
    hits: [
      [0.3959, 0.4284, 0.4608, 0.5063, 0.5387, 0.5761, 0.628, 0.6799, 0.7319, 0.787],
    ],
  },
  {
    id: "1000901_7",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.62, 0.6709, 0.7217, 0.7929, 0.8437, 0.9022, 0.9836, 1.0649, 1.1462, 1.2327],
    ],
  },
  {
    id: "1000901_8",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.25, 1.3525, 1.455, 1.5985, 1.701, 1.8189, 1.9829, 2.1469, 2.3109, 2.4852],
    ],
  },
];

const basicSkill: Skill = {
  id: "1000901",
  category: "Basic",
  name: "숨기는 칼날",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorSword.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["45.34%", "49.06%", "52.78%", "57.99%", "61.7%", "65.98%", "71.93%", "77.88%", "83.83%", "90.15%", "97.58%", "105.02%", "112.45%", "119.89%", "127.32%", "134.76%", "142.2%", "149.63%", "157.07%", "164.5%"] },
    { attributeName: "2단 피해", description: "", values: ["42.67%", "46.17%", "49.67%", "54.57%", "58.07%", "62.09%", "67.69%", "73.29%", "78.89%", "84.84%", "91.84%", "98.83%", "105.83%", "112.83%", "119.83%", "126.82%", "133.82%", "140.82%", "147.82%", "154.82%"] },
    { attributeName: "3단 피해", description: "", values: ["56%", "60.6%", "65.19%", "71.62%", "76.21%", "81.49%", "88.84%", "96.18%", "103.53%", "111.34%", "120.52%", "129.71%", "138.89%", "148.07%", "157.26%", "166.44%", "175.63%", "184.81%", "193.99%", "203.18%"] },
    { attributeName: "4단 피해", description: "", values: ["136%", "147.16%", "158.31%", "173.92%", "185.07%", "197.9%", "215.74%", "233.58%", "251.43%", "270.39%", "292.69%", "314.99%", "337.3%", "359.6%", "381.91%", "404.21%", "426.51%", "448.82%", "471.12%", "493.43%"] },
    { attributeName: "강공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "강공격 시 피해 감소", description: "", values: ["35%", "35%", "35%", "35%", "35%", "35%", "35%", "35%", "35%", "35%"] },
    { attributeName: "강공격 공격 피해", description: "", values: ["110.84%", "119.93%", "129.02%", "141.75%", "150.84%", "161.29%", "175.83%", "190.37%", "204.91%", "220.37%", "238.54%", "256.72%", "274.9%", "293.08%", "311.25%", "329.43%", "347.61%", "365.79%", "383.97%", "402.14%"] },
    { attributeName: "후발제인 피해", description: "", values: ["39.59%", "42.84%", "46.08%", "50.63%", "53.87%", "57.61%", "62.8%", "67.99%", "73.19%", "78.7%", "85.2%", "91.69%", "98.18%", "104.67%", "111.16%", "117.66%", "124.15%", "130.64%", "137.13%", "143.62%"] },
    { attributeName: "공중 공격 피해", description: "", values: ["62%", "67.09%", "72.17%", "79.29%", "84.37%", "90.22%", "98.36%", "106.49%", "114.62%", "123.27%", "133.44%", "143.6%", "153.77%", "163.94%", "174.11%", "184.28%", "194.44%", "204.61%", "214.78%", "224.95%"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "회피 반격 피해", description: "", values: ["125%", "135.25%", "145.5%", "159.85%", "170.1%", "181.89%", "198.29%", "214.69%", "231.09%", "248.52%", "269.02%", "289.52%", "310.02%", "330.52%", "351.02%", "371.52%", "392.02%", "412.52%", "433.02%", "453.52%"] },
  ],
};


const resonanceSkillAttacks: Attack[] = [
  {
    id: "1000902_1",
    name: "난공불락 피해",
    type: "Skill",
    element: "Havoc",
    scalingStat: "DEF",
    skillLevel: 10,
    hits: [
      [0.6786, 0.7343, 0.7899, 0.8678, 0.9235, 0.9875, 1.0765, 1.1655, 1.2546, 1.3492],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1000902",
  category: "Skill",
  name: "난공불락",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconTaohua/SP_IconTaoHuaB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["67.86%", "73.43%", "78.99%", "86.78%", "92.35%", "98.75%", "107.65%", "116.55%", "125.46%", "134.92%", "146.05%", "157.18%", "168.3%", "179.43%", "190.56%", "201.69%", "212.82%", "223.95%", "235.08%", "246.21%"] },
    { attributeName: "쿨타임", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
    { attributeName: "철벽의 실드 피해 감소", description: "", values: ["15%", "15%", "15%", "15%", "15%", "15%", "15%", "15%", "15%", "15%"] },
    { attributeName: "HP 회복", description: "", values: ["950+45.00%", "1064+46.80%", "1187+48.60%", "1330+51.30%", "1501+54.90%", "1662+58.50%", "1691+65.25%", "1729+72.90%", "1757+81.00%", "1805+94.50%", "1953+102.30%", "2102+110.09%", "2251+117.89%", "2400+125.68%", "2549+133.48%", "2698+141.27%", "2847+149.07%", "2996+156.86%", "3145+164.66%", "3293+172.45%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15", "15"] },
  ],
};


const liberationSkillAttacks: Attack[] = [
  {
    id: "1000903_1",
    name: "불굴의 의지 피해",
    type: "Liberation",
    element: "Havoc",
    scalingStat: "DEF",
    skillLevel: 10,
    hits: [
      [2.262, 2.4475, 2.633, 2.8927, 3.0782, 3.2915, 3.5883, 3.885, 4.1818, 4.4971],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1000903",
  category: "Liberation",
  name: "불굴의 의지",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconTaohua/SP_IconTaoHuaC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "공명 에너지 소모", description: "", values: ["125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125"] },
    { attributeName: "쿨타임", description: "", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "스킬 피해", description: "", values: ["226.2%", "244.75%", "263.3%", "289.27%", "307.82%", "329.15%", "358.83%", "388.5%", "418.18%", "449.71%", "486.81%", "523.91%", "561%", "598.1%", "635.2%", "672.29%", "709.39%", "746.49%", "783.58%", "820.68%"] },
  ],
};


const variationSkillAttacks: Attack[] = [
  {
    id: "1000906_1",
    name: "협공 방어진 피해",
    type: "Variation",
    element: "Havoc",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.05, 1.1361, 1.2222, 1.3428, 1.4289, 1.5279, 1.6657, 1.8034, 1.9412, 2.0876],
    ],
  },
];

const variationSkill: Skill = {
  id: "1000906",
  category: "Variation",
  name: "협공 방어진",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconTaohua/SP_IconTaoHuaQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["105%", "113.61%", "122.22%", "134.28%", "142.89%", "152.79%", "166.57%", "180.34%", "194.12%", "208.76%", "225.98%", "243.2%", "260.42%", "277.64%", "294.86%", "312.08%", "329.3%", "346.52%", "363.74%", "380.96%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const circuitSkillAttacks: Attack[] = [
  {
    id: "1000907_1",
    name: "방어의 틈새 1단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "DEF",
    skillLevel: 10,
    hits: [
      [0.4336, 0.4692, 0.5047, 0.5545, 0.59, 0.6309, 0.6878, 0.7447, 0.8016, 0.862],
    ],
  },
  {
    id: "1000907_2",
    name: "방어의 틈새 2단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "DEF",
    skillLevel: 10,
    hits: [
      [0.558, 0.6038, 0.6495, 0.7136, 0.7593, 0.8119, 0.8851, 0.9583, 1.0316, 1.1093],
    ],
  },
  {
    id: "1000907_3",
    name: "방어의 틈새 3단 피해",
    type: "Basic",
    element: "Havoc",
    scalingStat: "DEF",
    skillLevel: 10,
    hits: [
      [0.7314, 0.7914, 0.8514, 0.9353, 0.9953, 1.0643, 1.1602, 1.2562, 1.3522, 1.4541],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1000907",
  category: "Circuit",
  name: "공방전환",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconTaohua/SP_IconTaoHuaY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "방어의 틈새 1단 피해", description: "", values: ["43.36%", "46.92%", "50.47%", "55.45%", "59%", "63.09%", "68.78%", "74.47%", "80.16%", "86.2%", "93.31%", "100.42%", "107.53%", "114.64%", "121.75%", "128.86%", "135.97%", "143.08%", "150.19%", "157.3%"] },
    { attributeName: "방어의 틈새 2단 피해", description: "", values: ["55.8%", "60.38%", "64.95%", "71.36%", "75.93%", "81.19%", "88.51%", "95.83%", "103.16%", "110.93%", "120.08%", "129.23%", "138.38%", "147.54%", "156.69%", "165.84%", "174.99%", "184.14%", "193.29%", "202.44%"] },
    { attributeName: "방어의 틈새 3단 피해", description: "", values: ["73.14%", "79.14%", "85.14%", "93.53%", "99.53%", "106.43%", "116.02%", "125.62%", "135.22%", "145.41%", "157.41%", "169.4%", "181.39%", "193.39%", "205.38%", "217.38%", "229.37%", "241.37%", "253.36%", "265.36%"] },
    { attributeName: "방어의 틈새 1단 실드", description: "", values: ["300+11.25%", "336+11.7%", "375+12.15%", "420+12.82%", "474+13.72%", "525+14.62%", "534+16.31%", "546+18.22%", "555+20.25%", "570+23.62%", "617+25.57%", "664+27.52%", "711+29.47%", "758+31.42%", "805+33.36%", "852+35.31%", "899+37.26%", "946+39.21%", "993+41.16%", "1040+43.11%"] },
    { attributeName: "방어의 틈새 2단 실드", description: "", values: ["450+16.87%", "504+17.55%", "562+18.22%", "630+19.23%", "711+20.58%", "787+21.93%", "801+24.46%", "819+27.33%", "832+30.37%", "855+35.43%", "925+38.36%", "996+41.28%", "1066+44.2%", "1137+47.13%", "1207+50.05%", "1278+52.97%", "1348+55.9%", "1419+58.82%", "1489+61.74%", "1560+64.67%"] },
    { attributeName: "방어의 틈새 3단 실드", description: "", values: ["750+28.12%", "840+29.25%", "937+30.37%", "1050+32.06%", "1185+34.31%", "1312+36.56%", "1335+40.78%", "1365+45.56%", "1387+50.62%", "1425+59.06%", "1542+63.93%", "1660+68.8%", "1777+73.67%", "1895+78.55%", "2012+83.42%", "2130+88.29%", "2247+93.16%", "2365+98.03%", "2482+102.91%", "2600+107.78%"] },
    { attributeName: "실드 지속 시간", description: "", values: ["18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18"] },
  ],
};


const passive0904: Skill = {
  id: "1000904",
  category: "Passive",
  name: "마음 보호",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconTaohua/SP_IconTaoHuaD1.webp",
  attacks: [],
};


const passive0905: Skill = {
  id: "1000905",
  category: "Passive",
  name: "우뚝 솟은 산",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconTaohua/SP_IconTaoHuaD2.webp",
  attacks: [],
};


const passive0908: Skill = {
  id: "1000908",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld4.webp",
  attacks: [],
};


const introSkill: Skill = {
  id: "1000909",
  category: "Intro",
  name: "위기의 일순",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconTaohua/SP_IconTaohuaT.webp",
  attacks: [],
};


const syncSkill: Skill = {
  id: "1000910",
  category: "Sync",
  name: "조화도 파괴 · 대검",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakSword.webp",
  attacks: [],
};

/**
 * 고유 효과와 공명체인을 계산 가능한 형태로 옮긴 것.
 * 실드량·지속시간처럼 피해와 무관한 것은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 반주 스킬 ──
  {
    label: "위기의 일순 · 공명 스킬 피해 부스트",
    target: "boost",
    damageType: "Skill",
    value: 0.38,
    uptime: "active",
    scope: "party", // 반주로 등장하는 「다음 캐릭터」에게 걸린다
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },
  // ── 고유 스킬 ──
  {
    label: "마음 보호 · 방어력",
    inherentSkillId: "1000904",
    target: "defPercent",
    damageType: "All",
    value: 0.15, // 15% 증가
    uptime: "active",
    scope: "self",
    condition: "공명 스킬 「철벽의 실드」가 지속되는 동안",
  },

  // ── 공명체인 ──
  {
    label: "2체인 · 불굴의 의지 크리티컬",
    target: "critRate",
    damageType: "All",
    attackId: "1000903_1",
    value: 0.2, // 20% 증가
    uptime: "passive", // 조건이 없다
    scope: "self",
    resonanceChain: 2,
  },
  {
    label: "2체인 · 불굴의 의지 크리티컬 피해",
    target: "critDamage",
    damageType: "All",
    attackId: "1000903_1",
    value: 0.2, // 20% 증가
    uptime: "passive",
    scope: "self",
    resonanceChain: 2,
  },
  {
    label: "4체인 · 방어력",
    target: "defPercent",
    damageType: "All",
    value: 0.5, // 50% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 4,
    condition: "강공격 · 후발제인 성공 후 5초간 · 15초마다 1회",
  },
  {
    label: "5체인 · 공방전환 피해",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1000907_1", "1000907_2", "1000907_3"],
    value: 0.5, // 50% 증가
    uptime: "passive",
    scope: "self",
    resonanceChain: 5,
  },
  {
    label: "6체인 · 일반 공격 피해",
    target: "damageBonus",
    damageType: "Basic",
    value: 0.4, // 40% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "공명 스킬 「철벽의 실드」가 지속되는 동안",
  },
  {
    label: "6체인 · 강공격 피해",
    target: "damageBonus",
    damageType: "Heavy",
    value: 0.4, // 40% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "공명 스킬 「철벽의 실드」가 지속되는 동안",
  },
];

// 미반영 — 피해 계산과 무관해서 뺀 것들
//   고유 「우뚝 솟은 산」   후발제인 성공 시 스태미나 25pt 회복
//   1체인 「여유로운 마음」  공방전환 실드량 40% 증가
//   3체인 「만물의 통찰」   철벽의 실드 지속 시간 30초로 연장
//   4체인 앞부분          HP 25% 회복
//   5체인 뒷부분          공명 에너지 20pt 회복
//   속성표의 「강공격 시 피해 감소」·「철벽의 실드 피해 감소」는 받는 피해 쪽이라 공격이 아니다

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive0904,
  passive0905,
  passive0908,
  introSkill,
  syncSkill,
];

export const taoqi: Character = {
  id: "taoqi",
  name: "도기",
  level: 90,
  element: "Havoc",
  weaponType: "Broadblade",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id가 아니라 별도 번호(9)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_9.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_9_UI.webp",
  echoIds: [],
};
