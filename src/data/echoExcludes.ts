import excludeData from "./excludeEcho.json";

/**
 * 목록에서 빼둔 에코.
 *
 * 덤프에는 실제로 끼고 쓰는 에코 말고 다른 계열이 잔뜩 섞여 있다. 이름이 같은 것이 여럿이라
 * 고를 때 헷갈리기만 하고 계산에 쓸 일도 없어서, 목록을 만들 때 걸러낸다.
 *
 * 목록은 src/data/excludeEcho.json 한 벌이 전부다.
 *   excluded  빼는 에코와 그 이유. 규칙이 찾은 것 + 사람이 계보를 훑어보고 정한 것
 *   keep      규칙이 뺐지만 사람이 「그대로 두기로」 정한 것 — 스크립트가 다시 넣지 않는다
 *
 * `node scripts/build-echo-attacks.mjs`는 이 파일을 **덮어쓰지 않고 합친다.**
 * 새로 찾은 것만 더하고, keep에 든 id는 건드리지 않는다.
 *
 * 한때 화면(에코 계보 탭)에서 브라우저에 쌓아 두고 겹쳐 보던 시절이 있었는데,
 * 정리가 끝나 이 파일로 옮긴 뒤로는 JSON 한 곳만 본다 — 고칠 일이 있으면 파일을 고친다.
 */

export interface ExcludedEcho {
  name: string;
  /** 왜 뺐는지. 화면에 그대로 띄운다. */
  reason: string;
}

const table = (excludeData as { excluded: Record<string, ExcludedEcho> }).excluded ?? {};

export const EXCLUDED_ECHO_IDS: ReadonlySet<string> = new Set(Object.keys(table));

/** 이 도감 id를 목록에서 빼야 하는지. */
export const isExcludedEcho = (id: string | number): boolean =>
  EXCLUDED_ECHO_IDS.has(String(id));

/** 뺀 에코와 그 이유. 「왜 목록에 없는지」를 보여줄 때 쓴다. */
export const excludedEchoes = (): (ExcludedEcho & { id: string })[] =>
  Object.entries(table).map(([id, entry]) => ({ id, ...entry }));
