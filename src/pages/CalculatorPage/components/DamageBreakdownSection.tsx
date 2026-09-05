import { useState } from "react";
import type { CalculationResult } from "../hooks/useCalculationResults";
import type { AttackType } from "../../../types/game";
import { characters } from "../../../data/sampleData";
import { PARTY_SLOTS, usePartyConfig } from "../../../context/PartyConfigContext";
import { num, pct } from "../../../utils/format";

interface DamageBreakdownSectionProps {
  results: CalculationResult[];
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
const SLICE_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];
/** 여섯 번째부터는 색을 새로 만들지 않고 「기타」로 접는다. */
const OTHER_COLOR = "#9199a8";
const EMPTY_COLOR = "#364054";
const MAX_SLICES = 5;

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

interface Slice {
  name: string;
  value: number;
  color: string;
}

/** 이 캐릭터의 공격을 분류별로 묶어 큰 것부터. 다섯 개까지만 제 색을 준다. */
function slicesOf(rows: CalculationResult[]): Slice[] {
  const byCategory = new Map<string, number>();
  for (const r of rows) {
    const key = CATEGORY_NAMES[r.attack.damageBonusType ?? r.attack.type] ?? "기타";
    byCategory.set(key, (byCategory.get(key) ?? 0) + r.damage.expectedDamage);
  }

  const sorted = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, MAX_SLICES);
  const tail = sorted.slice(MAX_SLICES);

  return [
    ...head.map(([name, value], i) => ({ name, value, color: SLICE_COLORS[i] })),
    ...(tail.length
      ? [{ name: "기타", value: tail.reduce((s, [, v]) => s + v, 0), color: OTHER_COLOR }]
      : []),
  ];
}

/**
 * 로테이션 결과를 두 각도로 보여준다.
 *   왼쪽 — 캐릭터마다 도넛 하나. 그 캐릭터의 피해를 공격 분류로 나눈 비중.
 *   오른쪽 — 캐릭터별 피해량 가로 막대와 총 합산.
 * 숫자는 전부 기대 피해 기준이다. 공격을 담지 않아도 빈 도넛으로 자리를 지킨다.
 */
export function DamageBreakdownSection({ results }: DamageBreakdownSectionProps) {
  const { config } = usePartyConfig();
  const [hover, setHover] = useState<string | null>(null);

  const total = results.reduce((sum, r) => sum + r.damage.expectedDamage, 0);

  // 파티 세 자리를 그대로 쓴다 — 공격을 담지 않은 캐릭터도 빈 도넛으로 남는다.
  const members = PARTY_SLOTS.map((slot, index) => {
    const character = characters.find((c) => c.id === config[slot].characterId);
    const rows = character ? results.filter((r) => r.character.id === character.id) : [];
    const value = rows.reduce((sum, r) => sum + r.damage.expectedDamage, 0);

    return {
      key: character?.id ?? `slot-${index}`,
      name: character?.name ?? `${index + 1}번 캐릭터`,
      icon: character?.iconUrl,
      empty: !character,
      slices: slicesOf(rows),
      value,
    };
  });

  const barMax = members.reduce((max, m) => Math.max(max, m.value), 0) || 1;

  return (
    <section className="panel viz">
      <div className="row">
        <div>
          <h2>피해 분석</h2>
        </div>
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
                            opacity={hover === null || hover === s.name ? 1 : 0.3}
                            onMouseEnter={() => setHover(s.name)}
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
                      className={hover === null || hover === s.name ? "" : "dim"}
                      onMouseEnter={() => setHover(s.name)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <i style={{ background: s.color }} />
                      <span>{s.name}</span>
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
          <figcaption>
            캐릭터별 피해량
            <b className="viz-total">
              기대 총 피해량 <span>{num(total)}</span>
            </b>
          </figcaption>

          <ul className="viz-bars">
            {members.map((m) => (
              <li key={m.key} title={`${m.name} · ${num(m.value)}`}>
                <span className="viz-bar-name">
                  {m.icon && <img src={m.icon} alt="" loading="lazy" />}
                  {m.name}
                </span>
                <span className="viz-bar-track">
                  <span
                    className="viz-bar-fill"
                    style={{ width: `${(m.value / barMax) * 100}%` }}
                  />
                </span>
                <b>{num(m.value)}</b>
                <em>{total > 0 ? pct(m.value / total, 1) : "—"}</em>
              </li>
            ))}
          </ul>
        </figure>
      </div>
    </section>
  );
}
