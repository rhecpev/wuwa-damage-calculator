import { useState } from "react";
import type { CalculationResult } from "../hooks/useCalculationResults";
import type { AttackType } from "../../../types/game";
import { characters } from "../../../data/sampleData";
import { ANOMALIES } from "../../../data/anomalies";
import { useCharacterColor } from "./characterColors";
import { PARTY_SLOTS, usePartyConfig } from "../../../context/PartyConfigContext";
import { num, pct } from "../../../utils/format";
import { tuneLabelOf } from "../../../utils/buffLabels";
import type { DamageSnapshot } from "../../../data/cyclePresets";

interface DamageBreakdownSectionProps {
  /** 지금 계산한 결과. snapshot을 주면 쓰지 않는다. */
  results?: CalculationResult[];
  /** 담아 둔 그래프 값. 사이클 관리에서 「저장 당시 그래프」를 그릴 때 준다. */
  snapshot?: DamageSnapshot;
  /** 판 제목. 사이클 비교 탭에서 둘을 나란히 띄울 때 어느 쪽인지 적는다. */
  title?: string;
  /** 제목 아래 한 줄. 어느 사이클을 그린 것인지 같은 설명에 쓴다. */
  note?: string;
  /**
   * 세로로 쌓기. 도넛 줄이 위, 막대가 아래로 간다.
   * 판 둘을 좌우로 나란히 놓을 때(사이클 비교) 폭이 절반이라 옆으로는 못 앉힌다.
   */
  stacked?: boolean;
}

/** 공격 분류 이름. 피해량을 묶는 기준이자 도넛 조각의 이름이다. */
const CATEGORY_NAMES: Record<AttackType, string> = {
  Basic: "일반 공격",
  Heavy: "강공격",
  Aerial: "공중 공격",
  DodgeCounter: "회피 반격",
  Skill: "공명 스킬",
  Liberation: "공명 해방",
  Intro: "반주 스킬",
  Outro: "변주 스킬",
  Echo: "에코",
  Ultimate: "궁극기",
  Variation: "변주",
  Chain: "협동",
};

/**
 * 조각 색. 밝은 순서가 아니라 정해진 순서로 배정한다
 * — 항목이 늘거나 줄어도 같은 분류가 같은 색을 유지해야 한다.
 * 색은 분류 이름으로 고정하므로 캐릭터 셋의 도넛에서 같은 분류가 같은 색으로 나온다.
 * 이 다섯 색은 앱 표면(#282f41)에서 색각 이상 판별·명도·대비 검사를 통과한 조합이다.
 */
const SLICE_COLORS = ["var(--c-3987e5)", "var(--c-d95926)", "var(--c-199e70)", "var(--c-c98500)", "var(--c-d55181)"];
/** 여섯 번째부터는 색을 새로 만들지 않고 「기타」로 접는다. */
const OTHER_COLOR = "var(--c-9199a8)";
const EMPTY_COLOR = "var(--c-364054)";
const MAX_SLICES = 5;

/** 공격별 피해 막대그래프 크기(viewBox). 폭은 판에 맞춰 늘어난다. */
const CHART_W = 1200;
const CHART_H = 96;

const RADIUS = 52;
const THICKNESS = 18;
const GAP = 2; // 조각 사이 표면 간격(px)
const CENTER = 60;

/** 도넛 한 조각의 path. 각도는 12시에서 시계 방향. */
function arc(startRatio: number, endRatio: number): string {
  const inner = RADIUS - THICKNESS;
  // 간격은 조각 길이에 비례하지 않으므로 반지름 기준 각도로 환산한다.
  const gapAngle = GAP / RADIUS;
  const a0 = startRatio * Math.PI * 2 - Math.PI / 2 + gapAngle / 2;
  const a1 = Math.max(a0, endRatio * Math.PI * 2 - Math.PI / 2 - gapAngle / 2);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (radius: number, angle: number) =>
    `${(CENTER + radius * Math.cos(angle)).toFixed(2)} ${(CENTER + radius * Math.sin(angle)).toFixed(2)}`;

  return [
    `M ${p(RADIUS, a0)}`,
    `A ${RADIUS} ${RADIUS} 0 ${large} 1 ${p(RADIUS, a1)}`,
    `L ${p(inner, a1)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${p(inner, a0)}`,
    "Z",
  ].join(" ");
}

