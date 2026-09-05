import echoData from "./echo.json";
import echoDetailData from "./echoDetails.json";

/**
 * 에코 도감(src/data/echo.json). 보유 에코(myEcho.json)에는 없는
 * 등급 · 속성 · 화음(세트) 효과가 여기 들어 있다.
 */
export interface FetterEffect {
  /** 몇 개를 맞춰야 열리는지. 2 또는 5. */
  key: number;
  name: string;
  /** 수치가 {0} 자리로 비어 있는 원문. 덤프에 수치가 없어 그대로 둔다. */
  description: string;
}

export interface FetterGroup {
  id: number;
  name: string;
  icon: string | null;
  effects: FetterEffect[];
}

export interface EchoEntry {
  id: string;
  name: string;
  rarity: number;
  icon: string | null;
  elementName: string | null;
  elementIcon: string | null;
  fetterGroups: FetterGroup[];
}

// 도감은 걸러내지 않고 통째로 담는다.
// 목록에서 빼는 것(새알심 · 「이상」 중복 등)은 화면이 isExcludedEcho로 거른다 —
// 여기서 미리 지우면 이미 그 에코를 끼고 있던 사람의 이름·아이콘 조회가 깨진다.
const raw = (echoData as { Echo: any[] }).Echo ?? [];

export const echoesById = new Map<string, EchoEntry>(
  raw.map((e) => [
    String(e.Id),
    {
      id: String(e.Id),
      name: e.Name,
      rarity: e.Rarity ?? 0,
      icon: e.IconMiddle ?? e.Icon ?? null,
      elementName: e.Element?.Name ?? null,
      elementIcon: e.Element?.Icon ?? null,
      fetterGroups: (e.FetterGroups ?? []).map((g: any) => ({
        id: g.Id,
        name: g.Name,
        icon: g.Icon ?? null,
        effects: (g.Fetters ?? []).map((f: any) => ({
          key: f.Key,
          name: f.Name,
          description: f.EffectDescription ?? "",
        })),
      })),
    },
  ]),
);

/** 이름으로 화음 그룹 하나를 찾는다. 어느 에코에 딸려 있든 내용은 같다. */
export function fetterGroupByName(name: string): FetterGroup | undefined {
  for (const echo of echoesById.values()) {
    const group = echo.fetterGroups.find((g) => g.name === name);
    if (group) return group;
  }
  return undefined;
}

/**
 * 상세 엔드포인트에서 받아온 것(scripts/fetch-echo-details.mjs).
 * 목록(echo.json)에는 없는 에코 어빌리티 본문과, 수치가 채워진 화음 세트 효과가 들어 있다.
 */
interface EchoDetail {
  /** 에코 어빌리티 전문. 쿨타임까지 포함된 원문이다. */
  skill: string;
  /** 한 줄 요약. */
  simple: string;
  cooldown: number | null;
}

interface FetterDetail {
  /** 몇 개를 맞춰야 열리는지. 보통 [2, 5]. */
  keys: number[];
  /** keys와 같은 순서의 효과 설명. 수치가 채워져 있다. */
  descriptions: string[];
}

const details = echoDetailData as {
  echoes: Record<string, EchoDetail | undefined>;
  fetters: Record<string, FetterDetail | undefined>;
};

/** 이 에코의 에코 어빌리티. 없으면 undefined. */
export const echoAbility = (echoId: string): EchoDetail | undefined => details.echoes[echoId];

/**
 * 화음 세트 효과를 "몇 개 맞췄는지"에 맞춰 돌려준다.
 * 열린 단계(count >= key)만 on이 true다.
 */
export function fetterEffects(
  name: string,
  count: number,
): { key: number; description: string; on: boolean }[] {
  const detail = details.fetters[name];
  if (!detail) return [];

  return detail.keys.map((key, index) => ({
    key,
    description: detail.descriptions[index] ?? "",
    on: count >= key,
  }));
}
