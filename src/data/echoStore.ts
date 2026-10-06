import myEchoData from "./myEcho.json";
import characterEchoLinksData from "./characterEchoLinks.json";
import { loadPersisted, savePersisted } from "../utils/persist";
import { echoStats, echoSubStats } from "../calculator/echoStats";
import { fetterGroupByName } from "./echoes";
import { rentalEchoesOf } from "./rentalBuilds";
import { isRentalCharacter } from "./rentalStore";
import type { Echo } from "../types/game";

/**
 * 보유 에코와 캐릭터-에코 연결의 저장소.
 *
 * 서버 없이 브라우저 localStorage에 둔다. 나중에 프로그램으로 배포해도
 * 각자 기기에 자기 데이터가 남는다.
 *
 * src/data/myEcho.json · characterEchoLinks.json은 "처음 열었을 때의 씨앗"이다.
 * 한 번이라도 저장한 뒤로는 localStorage 쪽이 이긴다.
 */

export interface MyEcho {
  /** 이 목록 안에서만 쓰는 일련번호. 연결(EchoLink.echoId)이 이 값을 가리킨다. */
  pk: number;
  /** 도감 id(echo.json의 Id). 같은 에코를 여러 개 들고 있을 수 있어 pk와 따로 둔다. */
  id: string;
  name: string;
  iconUrl?: string;
  fetterGroups?: { name: string; icon: string }[];
  options?: any;
}

export interface EchoLink {
  characterId: string;
  echoId: number;
}

const ECHO_KEY = "myEchoes";
const LINK_KEY = "characterEchoLinks";

/**
 * 보유 에코·장착 연결이 바뀌었다고 알리는 자리.
 *
 * 이 저장소는 localStorage 한 벌이라 화면끼리 React 상태로 이어져 있지 않다.
 * 에코를 갈아끼우면 화음 세트와 메인 에코 어빌리티에서 나오는 버프가 달라지므로,
 * 저장이 일어날 때마다 번호를 올려 구독한 쪽(PartyConfigContext)이 다시 계산하게 한다.
 * 값 자체는 실으면 안 된다 — useSyncExternalStore는 매번 같은 값을 받아야 한다.
 */
let version = 0;
const listeners = new Set<() => void>();

export const echoStoreVersion = (): number => version;

export function subscribeEchoStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const bump = () => {
  version += 1;
  listeners.forEach((fn) => fn());
};

export const loadMyEchoes = (): MyEcho[] =>
  loadPersisted(ECHO_KEY, (myEchoData.echoes ?? []) as MyEcho[]);

export const saveMyEchoes = (echoes: MyEcho[]): void => {
  savePersisted(ECHO_KEY, echoes);
  // 지운 에코를 가리키던 장착 칸도 같이 걷어 낸다 — 남겨 두면 화면에는 안 보이면서
  // 다섯 자리 중 하나를 차지해 새 에코를 못 끼운다.
  const links = loadPersisted(LINK_KEY, (characterEchoLinksData.links ?? []) as EchoLink[]);
  const kept = pruneLinks(links, echoes);
  if (kept.length !== links.length) savePersisted(LINK_KEY, kept);
  // 프리셋도 같다 — 지운 에코의 pk는 나중에 새 에코가 다시 쓸 수 있어, 남겨 두면 엉뚱한 에코를 가리킨다.
  const pks = new Set(echoes.map((e) => e.pk));
  const presets = loadEchoPresets();
  const trimmed = presets
    .map((preset) => ({ ...preset, echoIds: preset.echoIds.filter((pk) => pks.has(pk)) }))
    .filter((preset) => preset.echoIds.length > 0);
  if (JSON.stringify(trimmed) !== JSON.stringify(presets)) savePersisted(PRESET_KEY, trimmed);
  bump();
};

/**
 * 에코 프리셋 — 다섯 자리에 낀 에코 한 벌에 이름을 붙여 둔 것.
 * 캐릭터에 묶이지 않는다 — 어느 캐릭터에서든 불러와 그대로 끼울 수 있다.
 */
export interface EchoPreset {
  id: string;
  name: string;
  /** 보유 에코의 pk들. 순서가 곧 슬롯 순서라 첫 번째가 메인 에코다. */
  echoIds: number[];
}

const PRESET_KEY = "echoPresets";

export const loadEchoPresets = (): EchoPreset[] => loadPersisted(PRESET_KEY, [] as EchoPreset[]);

export const saveEchoPresets = (presets: EchoPreset[]): void => {
  savePersisted(PRESET_KEY, presets);
};

/** 두 벌이 같은 에코를 같은 자리 순서로 담고 있는지. 자리가 다르면 메인 에코가 달라 다른 벌로 본다. */
export const sameEchoes = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((pk, index) => pk === b[index]);

/** 이 캐릭터가 지금 끼고 있는 프리셋 — 낀 에코가 프리셋과 자리까지 똑같을 때만 그 프리셋으로 본다. */
export function echoPresetOf(
  characterId: string,
  presets: EchoPreset[] = loadEchoPresets(),
  links: EchoLink[] = loadEchoLinks(),
): EchoPreset | undefined {
  const worn = links.filter((link) => link.characterId === characterId).map((link) => link.echoId);
  if (worn.length === 0) return undefined;
  return presets.find((preset) => sameEchoes(preset.echoIds, worn));
}

