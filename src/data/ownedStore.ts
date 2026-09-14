import { loadPersisted, savePersisted } from "../utils/persist";
import { baseCharacterId } from "./modeVariants";

/**
 * 「내가 가지고 있는 것」 — 캐릭터 보유 여부와 보유 무기.
 *
 * 둘 다 서버 없이 브라우저 localStorage에 둔다(에코 저장소와 같은 방식).
 * React 상태가 아니라서 바뀔 때마다 번호를 올려 구독한 화면이 다시 그리게 한다.
 *
 * 캐릭터와 무기의 담는 모양이 다르다 —
 *   캐릭터는 「있다/없다」 하나뿐이라 id 목록이면 충분하다.
 *   무기는 **같은 무기를 여러 자루 가질 수 있다.** 무기 하나는 한 캐릭터만 낄 수 있으므로,
 *   두 캐릭터에게 같은 무기를 물리려면 실제로 두 자루가 있어야 한다.
 *   그래서 에코처럼 자루마다 일련번호(pk)를 붙여 따로 담는다.
 */

let version = 0;
const listeners = new Set<() => void>();

export const ownedStoreVersion = (): number => version;

export function subscribeOwnedStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const bump = () => {
  version += 1;
  listeners.forEach((fn) => fn());
};

// ── 캐릭터 보유 ──────────────────────────────────────────────

const CHARACTER_KEY = "ownedCharacters";

let ownedCharacters = loadPersisted<string[]>(CHARACTER_KEY, []);

export const ownedCharacterIds = (): string[] => ownedCharacters;

export const isOwnedCharacter = (characterId: string): boolean =>
  ownedCharacters.includes(characterId);

export function toggleOwnedCharacter(characterId: string): void {
  ownedCharacters = ownedCharacters.includes(characterId)
    ? ownedCharacters.filter((id) => id !== characterId)
    : [...ownedCharacters, characterId];
  savePersisted(CHARACTER_KEY, ownedCharacters);
  bump();
}

// ── 보유 무기 ────────────────────────────────────────────────

export interface MyWeapon {
  /** 이 목록 안에서만 쓰는 일련번호. 같은 무기를 여러 자루 담을 수 있어 필요하다. */
  pk: number;
  /** 도감 id(weapons.json의 id). */
  weaponId: string;
  /** 무기 레벨 1~90. */
  level: number;
  /** 정련(중첩) 단계 1~5. */
  refine: number;
}

const WEAPON_KEY = "myWeapons";

let myWeapons = loadPersisted<MyWeapon[]>(WEAPON_KEY, []);

export const loadMyWeapons = (): MyWeapon[] => myWeapons;

/** 이 무기를 몇 자루 가지고 있는지. */
export const ownedWeaponCount = (weaponId: string): number =>
  myWeapons.filter((w) => w.weaponId === weaponId).length;

/** 한 자루라도 가지고 있는 무기 id. */
export const ownedWeaponIds = (): Set<string> => new Set(myWeapons.map((w) => w.weaponId));

/** 다음 pk. 지운 자리를 다시 쓰지 않도록 지금 있는 최대값 다음을 준다. */
const nextPk = (): number => myWeapons.reduce((max, w) => Math.max(max, w.pk), 0) + 1;

/** 무기 한 자루를 보유 목록에 담는다. 같은 무기를 여러 번 담을 수 있다. */
export function addMyWeapon(weaponId: string, level = 90, refine = 1): MyWeapon {
  const weapon: MyWeapon = { pk: nextPk(), weaponId, level, refine };
  myWeapons = [...myWeapons, weapon];
  savePersisted(WEAPON_KEY, myWeapons);
  bump();
  return weapon;
}

export function removeMyWeapon(pk: number): void {
  myWeapons = myWeapons.filter((w) => w.pk !== pk);
  savePersisted(WEAPON_KEY, myWeapons);
  bump();
}

/** 그 자루의 레벨·정련을 고친다. */
export function updateMyWeapon(pk: number, patch: Partial<Pick<MyWeapon, "level" | "refine">>): void {
  myWeapons = myWeapons.map((w) => (w.pk === pk ? { ...w, ...patch } : w));
  savePersisted(WEAPON_KEY, myWeapons);
  bump();
}

/**
 * 자루마다 누가 끼고 있는지. 캐릭터 id 목록을 자루 pk별로 돌려준다.
 *
 * 무기 설정에 자루(pk)가 적혀 있으면 그 자루로 잡는다. 자루를 지목하지 않은 예전 설정은
 * **그 무기의 비어 있는 자루에 차례로** 붙인다 — 첫 자루에 몰아 붙이면 두 자루를 가지고
 * 두 캐릭터에게 물렸는데도 「자루 부족」이 뜬다. 빈 자루가 없을 때만 첫 자루에 겹쳐 붙인다
 * (그때는 정말로 자루가 모자란 것이다).
 *
 * characterIds 순서가 곧 우선순위다 — 화면의 캐릭터 목록 순서를 넘기면 늘 같은 결과가 나온다.
 *
 * 모드로 갈린 같은 캐릭터(에이메스 · 조화 파동 / 불꽃)는 게임에서 한 명이다. 같은 무기를 끼웠으면
 * 한 자루를 같이 쓰는 것으로 본다 — 먼저 붙은 모드의 자루에 나머지 모드도 붙인다.
 * 그래서 한 자루에 id가 여럿 붙어도 원래 캐릭터로는 한 명일 수 있다(distinctWearers로 센다).
 */
export function wearersByCopy(
  weaponsList: MyWeapon[],
  characterWeapons: Record<string, { weaponId: string; pk?: number } | undefined>,
  characterIds: string[],
): Map<number, string[]> {
  const out = new Map<number, string[]>();
  const put = (pk: number, id: string) => out.set(pk, [...(out.get(pk) ?? []), id]);
  const pending: string[] = [];

  for (const id of characterIds) {
    const worn = characterWeapons[id];
    if (!worn?.weaponId) continue;
    const copy =
      worn.pk !== undefined
        ? weaponsList.find((w) => w.pk === worn.pk && w.weaponId === worn.weaponId)
        : undefined;
    if (copy) put(copy.pk, id);
    else pending.push(id);
  }

  for (const id of pending) {
    const weaponId = characterWeapons[id]!.weaponId;
    const copies = weaponsList.filter((w) => w.weaponId === weaponId);
    if (copies.length === 0) continue; // 보유 목록에 없는 무기 — 붙일 자루가 없다
    // 같은 캐릭터의 다른 모드가 이미 이 무기의 자루를 쥐고 있으면 그 자루를 같이 쓴다.
    const base = baseCharacterId(id);
    const sibling = copies.find((w) =>
      (out.get(w.pk) ?? []).some((other) => baseCharacterId(other) === base),
    );
    // 빈 자루 = 다른 캐릭터가 아무도 안 쥔 자루.
    const free = copies.find((w) => !out.has(w.pk));
    put((sibling ?? free ?? copies[0]).pk, id);
  }

  return out;
}

/**
 * 한 자루를 쥔 캐릭터 id 목록을 **원래 캐릭터 한 명씩**으로 줄인다.
 * 모드로 갈린 같은 캐릭터는 한 명이다. preferId가 목록에 있으면 그 모드를 대표로 남긴다.
 */
export function distinctWearers(ids: string[], preferId?: string): string[] {
  const out = new Map<string, string>();
  for (const id of ids) {
    const base = baseCharacterId(id);
    if (!out.has(base) || id === preferId) out.set(base, id);
  }
  return [...out.values()];
}
