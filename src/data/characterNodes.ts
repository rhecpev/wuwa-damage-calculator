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
 * 노드에 적힌 퍼센트가 실제로는 그보다 조금 낮게 걸린다 — 노드 하나당 0.004%p.
 *
 * 에코 부옵션과 같은 꼴인데(calculator/echoStats.ts의 SUB_PERCENT_ADJUST) 폭이 더 작다.
 * 수수 Lv.90 실측이 이 자리를 잡아 준다. 기초 HP 16712 · HP 노드 넷(1.8+1.8+4.2+4.2=12%) ·
 * 에코 부옵션 HP% 9.4 · 깡 2280+2280+430+430 → 게임 25703
 *   노드를 적힌 대로: ⌊16712×1.12⌋=18717 + ⌊16712×0.09392⌋=1569 + 5420 = 25706  (3 어긋남)
 *   노드마다 0.004%p 낮게: ⌊16712×1.11984⌋=18714 + 1569 + 5420 = 25703            ← 일치
 * 에코 쪽으로 3을 메우려면 부옵션 한 줄에 0.02%p가 필요한데, 그러면 치사 Lv.90 실측
 * (부옵션 한 줄 7.9% → +3130)이 깨진다. 그래서 어긋난 자리는 노드 쪽이다.
 *
 * 이 노드 몫은 공격력·HP·방어력 %에만 건다. 다른 칸(피해 보너스·치료 효과)은 어디서도
 * 버림을 타지 않아 0.004%p를 빼 봐야 결과가 달라지지 않는다.
 *
 * 「노드마다」인지 「합계에 한 번」인지는 실측 한 건으로는 갈리지 않는다. 에코 부옵션이
 * 개수를 따라가는 것에 맞춰 노드마다로 둔다. 실측이 더 모이면 다시 확인할 것.
 *   (공격력 실측 둘 — 단근 1527 · 치사 2564 — 은 어느 쪽으로 둬도 그대로다.)
 */
const NODE_PERCENT_ADJUST = 0.00004;

/** 위 보정을 받는 칸. 스탯창 값을 확정할 때 버림을 타는 셋이다. */
const ADJUSTED_KEYS = new Set<keyof Stats>(["hpPercent", "atkPercent", "defPercent"]);

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
      const amount = ADJUSTED_KEYS.has(key) ? value - NODE_PERCENT_ADJUST : value;
      result[key] = (result[key] ?? 0) + amount;
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
