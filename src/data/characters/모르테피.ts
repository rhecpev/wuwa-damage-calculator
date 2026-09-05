import { emptyStats } from "../../types/stats";
import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";

/**
 * 모르테피 — encore.moe API v2 원본(api/characters/1204.json)에서 옮겨 적은 것.
 * 절차와 규칙은 docs/character-workflow.md 참고.
 *
 * 공명 회로 「분노의 후가」는 공명 스킬 판정이다(DamageList Type 기준).
 * 「강화음」은 공명 해방 판정이고, 협동 공격으로 여러 발이 나가는 형태라
 * 발수는 로테이션에서 같은 공격을 여러 번 담아 표현한다.
 */

// 스킬 트리 스탯 노드는 여기 넣지 않는다.
// src/data/characterNodes.json 이 노드 8개를 들고 있고, 켜고 끈 결과를 계산이 합산한다.
const baseStats = {
  ...emptyStats(),
  hp: 10025,
  atk: 250,
  def: 1136.6646,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

const basicSkillAttacks: Attack[] = [
  {
    id: "1001201_1",
    name: "1단 피해",
    type: "Basic",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2429, 0.2629, 0.2828, 0.3107, 0.3306, 0.3535, 0.3854, 0.4172, 0.4491, 0.483],
    ],
  },
  {
    id: "1001201_2",
    name: "2단 피해",
    type: "Basic",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2051, 0.222, 0.2388, 0.2623, 0.2792, 0.2985, 0.3254, 0.3523, 0.3792, 0.4078],
      [0.2051, 0.222, 0.2388, 0.2623, 0.2792, 0.2985, 0.3254, 0.3523, 0.3792, 0.4078],
    ],
  },
  {
    id: "1001201_3",
    name: "3단 피해",
    type: "Basic",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.5397, 0.584, 0.6283, 0.6902, 0.7345, 0.7854, 0.8562, 0.927, 0.9978, 1.073],
    ],
  },
  {
    id: "1001201_4",
    name: "4단 피해",
    type: "Basic",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1057, 0.1144, 0.1231, 0.1352, 0.1439, 0.1539, 0.1677, 0.1816, 0.1955, 0.2102],
      [0.1057, 0.1144, 0.1231, 0.1352, 0.1439, 0.1539, 0.1677, 0.1816, 0.1955, 0.2102],
      [0.1057, 0.1144, 0.1231, 0.1352, 0.1439, 0.1539, 0.1677, 0.1816, 0.1955, 0.2102],
      [0.1057, 0.1144, 0.1231, 0.1352, 0.1439, 0.1539, 0.1677, 0.1816, 0.1955, 0.2102],
      [0.6384, 0.6908, 0.7431, 0.8164, 0.8688, 0.929, 1.0127, 1.0965, 1.1803, 1.2693],
    ],
  },
  {
    id: "1001201_5",
    name: "공중 공격 1단 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1169, 0.1265, 0.1361, 0.1495, 0.1591, 0.1702, 0.1855, 0.2008, 0.2162, 0.2325],
    ],
  },
  {
    id: "1001201_6",
    name: "공중 공격 2단 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1169, 0.1265, 0.1361, 0.1495, 0.1591, 0.1702, 0.1855, 0.2008, 0.2162, 0.2325],
    ],
  },
  {
    id: "1001201_7",
    name: "조준 피해",
    type: "Heavy",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4914, 0.5317, 0.572, 0.6285, 0.6687, 0.7151, 0.7796, 0.844, 0.9085, 0.977],
    ],
  },
  {
    id: "1001201_8",
    name: "조준 풀 차지 피해",
    type: "Heavy",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.84, 0.9089, 0.9778, 1.0742, 1.1431, 1.2223, 1.3325, 1.4427, 1.553, 1.6701],
    ],
  },
  {
    id: "1001201_9",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type 기준
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.9807, 1.0612, 1.1416, 1.2542, 1.3346, 1.4271, 1.5557, 1.6844, 1.8131, 1.9498],
    ],
  },
];

