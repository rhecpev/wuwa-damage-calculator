import characterStatsData from "./characterStats.json";
import type { Character } from "../types/game";

/**
 * 레벨별 기초 스탯(HP/공격력/방어력) 표. 원본 덤프에서 뽑은 것으로,
 * scripts/build-character-stats.mjs 가 src/data/characterStats.json 을 만든다.
 *
 * 캐릭터 데이터 파일의 baseStats는 레벨 90 고정값이라 레벨을 내리면 맞지 않는다.
 * characterAtLevel()로 그 레벨의 값을 채운 사본을 만들어 계산·표시에 쓴다.
 * (스킬 트리에서 오는 공격력%·속성 피해 보너스 같은 값은 레벨과 무관해 그대로 둔다.)
 */

export const CHARACTER_LEVEL_MIN = 1;
export const CHARACTER_LEVEL_MAX = 90;
export const DEFAULT_CHARACTER_LEVEL = CHARACTER_LEVEL_MAX;

type LevelTables = Partial<Record<"hp" | "atk" | "def", number[]>>;

const tables = characterStatsData as Record<string, LevelTables | undefined>;

export const clampCharacterLevel = (level: number) =>
  Math.min(Math.max(Math.round(level), CHARACTER_LEVEL_MIN), CHARACTER_LEVEL_MAX);

/** 이 캐릭터의 레벨별 표가 있는지. 없으면 레벨을 바꿔도 기초 스탯은 그대로다. */
export const hasLevelTable = (id: string) => tables[id] !== undefined;

/**
 * 고른 레벨의 기초 스탯을 채운 캐릭터 사본.
 * 표가 없는 캐릭터도 레벨 자체는 반영한다 — 방어저항 배율이 내 레벨을 보기 때문.
 */
export function characterAtLevel(c: Character, level: number): Character {
  const lv = clampCharacterLevel(level);
  const t = tables[c.id];
  const hp = t?.hp?.[lv - 1];
  const atk = t?.atk?.[lv - 1];
  const def = t?.def?.[lv - 1];

  if (hp === undefined || atk === undefined || def === undefined) {
    return lv === c.level ? c : { ...c, level: lv };
  }

  return { ...c, level: lv, baseStats: { ...c.baseStats, hp, atk, def } };
}
