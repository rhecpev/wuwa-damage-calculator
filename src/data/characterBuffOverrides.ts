import { buffOverrideKey, createBuffOverrideStore } from "./buffOverrides";
import type { BuffOverride, BuffOverrideMap } from "./buffOverrides";

/**
 * 캐릭터 고유효과·공명체인 버프의 「상시/발동」과 「본인/파티」 수정분.
 * 캐릭터 관리 → 버프 정리 탭에서 고치고, deriveCharacterBuffs가 계산할 때 덧씌운다.
 * 키는 `캐릭터id:효과순번` — Character.passiveBuffs의 배열 순서를 그대로 쓴다.
 */
export type CharacterBuffOverride = BuffOverride;
export type CharacterBuffOverrideMap = BuffOverrideMap;

const store = createBuffOverrideStore("character-buff-overrides");

export const characterBuffKey = buffOverrideKey;

export const getCharacterBuffOverrides = store.get;
export const subscribeCharacterBuffOverrides = store.subscribe;
export const setCharacterBuffOverride = store.set;
export const clearCharacterBuffOverride = store.clear;
export const resetCharacterBuffOverrides = store.reset;
