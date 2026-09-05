import type { Attack, Character, CharacterBuffTemplate, Skill } from "../../types/game";
import { emptyStats } from "../../types/stats";

/**
 * 루실라 (Id 1109, 5성, 응결, 증폭기)
 * 출처: encore.moe API v2 (api/characters/1109.json)
 * 작성 절차: docs/character-workflow.md
 *
 * hits는 SkillAttributes의 *N 표기로 히트 개수를 잡고 레벨 1~10 값을 그대로 옮겼다.
 *
 * SkillBranches에 공명 모드 둘(서리 · 에코)이 있고, 둘 다 resonanceModes에 담았다.
 * 기본값은 게임의 IsDefault를 따라 서리다. 모드에 따라 갈리는 버프는 resonanceMode로
 * 표시해 두어, 캐릭터 관리 탭에서 모드를 고르면 그쪽 것만 걸린다.
 *
 * 판정도 모드를 탄다 — DamageList를 보면 「생생한 기억」 · 「내려놓기」 · 「망각」은
 * 같은 배율이 「일반 공격」과 「에코 어빌리티」 두 판정으로 각각 실려 있다.
 * Attack은 판정을 하나만 들 수 있으므로 데이터에는 서리 모드 쪽(일반 공격)을 담고,
 * 에코 모드일 때 셋의 판정을 갈아 끼우는 버프를 따로 두었다(switchesDamageBonusType).
 *
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
  hp: 12237.5,
  atk: 375,
  def: 1197.7756,
  critRate: 0.05, // 표시값 5%
  critDamage: 0.5, // 표시값 150% - 기본 100%
};

// 기본 공격 — 전부 일반 공격 판정이다. 3단은 상태에 따라 둘로 갈린다.
const basicSkillAttacks: Attack[] = [
  {
    id: "1005001_1",
    name: "일반 공격 1단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2982, 0.3227, 0.3472, 0.3814, 0.4058, 0.434, 0.4731, 0.5122, 0.5513, 0.5929],
    ],
  },
  {
    id: "1005001_2",
    name: "일반 공격 2단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1353, 0.1464, 0.1575, 0.173, 0.1841, 0.1968, 0.2146, 0.2323, 0.2501, 0.2689],
      [0.2029, 0.2195, 0.2362, 0.2595, 0.2761, 0.2952, 0.3218, 0.3485, 0.3751, 0.4034],
    ],
  },
  {
    id: "1005001_3",
    name: "일반 공격 3단 · 무색무취 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.8025, 0.8683, 0.9341, 1.0263, 1.0921, 1.1677, 1.273, 1.3783, 1.4836, 1.5955],
    ],
  },
  {
    id: "1005001_4",
    name: "일반 공격 3단 · 매력가득 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.1834, 1.2804, 1.3775, 1.5133, 1.6104, 1.7219, 1.8772, 2.0325, 2.1877, 2.3527],
    ],
  },
  {
    id: "1005001_5",
    name: "공중 공격 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.434, 0.4696, 0.5052, 0.555, 0.5906, 0.6316, 0.6885, 0.7454, 0.8024, 0.8629],
    ],
  },
  {
    id: "1005001_6",
    name: "회피 반격 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3412, 0.3692, 0.3971, 0.4363, 0.4643, 0.4965, 0.5412, 0.586, 0.6307, 0.6783],
      [0.417, 0.4512, 0.4854, 0.5333, 0.5674, 0.6068, 0.6615, 0.7162, 0.7709, 0.829],
    ],
  },
];

const basicSkill: Skill = {
  id: "1005001",
  category: "Basic",
  name: "스냅샷",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorMagic.webp",
  attacks: basicSkillAttacks,
  attributes: [
    { attributeName: "일반 공격 1단 피해", description: "", values: ["29.82%", "32.27%", "34.72%", "38.14%", "40.58%", "43.40%", "47.31%", "51.22%", "55.13%", "59.29%", "64.18%", "69.07%", "73.96%", "78.85%", "83.74%", "88.63%", "93.52%", "98.41%", "103.30%", "108.19%"] },
    { attributeName: "일반 공격 2단 피해", description: "", values: ["13.53%+20.29%", "14.64%+21.95%", "15.75%+23.62%", "17.30%+25.95%", "18.41%+27.61%", "19.68%+29.52%", "21.46%+32.18%", "23.23%+34.85%", "25.01%+37.51%", "26.89%+40.34%", "29.11%+43.66%", "31.33%+46.99%", "33.55%+50.32%", "35.76%+53.64%", "37.98%+56.97%", "40.20%+60.30%", "42.42%+63.62%", "44.64%+66.95%", "46.85%+70.28%", "49.07%+73.60%"] },
    { attributeName: "일반 공격 3단 · 무색무취 피해", description: "", values: ["80.25%", "86.83%", "93.41%", "102.63%", "109.21%", "116.77%", "127.30%", "137.83%", "148.36%", "159.55%", "172.71%", "185.87%", "199.03%", "212.19%", "225.35%", "238.51%", "251.67%", "264.83%", "277.99%", "291.15%"] },
    { attributeName: "일반 공격 3단 · 매력가득 피해", description: "", values: ["118.34%", "128.04%", "137.75%", "151.33%", "161.04%", "172.19%", "187.72%", "203.25%", "218.77%", "235.27%", "254.67%", "274.08%", "293.49%", "312.89%", "332.30%", "351.71%", "371.12%", "390.52%", "409.93%", "429.34%"] },
    { attributeName: "공중 공격 피해", description: "", values: ["43.40%", "46.96%", "50.52%", "55.50%", "59.06%", "63.16%", "68.85%", "74.54%", "80.24%", "86.29%", "93.41%", "100.52%", "107.64%", "114.76%", "121.88%", "128.99%", "136.11%", "143.23%", "150.35%", "157.46%"] },
    { attributeName: "회피 반격 피해", description: "", values: ["34.12%+41.70%", "36.92%+45.12%", "39.71%+48.54%", "43.63%+53.33%", "46.43%+56.74%", "49.65%+60.68%", "54.12%+66.15%", "58.60%+71.62%", "63.07%+77.09%", "67.83%+82.90%", "73.42%+89.74%", "79.02%+96.58%", "84.61%+103.41%", "90.21%+110.25%", "95.80%+117.09%", "101.40%+123.93%", "106.99%+130.77%", "112.59%+137.60%", "118.18%+144.44%", "123.78%+151.28%"] },
    { attributeName: "공중 공격 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
  ],
};

// 공명 스킬
const resonanceSkillAttacks: Attack[] = [
  {
    id: "1005002_1",
    name: "환상 프레임 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.0667, 0.0722, 0.0776, 0.0853, 0.0908, 0.0971, 0.1058, 0.1145, 0.1233, 0.1326],
      [0.0667, 0.0722, 0.0776, 0.0853, 0.0908, 0.0971, 0.1058, 0.1145, 0.1233, 0.1326],
      [0.0667, 0.0722, 0.0776, 0.0853, 0.0908, 0.0971, 0.1058, 0.1145, 0.1233, 0.1326],
    ],
  },
  {
    id: "1005002_2",
    name: "필 라이트 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.2528, 1.3556, 1.4583, 1.6021, 1.7049, 1.823, 1.9874, 2.1517, 2.3161, 2.4907],
    ],
  },
  {
    id: "1005002_3",
    name: "팔로우 스폿 피해",
    type: "Skill",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4142, 0.4482, 0.4822, 0.5297, 0.5637, 0.6027, 0.6571, 0.7114, 0.7657, 0.8235],
      [0.4142, 0.4482, 0.4822, 0.5297, 0.5637, 0.6027, 0.6571, 0.7114, 0.7657, 0.8235],
      [1.3806, 1.4939, 1.6071, 1.7656, 1.8788, 2.009, 2.1901, 2.3712, 2.5524, 2.7448],
      [0.5523, 0.5976, 0.6429, 0.7063, 0.7515, 0.8036, 0.8761, 0.9485, 1.021, 1.098],
    ],
  },
];

const resonanceSkill: Skill = {
  id: "1005002",
  category: "Skill",
  name: "환상 프레임",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuosela/SP_SkillIconLuoselaB1.webp",
  attacks: resonanceSkillAttacks,
  attributes: [
    { attributeName: "환상 프레임 피해", description: "", values: ["6.67%*3", "7.22%*3", "7.76%*3", "8.53%*3", "9.08%*3", "9.71%*3", "10.58%*3", "11.45%*3", "12.33%*3", "13.26%*3", "14.35%*3", "15.45%*3", "16.54%*3", "17.63%*3", "18.73%*3", "19.82%*3", "20.91%*3", "22.01%*3", "23.10%*3", "24.19%*3"] },
    { attributeName: "필 라이트 피해", description: "", values: ["125.28%", "135.56%", "145.83%", "160.21%", "170.49%", "182.30%", "198.74%", "215.17%", "231.61%", "249.07%", "269.62%", "290.17%", "310.71%", "331.26%", "351.80%", "372.35%", "392.90%", "413.44%", "433.99%", "454.53%"] },
    { attributeName: "팔로우 스폿 피해", description: "", values: ["41.42%+41.42%+138.06%+55.23%", "44.82%+44.82%+149.39%+59.76%", "48.22%+48.22%+160.71%+64.29%", "52.97%+52.97%+176.56%+70.63%", "56.37%+56.37%+187.88%+75.15%", "60.27%+60.27%+200.90%+80.36%", "65.71%+65.71%+219.01%+87.61%", "71.14%+71.14%+237.12%+94.85%", "76.57%+76.57%+255.24%+102.10%", "82.35%+82.35%+274.48%+109.80%", "89.14%+89.14%+297.12%+118.85%", "95.93%+95.93%+319.77%+127.91%", "102.73%+102.73%+342.41%+136.97%", "109.52%+109.52%+365.05%+146.02%", "116.31%+116.31%+387.69%+155.08%", "123.10%+123.10%+410.33%+164.14%", "129.90%+129.90%+432.97%+173.19%", "136.69%+136.69%+455.62%+182.25%", "143.48%+143.48%+478.26%+191.31%", "150.27%+150.27%+500.90%+200.36%"] },
    { attributeName: "공명 스킬 쿨타임", description: "", values: ["16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16", "16"] },
  ],
};

// 공명 해방 「추억」 — 추억 상태의 공격이 통째로 여기 들어 있다.
// 일곱 개 모두 판정은 일반 공격이다.
const liberationSkillAttacks: Attack[] = [
  {
    id: "1005003_1",
    name: "생생한 기억 피해",
    type: "Liberation",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.718, 0.7769, 0.8357, 0.9182, 0.977, 1.0447, 1.1389, 1.2331, 1.3273, 1.4274],
    ],
  },
  {
    id: "1005003_2",
    name: "일반 공격 · 플래시 백 1단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.1541, 0.1668, 0.1794, 0.1971, 0.2097, 0.2243, 0.2445, 0.2647, 0.2849, 0.3064],
      [0.2312, 0.2501, 0.2691, 0.2956, 0.3146, 0.3364, 0.3667, 0.397, 0.4273, 0.4595],
    ],
  },
  {
    id: "1005003_3",
    name: "일반 공격 · 플래시 백 2단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.3006, 0.3253, 0.3499, 0.3845, 0.4091, 0.4375, 0.4769, 0.5163, 0.5558, 0.5977],
      [0.4509, 0.4879, 0.5249, 0.5767, 0.6136, 0.6562, 0.7153, 0.7745, 0.8336, 0.8965],
    ],
  },
  {
    id: "1005003_4",
    name: "일반 공격 · 플래시 백 3단 피해",
    type: "Basic",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.2622, 0.2837, 0.3052, 0.3353, 0.3567, 0.3815, 0.4159, 0.4502, 0.4846, 0.5212],
      [0.2622, 0.2837, 0.3052, 0.3353, 0.3567, 0.3815, 0.4159, 0.4502, 0.4846, 0.5212],
      [0.2622, 0.2837, 0.3052, 0.3353, 0.3567, 0.3815, 0.4159, 0.4502, 0.4846, 0.5212],
      [0.2622, 0.2837, 0.3052, 0.3353, 0.3567, 0.3815, 0.4159, 0.4502, 0.4846, 0.5212],
      [0.2622, 0.2837, 0.3052, 0.3353, 0.3567, 0.3815, 0.4159, 0.4502, 0.4846, 0.5212],
      [0.2622, 0.2837, 0.3052, 0.3353, 0.3567, 0.3815, 0.4159, 0.4502, 0.4846, 0.5212],
      [0.2622, 0.2837, 0.3052, 0.3353, 0.3567, 0.3815, 0.4159, 0.4502, 0.4846, 0.5212],
      [0.2622, 0.2837, 0.3052, 0.3353, 0.3567, 0.3815, 0.4159, 0.4502, 0.4846, 0.5212],
    ],
  },
  {
    id: "1005003_5",
    name: "내려놓기 피해",
    type: "Liberation",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.4266, 0.4616, 0.4966, 0.5455, 0.5805, 0.6207, 0.6767, 0.7327, 0.7886, 0.8481],
      [0.4266, 0.4616, 0.4966, 0.5455, 0.5805, 0.6207, 0.6767, 0.7327, 0.7886, 0.8481],
      [0.4266, 0.4616, 0.4966, 0.5455, 0.5805, 0.6207, 0.6767, 0.7327, 0.7886, 0.8481],
      [2.986, 3.2308, 3.4757, 3.8184, 4.0633, 4.3449, 4.7366, 5.1284, 5.5201, 5.9364],
    ],
  },
  {
    id: "1005003_6",
    name: "공중 공격 · 추억 피해",
    type: "Aerial",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.558, 0.6038, 0.6496, 0.7136, 0.7594, 0.812, 0.8852, 0.9584, 1.0316, 1.1094],
    ],
  },
  {
    id: "1005003_7",
    name: "회피 반격 · 추억 피해",
    type: "DodgeCounter",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.5812, 0.6289, 0.6765, 0.7433, 0.7909, 0.8457, 0.922, 0.9982, 1.0745, 1.1555],
      [0.7104, 0.7686, 0.8269, 0.9084, 0.9667, 1.0336, 1.1268, 1.22, 1.3132, 1.4122],
    ],
  },
];

const liberationSkill: Skill = {
  id: "1005003",
  category: "Liberation",
  name: "생생한 기억",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuosela/SP_SkillIconLuoselaC1.webp",
  attacks: liberationSkillAttacks,
  attributes: [
    { attributeName: "생생한 기억 피해", description: "", values: ["71.80%", "77.69%", "83.57%", "91.82%", "97.70%", "104.47%", "113.89%", "123.31%", "132.73%", "142.74%", "154.52%", "166.29%", "178.06%", "189.84%", "201.61%", "213.39%", "225.16%", "236.94%", "248.71%", "260.48%"] },
    { attributeName: "일반 공격 · 플래시 백 1단 피해", description: "", values: ["15.41%+23.12%", "16.68%+25.01%", "17.94%+26.91%", "19.71%+29.56%", "20.97%+31.46%", "22.43%+33.64%", "24.45%+36.67%", "26.47%+39.70%", "28.49%+42.73%", "30.64%+45.95%", "33.16%+49.74%", "35.69%+53.53%", "38.22%+57.33%", "40.75%+61.12%", "43.27%+64.91%", "45.80%+68.70%", "48.33%+72.49%", "50.85%+76.28%", "53.38%+80.07%", "55.91%+83.86%"] },
    { attributeName: "일반 공격 · 플래시 백 2단 피해", description: "", values: ["30.06%+45.09%", "32.53%+48.79%", "34.99%+52.49%", "38.45%+57.67%", "40.91%+61.36%", "43.75%+65.62%", "47.69%+71.53%", "51.63%+77.45%", "55.58%+83.36%", "59.77%+89.65%", "64.70%+97.04%", "69.63%+104.44%", "74.56%+111.83%", "79.49%+119.23%", "84.42%+126.62%", "89.35%+134.02%", "94.28%+141.41%", "99.21%+148.81%", "104.14%+156.20%", "109.07%+163.60%"] },
    { attributeName: "일반 공격 · 플래시 백 3단 피해", description: "", values: ["26.22%*8", "28.37%*8", "30.52%*8", "33.53%*8", "35.67%*8", "38.15%*8", "41.59%*8", "45.02%*8", "48.46%*8", "52.12%*8", "56.42%*8", "60.72%*8", "65.01%*8", "69.31%*8", "73.61%*8", "77.91%*8", "82.21%*8", "86.51%*8", "90.81%*8", "95.11%*8"] },
    { attributeName: "내려놓기 피해", description: "", values: ["42.66%*3+298.60%", "46.16%*3+323.08%", "49.66%*3+347.57%", "54.55%*3+381.84%", "58.05%*3+406.33%", "62.07%*3+434.49%", "67.67%*3+473.66%", "73.27%*3+512.84%", "78.86%*3+552.01%", "84.81%*3+593.64%", "91.80%*3+642.60%", "98.80%*3+691.57%", "105.80%*3+740.54%", "112.79%*3+789.51%", "119.79%*3+838.48%", "126.78%*3+887.45%", "133.78%*3+936.42%", "140.77%*3+985.39%", "147.77%*3+1034.36%", "154.77%*3+1083.33%"] },
    { attributeName: "공중 공격 · 추억 피해", description: "", values: ["55.80%", "60.38%", "64.96%", "71.36%", "75.94%", "81.20%", "88.52%", "95.84%", "103.16%", "110.94%", "120.09%", "129.24%", "138.39%", "147.55%", "156.70%", "165.85%", "175.00%", "184.15%", "193.30%", "202.45%"] },
    { attributeName: "회피 반격 · 추억 피해", description: "", values: ["58.12%+71.04%", "62.89%+76.86%", "67.65%+82.69%", "74.33%+90.84%", "79.09%+96.67%", "84.57%+103.36%", "92.20%+112.68%", "99.82%+122.00%", "107.45%+131.32%", "115.55%+141.22%", "125.08%+152.87%", "134.61%+164.52%", "144.14%+176.17%", "153.67%+187.82%", "163.20%+199.47%", "172.74%+211.12%", "182.27%+222.77%", "191.80%+234.42%", "201.33%+246.07%", "210.86%+257.72%"] },
    { attributeName: "공중 공격 · 추억 스태미나 소모", description: "", values: ["30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30", "30"] },
    { attributeName: "쿨타임", description: "", values: ["25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25", "25"] },
    { attributeName: "협주 에너지 회복", description: "", values: ["20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20", "20"] },
  ],
};

// 변주 스킬
const variationSkillAttacks: Attack[] = [
  {
    id: "1005006_1",
    name: "편집 피해",
    type: "Variation",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.49, 0.5302, 0.5704, 0.6267, 0.6668, 0.713, 0.7773, 0.8416, 0.9059, 0.9742],
    ],
  },
  {
    id: "1005006_2",
    name: "편집 · 하드 컷 피해",
    type: "Variation",
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [0.7515, 0.8132, 0.8748, 0.9611, 1.0227, 1.0936, 1.1922, 1.2908, 1.3893, 1.4941],
    ],
  },
];

const variationSkill: Skill = {
  id: "1005006",
  category: "Variation",
  name: "편집",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuosela/SP_SkillIconLuoselaQTE.webp",
  attacks: variationSkillAttacks,
  attributes: [
    { attributeName: "편집 피해", description: "", values: ["49.00%", "53.02%", "57.04%", "62.67%", "66.68%", "71.30%", "77.73%", "84.16%", "90.59%", "97.42%", "105.46%", "113.49%", "121.53%", "129.57%", "137.60%", "145.64%", "153.67%", "161.71%", "169.75%", "177.78%"] },
    { attributeName: "편집 · 하드 컷 피해", description: "", values: ["75.15%", "81.32%", "87.48%", "96.11%", "102.27%", "109.36%", "119.22%", "129.08%", "138.93%", "149.41%", "161.74%", "174.06%", "186.38%", "198.71%", "211.03%", "223.36%", "235.68%", "248.01%", "260.33%", "272.66%"] },
    { attributeName: "편집으로 회복하는 협주 에너지", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
    { attributeName: "편집 · 하드 컷으로 회복하는 협주 에너지", description: "", values: ["10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10", "10"] },
  ],
};

// 공명 회로 — 망각 하나뿐이고 판정은 일반 공격이다.
const circuitSkillAttacks: Attack[] = [
  {
    id: "1005007_1",
    name: "망각 피해",
    type: "Skill",
    damageBonusType: "Basic", // DamageList Type = 일반 공격
    element: "Glacio",
    scalingStat: "ATK",
    skillLevel: 10,
    hits: [
      [1.4359, 1.5537, 1.6714, 1.8363, 1.954, 2.0894, 2.2778, 2.4662, 2.6546, 2.8548],
    ],
  },
];

const circuitSkill: Skill = {
  id: "1005007",
  category: "Circuit",
  name: "기억 궁전",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuosela/SP_SkillIconLuoselaY.webp",
  attacks: circuitSkillAttacks,
  attributes: [
    { attributeName: "망각 피해", description: "", values: ["143.59%", "155.37%", "167.14%", "183.63%", "195.40%", "208.94%", "227.78%", "246.62%", "265.46%", "285.48%", "309.03%", "332.57%", "356.12%", "379.67%", "403.22%", "426.77%", "450.32%", "473.87%", "497.42%", "520.96%"] },
  ],
};
const passive5004: Skill = {
  id: "1005004",
  category: "Passive",
  name: "슬로우 모션",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuosela/SP_SkillIconLuoselaD1.webp",
  attacks: [],
};

const passive5005: Skill = {
  id: "1005005",
  category: "Passive",
  name: "명심",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuosela/SP_SkillIconLuoselaD2.webp",
  attacks: [],
};

const passive5008: Skill = {
  id: "1005008",
  category: "Passive",
  name: "요리의 달인",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuosela/SP_SkillIconLuoselaY.webp",
  attacks: [],
};

const passive5009: Skill = {
  id: "1005009",
  category: "Intro",
  name: "몽타주",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconLuosela/SP_SkillIconLuoselaT.webp",
  attacks: [],
};

const passive5010: Skill = {
  id: "1005010",
  category: "Sync",
  name: "조화도 파괴 · 증폭기",
  icon: "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconWeakPointBreakMagic.webp",
  attacks: [],
};
/**
 * 고유 스킬 · 반주 스킬 · 공명체인 6개를 계산 가능한 버프로 옮긴 것.
 * 공명 모드(서리 · 에코)에 따라 갈리는 것은 resonanceMode로 표시했다 —
 * 지금 고른 모드와 다른 버프는 deriveCharacterBuffs에서 아예 빠진다.
 */
