import echoOptionData from "../data/echoOption.json";
import { DMG_CAL_BUCKET, type DmgCalType, type Stats } from "../types/stats";

/**
 * 보유 에코(src/data/myEcho.json)의 옵션은 게임 화면에 찍힌 한국어 라벨과
 * 문자열 수치 그대로 저장돼 있다. 계산 엔진이 쓰는 Stats 키로 옮겨준다.
 *
 * 값이 null인 항목은 Stats에 대응 필드가 없는 것이라 합산에서 제외된다.
 * 라벨 목록은 src/data/echoOption.json 기준이다.
 *
 * 공격력·HP·방어력 옵션만은 어느 자리로 들어가는지를 계산기가 정하지 않고
 * echoOption.json의 dmgCalType에 적힌 값을 그대로 따른다.
 *   atkPer  -> 백분율 합산   atkPlus -> 깡공
 */
const ECHO_STAT_KEYS: Record<string, keyof Stats | null> = {
  HP: "hp",
  "HP(%)": "hpPercent",
  공격력: "atk",
  "공격력(%)": "atkPercent",
  방어력: "def",
  "방어력(%)": "defPercent",
  "크리티컬(%)": "critRate",
  "크리티컬 피해(%)": "critDamage",
  "공명효율(%)": "energyRegen",
  "치료효과 보너스(%)": "healingBonus",
  "일반공격 피해 보너스(%)": "basicDamageBonus",
  "강공격 피해 보너스(%)": "heavyDamageBonus",
  "공명스킬 피해 보너스(%)": "skillDamageBonus",
  "공명해방 피해 보너스(%)": "liberationDamageBonus",
  "기류 피해 보너스(%)": "aeroDamageBonus",
  "응결 피해 보너스(%)": "glacioDamageBonus",
  "전도 피해 보너스(%)": "electroDamageBonus",
  "용융 피해 보너스(%)": "fusionDamageBonus",
  "인멸 피해 보너스(%)": "havocDamageBonus",
  "회절 피해 보너스(%)": "spectroDamageBonus",
};

/** 라벨 -> dmgCalType. 여기 있는 라벨은 ECHO_STAT_KEYS보다 이 값이 우선한다. */
const ECHO_DMG_CAL_TYPES = echoOptionData.dmgCalType as Record<string, DmgCalType | undefined>;

/**
 * 부옵션 퍼센트가 **스탯창 버림에 들어갈 때** 먹히는 값. 표시값과 조금씩 다르다.
 *
 * 스탯창 값은 ⌊기초 × Σ%⌋ 꼴로 버려지는데(calculator/stats.ts), 표시값을 그대로 넣으면
 * 결과가 1~4씩 어긋난다. 한동안 「어느 부옵션이든 0.008%p 낮다」는 상수로 맞췄지만
 * 실측이 쌓이면서 그 모양이 깨졌다 — 같은 2줄짜리인데 요구가 갈린다.
 *   현령 HP(8.6+10.9)  → 총 0.008~0.017%p 낮아야 한다
 *   히유키 HP(6.4+8.6) → 총 0.029~0.039%p 낮아야 한다
 * 그래서 값마다 따로 잡는다.
 *
 * **스탯 종류마다 표가 다르다.** 방어력%는 부옵션 눈금 자체가 다르고(8.1 · 9.0 · 10.0 ·
 * 10.9 · 11.8 · 12.8 · 13.8 · 14.7), 같은 숫자여도 HP·공격력 쪽과 다르게 움직인다.
 * HP와 공격력도 실측이 서로 다른 값을 요구해 갈라 두었다.
 *
 * 값을 잡아 준 실측(전부 docs/피해-실측-대조.md) —
 *   HP    수수 25703 · 단근 17532 · 현령 18243 · 히유키 16722 · 모니에 23900 ·
 *         벨리나 21819 · 페비 17104 · 젠니 16260 · 카르티시아 50102
 *   공격력 현령 2434 · 히유키 2381 · 루실라 2187 · 치사 2283 · 샤콘 2295
 *   방어력 모니에 3105 · 젠니 1321 · 페비 1731 · 벨리나 1468
 * 「페비 HP 17104」와 「젠니 HP 16260」은 HP% 부옵션이 8.6 한 줄뿐이라 그 값을 바로 못 박는다
 * (8.5847~8.5912%). 「수수 HP」의 9.4, 「젠니 방어력」의 11.8, 「모니에 방어력」의 9.0도 마찬가지다.
 *
 * 7.1은 실측 둘이 갈라서 잡아 줬다. 앞선 값(HP 7.093 · 공격력은 표에 없어 표시값)으로는
 * 둘 다 높게 나왔다 — 카르티시아 HP가 50107(게임 50102) · 샤콘 공격력이 2296(게임 2295).
 *   카르티시아 HP 50102: 부옵션 8.6+8.6+7.1. 8.6이 위 구간에 못 박혀 있어 7.1만 움직일 수
 *     있고, 7.053~7.072%를 요구한다.
 *   샤콘 공격력 2295: 부옵션 7.9+7.1. 7.9는 치사 실측(7.9 세 줄)이 표시값으로 못 박아 둬서
 *     역시 7.1만 남고, 6.927~7.031%를 요구한다.
 * 두 구간이 겹치지 않는다 — 10.1이 HP 10.11 · 공격력 10.02로 갈리는 것과 같은 모양이라
 * 눈금 하나가 스탯 종류마다 다르다는 것을 한 번 더 확인해 준다.
 *
 * 아직 안 맞는 것 — **공격력은 실측 일곱 건이 전부 맞는다.** 남은 한 건은 HP 쪽이다.
 *   카르티시아 HP 50102: 7.1을 벨리나 HP(21819)에 맞추면서 다시 어긋난다. 카르티시아는
 *     HP% 메인이 섞인 실측이라 메인 쪽 값이 표시값과 다를 수 있어 부옵션만으로 잰
 *     벨리나를 따랐다. HP% 메인이 섞인 실측이 더 오면 메인 값을 값마다 다시 잡는다.
 *   (예전에 이 자리에 적혀 있던 「페비 공격력 2336 · 벨리나 공격력 1612가 어긋난다」는
 *    지금 표로 둘 다 맞는다 — 페비는 ⌊912×1.24⌋ + ⌊912×0.84⌋ + 깡 440 = 2336.
 *    살아 있는 대조표는 늘 docs/피해-실측-대조.md의 「스탯 실측 대조」다.)
 *
 * 이 표는 **버림을 타는 칸에만** 걸린다. 피해 보너스·크리티컬처럼 피해식에 그대로 곱해지는
 * 칸은 표시값이 맞다 — 현령 실측 열 줄이 그것을 따로 확인했다(아래 ADJUSTED_KEYS).
 */