/** 프리셋의 에코 가운데 **다른 캐릭터**가 끼고 있는 것의 주인들(캐릭터 id, 겹치지 않게). */
export function echoPresetOwners(characterId: string, preset: EchoPreset): string[] {
  const owners = loadEchoLinks()
    .filter((link) => link.characterId !== characterId && preset.echoIds.includes(link.echoId))
    .map((link) => link.characterId);
  return [...new Set(owners)];
}

/**
 * 사이클을 담는 순간 캐릭터 한 명이 끼고 있던 에코 한 벌.
 * pk만 적으면 그 뒤에 에코를 고치거나 지우고 새로 만든 것을 못 가려내므로, 에코 내용도 같이 박아 둔다.
 */
export interface EchoSetSnapshot {
  /** 그때 끼고 있던 에코 프리셋의 이름. 프리셋과 같지 않은 구성이었으면 없다. */
  presetName?: string;
  /** 슬롯 순서대로. 첫 번째가 메인 에코다. */
  echoes: Pick<MyEcho, "pk" | "id" | "name" | "options">[];
}

/** 이 캐릭터가 지금 끼고 있는 에코의 pk들(슬롯 순서). 대여 빌드가 아니라 **내 장착**을 본다. */
export const wornEchoPks = (characterId: string, links: EchoLink[] = loadEchoLinks()): number[] =>
  links.filter((link) => link.characterId === characterId).map((link) => link.echoId);

/** 지금 낀 한 벌을 사이클에 담을 모양으로. 낀 에코가 없거나 대여로 둔 캐릭터면 undefined. */
export function echoSetSnapshotOf(characterId: string): EchoSetSnapshot | undefined {
  if (isRentalCharacter(characterId)) return undefined;
  const links = loadEchoLinks();
  const owned = loadMyEchoes();
  const echoes = wornEchoPks(characterId, links)
    .map((pk) => owned.find((e) => e.pk === pk))
    .filter((e): e is MyEcho => e !== undefined)
    .map(({ pk, id, name, options }) => ({ pk, id, name, options }));
  if (echoes.length === 0) return undefined;
  const presetName = echoPresetOf(characterId, loadEchoPresets(), links)?.name;
  return { ...(presetName ? { presetName } : {}), echoes };
}

/**
 * 담아 둔 한 벌을 지금도 그대로 끼울 수 있는지 — 에코가 전부 남아 있고 내용도 그때와 같아야 한다.
 * 남에게 받은 사이클은 pk가 내 것과 우연히 겹칠 수 있어, 내용까지 견줘야 엉뚱한 에코를 끼우지 않는다.
 */
export function canRestoreEchoSet(set: EchoSetSnapshot, owned: MyEcho[] = loadMyEchoes()): boolean {
  return set.echoes.every((saved) => {
    const mine = owned.find((e) => e.pk === saved.pk);
    return (
      mine !== undefined &&
      mine.id === saved.id &&
      JSON.stringify(mine.options) === JSON.stringify(saved.options)
    );
  });
}

/**
 * 담아 둔 한 벌들을 끼웠다고 칠 때의 장착 연결. 끼울 수 없는 벌(canRestoreEchoSet)은 건너뛴다.
 * 저장하지는 않는다 — 미리 따져 보는 데도 쓰기 때문이다.
 */
export function linksWithEchoSets(
  sets: { characterId: string; echoSet?: EchoSetSnapshot }[],
  links: EchoLink[] = loadEchoLinks(),
): EchoLink[] {
  const owned = loadMyEchoes();
  let next = links;
  for (const { characterId, echoSet } of sets) {
    if (!echoSet || !canRestoreEchoSet(echoSet, owned)) continue;
    const pks = echoSet.echoes.map((e) => e.pk).slice(0, 5);
    if (sameEchoes(pks, wornEchoPks(characterId, next))) continue;
    next = [
      ...next.filter((link) => link.characterId !== characterId && !pks.includes(link.echoId)),
      ...pks.map((echoId) => ({ characterId, echoId })),
    ];
  }
  return next;
}

/**
 * 프리셋 한 벌을 그 캐릭터에 끼운다. 지금 낀 에코는 빠지고,
 * 다른 캐릭터가 끼고 있던 에코는 거기서 떨어져 나온다(중복 장착 금지).
 */
export function applyEchoPreset(characterId: string, preset: EchoPreset): void {
  const next = preset.echoIds.slice(0, 5);
  saveEchoLinks([
    ...loadEchoLinks().filter(
      (link) => link.characterId !== characterId && !next.includes(link.echoId),
    ),
    ...next.map((echoId) => ({ characterId, echoId })),
  ]);
}

/** 없는 에코(지웠거나 pk가 바뀐 것)를 가리키는 연결을 뺀다. */
function pruneLinks(links: EchoLink[], echoes: MyEcho[]): EchoLink[] {
  const pks = new Set(echoes.map((e) => e.pk));
  return links.filter((link) => pks.has(link.echoId));
}

