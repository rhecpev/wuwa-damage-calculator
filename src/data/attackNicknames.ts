import { loadPersisted, savePersisted } from "../utils/persist";
import { characters } from "./sampleData";
import { DISCORD_ATTACK_ID } from "./discord";
import type { AttackType, SkillCategory } from "../types/game";

/**
 * 공격 별명 — 인게임 명칭 대신 쓰는 내 말.
 *
 * 인게임 공격 이름은 「공명 스킬 2단」처럼 자료를 그대로 옮긴 것이라, 루틴을 짜는 사람이
 * 평소 부르는 이름(「전깔기」 · 「풀차지」)과 다르다. 그래서 공격마다 별명을 적어 두고
 * 공격 추가 화면에서 토글로 갈아 볼 수 있게 한다.
 *
 * 캐릭터 자료(src/data/characters/*.ts)는 API에서 받아 적은 것이라 화면에서 고칠 수 없다.
 * 그래서 캐릭터 자료를 건드리지 않고 **덧씌우는 표**를 따로 둔다 —
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

/**
 * 여러 칸을 한 번에 적는다. 내보낸 파일을 불러올 때 쓴다.
 * 빈 값은 그 칸을 지운다 — setAttackNickname과 같은 규칙이다.
 */
export function mergeAttackNicknames(entries: Record<string, string>): void {
  const next: AttackNicknameMap = { ...nicknames };
  for (const [key, name] of Object.entries(entries)) {
    const label = name.trim();
    if (label) next[key] = label;
    else delete next[key];
  }
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
 * ── 자동 별명 ────────────────────────────────────────────────
 *
 * 공격 1000줄이 넘는 것을 하나하나 적을 수는 없다. 그래서 **모션과 분류로 짓는 규칙**을 두고,
 * 적어 둔 별명이 없는 공격은 이 이름으로 보인다. 손으로 적으면 그쪽이 늘 이긴다.
 *
 *   일반 공격 평 · 공명 스킬 E · 공명 해방 R · 조화도 파괴 F
 *   점프 공격 점공 · 공중 공격 공중 · 낙하 공격 낙공 · 반주 스킬 반주 · 변주 스킬 변주
 *   (규칙에 없던 모션은 강공격 강공 · 회피 반격 회반 · 협동 공격 협공으로 짓는다)
 *
 * 이름에 단수가 있으면 뒤에 붙인다 — 「일반 공격 1단 피해」는 **평1**이다.
 */

/** 이름에 이 말이 있으면 그 모션으로 본다. 위에서부터 먼저 걸리는 것을 쓴다. */
const NAME_TOKENS: [RegExp, string][] = [
  // 「공중 낙하 공격」처럼 두 말이 겹치는 이름이 있어 좁은 쪽을 먼저 본다.
  [/낙하\s*공격/, "낙공"],
  [/점프\s*공격/, "점공"],
  [/공중\s*공격/, "공중"],
  [/회피\s*반격/, "회반"],
  [/강공격/, "강공"],
  [/협동\s*공격/, "협공"],
  [/일반\s*공격/, "평"],
  [/반주\s*스킬/, "반주"],
  [/변주\s*스킬/, "변주"],
];

/** 이름으로 모션을 못 가리면 스킬 분류로 본다. */
const CATEGORY_TOKENS: Partial<Record<SkillCategory, string>> = {
  Basic: "평",
  Skill: "E",
  Liberation: "R",
  Intro: "반주",
  Variation: "변주",
  Sync: "F",
};

/** 분류마저 없는 옛 자료는 공격 타입으로 본다. */
const TYPE_TOKENS: Partial<Record<AttackType, string>> = {
  Basic: "평",
  Heavy: "강공",
  Aerial: "공중",
  DodgeCounter: "회반",
  Skill: "E",
  Liberation: "R",
  Ultimate: "R",
  Intro: "반주",
  Outro: "변주",
  Variation: "변주",
};

/** 이 공격을 무엇이라 부를지 — 단수를 빼고 앞에 붙는 말만. */
function tokenOf(name: string, category: SkillCategory | undefined, type: AttackType) {
  for (const [pattern, token] of NAME_TOKENS) if (pattern.test(name)) return token;
  return (category && CATEGORY_TOKENS[category]) ?? TYPE_TOKENS[type];
}

/** 자료는 바뀌지 않으므로 캐릭터마다 한 번만 짓고 들고 있는다. */
const autoCache = new Map<string, Map<string, string>>();

/**
 * 이 캐릭터의 공격 id -> 자동 별명.
 *
 * 한 캐릭터 안에서 같은 이름이 나오면(회로의 「하늘로 향해 · 일반 공격 1단」처럼 모션이 겹친다)
 * 두 번째부터 -2 · -3을 붙인다. 어느 쪽이 무엇인지는 별명 탭에서 손으로 고쳐 가른다.
 */
export function autoNicknamesOf(characterId: string): Map<string, string> {
  const cached = autoCache.get(characterId);
  if (cached) return cached;

  const character = characters.find((c) => c.id === characterId);
  const out = new Map<string, string>();
  const used = new Map<string, number>();

  for (const skill of character?.skills ?? []) {
    for (const attack of skill.attacks) {
      const token = tokenOf(attack.name, skill.category, attack.type);
      if (!token) continue;
      // 「2단 피해」 · 「일반 공격 2단 피해」 — 단수는 그대로 뒤에 붙인다.
      const step = attack.name.match(/(\d+)\s*단/)?.[1] ?? "";
      const base = `${token}${step}`;
      const nth = (used.get(base) ?? 0) + 1;
      used.set(base, nth);
      out.set(attack.id, nth === 1 ? base : `${base}-${nth}`);
    }
  }

  autoCache.set(characterId, out);
  return out;
}

/**
 * 규칙으로 지은 별명. 캐릭터 스킬에 없는 항목(조화도 파괴·이상 효과)도 여기서 받는다.
 * 지을 수 없으면 undefined — 그때는 인게임 명칭을 그대로 쓴다.
 */
export function autoNickname(characterId: string, attackId: string): string | undefined {
  // 조화도 파괴는 캐릭터 스킬이 아니라 팔레트가 늘 세우는 항목이다.
  if (attackId === DISCORD_ATTACK_ID) return "F";
  return autoNicknamesOf(characterId).get(attackId);
}

/**
 * 화면에 띄울 이름.
 * 손으로 적어 둔 별명 → 규칙으로 지은 별명 → 인게임 명칭 차례로 고른다. 빈 칸이 보이면 안 된다.
 */
export function attackDisplayName(
  characterId: string,
  attackId: string,
  inGameName: string,
  useNickname: boolean,
): string {
  if (!useNickname) return inGameName;
  return attackNickname(characterId, attackId) ?? autoNickname(characterId, attackId) ?? inGameName;
}