const passiveBuffs: CharacterBuffTemplate[] = [
  // ── 스킬에서 오는 것 (설명문에서 옮김) ──
  {
    label: "생생한 기억 · 일반 공격 피해 보너스 (서리 모드)",
    target: "damageBonus",
    damageType: "Basic",
    value: 0.3,
    uptime: "active",
    scope: "self",
    resonanceMode: "Frost",
    condition: "서리 모드에서 공명 해방 발동 후 10초간",
  },
  {
    label: "생생한 기억 · 에코 어빌리티 피해 보너스 (에코 모드)",
    target: "damageBonus",
    damageType: "Echo",
    value: 0.3,
    uptime: "active",
    scope: "self",
    resonanceMode: "Echo",
    condition: "에코 모드에서 공명 해방 발동 후 10초간",
  },
  {
    label: "기억 궁전 · 줌 1스택당 파티 에코 크리티컬 피해",
    target: "critDamage",
    damageType: "Echo",
    value: 0.1,
    maxStacks: 5,
    uptime: "active",
    scope: "party",
    resonanceMode: "Echo", // 「줌」은 에코 모드에서만 쌓인다(기시감)
    condition: "「줌」 스택만큼, 파티 등장 캐릭터의 에코 어빌리티에",
  },
  // ── 고유 스킬 「슬로우 모션」 ──
  {
    label: "슬로우 모션 · 응결 저항 감소 (서리 모드)",
    inherentSkillId: "1005004",
    target: "resReduction",
    damageType: "All",
    element: "Glacio",
    value: 0.08, // 저항 8% 감소
    uptime: "active",
    scope: "party",
    resonanceMode: "Frost",
    condition: "서리 모드에서 팔로우 스폿 발동 후 30초간",
  },
  {
    label: "슬로우 모션 · 파티 에코 어빌리티 피해 보너스 (에코 모드)",
    inherentSkillId: "1005004",
    target: "damageBonus",
    damageType: "Echo",
    value: 0.25, // 25% 증가
    uptime: "active",
    scope: "party",
    resonanceMode: "Echo",
    condition: "에코 모드에서 팔로우 스폿 발동 후 30초간",
  },

  // ── 반주 스킬 「몽타주」 (에코 모드) ──
  {
    label: "몽타주 · 에코 어빌리티 피해 부스트 (에코 모드)",
    target: "boost",
    damageType: "Echo",
    value: 0.5, // 50% 부스트
    uptime: "active",
    scope: "party",
    resonanceMode: "Echo",
    condition: "에코 모드. 반주로 등장한 캐릭터에게 14초간",
  },

  // ── 공명체인 ──
  {
    label: "1체인 · 크리티컬",
    target: "critRate",
    damageType: "All",
    value: 0.2, // 20% 증가
    uptime: "active",
    scope: "self",
    resonanceChain: 1,
    condition: "공명 스킬 팔로우 스폿 발동 후 10초간",
  },
  {
    label: "2체인 · 파티 에코 어빌리티 피해 보너스 (에코 모드)",
    target: "damageBonus",
    damageType: "Echo",
    value: 0.4, // 40% 증가
    uptime: "active",
    scope: "party",
    resonanceChain: 2,
    resonanceMode: "Echo",
    condition: "에코 모드에서 공명 해방 발동 후. 추억 종료 뒤에도 30초 유지",
  },
  // 3체인 — DamageList에 42.66% 옆에 85.32%(× 2), 298.6% 옆에 597.19%(× 2)가 들어 있다.
  {
    label: "3체인 · 내려놓기 배율 상승",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1005003_5"],
    value: 1, // 배율 100% 상승
    modifier: "amplify",
    uptime: "passive", // 조건이 없어 늘 걸린다
    scope: "self",
    resonanceChain: 3,
  },
  {
    label: "4체인 · 공격력",
    target: "atkPercent",
    damageType: "All",
    value: 0.1, // 스택당 10% 증가
    stacks: 3, // 기본값
    maxStacks: 3,
    uptime: "active",
    scope: "self",
    resonanceChain: 4,
    condition: "망각 발동 시 1스택, 6초 지속",
  },
  // 5체인 — DamageList에 143.59% 옆에 215.39%(= 143.59 × 1.5) 엔트리가 들어 있다.
  {
    label: "5체인 · 망각 배율 상승",
    target: "motionValue",
    damageType: "All",
    attackIds: ["1005007_1"],
    value: 0.5, // 배율 50% 상승
    modifier: "amplify",
    uptime: "passive", // 조건이 없어 늘 걸린다
    scope: "self",
    resonanceChain: 5,
  },
  {
    label: "6체인 · 명심 (내려놓기 피해)",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1005003_5"],
    value: 2, // 스택당 200% 증가
    stacks: 3, // 기본값 — 최대 600%이므로 3스택분
    maxStacks: 3,
    uptime: "active",
    scope: "self",
    resonanceChain: 6,
    condition: "추억 상태에서 「사진」을 소모할 때마다 1스택, 최대 3스택",
  },
  // ── 에코 모드 판정 전환 ──
  // 「생생한 기억」 · 「내려놓기」 · 「망각」은 DamageList에 같은 배율이 두 벌씩 있다.
  //   생생한 기억 71.8%   1109010011 일반 공격 / 1109010012 에코 어빌리티
  //   내려놓기 42.66%·298.6%  1109014011·021 일반 공격 / 1109014012·022 에코 어빌리티
  //   망각 143.59%        1109010021 일반 공격 / 1109010022 에코 어빌리티
  // 설명문도 「서리 / 에코에 있을 시 일반 공격 피해 / 에코 어빌리티 피해로 적용된다」다.
  // Attack에는 서리 쪽(일반 공격)을 담아두고, 에코 모드일 때 여기서 판정만 갈아 끼운다.
  // 수치는 0이다 — 하는 일이 판정 전환뿐이라 피해에 더하는 값이 없다.
  {
    label: "에코 모드 · 생생한 기억 · 내려놓기 · 망각을 에코 어빌리티 판정으로",
    target: "damageBonus",
    damageType: "All",
    attackIds: ["1005003_1", "1005003_5", "1005007_1"],
    value: 0,
    switchesDamageBonusType: "Echo",
    uptime: "passive", // 모드만 맞으면 늘 그렇다 — 따로 켤 조건이 없다
    scope: "self",
    resonanceMode: "Echo",
  },

  // ── 「서리 효과」 피해 부스트 ──
  // 이상 효과 피해는 일반 피해와 계산식이 달라 전용 자리(anomalyBoost)에 담는다.
  // damageType에 어느 효과인지 적으면 그 효과의 피해에만 걸린다.
  {
    label: "몽타주 · 서리 효과 피해 부스트 (서리 모드)",
    target: "anomalyBoost",
    damageType: "FrostChafe",
    value: 0.6, // 60% 부스트
    uptime: "active",
    scope: "party", // 등장 캐릭터 주변 목표가 받는 피해라 파티 전원이 덕을 본다
    resonanceMode: "Frost",
    condition: "서리 모드. 반주 발동 후 30초간 (모드 전환 시 즉시 종료)",
  },
  {
    label: "2체인 · 서리 효과 피해 부스트 (서리 모드)",
    target: "anomalyBoost",
    damageType: "FrostChafe",
    value: 0.8, // 80% 부스트
    uptime: "active",
    scope: "party",
    resonanceChain: 2,
    resonanceMode: "Frost",
    condition: "서리 모드에서 공명 해방 발동 시",
  },
];