const SUB_PANEL_PERCENT: Record<string, Record<string, number>> = {
  // HP % — 표시값보다 조금씩 낮다.
  //   7.9 · 10.1은 모르테피 HP 17909(10.1+10.1+7.9)와 치사 HP +3130(7.9) · +8777(7.9+10.1)이
  //   함께 잡는다. 설지 HP 19370(7.9+7.9+10.9)이 더해져 HP 실측 일곱 건을 한 번에 맞추는 값으로 다시 풀었다
  //   (치사 두 건 · 모르테피 · 벨리나 · 현령 · 설지 · 단근 — 가장 여유가 큰 자리).
  //   (예전 10.11 · 7.9 표시값으로는 모르테피 17914 · 치사 3131 / 8780으로 높게 나왔다)
  hpPercent: {
    "6.4": 6.388,
    // 7.1은 벨리나 HP 21819(8.6+7.1)가 7.086~7.100을 요구한다. 한때 카르티시아 HP 50102에 맞춰
    // 7.06으로 내렸었는데 그러면 벨리나가 21814로 어긋난다. 카르티시아는 메인 옵션 HP%가
    // 섞인 실측이라 메인 쪽 값이 표시값과 다를 수 있어, 부옵션만으로 잰 벨리나를 따른다.
    "7.1": 7.093,
    "7.9": 7.892,
    "8.6": 8.588,
    "9.4": 9.373,
    "10.1": 10.092,
    "10.9": 10.898, // 설지 HP 19370(7.9+7.9+10.9) · 현령 HP 18243(8.6+10.9)
    "11.6": 11.599,
  },
  // 공격력 % — 실측 일곱 건. 10.1 · 7.1을 뺀 나머지는 표시값 그대로가 맞는다.
  atkPercent: {
    "7.1": 6.98,
    "10.1": 10.02,
  },
  // 방어력 % — 실측 네 건. 눈금 자체가 다르다(8.1 · 9.0 · 10.0 · 10.9 · 11.8 · 12.8 · 13.8 · 14.7).
  defPercent: {
    "9.0": 8.99,
    "10.9": 10.77,
    "11.8": 11.93,
    "13.8": 13.79,
  },
};

/**
 * **메인 옵션** 퍼센트가 스탯창 버림에 들어갈 때 먹히는 값. 지금은 HP%만 있다.
 *
 * 파수인 HP 49915 — 기초 16712 · 스킬 트리 12% · 메인 HP 33 + 30 + 22.8 + 22.8 ·
 * 부옵션 10.1×3 + 10.9 + 7.1 · 깡 4990. 에코 HP% 합이 156.819~156.825%여야 하는데
 * 표시값 메인으로는 156.867%(49923)다. 부옵션은 다른 HP 실측 일곱 건에 묶여 합쳐서
 * 0.022%p밖에 못 내리므로 메인 쪽이 표시값보다 낮아야 한다. 실측이 이 한 건뿐이라
 * 세 값을 같은 비율(×0.99958)로 내렸다 — HP% 메인이 섞인 실측이 더 오면 값마다 다시 잡는다.
 *
 * 공격력% 메인은 표시값 그대로가 맞다 — 현령 공격력 2434(메인 30 · 18 · 18)가 확인했다.
 */
