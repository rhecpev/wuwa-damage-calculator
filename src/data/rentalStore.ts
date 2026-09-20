import { loadPersisted, savePersisted } from "../utils/persist";
import { baseCharacterId } from "./modeVariants";
import { hasRentalBuild } from "./rentalBuilds";

/**
 * 「이 캐릭터는 대여로 본다」는 표시.
 *
 * 매트릭스는 보유하지 않은 캐릭터도 정해진 빌드로 빌려 쓸 수 있다(rentalBuilds).
 * 캐릭터마다 **내 세팅 / 대여 빌드** 중 어느 쪽으로 계산할지를 여기 담는다.
 * 보유 표시(ownedStore)와 같은 자리에서 켜고 끄며, 저장 방식도 같다 —
 * localStorage 한 벌에 원래 캐릭터 id로 담는다(모드로 갈린 캐릭터는 게임에서 한 명이다).
 */

let version = 0;
const listeners = new Set<() => void>();

export const rentalStoreVersion = (): number => version;

export function subscribeRentalStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const bump = () => {
  version += 1;
  listeners.forEach((fn) => fn());
};

const KEY = "rentalCharacters";

let rentalCharacters = [...new Set(loadPersisted<string[]>(KEY, []).map(baseCharacterId))];

export const rentalCharacterIds = (): string[] => rentalCharacters;

/**
 * 지금 대여로 보는 캐릭터인지.
 * 빌드가 없는 캐릭터는 켜 두었더라도 false다 — 세팅이 통째로 비어 버리면 안 되니까.
 */
export const isRentalCharacter = (characterId: string): boolean =>
  rentalCharacters.includes(baseCharacterId(characterId)) && hasRentalBuild(characterId);

export function toggleRentalCharacter(characterId: string): void {
  const id = baseCharacterId(characterId);
  if (!hasRentalBuild(id)) return;
  rentalCharacters = rentalCharacters.includes(id)
    ? rentalCharacters.filter((other) => other !== id)
    : [...rentalCharacters, id];
  savePersisted(KEY, rentalCharacters);
  bump();
}
