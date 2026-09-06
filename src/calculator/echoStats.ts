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
 * 부옵션 퍼센트가 게임 화면에 찍힐 때 깎이는 자릿수.
 *
 * 게임은 부옵션 퍼센트를 소수 첫째 자리까지만 보여 준다. 그런데 실제로 걸리는 값은
 * 그 표시값보다 **0.01%p 낮다** — 표시값이 반올림된 것이다. 스탯창 계산이 버림이라
 * 이 0.01%p가 결과를 1~2 어긋나게 만든다.
 *
 * 치사 Lv.90(기초 HP 10775) 실측 두 건이 이 자리를 잡아 준다.
 *   HP% 7.9 하나 + 메인 서브 옵션 HP 2280 하나   → 게임 +3130
 *     표시값 그대로: ⌊10775×0.079⌋+2280 = 851+2280 = 3131  (1 어긋남)
 *     0.01%p 낮게:  ⌊10775×0.0789⌋+2280 = 850+2280 = 3130  ← 일치
 *   HP% 7.9+10.1 + 메인 서브 옵션 HP 2280 셋      → 게임 +8777
 *     표시값 그대로: ⌊10775×0.180⌋+6840 = 1939+6840 = 8779  (2 어긋남)
 *     0.01%p 낮게:  ⌊10775×0.1798⌋+6840 = 1937+6840 = 8777 ← 일치
 *
 * 어긋나는 양이 부옵션 개수를 따라가므로 「버림 위치」 문제가 아니다. 그렇다고
 * 「옵션마다 1씩 깎는다」로 두면 앞서 맞춰 둔 공격력 실측(2564)이 2557로 깨진다.
 * 퍼센트값 자체가 낮다고 보는 쪽만 세 실측을 동시에 맞춘다
 * (공격력 쪽 에코 87.8% → 87.7x%, ⌊937×0.877x⌋ = 822로 그대로다).
 *
 * 메인 옵션·메인 서브 옵션은 이 보정을 받지 않는다. 실측으로 확인한 적이 없고,
 * 위 두 건도 메인 서브 옵션 HP 2280을 표시값 그대로 두어야 맞는다.
 */
const SUB_PERCENT_ADJUST = 0.0001;

/**
 * 라벨에 "(%)"가 붙어 있으면 표시값이 퍼센트다 — 0.01 단위로 바꿔 담는다.
 * fromSub는 부옵션 5줄에서 온 값이라는 뜻이다(위 SUB_PERCENT_ADJUST 설명 참고).
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
  const amount = isPercent ? value / 100 - (fromSub ? SUB_PERCENT_ADJUST : 0) : value;
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