const basicSkill: Skill = {
  id: "1001201",
  category: "Basic",
  name: "즉흥적 발휘",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorGun.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "1단 피해", description: "", values: ["24.29%", "26.29%", "28.28%", "31.07%", "33.06%", "35.35%", "38.54%", "41.72%", "44.91%", "48.30%", "52.28%", "56.26%", "60.25%", "64.23%", "68.21%", "72.20%", "76.18%", "80.16%", "84.15%", "88.13%"] },
    { attributeName: "2단 피해", description: "", values: ["20.51%*2", "22.20%*2", "23.88%*2", "26.23%*2", "27.92%*2", "29.85%*2", "32.54%*2", "35.23%*2", "37.92%*2", "40.78%*2", "44.14%*2", "47.51%*2", "50.87%*2", "54.24%*2", "57.60%*2", "60.96%*2", "64.33%*2", "67.69%*2", "71.05%*2", "74.42%*2"] },
    { attributeName: "3단 피해", description: "", values: ["53.97%", "58.40%", "62.83%", "69.02%", "73.45%", "78.54%", "85.62%", "92.70%", "99.78%", "107.30%", "116.15%", "125.00%", "133.86%", "142.71%", "151.56%", "160.41%", "169.26%", "178.11%", "186.96%", "195.81%"] },
    { attributeName: "4단 피해", description: "", values: ["10.57%*4+63.84%", "11.44%*4+69.08%", "12.31%*4+74.31%", "13.52%*4+81.64%", "14.39%*4+86.88%", "15.39%*4+92.90%", "16.77%*4+101.27%", "18.16%*4+109.65%", "19.55%*4+118.03%", "21.02%*4+126.93%", "22.75%*4+137.40%", "24.49%*4+147.86%", "26.22%*4+158.33%", "27.95%*4+168.80%", "29.69%*4+179.27%", "31.42%*4+189.74%", "33.15%*4+200.21%", "34.89%*4+210.68%", "36.62%*4+221.15%", "38.35%*4+231.62%"] },
    { attributeName: "공중 공격 1단 피해", description: "", values: ["11.69%", "12.65%", "13.61%", "14.95%", "15.91%", "17.02%", "18.55%", "20.08%", "21.62%", "23.25%", "25.16%", "27.08%", "29.00%", "30.91%", "32.83%", "34.75%", "36.67%", "38.58%", "40.50%", "42.42%"] },
    { attributeName: "공중 공격 2단 피해", description: "", values: ["11.69%", "12.65%", "13.61%", "14.95%", "15.91%", "17.02%", "18.55%", "20.08%", "21.62%", "23.25%", "25.16%", "27.08%", "29.00%", "30.91%", "32.83%", "34.75%", "36.67%", "38.58%", "40.50%", "42.42%"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5", "5"] },
    { attributeName: "조준 피해", description: "", values: ["49.14%", "53.17%", "57.20%", "62.85%", "66.87%", "71.51%", "77.96%", "84.40%", "90.85%", "97.70%", "105.76%", "113.82%", "121.88%", "129.94%", "138.00%", "146.05%", "154.11%", "162.17%", "170.23%", "178.29%"] },
    { attributeName: "조준 풀 차지 피해", description: "", values: ["84.00%", "90.89%", "97.78%", "107.42%", "114.31%", "122.23%", "133.25%", "144.27%", "155.30%", "167.01%", "180.78%", "194.56%", "208.33%", "222.11%", "235.89%", "249.66%", "263.44%", "277.21%", "290.99%", "304.77%"] },
    { attributeName: "회피 반격 피해", description: "", values: ["98.07%", "106.12%", "114.16%", "125.42%", "133.46%", "142.71%", "155.57%", "168.44%", "181.31%", "194.98%", "211.06%", "227.14%", "243.23%", "259.31%", "275.40%", "291.48%", "307.56%", "323.65%", "339.73%", "355.81%"] },
  ],
};


