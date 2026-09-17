import { DISCORD_ATTACK_ID } from "./discord";
import { baseCharacterId } from "./modeVariants";
import type { ManualBuff, ResonanceMode } from "../types/game";

/**
 * 「조화 밀집 · 간섭」 — 적에게 붙는 상태를 버프 한 줄로 담는다.
 *
 * 암흑 효과(data/anomalyBuffs.ts)와 같은 꼴이다. 적에게 붙는 상태는 누가 붙였든 하나뿐이라
 * 캐릭터마다 두면 파티에 둘 이상 서는 순간 같은 줄이 여럿 뜨고 다 켜면 여러 번 걸린다.
 *
 * ── 원문 ────────────────────────────────────────────────────
 * 「목표가 1스택의 「조화 밀집 · 간섭」을 보유할 때마다, **자신의** 조화도 파괴 증폭 1pt 당
 *  **자신이** 해당 목표에게 입히는 최종 피해를 0.12% 증가시킨다.
 *  ○○가 파티에 있을 시, 목표의 「조화 밀집 · 간섭」 스택 최대치가 1스택 증가된다」
 *
 * 두 문장이 갈린다 —
 *   앞 문장: **대응 캐릭터마다 자기 증폭으로** 자기 피해를 올린다 → 이 줄 하나(ownerId 없음)가 맡는다.
 *     ownerId를 비워 두면 scaleStats가 **때리는 캐릭터의 스탯**을 읽는다. 준 사람 스탯을 읽는
 *     보통의 파티 버프와 반대인데, 원문이 「자신의 증폭」이라 이쪽이 맞다.
 *   뒤 문장: 상한을 1씩 올린다 → 캐릭터 파일의 「간섭 상한 +1」 줄들이 맡는다(raisesStatusStacks).
 *     statusStackCap이 그 줄들을 **더해서** 상한을 낸다 — 셋이 서면 1 + 3 = 4스택.
 *
 * 스택은 「조화도 파괴」를 쓸 때마다 1씩 쌓인다(원문: 「파티 내 캐릭터가 조화도 파괴 발동 시,
 * 목표가 「조화 밀집 · 이탈」을 보유할 경우 1스택의 「조화 밀집 · 간섭」을 추가한다」).
 * 루틴에 조화도 파괴 카드를 담으면 그 뒤 카드에서 저절로 켜지고 스택도 따라 오른다
 * (triggeredBy · stacksPerTrigger — calculator/autoBuffs.ts).
 */
export const CLUSTER_INTERFERENCE_STATUS = "조화 밀집 · 간섭" as const;
export const CLUSTER_INTERFERENCE_BUFF_ID = "status:조화 밀집 · 간섭";

/**
 * 「조화 밀집 · 간섭」에 대응하는 능력을 가진 캐릭터.
 * 데니아 · 린네는 **조화 밀집 모드일 때만** 대응한다 — 다른 모드에서는 이 능력이 없다.
 */
export const CLUSTER_RESPONDERS: { id: string; mode?: ResonanceMode }[] = [
  { id: "luke" },
  { id: "qingchao" },
  { id: "monie" },
  { id: "denia", mode: "Cluster" },
  { id: "linne", mode: "Cluster" },
];

/** 이 캐릭터가 지금 설정에서 「조화 밀집 · 간섭」에 대응하는지. */
export function respondsToCluster(characterId: string, mode?: ResonanceMode): boolean {
  const row = CLUSTER_RESPONDERS.find((r) => r.id === baseCharacterId(characterId));
  if (!row) return false;
  return row.mode === undefined || row.mode === mode;
}

/**
 * 파티에 대응 캐릭터가 하나라도 있을 때만 줄을 담는다 — 아무도 없으면 켤 수 있어도 얻는 게 없다.
 * members에는 파티 세 자리의 캐릭터와 고른 공명 모드를 넘긴다.
 */
export function clusterStateBuffs(
  members: { characterId: string; mode?: ResonanceMode }[] = [],
): ManualBuff[] {
  const responders = members.filter((m) => respondsToCluster(m.characterId, m.mode));
  if (responders.length === 0) return [];

  return [
    {
      id: CLUSTER_INTERFERENCE_BUFF_ID,
      label: "조화 밀집 · 간섭 · 최종 피해 (자신의 증폭 1pt당 0.12%)",
      target: "totalDamage",
      damageType: "All",
      value: 0.0012, // 증폭 1pt당 0.12%
      scaleFrom: "SyncAmplify",
      // 상한은 statusStackCap이 「간섭 상한 +1」 줄들을 더해서 낸다. 기본값은 일단 1스택.
      statusStacks: CLUSTER_INTERFERENCE_STATUS,
      stacks: 1,
      modifier: "increase",
      enabled: true,
      // 적에게 실제로 붙어 있을 때만 걸린다 — 조화도 파괴를 쓰면 저절로 켜진다.
      uptime: "active",
      // ownerId를 비워 둔다 — 비례 기준(증폭)을 **때리는 캐릭터 자신의 것**으로 읽게 하려는 것이다.
      scope: "party",
      // 대응 능력이 있는 캐릭터만 이 피해 증가를 얻는다.
      onlyFor: responders.map((m) => baseCharacterId(m.characterId)),
      // 조화도 파괴를 쓸 때마다 1스택. 적에게 쌓이는 값이라 **사이클을 넘어 그대로 간다** —
      // 상한에 닿으면 더 오르지 않는다(자르는 것은 계산·화면 쪽).
      triggeredBy: [DISCORD_ATTACK_ID],
      stacksPerTrigger: 1,
      endsOn: "rotation",
    },
  ];
}
