import characterNodesData from "./characterNodes.json";
import type { Character, Skill, SkillCategory } from "../types/game";
import type { Stats } from "../types/stats";

/**
 * 스킬 트리의 동그란 스탯 노드. 갈래마다 두 개씩, 캐릭터당 8개다.
 * scripts/build-character-nodes.mjs 가 원본 덤프에서 뽑아 characterNodes.json 을 만든다.
 *
 * 예전에는 이 8개를 합친 값이 캐릭터 파일의 baseStats에 상수로 박혀 있었다.
 * 이제 노드 하나하나가 데이터로 있으므로, 켜고 끈 결과를 합산해서 쓴다.
 * 아무것도 정하지 않은 캐릭터는 전부 켠 것으로 본다 — 게임에서도 만렙이면 전부 열려 있다.
 */
export interface CharacterNode {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  /** 이 노드가 붙는 갈래. 스킬 트리에서 어느 세로줄에 그릴지를 정한다. */
  branch: Extract<SkillCategory, "Basic" | "Skill" | "Liberation" | "Variation">;
  /** 갈래 안에서의 위치. lower가 스킬에 가까운 쪽(작은 값), upper가 위쪽(큰 값). */
  row: "lower" | "upper";
  stats: Partial<Stats>;
}

const byCharacter = characterNodesData as Record<string, CharacterNode[] | undefined>;

/** 이 캐릭터의 노드 목록. 데이터가 없으면 빈 배열. */
export const nodesOf = (characterId: string): CharacterNode[] => byCharacter[characterId] ?? [];

/**
 * 노드에 적힌 퍼센트는 표시값 그대로 쓴다.
 *
 * 한동안 노드마다 0.004%p를 깎았다 — 수수 Lv.90 HP 실측(25703)이 3 높게 나와서였다.
 * 그 뒤 히유키·루실라 실측이 붙으면서, 어긋남의 자리가 노드가 아니라 **에코 부옵션**이라는
 * 것이 드러났다(calculator/echoStats.ts의 SUB_PANEL_PERCENT). 부옵션 값별 표로 맞추면
 * 노드를 깎지 않아도 수수 실측이 맞고, 「히유키 에코를 전부 뺀 공격력 1300」 실측이
 * 캐릭터측 갈래(노드 12% + 무기 효과 12%)가 표시값 그대로임을 직접 확인해 준다.
 */

/**
 * 켜둔 노드의 스탯 합계.
 * enabled가 undefined면 "아직 손대지 않음"이라 전부 켠 것으로 본다.
 * 빈 배열은 "전부 껐다"는 뜻이라 그대로 0이 된다.
 */
export function nodeStats(characterId: string, enabled?: string[]): Partial<Stats> {
  const result: Partial<Stats> = {};

  for (const node of nodesOf(characterId)) {
    if (enabled && !enabled.includes(node.id)) continue;
    for (const [key, value] of Object.entries(node.stats) as [keyof Stats, number][]) {
      result[key] = (result[key] ?? 0) + value;
    }
  }

  return result;
}

/** 이 노드가 지금 켜져 있는지. 위와 같은 규칙 — 정한 적 없으면 켜진 것. */
export const isNodeOn = (nodeId: string, enabled?: string[]) =>
  enabled === undefined || enabled.includes(nodeId);

/**
 * 스킬 트리 가운데 줄(공명 회로) 위에 얹히는 고유 스킬.
 * 「요리의 달인」 같은 월드 스킬은 트리에 없어서 아이콘 경로로 걸러낸다.
 * 데이터는 먼저 열리는 것부터 담겨 있고 화면은 위에서 아래로 그리므로 뒤집어 돌려준다.
 */
export function inherentSkillsOf(character: Character | undefined): Skill[] {
  return (character?.skills ?? [])
    .filter((s) => s.category === "Passive" && !(s.icon ?? "").includes("SP_IconWorld"))
    .reverse();
}

/** 고유 스킬도 스탯 노드와 같은 규칙 — 정한 적 없으면 전부 켜진 것으로 본다. */
export const isInherentOn = (skillId: string, enabled?: string[]) =>
  enabled === undefined || enabled.includes(skillId);