const resonanceSkillAttacks: Attack[] = [
  {
    id: "1001202_1",
    name: "분노의 연주 피해",
    type: "Skill",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.05, 1.1361, 1.2222, 1.3428, 1.4289, 1.5279, 1.6657, 1.8034, 1.9412, 2.0876],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1001202",
  category: "Skill",
  name: "분노의 연주",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMotefei/SP_IconMotefeiB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["105.00%", "113.61%", "122.22%", "134.28%", "142.89%", "152.79%", "166.57%", "180.34%", "194.12%", "208.76%", "225.98%", "243.20%", "260.42%", "277.64%", "294.86%", "312.08%", "329.30%", "346.52%", "363.74%", "380.96%"] },
    { attributeName: "쿨타임", description: "", values: ["14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14", "14"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18"] },
  ],
};


const liberationSkillAttacks: Attack[] = [
  {
    id: "1001203_1",
    name: "격렬한 피날레 피해",
    type: "Liberation",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.8, 0.8656, 0.9312, 1.0231, 1.0887, 1.1641, 1.2691, 1.374, 1.479, 1.5905],
    ],
  },
  {
    id: "1001203_2",
    name: "강화음 피해",
    type: "Liberation",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1001203",
  category: "Liberation",
  name: "격렬한 피날레",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMotefei/SP_IconMotefeiC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "격렬한 피날레 피해", description: "", values: ["80.00%", "86.56%", "93.12%", "102.31%", "108.87%", "116.41%", "126.91%", "137.40%", "147.90%", "159.05%", "172.17%", "185.29%", "198.41%", "211.53%", "224.65%", "237.77%", "250.89%", "264.01%", "277.13%", "290.25%"] },
    { attributeName: "강화음 피해", description: "", values: ["16.00%", "17.32%", "18.63%", "20.47%", "21.78%", "23.29%", "25.39%", "27.48%", "29.58%", "31.81%", "34.44%", "37.06%", "39.69%", "42.31%", "44.93%", "47.56%", "50.18%", "52.81%", "55.43%", "58.05%"] },
    { attributeName: "지속 시간", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "쿨타임", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
    { attributeName: "공명 에너지 소모", description: "", values: ["125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125", "125"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};


const variationSkillAttacks: Attack[] = [
  {
    id: "1001206_1",
    name: "불협화음 피해",
    type: "Variation",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.85, 0.9197, 0.9894, 1.087, 1.1567, 1.2369, 1.3484, 1.4599, 1.5714, 1.6899],
    ],
  },
];

