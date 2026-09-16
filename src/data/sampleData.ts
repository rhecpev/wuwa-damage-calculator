import type { Character } from "../types/game";
import { ATTACK_TRIGGERS } from "./attackTriggers";

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

/**
 * 공격마다 「피해 말고 따로 일으키는 일」을 붙인다(attackTriggers.ts).
 *
 * 캐릭터 파일은 API 원본을 옮겨 적은 것이라 트리거를 거기 적지 않는다. 대신 공격 id를 열쇠로
 * 하는 표를 따로 두고, **불러올 때 한 번** 공격에 매달아 준다 — 화면과 계산은 `attack.trigger`
 * 하나만 보면 된다. 표에 없는 공격은 필드가 없다(= 피해만 준다).
 */
function withTriggers(character: Character): Character {
  return {
    ...character,
    skills: character.skills.map((skill) => ({
      ...skill,
      attacks: skill.attacks.map((attack) => {
        const trigger = ATTACK_TRIGGERS[attack.id];
        return trigger ? { ...attack, trigger } : attack;
      }),
    })),
  };
}

export const characters: Character[] = Object.keys(modules)
  .sort((a, b) => a.localeCompare(b))
  .flatMap((path) => Object.values(modules[path]).filter(isCharacter))
  .map(withTriggers);

export function getAvailableCharacters(): Character[] {
  return characters;
}
