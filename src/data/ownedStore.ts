import { loadPersisted, savePersisted } from "../utils/persist";

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
