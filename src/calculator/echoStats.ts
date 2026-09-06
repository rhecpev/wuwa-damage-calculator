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
 *         벨리나 21819 · 페비 17104 · 젠니 16260
 *   공격력 현령 2434 · 히유키 2381 · 루실라 2187
 *   방어력 모니에 3105 · 젠니 1321 · 페비 1731 · 벨리나 1468
 * 「페비 HP 17104」와 「젠니 HP 16260」은 HP% 부옵션이 8.6 한 줄뿐이라 그 값을 바로 못 박는다
 * (8.5847~8.5912%). 「수수 HP」의 9.4, 「젠니 방어력」의 11.8, 「모니에 방어력」의 9.0도 마찬가지다.
 *
 * 아직 안 맞는 것 —
 *   페비 공격력 2336: 부옵션 몫이 165여야 하는데 위 값으로는 163이다. 8.6+9.4가 18.09%를
 *     넘어야 하는데, 같은 값을 쓰는 HP 실측이 그 위로 올라가는 것을 막는다. 공격력 쪽만
 *     구조가 조금 다른 것으로 보이나 아직 못 잡았다.
 *   벨리나 공격력 1612: 94나 어긋난다. HP·방어력은 같은 에코로 맞으므로 에코 자료는
 *     맞고, 무기 쪽(앱에 「수행자의 증폭기 · 탐색」 Lv90 정련5로 저장돼 있다)이 실제와
 *     다른 것으로 보인다.
 *
 * 이 표는 **버림을 타는 칸에만** 걸린다. 피해 보너스·크리티컬처럼 피해식에 그대로 곱해지는
 * 칸은 표시값이 맞다 — 현령 실측 열 줄이 그것을 따로 확인했다(아래 ADJUSTED_KEYS).
 */
const SUB_PANEL_PERCENT: Record<string, Record<string, number>> = {
  hpPercent: {
    "6.4": 6.388,
    "7.1": 7.093,
    "8.6": 8.588,
    "9.4": 9.373,
    "10.1": 10.11,
    "10.9": 10.9,
    "11.6": 11.599,
  },
  atkPercent: {
    "6.4": 6.376,
    "7.9": 7.95,
    "8.6": 8.6,
    "9.4": 9.374,
    "10.1": 10.109,
    "10.9": 10.888,
    "11.6": 11.575,
  },
  defPercent: {
    "9.0": 9.03,
    "10.9": 10.77,
    "11.8": 11.93,
    "13.8": 13.79,
  },
};

/** 표에 없는 값은 아직 실측이 없다. 예전 상수만큼만 깎아 둔다. */
const SUB_PERCENT_ADJUST = 0.008;

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
) {
  const calType = ECHO_DMG_CAL_TYPES[type];
  const key = calType ? DMG_CAL_BUCKET[calType] : ECHO_STAT_KEYS[type];
  if (!key) return; // 미지원 옵션(치료 효과 등)이거나 모르는 라벨
  const value = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  if (!Number.isFinite(value)) return;
  const isPercent = type.endsWith("(%)");
  // 부옵션 퍼센트 중 버림을 타는 칸만 표시값 대신 「먹히는 값」으로 바꿔 담는다.
  const percent = fromSub && ADJUSTED_KEYS.has(key) ? subPanelPercent(key, value) : value;
  const amount = isPercent ? percent / 100 : value;
  target[key] = (target[key] ?? 0) + amount;
}

/** myEcho.json 한 개의 옵션 전부(메인·메인 서브·부옵션 5줄)를 Stats로 합친다. */
export function echoStats(echo: any): Partial<Stats> {
  const stats: Partial<Stats> = {};
  const options = echo?.options;
  if (!options) return stats;

  put(stats, options.mainOption?.type, options.mainOption?.value);
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