// 미반영 — 피해 계산과 무관하거나 엔진이 다루지 못해 뺀 것들
//   고유 「명심」   필름 · 줌 스택 상한 증가
//   1체인 앞부분   포커스 링 자동 완성, 중단 저항
//   4체인 뒷부분   플래시 백 3단 중 받는 피해 30% 감소
//   6체인 뒷부분   「그리움」으로 「인상」 회복
//   고유 「요리의 달인」 요리 확률 효과

const skills: Skill[] = [
  basicSkill,
  resonanceSkill,
  liberationSkill,
  variationSkill,
  circuitSkill,
  passive5004,
  passive5005,
  passive5008,
  passive5009,
  passive5010,
];

export const lucila: Character = {
  id: "lucila",
  name: "루실라",
  level: 90,
  element: "Glacio",
  weaponType: "Rectifier",
  // 게임 SkillBranches의 IsDefault가 서리라 서리를 앞에 둔다(첫 값이 기본 모드).
  resonanceModes: ["Frost", "Echo"],
  baseStats,
  skills,
  passiveBuffs,
  // 계산 가능한 고정 스탯 보너스가 없어 비워둔다(전부 조건부라 passiveBuffs로 갔다).
  chainEffects: [],
  // API RoleHeadIconBig / RoleHeadIconLarge. 파일 번호는 캐릭터 Id(1109)가 아니라 별도 번호(66)다.
  iconUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead150/T_IconRoleHead150_66_UI.webp",
  artUrl:
    "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_66_UI.webp",
  echoIds: [],
};
