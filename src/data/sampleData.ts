import type { Character } from "../types/game";

/**
 * src/data/characters/*.ts 를 전부 읽어 캐릭터 목록을 만든다.
 * 파일을 추가하면 여기에 등록하는 과정 없이 바로 목록에 나타난다.
 * 각 파일은 Character 객체를 named export 하기만 하면 된다.
 */
const modules = import.meta.glob<Record<string, unknown>>("./characters/*.ts", {
  eager: true,
});

function isCharacter(value: unknown): value is Character {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Partial<Character>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    Array.isArray(c.skills) &&
    typeof c.baseStats === "object"
  );
}

export const characters: Character[] = Object.keys(modules)
  .sort((a, b) => a.localeCompare(b))
  .flatMap((path) => Object.values(modules[path]).filter(isCharacter));

export function getAvailableCharacters(): Character[] {
  return characters;
}
