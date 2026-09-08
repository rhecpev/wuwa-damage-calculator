import { useMemo, useState, useSyncExternalStore } from "react";
import { usePartyConfig } from "../../context/PartyConfigContext";
import { computeResults } from "../CalculatorPage/hooks/useCalculationResults";
import type { CalculationResult } from "../CalculatorPage/hooks/useCalculationResults";
import { DamageBreakdownSection } from "../CalculatorPage/components/DamageBreakdownSection";
import {
  echoStoreVersion,
  loadEchoLinks,
  loadMyEchoes,
  subscribeEchoStore,
} from "../../data/echoStore";
import type { EchoLink } from "../../data/echoStore";
import { characters } from "../../data/sampleData";
import { num } from "../../utils/format";
import type { Character, ManualBuff, PartyConfig } from "../../types/game";

/**
 * 사이클 대미지 비교 — **에코를 바꾸면 얼마나 달라지나**.
 *
 * 사이클 하나를 잡고, 거기 나오는 캐릭터 한 명의 에코를 슬롯 단위로 갈아 끼워 본다.
 * 왼쪽 그래프가 지금 낀 그대로, 오른쪽이 갈아 끼운 뒤다.
 *
 * 계산은 계산 탭과 같은 함수(computeResults)를 쓴다. 에코 연결(EchoLink)만 덮어써서
 * 넘기므로 저장된 장착 상태는 건드리지 않는다 — 여기서 아무리 바꿔 봐도 원래대로 남는다.
 */
