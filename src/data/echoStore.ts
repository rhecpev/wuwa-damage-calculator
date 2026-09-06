import myEchoData from "./myEcho.json";
import characterEchoLinksData from "./characterEchoLinks.json";
import { loadPersisted, savePersisted } from "../utils/persist";
import { echoStats } from "../calculator/echoStats";
import { fetterGroupByName } from "./echoes";
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
  bump();
};

/** 다음 pk. 지운 자리를 다시 쓰지 않도록 지금 있는 최대값 다음을 준다. */
export const nextPk = (echoes: MyEcho[]): number =>
  echoes.reduce((max, e) => Math.max(max, e.pk), 0) + 1;

export const loadEchoLinks = (): EchoLink[] =>
  loadPersisted(LINK_KEY, (characterEchoLinksData.links ?? []) as EchoLink[]);

export const saveEchoLinks = (links: EchoLink[]): void => {
  savePersisted(LINK_KEY, links);
  bump();
};

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
  const first = links.find((link) => link.characterId === characterId);
  return first && owned.find((e) => e.pk === first.echoId);
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
  return links
    .filter((link) => link.characterId === characterId)
    .map((link) => owned.find((e) => e.pk === link.echoId))
    .filter((e): e is MyEcho => e !== undefined)
    .map((e) => ({
      // 같은 도감 에코를 여러 개 들 수 있어 pk를 id로 쓴다.
      id: String(e.pk),
      name: e.name,
      cost: 0, // 덤프에 코스트가 없다.
      stats: echoStats(e),
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

  for (const link of links.filter((l) => l.characterId === characterId)) {
    const echo = owned.find((e) => e.pk === link.echoId);
    const name = (echo?.options as { selectedFetter?: string } | undefined)?.selectedFetter;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts]
    .map(([name, count]) => ({ name, count, icon: fetterGroupByName(name)?.icon }))
    .sort((a, b) => b.count - a.count);
}