/** 다음 pk. 지운 자리를 다시 쓰지 않도록 지금 있는 최대값 다음을 준다. */
export const nextPk = (echoes: MyEcho[]): number =>
  echoes.reduce((max, e) => Math.max(max, e.pk), 0) + 1;

/** 장착 연결. 이미 저장된 자료에 남은 「지운 에코를 가리키는 칸」은 읽을 때 걸러 낸다. */
export const loadEchoLinks = (): EchoLink[] =>
  pruneLinks(
    loadPersisted(LINK_KEY, (characterEchoLinksData.links ?? []) as EchoLink[]),
    loadMyEchoes(),
  );

export const saveEchoLinks = (links: EchoLink[]): void => {
  savePersisted(LINK_KEY, links);
  bump();
};

/**
 * 이 캐릭터가 지금 차고 있는 에코 다섯 자리. **대여로 둔 캐릭터는 대여 빌드의 에코**다
 * (rentalBuilds) — 내 보유 에코와 연결은 그대로 두고 읽을 때만 갈아 끼운다.
 *
 * 에코를 보는 자리는 전부 이 함수를 거친다 — 스탯 · 화음 세트 · 에코 어빌리티가
 * 서로 다른 에코를 보면 안 되기 때문이다.
 */
export function echoesOf(
  characterId: string,
  links: EchoLink[] = loadEchoLinks(),
  owned: MyEcho[] = loadMyEchoes(),
): MyEcho[] {
  if (isRentalCharacter(characterId)) return rentalEchoesOf(characterId) as MyEcho[];
  return links
    .filter((link) => link.characterId === characterId)
    .map((link) => owned.find((e) => e.pk === link.echoId))
    .filter((e): e is MyEcho => e !== undefined);
}

/**
 * 이 캐릭터의 메인 에코 — 다섯 자리 중 첫 번째에 낀 것.
 *
 * 자리 순서는 연결 목록(EchoLink)의 순서가 그대로다(CharactersPage의 setEchoes 참고).
 * 에코 어빌리티는 메인에 낀 에코 하나만 쓸 수 있으므로, echoAbilityBuffs를 계산에
 * 넣을 때는 반드시 여기서 나온 에코의 것만 넣는다. 2~5번 자리 에코의 어빌리티는
 * 장착 효과든 발동 효과든 아무 것도 걸리지 않는다.
 * (화음 세트 효과 echoSetBuffs는 반대로 자리를 가리지 않고 개수만 센다.)
 *
 * 낀 에코가 없으면 undefined.
 */
export function mainEchoOf(
  characterId: string,
  links: EchoLink[] = loadEchoLinks(),
  owned: MyEcho[] = loadMyEchoes(),
): MyEcho | undefined {
  return echoesOf(characterId, links, owned)[0];
}

/**
 * 이 캐릭터가 장착한 에코를 계산 엔진이 먹는 모양(Echo)으로 돌려준다.
 *
 * 캐릭터 관리 화면과 피해 계산 화면이 같은 값을 보도록 한 군데로 모아 둔다.
 * links를 넘기면 그걸 쓰고(편집 중인 화면), 없으면 저장본을 읽는다.
 * 돌려주는 순서가 곧 슬롯 순서다 — 첫 번째가 메인 에코(mainEchoOf와 같은 것).
 */
export function equippedEchoes(
  characterId: string,
  links: EchoLink[] = loadEchoLinks(),
  owned: MyEcho[] = loadMyEchoes(),
): Echo[] {
  return echoesOf(characterId, links, owned)
    .map((e) => ({
      // 같은 도감 에코를 여러 개 들 수 있어 pk를 id로 쓴다.
      id: String(e.pk),
      name: e.name,
      cost: 0, // 덤프에 코스트가 없다.
      stats: echoStats(e),
      subStats: echoSubStats(e),
      effects: [],
    }));
}

/**
 * 이 캐릭터가 맞춰 둔 화음 세트 — 이름 · 아이콘 · 맞춘 개수.
 *
 * 세트 효과가 몇 세트에서 열리는지는 data/echoBuffs.ts가 알고 있고, 여기서는
 * 「무엇을 몇 개 맞췄는지」만 센다. 파티 카드처럼 한눈에 보여줄 자리에서 쓴다.
 * 세는 규칙은 화음 세트 버프를 만드는 자리(calculator/equippedBuffs.ts)와 같다.
 */
export function equippedFetterSets(
  characterId: string,
  links: EchoLink[] = loadEchoLinks(),
  owned: MyEcho[] = loadMyEchoes(),
): { name: string; icon: string | null | undefined; count: number }[] {
  const counts = new Map<string, number>();

  for (const echo of echoesOf(characterId, links, owned)) {
    const name = (echo.options as { selectedFetter?: string } | undefined)?.selectedFetter;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts]
    .map(([name, count]) => ({ name, count, icon: fetterGroupByName(name)?.icon }))
    .sort((a, b) => b.count - a.count);
}
