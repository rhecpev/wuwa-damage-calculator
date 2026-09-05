import { loadPersisted, savePersisted } from "../utils/persist";
import type { BuffScope, BuffUptime } from "../types/game";

/**
 * 버프 데이터의 「상시/발동」(uptime)과 「본인/파티」(scope)를 사람이 고쳐 둔 것.
 *
 * 무기·캐릭터·에코의 버프 데이터는 게임 설명문을 손으로 옮겨 적으면서 정한 값이라
 * 해석이 틀릴 수 있다. 소스를 고치지 않고도 확인용 화면에서 바로 바꿔 쓸 수 있게,
 * 바꾼 것만 여기에 담아 두고 계산할 때 덧씌운다. 손대지 않은 버프는 아무 것도 저장하지 않는다.
 *
 * 키는 `대상id:효과순번`. 원본 배열의 순서를 그대로 쓴다.
 *
 * 무기·캐릭터·에코가 같은 화면 구성을 쓰므로 저장소도 이 공장 하나로 찍어낸다.
 * 저장 이름만 다르고 동작은 전부 같다.
 */
export interface BuffOverride {
  uptime?: BuffUptime;
  scope?: BuffScope;
}

export type BuffOverrideMap = Record<string, BuffOverride>;

export const buffOverrideKey = (ownerId: string, index: number) => `${ownerId}:${index}`;

export interface BuffOverrideStore {
  /** 지금 저장된 전체 표. useSyncExternalStore가 같은 객체를 받도록 사본을 만들지 않는다. */
  get(): BuffOverrideMap;
  subscribe(listener: () => void): () => void;
  /** 한 버프의 값을 바꾼다. 기본값과 같아지면 그 칸을 지워 「손대지 않음」으로 되돌린다. */
  set(
    ownerId: string,
    index: number,
    patch: BuffOverride,
    defaults: Required<BuffOverride>,
  ): void;
  /** 한 대상의 수정분을 통째로 지운다. index를 주면 그 효과 하나만. */
  clear(ownerId: string, index?: number): void;
  /** 전부 원래대로. */
  reset(): void;
}

export function createBuffOverrideStore(storeName: string): BuffOverrideStore {
  let overrides: BuffOverrideMap = loadPersisted<BuffOverrideMap>(storeName, {});
  const listeners = new Set<() => void>();

  const commit = (next: BuffOverrideMap) => {
    overrides = next;
    savePersisted(storeName, overrides);
    listeners.forEach((fn) => fn());
  };

  return {
    get: () => overrides,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    set(ownerId, index, patch, defaults) {
      const key = buffOverrideKey(ownerId, index);
      const next: BuffOverrideMap = { ...overrides };
      const merged: BuffOverride = { ...next[key], ...patch };

      if (merged.uptime === defaults.uptime) delete merged.uptime;
      if (merged.scope === defaults.scope) delete merged.scope;

      if (Object.keys(merged).length === 0) delete next[key];
      else next[key] = merged;

      commit(next);
    },

    clear(ownerId, index) {
      const next: BuffOverrideMap = { ...overrides };
      if (index === undefined) {
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${ownerId}:`)) delete next[key];
        }
      } else {
        delete next[buffOverrideKey(ownerId, index)];
      }
      commit(next);
    },

    reset() {
      commit({});
    },
  };
}
