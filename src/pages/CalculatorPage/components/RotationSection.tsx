import { Fragment, useState } from "react";
import type { CalculationResult } from "../hooks/useCalculationResults";
import { useAppState } from "../../../context/AppStateContext";
import { usePartyConfig } from "../../../context/PartyConfigContext";
import { DamageFormulaModal } from "./DamageFormulaModal";
import { num } from "../../../utils/format";
import { ANOMALIES } from "../../../data/anomalies";
import { triggerKind, triggerLabel, triggersOf } from "../../../data/attackTriggers";
import { anomalyStackCap } from "../../../calculator/manualBuffs";

interface RotationSectionProps {
  results: CalculationResult[];
}

export function RotationSection({ results }: RotationSectionProps) {
  const { selectedId, setSelectedId } = useAppState();
  const {
    removeAttack,
    duplicateAttack,
    clearRotation,
    setAnomalyStacks,
    setAnomalyOccurrences,
    setDiscordRate,
    setDiscordOccurrences,
    addCycle,
    setAttackCycle,
    openCycle,
    saveCyclePreset,
    allBuffs,
    characterModes,
  } = usePartyConfig();
  // 상세보기를 연 항목의 id. 카드 선택(selectedId)과는 별개로 둔다 —
  // 카드를 눌러 히트별로 펼치는 것과 계산식을 여는 것은 다른 동작이다.
  const [formulaId, setFormulaId] = useState<string | null>(null);
  // 사이클 저장 — 이름을 물어보는 작은 줄. 담고 나면 다시 접는다.
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saved, setSaved] = useState(false);
  const formulaResult = results.find((r) => r.item.id === formulaId);

  return (
    <section className="panel">
      <div className="row">
        <div>
          <h2>공격 루틴</h2>
        </div>
        <div className="rotation-tools">
          <button
            className="viz-toggle"
            title="여기서부터 다음 사이클로 넘긴다 — 뒤에 담는 공격이 새 사이클에 들어간다"
            onClick={() => addCycle()}
          >
            + 사이클
          </button>
          {results.length > 0 && (
            <>
              <button
                className="viz-toggle"
                title="지금 루틴을 버프 체크까지 통째로 담아 사이클 관리 탭에서 다시 쓴다"
                onClick={() => {
                  setSaveOpen((open) => !open);
                  setSaved(false);
                }}
              >
                사이클 저장
              </button>
              <button
                className="viz-toggle"
                title="담아둔 공격을 전부 비운다"
                onClick={() => clearRotation()}
              >
                일괄 삭제 ({results.length})
              </button>
            </>
          )}
        </div>
      </div>

      {saveOpen && (
        <div className="cycle-save">
          <input
            autoFocus
            placeholder="사이클 이름 (예: 금희 4사이클)"
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                saveCyclePreset(saveName || "이름 없는 사이클");
                setSaveName("");
                setSaved(true);
                setSaveOpen(false);
              }
              if (event.key === "Escape") setSaveOpen(false);
            }}
          />
          <button
            className="primary"
            onClick={() => {
              saveCyclePreset(saveName || "이름 없는 사이클");
              setSaveName("");
              setSaved(true);
              setSaveOpen(false);
            }}
          >
            담기
          </button>
          <small>캐릭터 · 무기 · 체인 · 손 버프 · 공격마다 켜둔 버프까지 함께 담깁니다.</small>
        </div>
      )}
      {saved && <p className="cycle-saved">사이클 관리 탭에 담았습니다.</p>}

      <div className="rotation-wrap">
        <div className="rotation">
          {results.map((result, index) => {
            // 카드를 누르면 이 카드가 선택되고 옆에 버프 창이 뜬다.
            // 히트별 내역은 「상세보기」의 계산식 창에서 본다.
            const open = selectedId === result.item.id;
            const multi = result.damage.hits.length > 1;
            // 사이클이 바뀌는 자리마다 줄을 끊고 머리를 하나 세운다.
            // 예전에 담은 공격에는 cycle이 없어 1사이클로 본다.
            const cycle = result.item.cycle ?? 1;
            const prevCycle = index > 0 ? (results[index - 1].item.cycle ?? 1) : 0;
            const cycleStarts = cycle !== prevCycle;
            // 그 사이클에 몇 대가 들었는지 — 머리에 같이 적는다.
            const cycleCount = results.filter((r) => (r.item.cycle ?? 1) === cycle).length;

            return (
            <Fragment key={result.item.id}>
            {cycleStarts && (
              <div className="cycle-head">
                <b>{cycle}사이클</b>
                <span>{cycleCount}대</span>
              </div>
            )}
            <div className="item">
              {/* 카드와 버튼을 한 상자에 묶는다 — 잇는 선까지 기준으로 잡히면 버튼이 멀리 떨어진다. */}
              <div className="item-card">
              <button
                className={`card ${open ? "selected" : ""}`}
                onClick={() => setSelectedId(open ? null : result.item.id)}
              >
                {result.character.iconUrl && (
                  <img
                    className="card-face"
                    src={result.character.iconUrl}
                    alt=""
                    loading="lazy"
                    title={result.character.name}
                  />
                )}

                <span className="card-title">
                  {index + 1}. {result.attack.name}
                </span>
                <span style={{ fontSize: 11, color: "#9aa3b3" }}>{result.character.name}</span>

                {/* 비크리 · 크리를 나란히, 기대 피해는 그 아래 큰 숫자로. */}
                <span className="card-dmg">
                  <em>비크리</em>
                  <i>{num(result.damage.normalDamage)}</i>
                  <em>크리</em>
                  <i>{num(result.damage.criticalDamage)}</i>
                </span>

                <b>{num(result.damage.expectedDamage)}</b>
                <small>기대 피해{multi && ` · ${result.damage.hits.length}타`}</small>

                {/* 이 공격을 쓰면 따라 일어나는 일 — 이상 효과·자원이 어디서 쌓이고
                    어디서 타는지 루틴을 훑으며 눈으로 따라갈 수 있게 적어 둔다.
                    피해 계산에는 들어가지 않는다(data/attackTriggers.ts). */}
                {(() => {
                  // 이중 모드 캐릭터는 지금 고른 모드에 맞는 줄만 남긴다 —
                  // 데니아처럼 같은 공격이 모드마다 다른 것을 붙이는 자리가 있어서다.
                  const mode =
                    characterModes[result.character.id] ?? result.character.resonanceModes?.[0];
                  const triggers = triggersOf(result.attack.id).filter(
                    (t) => t.resonanceMode === undefined || t.resonanceMode === mode,
                  );
                  if (triggers.length === 0) return null;
                  return (
                    <span className="card-triggers">
                      {triggers.map((trigger, i) => (
                        <em
                          key={i}
                          className={`trigger-${triggerKind(trigger)}-${trigger.action}`}
                          title={[trigger.condition, trigger.source].filter(Boolean).join(" — ")}
                        >
                          {triggerLabel(trigger)}
                          {trigger.condition && "*"}
                        </em>
                      ))}
                    </span>
                  );
                })()}

                {/* 카드가 button이라 안에 button을 둘 수 없어서 span으로 만든다. */}
                <span
                  className="card-detail"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation(); // 카드 선택까지 같이 걸리지 않도록
                    setFormulaId(result.item.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    event.stopPropagation();
                    setFormulaId(result.item.id);
                  }}
                >
                  상세보기
                </span>
              </button>

              <span className="item-tools">
                <button
                  className="copy"
                  title="이 공격을 버프 설정까지 그대로 복사해 맨 뒤에 추가"
                  onClick={() => duplicateAttack(result.item.id)}
                >
                  ⧉
                </button>
                <button
                  className="cyc"
                  title="앞 사이클로 옮기기"
                  onClick={() => setAttackCycle(result.item.id, cycle - 1)}
                  disabled={cycle <= 1}
                >
                  ↑
                </button>
                <button
                  className="cyc"
                  title="뒤 사이클로 옮기기"
                  onClick={() => setAttackCycle(result.item.id, cycle + 1)}
                >
                  ↓
                </button>
                <button className="x" title="삭제" onClick={() => removeAttack(result.item.id)}>
                  ×
                </button>
              </span>

              {/* 이상 효과는 스택이 곧 피해다 — 카드 아래에서 바로 고칠 수 있게 둔다. */}
              {result.damage.kind === "anomaly" && (() => {
                // 스택 상한은 고정이 아니다 — 치사의 반주처럼 상한을 올려주는 버프가 켜져 있으면
                // 그만큼 더 쌓을 수 있고, 폭발형은 넘긴 스택마다 33%씩 더 터진다.
                const cap = anomalyStackCap(
                  result.damage.breakdown.anomaly,
                  allBuffs,
                  result.item.enabledBuffIds,
                );
                return (
                <div className="card-anomaly" onClick={(event) => event.stopPropagation()}>
                  <label>
                    <em>스택</em>
                    <input
                      type="number"
                      min={0}
                      max={cap.max}
                      value={result.damage.breakdown.stacks}
                      onChange={(event) =>
                        setAnomalyStacks(result.item.id, Number(event.target.value))
                      }
                    />
                  </label>
                  <label>
                    <em>횟수</em>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={result.damage.breakdown.occurrences}
                      onChange={(event) =>
                        setAnomalyOccurrences(result.item.id, Number(event.target.value))
                      }
                    />
                  </label>
                  {cap.bonus > 0 && (
                    <small className="cap-note">
                      {cap.from.join(" · ")} 적용됨 · 상한 {cap.max}
                    </small>
                  )}
                  {/* 폭발형은 최대 스택에 닿아야 터진다 — 그 전에는 피해가 0이다. */}
                  {result.damage.breakdown.base === 0 && (
                    <small>
                      {result.damage.breakdown.anomalyType === "burst"
                        ? `최대 ${ANOMALIES[result.damage.breakdown.anomaly].maxStacks}스택에서 터집니다`
                        : "피해가 없는 효과입니다"}
                    </small>
                  )}
                </div>
                );
              })()}

              {/* 조화도 파괴 — 배율이 스킬마다 달라서 카드에서 바로 고칠 수 있게 둔다. */}
              {result.damage.kind === "discord" && (
                <div className="card-anomaly" onClick={(event) => event.stopPropagation()}>
                  <label>
                    <em>배율 %</em>
                    <input
                      type="number"
                      min={0}
                      max={20000}
                      step={10}
                      value={Math.round(result.damage.breakdown.baseRate * 100)}
                      onChange={(event) =>
                        setDiscordRate(result.item.id, Number(event.target.value) / 100)
                      }
                    />
                  </label>
                  <label>
                    <em>횟수</em>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={result.damage.breakdown.occurrences}
                      onChange={(event) =>
                        setDiscordOccurrences(result.item.id, Number(event.target.value))
                      }
                    />
                  </label>
                  <small>
                    공격력·크리티컬·피해 보너스가 걸리지 않습니다 · 물리 피해
                    {result.damage.breakdown.syncAmplify > 0 &&
                      ` · 조화도 파괴 증폭 ${result.damage.breakdown.syncAmplify}pt 적용됨`}
                  </small>
                </div>
              )}
              </div>

              {/* 다음 카드가 같은 사이클일 때만 화살표로 잇는다 — 사이클을 넘어가면 줄이 끊긴다. */}
              {index < results.length - 1 &&
                (results[index + 1].item.cycle ?? 1) === cycle && <em>→</em>}
            </div>
            </Fragment>
            );
          })}

          {/* 「+ 사이클」을 눌러 열어 둔 빈 사이클. 카드가 없으면 아무것도 안 보여
              단추가 먹지 않은 것처럼 느껴지므로, 자리를 그려서 다음에 담을 곳을 알린다. */}
          {(() => {
            const last = results.reduce((max, r) => Math.max(max, r.item.cycle ?? 1), 0);
            if (openCycle <= last) return null;
            return (
              <>
                <div className="cycle-head">
                  <b>{openCycle}사이클</b>
                  <span>아직 비어 있음</span>
                </div>
                <div className="cycle-empty">여기에 담으면 {openCycle}사이클에 들어갑니다.</div>
              </>
            );
          })()}

          {results.length === 0 && openCycle <= 1 && (
            <div className="empty">위의 공격을 클릭해서 딜사이클을 만들어보세요.</div>
          )}
        </div>
      </div>

      {formulaResult && (
        <DamageFormulaModal result={formulaResult} onClose={() => setFormulaId(null)} />
      )}
    </section>
  );
}