/** 이 공격이 묶이는 분류 이름. 도넛 조각과 요약 판의 분류 표가 같이 쓴다. */
export function damageCategoryName(r: CalculationResult): string {
  const kind = r.attack.anomaly;
  if (kind) return `${ANOMALIES[kind].name} 효과`;
  if (r.attack.discord) return "조화도 파괴";
  // Ultimate 칸을 빌린 것이라 그대로 두면 「궁극기」로 묶인다
  if (r.attack.tune) return `${tuneLabelOf(r.attack)} 피해`;
  return CATEGORY_NAMES[r.attack.damageBonusType ?? r.attack.type] ?? "기타";
}

interface Slice {
  name: string;
  value: number;
  color: string;
}

/**
 * 이 캐릭터의 공격을 분류별로 묶어 큰 것부터. 다섯 개까지만 제 색을 준다.
 *
 * 이상 효과는 분류가 아니라 효과 이름(「서리 효과」)으로 따로 묶고 「기타」로 접지 않는다
 * — 공격 모양만 빌린 항목이라 분류(type)가 에코로 잡혀 있어, 그대로 두면 에코 피해에 섞인다.
 * 조화도 파괴도 같은 사정이라 「조화도 파괴」로 따로 묶는다.
 */
function slicesOf(rows: CalculationResult[]): Slice[] {
  const byCategory = new Map<string, number>();
  const byAnomaly = new Map<string, number>();
  for (const r of rows) {
    const bucket = r.attack.anomaly || r.attack.discord ? byAnomaly : byCategory;
    const key = damageCategoryName(r);
    bucket.set(key, (bucket.get(key) ?? 0) + r.damage.expectedDamage);
  }

  const anomalies = [...byAnomaly.entries()];
  const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  // 이상 효과가 차지한 만큼 공격 분류 자리를 줄인다 — 색은 여전히 다섯 개까지다.
  const room = Math.max(MAX_SLICES - anomalies.length, 0);
  const head = [...sorted.slice(0, room), ...anomalies].sort((a, b) => b[1] - a[1]);
  const tail = sorted.slice(room);

  return [
    ...head.map(([name, value], i) => ({
      name,
      value,
      color: SLICE_COLORS[i] ?? OTHER_COLOR,
    })),
    ...(tail.length
      ? [{ name: "기타", value: tail.reduce((s, [, v]) => s + v, 0), color: OTHER_COLOR }]
      : []),
  ];
}

/**
 * 그래프가 그리는 값을 숫자로 뽑는다. 화면과 「사이클 저장」이 같이 쓴다
 * — 저장할 때 그때 그래프와 똑같은 값이 담기도록 계산을 한 곳에 둔다.
 * partyIds는 파티 세 자리의 캐릭터 id(빈 자리는 "")다.
 */
export function buildDamageSnapshot(
  results: CalculationResult[],
  partyIds: string[],
): DamageSnapshot {
  const total = results.reduce((sum, r) => sum + r.damage.expectedDamage, 0);
  // 총 피해량 중 이상 효과 몫. 누가 담았든 적에게 쌓인 상태가 낸 피해라 파티 전체로 한 번만 센다.
  const anomalyTotal = results.reduce(
    (sum, r) => sum + (r.attack.anomaly ? r.damage.expectedDamage : 0),
    0,
  );

  // 파티 세 자리를 그대로 쓴다 — 공격을 담지 않은 캐릭터도 빈 도넛으로 남는다.
  const members = partyIds.map((id, index) => {
    const character = characters.find((c) => c.id === id);
    const rows = character ? results.filter((r) => r.character.id === character.id) : [];
    return {
      characterId: character?.id ?? null,
      name: character?.name ?? `${index + 1}번 캐릭터`,
      value: rows.reduce((sum, r) => sum + r.damage.expectedDamage, 0),
      // 그중 이 캐릭터가 담은 이상 효과 항목이 낸 몫. value 안에 이미 들어 있다.
      anomaly: rows.reduce((sum, r) => sum + (r.attack.anomaly ? r.damage.expectedDamage : 0), 0),
      slices: slicesOf(rows),
    };
  });

  const attacks = results.map((r) => ({
    attackId: r.attack.id,
    characterId: r.character.id,
    name: r.attack.name,
    cycle: r.item.cycle ?? 1,
    expected: r.damage.expectedDamage,
    ...("normalDamage" in r.damage ? { normal: r.damage.normalDamage } : {}),
    ...("criticalDamage" in r.damage ? { critical: r.damage.criticalDamage } : {}),
  }));

  return { total, anomalyTotal, members, attacks };
}

