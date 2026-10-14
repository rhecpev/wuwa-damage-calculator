import { PARTY_SLOTS, usePartyConfig } from "../../../context/PartyConfigContext";
import { characters } from "../../../data/sampleData";
import { ELEMENT_COLORS } from "../../../data/elements";
import type { Character } from "../../../types/game";

/**
 * 같은 속성이 겹칠 때 뒤 사람에게 주는 옮김 — 색상각(도)과 밝기.
 * 한쪽으로만 조금씩 옮기면 셋이 나란히 붙어 잘 안 갈린다. 그래서 둘째는 색상환의 한쪽으로 밝게,
 * 셋째는 반대쪽으로 어둡게 옮긴다 — 첫 사람(속성 색)을 가운데 두고 양옆으로 벌어진다.
 */
const SHIFTS = [
  { hue: 0, light: 0 },
  { hue: 55, light: 0.07 },
  { hue: -55, light: -0.1 },
];

/**
 * 캐릭터를 나타내는 색. 기본은 그 캐릭터의 속성 색이다.
 *
 * 파티에 같은 속성이 둘 이상이면 표와 그래프에서 둘이 한 색으로 섞인다. 그래서 파티 자리 순서로
 * 그 속성의 첫 사람은 속성 색 그대로, 다음 사람부터는 색상각과 밝기를 옮긴 색(SHIFTS)을 준다.
 * 파티에 없는 캐릭터(자리를 비운 뒤에도 사이클에 남은 공격)는 속성 색 그대로다.
 */
export function useCharacterColor(): (character: Pick<Character, "id" | "element">) => string {
  const { config } = usePartyConfig();

  const shift = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const slot of PARTY_SLOTS) {
    const character = characters.find((c) => c.id === config[slot].characterId);
    if (!character) continue;
    const nth = seen.get(character.element) ?? 0;
    seen.set(character.element, nth + 1);
    shift.set(character.id, nth);
  }

  return (character) => {
    const base = ELEMENT_COLORS[character.element];
    const nth = shift.get(character.id) ?? 0;
    // 테마마다 속성 색 값이 달라서(변수) 색을 미리 계산해 둘 수 없다 — 브라우저가 그 자리에서 옮기게 한다.
    if (nth === 0) return base;
    const { hue, light } = SHIFTS[nth] ?? SHIFTS[SHIFTS.length - 1];
    return `oklch(from ${base} calc(l + ${light}) c calc(h + ${hue}))`;
  };
}
