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

/** 라벨에 "(%)"가 붙어 있으면 표시값이 퍼센트다 — 0.01 단위로 바꿔 담는다. */
function put(target: Partial<Stats>, type: string, raw: string | number | undefined) {
  const calType = ECHO_DMG_CAL_TYPES[type];
  const key = calType ? DMG_CAL_BUCKET[calType] : ECHO_STAT_KEYS[type];
  if (!key) return; // 미지원 옵션(치료 효과 등)이거나 모르는 라벨
  const value = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  if (!Number.isFinite(value)) return;
  target[key] = (target[key] ?? 0) + (type.endsWith("(%)") ? value / 100 : value);
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
  mains.forEach((type, index) => put(stats, type, subs[index]));

  return stats;
}