/**
 * 로테이션 결과를 한 판에 모아 보여준다.
 *   맨 위 — 총 기대 피해 · 공격 수 · 사이클 수 · 공격당 평균 · 이상 효과 몫.
 *   왼쪽 — 캐릭터마다 도넛 하나. 그 캐릭터의 피해를 공격 분류로 나눈 비중.
 *   오른쪽 — 캐릭터별 피해량 가로 막대, 그 아래 분류 × 캐릭터 표.
 *   아래 — 담긴 순서대로 선 공격별 피해 막대, 공격별 피해 순위.
 * 숫자는 전부 기대 피해 기준이다. 공격을 담지 않아도 빈 도넛으로 자리를 지킨다.
 */
export function DamageBreakdownSection({
  results = [],
  snapshot,
  title = "피해 분석",
  note,
  stacked = false,
}: DamageBreakdownSectionProps) {
  const { config } = usePartyConfig();
  const colorOf = useCharacterColor();
  // 커서를 올린 조각. 캐릭터까지 같이 적는다 — 분류 이름만 보면 다른 캐릭터의 같은 분류까지 함께 켜진다.
  const [hover, setHover] = useState<{ member: string; name: string } | null>(null);

  // 담아 둔 값이 있으면 그걸로, 없으면 지금 결과로 그린다.
  const data =
    snapshot ??
    buildDamageSnapshot(
      results,
      PARTY_SLOTS.map((slot) => config[slot].characterId),
    );
  const { total, anomalyTotal } = data;
  // 얼굴은 담지 않고 그릴 때 찾는다 — 그림 주소가 바뀌어도 옛 사이클이 깨지지 않게.
  const members = data.members.map((m, index) => ({
    ...m,
    key: m.characterId ?? `slot-${index}`,
    icon: characters.find((c) => c.id === m.characterId)?.iconUrl,
    empty: !m.characterId,
  }));

  const barMax = members.reduce((max, m) => Math.max(max, m.value), 0) || 1;

  // 공격별 순위 — 같은 캐릭터의 같은 공격은 몇 번을 담았든 합친다. 큰 것부터.
  // 예전에 담은 사이클에는 attacks가 없을 수 있다.
  const byAttack = new Map<string, { key: string; characterId: string; name: string; value: number; count: number }>();
  for (const a of data.attacks ?? []) {
    const key = `${a.characterId}|${a.attackId}`;
    const row = byAttack.get(key) ?? { key, characterId: a.characterId, name: a.name, value: 0, count: 0 };
    row.value += a.expected;
    row.count += 1;
    byAttack.set(key, row);
  }
  const ranking = [...byAttack.values()]
    .sort((x, y) => y.value - x.value)
    .map((a) => {
      const owner = characters.find((c) => c.id === a.characterId);
      return { ...a, name: a.name.replace(/\s*피해$/, ""), owner: owner?.name ?? "", icon: owner?.iconUrl };
    });
  const rankMax = ranking[0]?.value || 1;

  // 담긴 순서대로 본 공격 — 막대그래프와 맨 위 숫자 줄이 쓴다.
  const sequence = (data.attacks ?? []).map((a) => {
    const owner = characters.find((c) => c.id === a.characterId);
    return { ...a, color: owner ? colorOf(owner) : OTHER_COLOR };
  });
  const peak = sequence.reduce((max, a) => Math.max(max, a.expected), 0);
  const step = sequence.length > 0 ? CHART_W / sequence.length : CHART_W;
  const cycles = new Set(sequence.map((a) => a.cycle)).size;

  // 분류 × 캐릭터 표. 도넛과 달리 「기타」로 접지 않고 전부 적는다. 분류는 합이 큰 것부터.
  // 담아 둔 값(snapshot)에는 분류가 없어 지금 결과로 그릴 때만 나온다.
  const byCategory = new Map<string, Map<string, number>>();
  for (const r of results) {
    const name = damageCategoryName(r);
    const row = byCategory.get(name) ?? new Map<string, number>();
    row.set(r.character.id, (row.get(r.character.id) ?? 0) + r.damage.expectedDamage);
    byCategory.set(name, row);
  }
  const categories = [...byCategory.entries()]
    .map(([name, row]) => ({ name, row, sum: [...row.values()].reduce((s, v) => s + v, 0) }))
    .sort((a, b) => b.sum - a.sum);
  const columns = members.flatMap((m) => {
    const owner = characters.find((c) => c.id === m.characterId);
    return owner ? [{ ...m, id: owner.id, color: colorOf(owner) }] : [];
  });

  return (
    <section className={stacked ? "panel viz viz-stacked" : "panel viz"}>
      <div className="row">
        <div>
          <h2>{title}</h2>
          {note && <span className="enemy-hint">{note}</span>}
        </div>
      </div>

      {/* ── 맨 위: 숫자 한 줄 ── */}
      <div className="c2-sum-stats">
        <div>
          <em>총 기대 피해</em>
          <b className="accent">{num(total)}</b>
        </div>
        <div>
          <em>공격</em>
          <b>{sequence.length}</b>
        </div>
        <div>
          <em>사이클</em>
          <b>{cycles}</b>
        </div>
        <div>
          <em>공격당 평균</em>
          <b>{num(sequence.length > 0 ? total / sequence.length : 0)}</b>
        </div>
        {anomalyTotal > 0 && (
          <div title="총 피해량 중 이상 효과 피해">
            <em>이상 효과</em>
            <b>
              {num(anomalyTotal)} <small>{pct(anomalyTotal / total, 1)}</small>
            </b>
          </div>
        )}
      </div>

      <div className="viz-grid">
        {/* ── 왼쪽: 캐릭터마다 도넛 하나 ── */}
        <div className="viz-donuts">
          {members.map((m) => {
            let acc = 0;

            return (
              <figure className="viz-fig" key={m.key}>
                <figcaption>
                  {m.icon && <img src={m.icon} alt="" loading="lazy" />}
                  {m.name}
                </figcaption>

                <div className="viz-donut">
                  <svg viewBox="0 0 120 120" role="img" aria-label={`${m.name} 공격 분류별 피해 비중`}>
                    {m.slices.length === 0 ? (
                      // 담은 공격이 없어도 자리를 지키도록 빈 고리를 그린다.
                      <path d={arc(0, 1)} fill={EMPTY_COLOR} />
                    ) : (
                      m.slices.map((s) => {
                        const start = acc;
                        acc += s.value / m.value;
                        return (
                          <path
                            key={s.name}
                            d={arc(start, acc)}
                            fill={s.color}
                            opacity={hover === null || hover.member !== m.key || hover.name === s.name ? 1 : 0.3}
                            onMouseEnter={() => setHover({ member: m.key, name: s.name })}
                            onMouseLeave={() => setHover(null)}
                          >
                            <title>
                              {s.name} · {num(s.value)} · {pct(s.value / m.value, 1)}
                            </title>
                          </path>
                        );
                      })
                    )}
                  </svg>

                  <div className="viz-donut-center">
                    <b>{num(m.value)}</b>
                    <em>{m.value > 0 ? pct(m.value / total, 1) : "공격 없음"}</em>
                  </div>
                </div>

                {/* 범례 겸 직접 라벨 — 색만으로 구분하지 않도록 이름과 값을 같이 둔다. */}
                <ul className="viz-legend">
                  {m.slices.map((s) => (
                    <li
                      key={s.name}
                      className={hover === null || hover.member !== m.key || hover.name === s.name ? "" : "dim"}
                      onMouseEnter={() => setHover({ member: m.key, name: s.name })}
                      onMouseLeave={() => setHover(null)}
                    >
                      <i style={{ background: s.color }} />
                      <span>{s.name}</span>
                      {/* 비중만으로는 얼마였는지 모른다 — 실제 기대 피해를 비중 옆에 같이 적는다. */}
                      <em>{num(s.value)}</em>
                      <b>{pct(s.value / m.value, 1)}</b>
                    </li>
                  ))}
                  {m.slices.length === 0 && (
                    <li className="viz-legend-empty">
                      {m.empty ? "자리가 비어 있습니다" : "담은 공격이 없습니다"}
                    </li>
                  )}
                </ul>
              </figure>
            );
          })}
        </div>

        {/* ── 오른쪽: 캐릭터별 피해량 ── */}
        <figure className="viz-fig viz-bars-fig">
          <figcaption>캐릭터별 피해량</figcaption>

          <ul className="viz-bars">
            {members.map((m) => (
              <li
                key={m.key}
                title={`${m.name} · ${num(m.value)}${
                  m.anomaly > 0 ? ` (이상 효과 ${num(m.anomaly)})` : ""
                }`}
              >
                <span className="viz-bar-name">
                  {m.icon && <img src={m.icon} alt="" loading="lazy" />}
                  {m.name}
                  {/* 막대 안의 이상 효과 몫을 숫자로도 적는다 — 색만으로 구분하지 않게. */}
                  {m.anomaly > 0 && (
                    <small className="viz-bar-anomaly">
                      <i />
                      이상 효과 {num(m.anomaly)} · {pct(m.anomaly / m.value, 1)}
                    </small>
                  )}
                </span>
                {/* 공격 몫 뒤에 이상 효과 몫을 이어 붙인다. 둘을 합친 길이가 그 캐릭터의 피해량이다. */}
                <span className="viz-bar-track">
                  <span
                    className="viz-bar-fill"
                    style={{ width: `${((m.value - m.anomaly) / barMax) * 100}%` }}
                  />
                  {m.anomaly > 0 && (
                    <span
                      className="viz-bar-fill viz-bar-fill-anomaly"
                      style={{ width: `${(m.anomaly / barMax) * 100}%` }}
                    />
                  )}
                </span>
                <b>{num(m.value)}</b>
                <em>{total > 0 ? pct(m.value / total, 1) : "—"}</em>
              </li>
            ))}
          </ul>

          {/* 분류 × 캐릭터 — 도넛이 비중으로 보여 준 것을 숫자로 전부 적는다. */}
          {categories.length > 0 && (
            <table className="c2-bkd">
              <thead>
                <tr>
                  <th />
                  {columns.map((m) => (
                    <th key={m.id} style={{ "--who": m.color } as React.CSSProperties}>
                      {m.name}
                    </th>
                  ))}
                  <th>합계</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    {columns.map((m) => (
                      <td key={m.id}>{c.row.has(m.id) ? num(c.row.get(m.id)!) : "—"}</td>
                    ))}
                    <td>{num(c.sum)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>합계</td>
                  {columns.map((m) => (
                    <td key={m.id} style={{ "--who": m.color } as React.CSSProperties}>
                      {num(m.value)}
                    </td>
                  ))}
                  <td>{num(total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </figure>
      </div>

      {/* ── 담긴 순서대로 본 공격별 피해 — 어디서 피해가 몰리는지 한눈에 본다. 색은 캐릭터 속성이다. ── */}
      {sequence.length > 0 && (
        <div className="c2-sum-chart">
          <em>공격별 피해 (담긴 순서)</em>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="담긴 순서대로 본 기대 피해"
          >
            {sequence.map((a, index) => {
              const height = peak > 0 ? (a.expected / peak) * (CHART_H - 2) : 0;
              return (
                <rect
                  key={index}
                  x={index * step + step * 0.15}
                  y={CHART_H - height}
                  width={Math.max(step * 0.7, 0.6)}
                  height={height}
                  fill={a.color}
                >
                  <title>{`${index + 1}. ${a.name} — ${num(a.expected)}`}</title>
                </rect>
              );
            })}
          </svg>
        </div>
      )}

      {/* ── 아래: 공격별 피해 순위 — 같은 공격을 여러 번 담았으면 합쳐서 한 줄로 센다. ── */}
      {ranking.length > 0 && (
        <div className="viz-rank">
          <small className="viz-rank-head">공격별 피해 순위</small>
          <ol>
            {ranking.map((a, index) => (
              <li key={a.key} title={`${a.owner} · ${a.name} · ${num(a.value)}`}>
                <i className={index < 3 ? "top" : ""}>{index + 1}</i>
                <span className="viz-rank-name">
                  {a.icon && <img src={a.icon} alt="" loading="lazy" />}
                  {a.name}
                  {a.count > 1 && <small>×{a.count}</small>}
                </span>
                <span className="viz-bar-track">
                  <span className="viz-bar-fill" style={{ width: `${(a.value / rankMax) * 100}%` }} />
                </span>
                <b>{num(a.value)}</b>
                <em>{total > 0 ? pct(a.value / total, 1) : "—"}</em>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
