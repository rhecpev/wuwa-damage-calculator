import { buffOverrideKey, createBuffOverrideStore } from "./buffOverrides";
import type { BuffOverride, BuffOverrideMap } from "./buffOverrides";

/**
 * 무기 버프의 「상시/발동」과 「본인/파티」 수정분.
 * 저장소 동작은 buffOverrides.ts의 공용 구현을 그대로 쓰고, 여기서는 이름만 붙인다.
 * 키는 `무기id:효과순번` — weaponBuffs의 배열 순서를 그대로 쓴다.
 */
export type WeaponBuffOverride = BuffOverride;
export type WeaponBuffOverrideMap = BuffOverrideMap;

const store = createBuffOverrideStore("weapon-buff-overrides");

export const weaponBuffKey = buffOverrideKey;

export const getWeaponBuffOverrides = store.get;
export const subscribeWeaponBuffOverrides = store.subscribe;
export const setWeaponBuffOverride = store.set;
export const clearWeaponBuffOverride = store.clear;
export const resetWeaponBuffOverrides = store.reset;