const MAIN_PANEL_PERCENT: Record<string, Record<string, number>> = {
  hpPercent: {
    "33.0": 32.986,
    "30.0": 29.988,
    "22.8": 22.79,
  },
};

/** 표에 없는 값은 표시값 그대로 쓴다 — 실측이 없는 칸을 어림으로 깎지 않는다. */
const SUB_PERCENT_ADJUST = 0;

/**
 * 표시값 -> 스탯창 버림에 들어갈 값(퍼센트 단위 그대로).
 * 표시값은 늘 소수 첫째 자리까지라 키도 그 모양으로 맞춘다 — 9 와 "9.0"이 갈리지 않게.
 */
const subPanelPercent = (key: keyof Stats, shown: number): number =>
  SUB_PANEL_PERCENT[key]?.[shown.toFixed(1)] ?? shown - SUB_PERCENT_ADJUST;

/**
 * 위 표를 태우는 칸 — **스탯창에서 버림을 타는 셋**뿐이다.
 *
 * 피해 보너스·크리티컬은 버림 없이 피해식에 그대로 곱해지므로 표시값이 맞다.
 * 현령 Lv.90 실측 열 줄이 그것을 따로 못 박아 준다 — 같은 공격력·같은 적으로 잰 두 갈래를
 * 견주면 공격력·저항·방어가 약분되고 피해 보너스의 비만 남는데, 그 비가 1.20838~1.20849여야
 * 열 줄이 모두 맞는다(표시값 그대로 1.208410 · 깎으면 벗어난다).
 */
const ADJUSTED_KEYS = new Set<keyof Stats>(["hpPercent", "atkPercent", "defPercent"]);

/**
 * 라벨에 "(%)"가 붙어 있으면 표시값이 퍼센트다 — 0.01 단위로 바꿔 담는다.
 * fromSub는 부옵션 5줄에서 온 값이라는 뜻이다(위 SUB_PANEL_PERCENT 설명 참고).
 */
function put(
  target: Partial<Stats>,
  type: string,
  raw: string | number | undefined,
  fromSub = false,
  fromMain = false,
) {
  const calType = ECHO_DMG_CAL_TYPES[type];
  const key = calType ? DMG_CAL_BUCKET[calType] : ECHO_STAT_KEYS[type];
  if (!key) return; // 미지원 옵션(치료 효과 등)이거나 모르는 라벨
  const value = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  if (!Number.isFinite(value)) return;
  const isPercent = type.endsWith("(%)");
  // 부옵션 퍼센트 중 버림을 타는 칸만 표시값 대신 「먹히는 값」으로 바꿔 담는다.
  const percent =
    fromSub && ADJUSTED_KEYS.has(key)
      ? subPanelPercent(key, value)
      : fromMain && ADJUSTED_KEYS.has(key)
        ? (MAIN_PANEL_PERCENT[key]?.[value.toFixed(1)] ?? value)
        : value;
  const amount = isPercent ? percent / 100 : value;
  target[key] = (target[key] ?? 0) + amount;
}

/** myEcho.json 한 개의 옵션 전부(메인·메인 서브·부옵션 5줄)를 Stats로 합친다. */
export function echoStats(echo: any): Partial<Stats> {
  const stats: Partial<Stats> = {};
  const options = echo?.options;
  if (!options) return stats;

  put(stats, options.mainOption?.type, options.mainOption?.value, false, true);
  put(stats, options.mainSubOption?.type, options.mainSubOption?.value);

  const mains: string[] = options.mainSelects ?? [];
  const subs: string[] = options.subSelects ?? [];
  mains.forEach((type, index) => put(stats, type, subs[index], true));

  return stats;
}

/**
 * 위에서 **부옵션 5줄만** 따로 뽑은 것.
 *
 * 스탯창 값을 낼 때 에코 옵션의 버림이 메인 옵션 몫과 부옵션 몫으로 한 번 더 갈리기 때문에
 * (calculateFinalStats 주석 참고) 그 몫을 알아야 한다. 합산에 두 번 들어가지 않도록
 * 계산에는 echoStats 쪽만 쓰고, 이 값은 「그중 얼마가 부옵션에서 왔는지」로만 쓴다.
 */
export function echoSubStats(echo: any): Partial<Stats> {
  const stats: Partial<Stats> = {};
  const options = echo?.options;
  if (!options) return stats;

  const mains: string[] = options.mainSelects ?? [];
  const subs: string[] = options.subSelects ?? [];
  mains.forEach((type, index) => put(stats, type, subs[index], true));

  return stats;
}
