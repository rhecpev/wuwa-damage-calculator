import { useMemo, useState } from "react";
import { characters } from "../../data/sampleData";
import { characterTextOf } from "../../data/characterTexts";
import { ANOMALIES } from "../../data/anomalies";
import { anomaliesOf } from "../../data/characterAnomalies";
import {
  TRIGGER_STATUSES,
  triggerKind,
  triggerLabel,
  triggersOf,
} from "../../data/attackTriggers";
import { useReviewStatus } from "../../utils/useReviewStatus";
import type { Attack, Character, ResonanceMode, Skill } from "../../types/game";

/** 트리거에 붙은 공명 모드를 사람이 읽는 이름으로. */
const MODE_LABEL: Record<ResonanceMode, string> = {
  Discord: "조화 파동",
  Flame: "불꽃",
  Cluster: "조화 밀집",
  Frost: "서리",
  Echo: "에코",
};

/**
 * 공격 트리거 확인 탭 — 공격 하나하나가 **쓰면 무엇을 일으키는지** 채워 넣는 자리.
 *
 * 「서리 효과를 1회 추가한다」, 「어둠의 핵심을 모두 소모한다」처럼 스킬 설명문에 붙어
 * 있는 부수 효과를 data/attackTriggers.ts에 옮겨 적고, 그 결과를 여기서 훑는다.
 * 루틴 카드에 뜨는 알약이 곧 이 자료다.
 *
 * 옮겨 적을 때 제일 자주 나는 사고는 **남의 공격에 얹히는 것을 제 공격에 적는 것**이다.
 * 「파티 내 캐릭터가 서리 효과를 추가할 시」로 시작하는 문장은 그 캐릭터의 공격 트리거가
 * 아니라 버프다. 그래서 아래 「원문에서 찾은 문장」에 근거 줄을 같이 띄워 대조할 수 있게 했다.
 */

/** 원문에서 이상 효과를 언급하는 문장을 찾을 때 쓰는 말. */
const ANOMALY_WORDS = ["풍식", "광학", "전자", "서리", "불꽃", "암흑"];
const CHANGE_WORDS = ["추가", "소모", "제거", "부여", "획득", "회복"];

/** 이 캐릭터 설명문에서 「○○ 효과를 …한다」로 읽히는 줄만 뽑는다. */
function anomalyLines(characterId: string): string[] {
  const texts = characterTextOf(characterId);
  if (!texts) return [];
  const out: string[] = [];
  for (const skill of texts.skills) {
    for (const raw of skill.text.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      // 이상 효과 6종만 보면 절반을 놓친다 — 부조화 「이탈」·「간섭」과
      // 고유 상태도 같은 문법으로 적혀 있어 TRIGGER_STATUSES까지 함께 찾는다.
      const hit =
        ANOMALY_WORDS.some((w) => line.includes(`${w} 효과`)) ||
        TRIGGER_STATUSES.some((w) => line.includes(w));
      if (!hit) continue;
      if (!CHANGE_WORDS.some((w) => line.includes(w))) continue;
      if (!out.includes(line)) out.push(line);
    }
  }
  return out;
}

interface Row {
  character: Character;
  skill: Skill;
  attacks: Attack[];
  /** 트리거가 하나라도 적힌 공격 수. */
  filled: number;
}

function buildRows(character: Character): Row[] {
  return character.skills
    .filter((skill) => skill.attacks.length > 0)
    .map((skill) => ({
      character,
      skill,
      attacks: skill.attacks,
      filled: skill.attacks.filter((a) => triggersOf(a.id).length > 0).length,
    }));
}

type Filter = "all" | "filled" | "empty" | "anomaly";
const FILTERS: Array<{ id: Filter; label: string; hint: string }> = [
  { id: "anomaly", label: "효과 · 상태 캐릭터", hint: "이상 효과 · 부조화 이탈/간섭을 다루는 캐릭터만" },
  { id: "empty", label: "아직 빈 것", hint: "트리거가 하나도 없는 스킬" },
  { id: "filled", label: "채운 것", hint: "트리거가 하나라도 있는 스킬" },
  { id: "all", label: "전체", hint: "모든 스킬" },
];