const variationSkill: Skill = {
  id: "1001206",
  category: "Variation",
  name: "불협화음",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMotefei/SP_IconMotefeiQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "스킬 피해", description: "", values: ["85.00%", "91.97%", "98.94%", "108.70%", "115.67%", "123.69%", "134.84%", "145.99%", "157.14%", "168.99%", "182.93%", "196.87%", "210.81%", "224.75%", "238.69%", "252.63%", "266.57%", "280.51%", "294.45%", "308.39%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};


const circuitSkillAttacks: Attack[] = [
  {
    id: "1001207_1",
    name: "분노의 후가 피해",
    type: "Skill",
    element: "Fusion",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.64, 1.7745, 1.909, 2.0973, 2.2318, 2.3864, 2.6016, 2.8167, 3.0319, 3.2605],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1001207",
  category: "Circuit",
  name: "분노의 후가",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMotefei/SP_IconMotefeiY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "분노의 후가 피해", description: "", values: ["164.00%", "177.45%", "190.90%", "209.73%", "223.18%", "238.64%", "260.16%", "281.67%", "303.19%", "326.05%", "352.95%", "379.85%", "406.74%", "433.64%", "460.53%", "487.43%", "514.33%", "541.22%", "568.12%", "595.01%"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18", "18"] },
  ],
};


const passive1204: Skill = {
  id: "1001204",
  category: "Passive",
  name: "친절한 접대",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMotefei/SP_IconMotefeiD1.webp",
  attacks: [],
};


const passive1205: Skill = {
  id: "1001205",
  category: "Passive",
  name: "자유로운 리듬",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMotefei/SP_IconMotefeiD2.webp",
  attacks: [],
};


const passive1208: Skill = {
  id: "1001208",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWorld4.webp",
  attacks: [],
};


const introSkill: Skill = {
  id: "1001209",
  category: "Intro",
  name: "분노의 노래",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconMotefei/SP_IconMotefeiT.webp",
  attacks: [],
};


const syncSkill: Skill = {
  id: "1001210",
  category: "Sync",
  name: "조화도 파괴 · 권총",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakGun.webp",
  attacks: [],
};

/**
 * 고유 효과와 공명체인을 계산 가능한 형태로 옮긴 것.
 * 협동 공격 발동·에너지·지속 시간은 아래 「미반영」에 적어둔다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 반주 스킬 ──
  {
    label: "분노의 노래 · 강공격 피해 부스트",
    target: "boost",
    damageType: "Heavy",
    value: 0.38,
    uptime: "active",
    scope: "party", // 반주로 등장하는 「다음 캐릭터」에게 걸린다
    condition: "반주 스킬로 등장한 캐릭터에게 14초간. 전환하면 즉시 끝난다",
  },
  // ── 고유 스킬 ──
  {
    label: "친절한 접대 · 분노의 후가 피해",
    inherentSkillId: "1001204",
    target: "damageBonus",
    damageType: "All",
    attackId: "1001207_1",
    value: 0.25, // 25% 증가
    uptime: "active",
    scope: "self",
    condition: "공명 스킬 · 분노의 연주 발동 후 8초 내",
  },
  {
    label: "자유로운 리듬 · 강화음 피해",
    inherentSkillId: "1001205",
    target: "damageBonus",
    damageType: "All",
    attackId: "1001203_2", // 강화음
    value: 0.015, // 스택당 1.5%
    stacks: 50,
    maxStacks: 50,
    uptime: "active",
    scope: "self",
    condition: "해방 지속 중 강화음 명중마다 1스택(0.35초마다) · 최대 50스택 · 해방 종료 시 초기화",
  },

  // ── 공명체인 ──
  {
    label: "3체인 · 강화음 크리티컬 피해",
    target: "critDamage",
    damageType: "All",
    attackId: "1001203_2",
    value: 0.3, // 30% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 3,
    condition: "공명 해방 · 드래곤의 광상곡 지속 중",
  },
  {
    label: "5체인 · 협동 강화음 피해 감소",
    target: "damageBonus",
    damageType: "All",
    attackId: "1001203_2",
    value: -0.5, // 50% 감소
    uptime: "active",
    scope: "self",
    resonanceChain: 5,
    condition: "5체인 협동 공격으로 나가는 강화음 4발에만 걸린다(일반 강화음에는 걸지 말 것)",
  },
  {
    label: "6체인 · 파티 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "party", // 파티 전원에게 걸린다
    resonanceChain: 6,
    condition: "공명 해방 · 격렬한 피날레 사용 후 20초간",
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   1체인 「고독의 연주」  파티원 공명 스킬 발동 시 협동 공격 2발 (발동 조건이라 배율이 없다)
//   2체인 「거짓된 찬사」  에코 어빌리티 후 공명 에너지 10pt 회복
//   4체인 「분노의 왈츠」  드래곤의 광상곡 지속 시간 7초 연장
//   5체인 앞부분         공명 스킬 명중 시 협동 공격 4발 (발동 조건)

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive1204,
  passive1205,
  passive1208,
  introSkill,
  syncSkill,
];

export const mortefi: Character = {
  id: "mortefi",
  name: "모르테피",
  level: 90,
  element: "Fusion",
  weaponType: "Pistols",
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id가 아니라 별도 번호(13)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_13.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_13_UI.webp",
  echoIds: [],
};
