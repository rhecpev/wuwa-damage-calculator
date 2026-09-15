import type { Attack } from "../types/game";

/**
 * 공격에 딸린 추가타(Attack.extraHits)를 조건에 맞춰 hits 뒤에 붙인 계산용 사본을 만든다.
 *
 * 추가타는 따로 떨어지는 공격이 아니라 그 공격의 일부로 친다 — 그 공격에 걸리는 버프
 * (피해 보너스 · 배율 상승 등)를 그대로 받는다. 상리요 1체인 회선 매트릭스처럼
 * 「만물의 법칙 배율의 8%」로 정해진 것이 여기 들어간다.
 *
 * scaleHits는 원래 히트의 배율을 바꾼다 — 카를로타 6체인은 사격 본체가 커지고(×3.14)
 * 결정체가 4개 더 나온다. 커진 히트도 그 추가타 이름을 달아 색을 달리한다.
 *
 * 배율 「증가」(%p)는 원래 히트끼리, 원래 배율 비율대로만 나눈다. 추가타까지 몫을 나누면
 * 원래 히트가 받을 증가분이 줄어든다 — 그래서 increaseShare를 원래 몫 + 추가타 0으로 채운다.
 *
 * hitLabels에 히트별 이름을 채워 둔다(손대지 않은 원래 히트는 null). 히트별 표가 이걸 보고 색을 달리한다.
 */
export function withExtraHits(attack: Attack, chain: number): Attack {
  const extras = (attack.extraHits ?? []).filter((e) => (e.resonanceChain ?? 0) <= chain);
  if (extras.length === 0) return attack;

  const level = (levels: number[]) => levels[Math.max(0, attack.skillLevel - 1)] ?? levels.at(-1) ?? 0;
  const baseShare = attack.increaseShare ?? attack.hits.map(level);

  const labels: (string | null)[] = attack.hits.map(() => null);
  const hits = attack.hits.map((levels) => [...levels]);
  for (const extra of extras) {
    for (const { index, factor } of extra.scaleHits ?? []) {
      if (!hits[index]) continue;
      hits[index] = hits[index].map((v) => v * factor);
      labels[index] = extra.label;
    }
  }

  const added = extras.flatMap((e) =>
    e.hits.map((levels) => ({ levels, label: e.label, fixed: e.fixed === true })),
  );

  return {
    ...attack,
    hits: [...hits, ...added.map((a) => a.levels)],
    increaseShare: [...baseShare, ...added.map(() => 0)],
    hitLabels: [...labels, ...added.map((a) => a.label)],
    // 고정 배율 추가타는 그 공격의 배율 상승을 받지 않는다(calculator/damage.ts).
    ...(added.some((a) => a.fixed)
      ? { hitFixed: [...hits.map(() => false), ...added.map((a) => a.fixed)] }
      : {}),
  };
}
