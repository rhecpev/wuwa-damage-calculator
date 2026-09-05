import weaponsData from "./weapons.json";
import type { Weapon, WeaponType } from "../types/game";
import { weaponBuffs, type WeaponBuffTemplate } from "./weaponBuffs";
import { DMG_CAL_BUCKET, type DmgCalType, type Stats } from "../types/stats";

/**
 * encore.moe API v2에서 받아온 무기 122종.
 * 원본 덤프는 api/weapons.json, 여기서 쓰는 건 계산·표시에 필요한 필드만 추린 src/data/weapons.json.
 *
 * baseAtk / subStatValue는 레벨 90(최종 돌파) 기준이다.
 * 무기 레벨을 고른 경우 weaponAtLevel()로 그 레벨의 공격력과 부옵션을 채운 사본을 쓴다.
 */
export interface WeaponEntry extends Weapon {
  weaponType: WeaponType;
  typeName: string;
  /** 1~5 (별 개수) */
  rarity: number;
  icon: string;
  subStatName: string;
  /** 부옵션에 대응하는 Stats 키. 공명 효율은 Stats에 필드가 없어 null. */
  subStatKey: keyof Stats | null;
  subStatValue: number;
  /** 부옵션이 공격력/HP/방어력 계산식의 어느 자리로 들어가는지. 그 외 부옵션은 null. */
  subStatDmgCalType: DmgCalType | null;
  /** 레벨별 공격력. atkLevels[레벨-1] = 그 레벨의 공격력. */
  atkLevels: number[];
  /**
   * 레벨별 부옵션. subStatLevels[레벨-1] = 그 레벨의 부옵션 값.
   * 공격력과 달리 돌파 구간에서만 오르는 계단형이라 같은 값이 여러 레벨에 걸쳐 이어진다.
   */
  subStatLevels: number[];
  passiveName: string;
  passiveDesc: string;
  /** 정련 1~5단계 수치. 표시용이며 계산에는 반영되지 않는다. */
  passiveParams: string[][];
  /**
   * 무기 스킬을 계산 가능한 버프로 옮겨 적은 것(src/data/weaponBuffs.ts).
   * 아직 옮기지 않은 무기는 빈 배열이다.
   */
  passiveBuffs: WeaponBuffTemplate[];
}

interface RawWeapon
  extends Omit<WeaponEntry, "stats" | "subStatKey" | "subStatDmgCalType" | "passiveBuffs"> {
  subStatKey: string | null;
  subStatDmgCalType: string | null;
}

/** 무기 레벨 범위. 표시와 슬라이더가 같이 쓴다. */
export const WEAPON_LEVEL_MIN = 1;
export const WEAPON_LEVEL_MAX = 90;
export const DEFAULT_WEAPON_LEVEL = WEAPON_LEVEL_MAX;

export const weapons: WeaponEntry[] = (weaponsData.weapons as RawWeapon[]).map((w) => ({
  ...w,
  subStatKey: w.subStatKey as keyof Stats | null,
  subStatDmgCalType: w.subStatDmgCalType as DmgCalType | null,
  passiveBuffs: weaponBuffs[w.id] ?? [],
  // 부옵션은 퍼센트 정수까지만 쓴다(floorSubStat). 표시와 계산이 같은 값을 보게 한다.
  subStatValue: floorSubStat(w.subStatValue),
  // Weapon.stats — 계산 엔진이 그대로 합산하는 부분. 부옵션 하나만 들어간다.
  // 공격력/HP/방어력 부옵션은 dmgCalType이 가리키는 버킷에 담는다(공격력% -> atkPercent).
  // 무기 스킬(패시브)은 조건부/스택형이 많아 자동 변환하지 않았다.
  stats: statsOf(w),
}));

/**
 * 부옵션(무기 두 번째 옵션) 소수점 처리.
 * 원본은 36.45% 같은 두 자리 소수로 온다. 퍼센트 소수 둘째 자리부터 버려 한 자리까지만 쓴다
 *   36.45% → 36.4%
 * 되돌리려면 이 함수가 v를 그대로 돌려주게 두면 된다.
 * function 선언인 이유 — 아래 weapons 목록을 만들 때 이미 불리므로 호이스팅이 필요하다.
 */
function floorSubStat(v: number) {
  return Math.floor(v * 1000) / 1000;
}

/** 부옵션 한 줄을 Stats 한 칸으로. dmgCalType이 있으면 그게 자리를 정한다. */
function statsOf(w: {
  subStatDmgCalType: string | null;
  subStatKey: string | null;
  subStatValue: number;
}): Partial<Stats> {
  const bucket = w.subStatDmgCalType
    ? DMG_CAL_BUCKET[w.subStatDmgCalType as DmgCalType]
    : (w.subStatKey as keyof Stats | null);
  return bucket ? { [bucket]: w.subStatValue } : {};
}

/**
 * 고른 레벨의 공격력과 부옵션을 채운 무기 사본. 계산·표시 모두 이걸 거쳐서 쓴다.
 * 부옵션은 표시용 subStatValue와 계산용 stats 양쪽을 같이 갈아끼운다
 * — 한쪽만 바꾸면 화면 숫자와 계산이 어긋난다.
 * 표가 없거나 레벨이 범위를 벗어난 값은 손대지 않고 레벨 90 값을 그대로 둔다.
 */
export function weaponAtLevel(weapon: WeaponEntry, level: number): WeaponEntry {
  const index = Math.round(level) - 1;
  const atk = weapon.atkLevels?.[index];
  const sub = weapon.subStatLevels?.[index];
  if (atk === undefined && sub == null) return weapon;

  const next = { ...weapon };
  if (atk !== undefined) next.baseAtk = atk;
  if (sub != null) {
    next.subStatValue = floorSubStat(sub);
    next.stats = statsOf(next);
  }
  return next;
}

export const weaponsById = new Map(weapons.map((w) => [w.id, w]));

/** 해당 무기 종류로 장착 가능한 무기만 추린다. */
export function weaponsFor(type: WeaponType): WeaponEntry[] {
  return weapons.filter((w) => w.weaponType === type);
}
