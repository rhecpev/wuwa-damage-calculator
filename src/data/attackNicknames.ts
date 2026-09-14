import { loadPersisted, savePersisted } from "../utils/persist";

/**
 * 공격 별명 — 인게임 명칭 대신 쓰는 내 말.
 *
 * 인게임 공격 이름은 「공명 스킬 2단」처럼 자료를 그대로 옮긴 것이라, 루틴을 짜는 사람이
 * 평소 부르는 이름(「전깔기」 · 「풀차지」)과 다르다. 그래서 공격마다 별명을 적어 두고
 * 공격 추가 화면에서 토글로 갈아 볼 수 있게 한다.
 *
 * 캐릭터 자료(src/data/characters/*.ts)는 API에서 받아 적은 것이라 화면에서 고칠 수 없다.
 * 그래서 버프 수정분(data/buffOverrides.ts)과 같은 방식으로 **덧씌우는 표**를 따로 둔다 —
 * 캐릭터 자료에 별명 칸이 붙은 것처럼 읽히되, 적어 둔 것만 저장된다.
 *
 * 키는 `캐릭터id:공격id`. 같은 공격 id가 캐릭터 사이에서 겹칠 수 있어 캐릭터까지 묶는다.
 *
 * React 상태가 아니라서 바뀔 때마다 번호를 올려 구독한 화면이 다시 그리게 한다(ownedStore와 같다).
 */

const STORE_KEY = "attackNicknames";

export type AttackNicknameMap = Record<string, string>;

let nicknames = loadPersisted<AttackNicknameMap>(STORE_KEY, {});
let version = 0;
const listeners = new Set<() => void>();

export const attackNicknameKey = (characterId: string, attackId: string) =>
  `${characterId}:${attackId}`;

export const attackNicknamesVersion = (): number => version;

export function subscribeAttackNicknames(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const commit = (next: AttackNicknameMap) => {
  nicknames = next;
  savePersisted(STORE_KEY, nicknames);
  version += 1;
  listeners.forEach((fn) => fn());
};

/** 지금 저장된 전체 표. 사본을 만들지 않는다 — 구독한 화면이 같은 객체를 받아야 한다. */
export const getAttackNicknames = (): AttackNicknameMap => nicknames;

/** 이 공격의 별명. 적어 둔 것이 없으면 undefined. */
export const attackNickname = (characterId: string, attackId: string): string | undefined =>
  nicknames[attackNicknameKey(characterId, attackId)];

/** 별명을 적는다. 빈 칸으로 두면 그 칸을 지워 「적은 적 없음」으로 되돌린다. */
export function setAttackNickname(characterId: string, attackId: string, name: string): void {
  const key = attackNicknameKey(characterId, attackId);
  const label = name.trim();
  const next: AttackNicknameMap = { ...nicknames };
  if (label) next[key] = label;
  else delete next[key];
  commit(next);
}

/** 이 캐릭터에 적어 둔 별명을 통째로 지운다. */
export function clearCharacterNicknames(characterId: string): void {
  const next: AttackNicknameMap = { ...nicknames };
  for (const key of Object.keys(next)) {
    if (key.startsWith(`${characterId}:`)) delete next[key];
  }
  commit(next);
}

/** 이 캐릭터에 별명을 몇 개 적어 두었는지. 목록에 표시할 때 쓴다. */
export const nicknameCountOf = (characterId: string): number =>
  Object.keys(nicknames).filter((key) => key.startsWith(`${characterId}:`)).length;

/**
 * 화면에 띄울 이름.
 * nickname 모드라도 적어 둔 별명이 없으면 인게임 명칭을 그대로 쓴다 — 빈 칸이 보이면 안 된다.
 */
export function attackDisplayName(
  characterId: string,
  attackId: string,
  inGameName: string,
  useNickname: boolean,
): string {
  if (!useNickname) return inGameName;
  return attackNickname(characterId, attackId) ?? inGameName;
}
