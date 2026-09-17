import type { Character, ResonanceMode } from "../types/game";

/**
 * 이중 모드 캐릭터를 **모드마다 한 명씩**으로 가른다.
 *
 * 게임에서는 한 캐릭터가 공명 모드를 갈아 끼우지만, 계산기에서는 고른 모드에 따라
 * 걸리는 버프가 통째로 달라진다. 목록에서 「루실라 · 서리」와 「루실라 · 에코」를 따로
 * 고르는 편이 사이클을 견주기에도 낫다 — 한쪽을 담아 두고 다른 쪽을 만져 볼 수 있다.
 * 그래서 캐릭터 파일은 모드를 둘 다 담은 한 덩이로 두고, 여기서 갈라 내보낸다.
 *
 * 가른 id는 `원래id-모드슬러그` 꼴이다(lucila -> lucila-frost · lucila-echo).
 * 스킬 트리 노드 · 공명체인 · 원문은 원래 id로 저장돼 있으므로 baseCharacterId()로
 * 되돌려 찾는다. 저장소(무기 · 스킬 레벨 · 낀 에코)는 가른 id를 그대로 쓴다 —
 * 모드마다 다른 세팅을 들고 있는 것이 자연스럽다.
 */

export const MODE_LABEL: Record<ResonanceMode, string> = {
  Discord: "조화 파동",
  Flame: "불꽃",
  Cluster: "조화 밀집",
  Frost: "서리",
  Echo: "에코",
};

const MODE_SLUG: Record<ResonanceMode, string> = {
  Discord: "discord",
  Flame: "flame",
  Cluster: "cluster",
  Frost: "frost",
  Echo: "echo",
};

const SLUGS = new Set(Object.values(MODE_SLUG));

/** 슬러그 -> 모드. 가른 id에서 모드를 되읽는 데 쓴다. */
const MODE_BY_SLUG = Object.fromEntries(
  Object.entries(MODE_SLUG).map(([mode, slug]) => [slug, mode as ResonanceMode]),
) as Record<string, ResonanceMode>;

/**
 * 가른 id가 어느 모드인지(denia-cluster -> "Cluster"). 가르지 않은 id면 undefined다.
 *
 * 모드가 있는 캐릭터는 목록에 **모드마다 한 명씩** 서므로(modeVariants), id만 보면 지금
 * 어느 모드인지 알 수 있다. 공격 트리거를 모드로 걸러낼 때 이 값을 본다 —
 * 데니아가 불꽃일 때 「조화 밀집 · 이탈」을 붙이지 않는 것이 그 예다.
 */
export function modeOfCharacterId(characterId: string): ResonanceMode | undefined {
  const cut = characterId.lastIndexOf("-");
  if (cut < 0) return undefined;
  return MODE_BY_SLUG[characterId.slice(cut + 1)];
}

/**
 * 가른 id -> 원래 id. **모드 슬러그로 끝나는 것만** 되돌린다 —
 * rover-aero · yangyang-xuanling처럼 모드가 아닌 꼬리는 그대로 둔다.
 */
export function baseCharacterId(characterId: string): string {
  const cut = characterId.lastIndexOf("-");
  if (cut < 0) return characterId;
  return SLUGS.has(characterId.slice(cut + 1)) ? characterId.slice(0, cut) : characterId;
}

/**
 * 모드 수만큼 캐릭터를 만든다. 모드가 하나뿐이거나 없으면 원래 것을 그대로 돌려준다.
 *
 * 가른 쪽은 resonanceModes가 한 칸이라 모드 고르개(CharacterBuffSection)가 뜨지 않고,
 * passiveBuffs도 그 모드 것만 남는다 — 다른 모드 버프는 아예 목록에 오르지 않는다.
 * passiveBuffs 순번은 버프 id(`character:캐릭터id:순번`)의 열쇠라 가른 뒤의 순번이 기준이다.
 * id가 함께 바뀌므로 가르지 않았을 때 담아 둔 사이클과는 섞이지 않는다.
 */
export function modeVariants(base: Character): Character[] {
  const modes = base.resonanceModes ?? [];
  if (modes.length < 2) return [base];

  return modes.map((mode) => ({
    ...base,
    id: `${base.id}-${MODE_SLUG[mode]}`,
    name: `${base.name} · ${MODE_LABEL[mode]}`,
    resonanceModes: [mode],
    passiveBuffs: (base.passiveBuffs ?? []).filter(
      (b) => b.resonanceMode === undefined || b.resonanceMode === mode,
    ),
  }));
}