export function CycleComparePage() {
  const {
    config,
    characterWeapons,
    allBuffs,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
    cyclePresets,
  } = usePartyConfig();

  // 에코 저장소는 React 상태가 아니라 localStorage 한 벌이다 — 바뀌면 다시 읽는다.
  const echoVersion = useSyncExternalStore(subscribeEchoStore, echoStoreVersion);
  const links = useMemo(() => loadEchoLinks(), [echoVersion]);
  const owned = useMemo(() => loadMyEchoes(), [echoVersion]);

  const [baseId, setBaseId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  /** 슬롯 번호(그 캐릭터의 연결 순서) → 바꿔 낄 에코 pk. 비어 있으면 그대로 둔다. */
  const [swaps, setSwaps] = useState<Record<number, number>>({});

  const preset = cyclePresets.find((p) => p.id === baseId) ?? cyclePresets[0] ?? null;

  // 이 사이클에 나오는 캐릭터들. 에코를 바꿔 볼 대상은 여기서 고른다.
  const owners = useMemo<Character[]>(() => {
    if (!preset) return [];
    const ids = [...new Set(preset.rotation.map((r) => r.characterId))];
    return ids
      .map((id) => characters.find((c) => c.id === id))
      .filter((c): c is Character => Boolean(c));
  }, [preset]);

  const owner = owners.find((c) => c.id === ownerId) ?? owners[0] ?? null;

  /** 고른 캐릭터가 낀 에코를 연결 순서대로. 슬롯 번호가 곧 이 배열의 자리다. */
  const slots = useMemo(() => {
    if (!owner) return [];
    return links
      .filter((l) => l.characterId === owner.id)
      .map((l, index) => ({ index, link: l, echo: owned.find((e) => e.pk === l.echoId) }));
  }, [owner, links, owned]);

  const view = useMemo(() => {
    if (!preset) return null;

    const merged: ManualBuff[] = [
      ...allBuffs,
      ...preset.manualBuffs.filter((b) => !allBuffs.some((a) => a.id === b.id)),
    ];

    const run = (echoLinks?: EchoLink[]): CalculationResult[] => {
      const cfg: PartyConfig = { ...config, rotation: preset.rotation, enemy: preset.enemy };
      return computeResults(
        cfg,
        characterWeapons,
        merged,
        characterChains,
        characterSkillLevels,
        characterLevels,
        characterNodes,
        echoLinks,
      );
    };
    const sum = (rows: CalculationResult[]) =>
      rows.reduce((acc, r) => acc + r.damage.expectedDamage, 0);

    // 바꾼 뒤의 연결. 고른 캐릭터의 n번째 연결만 갈아 끼운다.
    let seen = -1;
    const swapped: EchoLink[] = links.map((l) => {
      if (!owner || l.characterId !== owner.id) return l;
      seen += 1;
      const next = swaps[seen];
      return next === undefined ? l : { ...l, echoId: next };
    });
    const changed = swapped.some((l, i) => l.echoId !== links[i].echoId);

    const before = run();
    const after = changed ? run(swapped) : before;
    const a = sum(before);
    const b = sum(after);

    // 캐릭터별로도 갈라 본다 — 남의 에코를 바꿔도 파티 버프로 내 딜이 움직인다.
    const byCharacter = owners.map((c) => {
      const x = sum(before.filter((r) => r.character.id === c.id));
      const y = sum(after.filter((r) => r.character.id === c.id));
      return { id: c.id, name: c.name, before: x, after: y, delta: y - x };
    });

    return {
      before,
      after,
      total: { before: a, after: b, delta: b - a, rate: a > 0 ? (b / a - 1) * 100 : 0 },
      byCharacter,
      changed,
    };
  }, [
    preset,
    owner,
    owners,
    swaps,
    links,
    config,
    characterWeapons,
    allBuffs,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
  ]);

  if (!preset) {
    return (
      <section className="panel">
        <h2>사이클 대미지 비교</h2>
        <p className="enemy-hint">
          담아 둔 사이클이 없습니다. 「데미지 계산」 탭에서 루틴을 짠 뒤 사이클로 담으면 여기서
          에코를 바꿔 가며 견줄 수 있습니다.
        </p>
      </section>
    );
  }

  const sign = (n: number) => (n > 0 ? "+" : "");

  return (
    <>
      {/* ── 위: 가로로 긴 판. 무엇을 어떻게 바꿀지 여기서 다 고른다. ── */}
      <section className="panel">
        <div className="row">
          <div>
            <h2>사이클 대미지 비교</h2>
          </div>
          <div className="compare-picks">
            <label>
              <em>사이클</em>
              <select
                value={preset.id}
                onChange={(event) => {
                  setBaseId(event.target.value);
                  setOwnerId("");
                  setSwaps({});
                }}
              >
                {cyclePresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {/* 캐릭터는 얼굴이 있어야 바로 알아본다 — select 로는 그림을 못 넣어 단추로 깐다. */}
            <span className="compare-owners">
              <em>에코 바꿀 캐릭터</em>
              {owners.map((c) => (
                <button
                  key={c.id}
                  className={c.id === owner?.id ? "on" : ""}
                  title={c.name}
                  onClick={() => {
                    setOwnerId(c.id);
                    setSwaps({});
                  }}
                >
                  {c.iconUrl && <img src={c.iconUrl} alt="" loading="lazy" />}
                  {c.name}
                </button>
              ))}
            </span>
            {view?.changed && (
              <button className="pen" onClick={() => setSwaps({})} title="바꾼 것을 되돌린다">
                되돌리기
              </button>
            )}
          </div>
        </div>

        <p className="enemy-hint">
          담아 둔 루틴과 적 설정을 <b>지금 환경</b>으로 돌린 값입니다. 여기서 에코를 바꿔 봐도
          실제 장착은 그대로입니다 — 계산에만 갈아 끼워 봅니다.
        </p>

        {slots.length === 0 ? (
          <p className="enemy-hint">
            {owner ? `${owner.name}에게 낀 에코가 없습니다.` : "이 사이클에 캐릭터가 없습니다."}{" "}
            「캐릭터 관리」 탭에서 에코를 끼우면 여기서 바꿔 볼 수 있습니다.
          </p>
        ) : (
          <div className="echo-swaps">
            {slots.map((slot) => (
              <label key={slot.index} className={swaps[slot.index] !== undefined ? "on" : ""}>
                <em>{slot.index + 1}번 슬롯</em>
                <small>{slot.echo?.name ?? "빈 슬롯"}</small>
                <select
                  value={swaps[slot.index] ?? slot.link.echoId}
                  onChange={(event) => {
                    const pk = Number(event.target.value);
                    setSwaps((prev) => {
                      const next = { ...prev };
                      if (pk === slot.link.echoId) delete next[slot.index];
                      else next[slot.index] = pk;
                      return next;
                    });
                  }}
                >
                  {owned.map((e) => (
                    <option key={e.pk} value={e.pk}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}

        <div className="stat-bonus">
          <div>
            <span>바꾸기 전 총 기대 피해</span>
            <b>{view ? num(view.total.before) : "—"}</b>
          </div>
          <div>
            <span>바꾼 뒤</span>
            <b>{view ? num(view.total.after) : "—"}</b>
          </div>
          <div>
            <span>차이</span>
            <b>
              {view
                ? `${sign(view.total.delta)}${num(Math.round(view.total.delta))} (${sign(
                    view.total.rate,
                  )}${view.total.rate.toFixed(2)}%)`
                : "—"}
            </b>
          </div>
        </div>
      </section>

      {/* ── 아래: 왼쪽이 바꾸기 전, 오른쪽이 바꾼 뒤 ── */}
      {view && (
        <div className="compare-graphs">
          <DamageBreakdownSection
            stacked
            results={view.before}
            title="바꾸기 전"
            note={`지금 낀 에코 그대로 · 총 ${num(view.total.before)}`}
          />
          <DamageBreakdownSection
            stacked
            results={view.after}
            title="바꾼 뒤"
            note={
              view.changed
                ? `총 ${num(view.total.after)} · ${sign(view.total.delta)}${num(
                    Math.round(view.total.delta),
                  )}`
                : "아직 바꾼 에코가 없습니다 — 위에서 슬롯을 갈아 끼워 보세요."
            }
          />
        </div>
      )}

      <section className="panel">
        <h2>캐릭터별로 얼마나 움직였나</h2>
        <p className="enemy-hint">
          남의 에코를 바꿔도 파티 버프를 타고 내 피해가 움직입니다. 그래서 캐릭터마다 따로 적습니다.
        </p>
        <table className="buff-table">
          <thead>
            <tr>
              <th>캐릭터</th>
              <th>바꾸기 전</th>
              <th>바꾼 뒤</th>
              <th>차이</th>
            </tr>
          </thead>
          <tbody>
            {view?.byCharacter.map((row) => (
              <tr key={row.id} className={row.delta === 0 ? "off" : ""}>
                <td>
                  {row.name}
                  {row.id === owner?.id && <span className="chain-mode">에코 바꾼 캐릭터</span>}
                </td>
                <td>{num(row.before)}</td>
                <td>{num(row.after)}</td>
                <td className="chain-value">
                  {row.delta === 0
                    ? "—"
                    : `${sign(row.delta)}${num(Math.round(row.delta))} (${sign(row.delta)}${(
                        row.before > 0 ? (row.after / row.before - 1) * 100 : 0
                      ).toFixed(2)}%)`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