export function AttackTriggerPage() {
  const [filter, setFilter] = useState<Filter>("anomaly");
  const [query, setQuery] = useState("");
  const review = useReviewStatus("attack-trigger-review");
  const { checkedSet } = review;

  const rows = useMemo(() => characters.flatMap(buildRows), []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (q) {
        const hay = `${row.character.name} ${row.skill.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "filled") return row.filled > 0;
      if (filter === "empty") return row.filled === 0;
      // 이상 효과가 없어도 「이탈」·「간섭」을 다루는 캐릭터는 같이 봐야 한다.
      if (filter === "anomaly")
        return anomaliesOf(row.character.id).length > 0 || anomalyLines(row.character.id).length > 0;
      return true;
    });
  }, [rows, filter, query]);

  // 진행 상황 — 이상 효과를 붙이는 캐릭터를 기준으로 센다. 거기가 먼저 채워져야 한다.
  const progress = useMemo(() => {
    const target = rows.filter(
      (r) => anomaliesOf(r.character.id).length > 0 || anomalyLines(r.character.id).length > 0,
    );
    const attacks = target.reduce((n, r) => n + r.attacks.length, 0);
    const filled = target.reduce((n, r) => n + r.filled, 0);
    const allAttacks = rows.reduce((n, r) => n + r.attacks.length, 0);
    const allFilled = rows.reduce((n, r) => n + r.filled, 0);
    return { attacks, filled, allAttacks, allFilled };
  }, [rows]);

  return (
    <>
      <header>
        <div>
          <h1>공격 트리거 확인</h1>
          <p>
            공격을 쓰면 따라 일어나는 일 — 이상 효과 추가·소모, 자원 획득·소모를 모아 둔 곳입니다.
            루틴 카드에 그대로 뜹니다.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="data-progress">
          <b>
            효과 · 상태를 다루는 캐릭터 {progress.filled} / {progress.attacks} 공격
          </b>
          <span>
            전체 {progress.allFilled} / {progress.allAttacks}
          </span>
        </div>

        <div className="chain-controls">
          <span className="chain-picker">
            보기
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={filter === f.id ? "on" : ""}
                title={f.hint}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </span>
          <input
            className="weapon-search"
            placeholder="캐릭터 · 스킬 이름으로 찾기"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      {list.length === 0 && <p className="data-empty">조건에 맞는 항목이 없습니다.</p>}

      {list.map((row) => {
        const kinds = anomaliesOf(row.character.id);
        return (
          <section className="panel char-attack-card" key={`${row.character.id}:${row.skill.id}`}>
            <div className="char-attack-head">
              {row.character.iconUrl && <img src={row.character.iconUrl} alt="" />}
              <div className="char-attack-name">
                <h2>
                  {row.character.name}
                  {kinds.map((k) => (
                    <span className="char-attack-mode" key={k}>
                      {ANOMALIES[k].name} 효과
                    </span>
                  ))}
                  {row.filled === 0 && <span className="char-buff-warn">트리거 없음</span>}
                </h2>
                <span>
                  {row.skill.name} · 공격 {row.attacks.length}개 · 트리거 {row.filled}개
                </span>
              </div>
            </div>

            <table className="buff-table data-table">
              <thead>
                <tr>
                  <th>공격</th>
                  <th>트리거</th>
                  <th>조건 · 근거</th>
                  <th>확인</th>
                </tr>
              </thead>
              <tbody>
                {row.attacks.map((attack) => {
                  const triggers = triggersOf(attack.id);
                  const key = `${row.character.id}:${attack.id}`;
                  const on = checkedSet.has(key);
                  return (
                    <tr key={attack.id} className={on ? "is-checked" : ""}>
                      <td className="data-cell-label">{attack.name}</td>
                      <td>
                        {triggers.length === 0 ? (
                          <em className="data-stacks">없음</em>
                        ) : (
                          <span className="card-triggers">
                            {triggers.map((t, i) => (
                              <em
                                key={i}
                                className={`trigger-${triggerKind(t)}-${t.action}`}
                                title={t.resonanceMode ? `${MODE_LABEL[t.resonanceMode]} 모드에서만` : undefined}
                              >
                                {triggerLabel(t)}
                                {t.resonanceMode && ` (${MODE_LABEL[t.resonanceMode]})`}
                              </em>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="data-cell-note">
                        {triggers.map((t, i) => (
                          <div key={i}>
                            {t.condition && <b>{t.condition} · </b>}
                            {t.source}
                          </div>
                        ))}
                      </td>
                      <td className="char-attack-review">
                        <button
                          className={on ? "cell-check on" : "cell-check"}
                          title={on ? "확인을 해제합니다" : "이 줄을 확인했다고 표시합니다"}
                          onClick={() => review.toggleChecked(key)}
                        >
                          ✓
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 옮겨 적을 때 대조할 원문. 스킬별로 자르지 않고 캐릭터 단위로 모아 보여준다
                — 「어느 공격의 것인지」를 사람이 판단해야 하는 자리라서다. */}
            {(() => {
              const lines = anomalyLines(row.character.id);
              if (lines.length === 0) return null;
              return (
                <details className="trigger-source">
                  <summary>원문에서 찾은 효과 · 상태 문장 {lines.length}줄</summary>
                  <ul>
                    {lines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </details>
              );
            })()}
          </section>
        );
      })}
    </>
  );
}
