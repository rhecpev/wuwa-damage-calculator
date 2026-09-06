import { Fragment, useState } from "react";
import type { CalculationResult } from "../hooks/useCalculationResults";
import { useAppState } from "../../../context/AppStateContext";
import { usePartyConfig } from "../../../context/PartyConfigContext";
import { DamageFormulaModal } from "./DamageFormulaModal";
import { num } from "../../../utils/format";
import { ANOMALIES } from "../../../data/anomalies";
import { anomalyStackCap } from "../../../calculator/manualBuffs";
import type { AttackType } from "../../../types/game";

interface RotationSectionProps {
  results: CalculationResult[];
}

/**
 * 카드 색을 가르는 갈래. 색만 다를 뿐 계산과는 무관하다.
 *
 * 공명 회로는 공격 자체에 자리가 없다 — 회로에 든 공격도 type은 강공격·공명 스킬이라
 * 스킬 갈래(skillCategory)를 먼저 본다. 이상 효과·조화도 파괴는 피해식이 통째로 달라
 * 그쪽을 가장 먼저 가른다.
 */
function cardKind(result: CalculationResult): string {
  if (result.damage.kind === "anomaly") return "anomaly";
  if (result.damage.kind === "discord") return "discord";
  if (result.skillCategory === "Circuit") return "circuit";
  switch (result.attack.type) {
    case "Basic":
    case "Aerial":
      return "basic";
    case "Heavy":
    case "DodgeCounter":
      return "heavy";
    case "Skill":
      return "skill";
    case "Liberation":
    case "Ultimate":
      return "liberation";
    case "Intro":
      return "intro";
    case "Outro":
    case "Variation":
      return "outro";
    case "Echo":
      return "echo";
    default:
      return "basic";
  }
}

/**
 * 카드에서 고를 수 있는 피해 판정.
 * 계산에 실제로 자리가 있는 것만 둔다(calculator/damage.ts의 CATEGORY_BONUS_KEY).
 */
const DAMAGE_TYPES: { value: AttackType; label: string }[] = [
  { value: "Basic", label: "일반 공격" },
  { value: "Heavy", label: "강공격" },
  { value: "Aerial", label: "공중 공격" },
  { value: "DodgeCounter", label: "회피 반격" },
  { value: "Skill", label: "공명 스킬" },
  { value: "Liberation", label: "공명 해방" },
  { value: "Intro", label: "반주 스킬" },
  { value: "Outro", label: "변주 스킬" },
  { value: "Echo", label: "에코" },
];

/**
 * 「이 뒤에 담기」 목록에 세울 공격들. 스킬 갈래로 묶는다 — 공격 추가 팔레트와 같은 순서다.
 * 이상 효과·조화도 파괴는 스킬이 아니라 상태·별도 항목이라 여기 나오지 않는다(위 팔레트에서 담는다).
 */
function attackGroups(character: CalculationResult["character"]) {
  const order: { category: string; label: string }[] = [
    { category: "Basic", label: "기본 공격" },
    { category: "Skill", label: "공명 스킬" },
    { category: "Circuit", label: "공명 회로" },
    { category: "Liberation", label: "공명 해방" },
    { category: "Variation", label: "변주 스킬" },
    { category: "Intro", label: "반주 스킬" },
    { category: "Sync", label: "조화도 파괴" },
  ];
  const bucket = new Map<string, CalculationResult["attack"][]>();
  for (const skill of character.skills) {
    const key = skill.category ?? "Basic";
    for (const attack of skill.attacks) {
      const rows = bucket.get(key);
      if (rows) rows.push(attack);
      else bucket.set(key, [attack]);
    }
  }
  return order
    .map((row) => ({ label: row.label, attacks: bucket.get(row.category) ?? [] }))
    .filter((row) => row.attacks.length > 0);
}

/**
 * 카드에 적을 공격 이름. 끝에 붙은 「피해」를 뗀다 —
 * 좁은 카드에서 줄만 잡아먹고, 어차피 카드에 뜨는 숫자가 피해량이다.
 */
const attackLabel = (name: string) => name.replace(/\s*피해$/, "");

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
    moveAttack,
    duplicateCycle,
    setAttackDamageType,
    addAttackAfter,
    openCycle,
    saveCyclePreset,
    allBuffs,
  } = usePartyConfig();
  // 상세보기를 연 항목의 id. 카드 선택(selectedId)과는 별개로 둔다 —
  // 카드를 눌러 히트별로 펼치는 것과 계산식을 여는 것은 다른 동작이다.
  const [formulaId, setFormulaId] = useState<string | null>(null);
  // 사이클 저장 — 이름을 물어보는 작은 줄. 담고 나면 다시 접는다.
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saved, setSaved] = useState(false);
  // 끌어다 놓기 — 집은 카드와 지금 걸쳐 있는 카드.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // 「이 뒤에 담기」 목록을 펼친 항목.
  const [addId, setAddId] = useState<string | null>(null);
  // 피해 판정을 고르는 창을 연 항목.
  const [typeId, setTypeId] = useState<string | null>(null);
  const formulaResult = results.find((r) => r.item.id === formulaId);
  const typeResult = results.find((r) => r.item.id === typeId);

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
                <button
                  className="cycle-copy"
                  title="이 사이클을 통째로 복사해 맨 뒤에 새 사이클로 붙입니다"
                  onClick={() => duplicateCycle(cycle)}
                >
                  ⧉ 사이클 복제
                </button>
              </div>
            )}
            <div
              className={[
                "item",
                dragId === result.item.id ? "dragging" : "",
                overId === result.item.id ? "over" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              // 카드를 끌어 순서를 바꾼다. 놓인 자리의 사이클을 따라가므로 사이클 이동도 이걸로 한다.
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", result.item.id);
                setDragId(result.item.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(event) => {
                if (!dragId || dragId === result.item.id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (overId !== result.item.id) setOverId(result.item.id);
              }}
              onDragLeave={() => setOverId((cur) => (cur === result.item.id ? null : cur))}
              onDrop={(event) => {
                event.preventDefault();
                const from = event.dataTransfer.getData("text/plain") || dragId;
                if (from) moveAttack(from, result.item.id);
                setDragId(null);
                setOverId(null);
              }}
            >
              {/* 카드와 버튼을 한 상자에 묶는다 — 잇는 선까지 기준으로 잡히면 버튼이 멀리 떨어진다. */}
              <div className="item-card">
              {/* 카드 안에 스택·횟수 입력칸이 들어가서 button으로 둘 수 없다
                  — button 안의 input은 표준이 아니고 누르는 판정도 엉킨다. */}
              <div
                className={`card kind-${cardKind(result)} ${open ? "selected" : ""}`}
                role="button"
                tabIndex={0}
                title={`${result.character.name} · ${result.attack.name}`}
                data-kind={cardKind(result)}
                onClick={() => setSelectedId(open ? null : result.item.id)}
                onKeyDown={(event) => {
                  // 안쪽 입력칸에서 누른 키는 카드를 여닫지 않는다.
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setSelectedId(open ? null : result.item.id);
                }}
              >
                <span className="card-head">
                  {result.character.iconUrl && (
                    <img
                      className="card-face"
                      src={result.character.iconUrl}
                      alt=""
                      loading="lazy"
                      draggable={false}
                    />
                  )}
                  <span
                    className="card-title"
                    role="button"
                    tabIndex={0}
                    title="누르면 이 뒤에 담을 공격을 고릅니다"
                    onClick={(event) => {
                      event.stopPropagation();
                      setAddId((cur) => (cur === result.item.id ? null : result.item.id));
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      setAddId((cur) => (cur === result.item.id ? null : result.item.id));
                    }}
                  >
                    {index + 1}. {attackLabel(result.attack.name)}
                    {result.item.damageBonusType && <i className="card-typed">판정</i>}
                  </span>
                </span>

                {/* 기대 피해가 곧 「상세보기」 단추다 — 카드를 좁히면서 자리를 합쳤다. */}
                <span
                  className="card-exp"
                  role="button"
                  tabIndex={0}
                  title="누르면 이 한 대의 계산식을 펼칩니다"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFormulaId(result.item.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    event.stopPropagation();
                    setFormulaId(result.item.id);
                  }}
                >
                  {num(result.damage.expectedDamage)}
                  {multi && <i>{result.damage.hits.length}타</i>}
                </span>

                {/* 이상 효과는 스택이 곧 피해다 — 카드 안에서 바로 고칠 수 있게 둔다. */}
                {result.damage.kind === "anomaly" && (() => {
                  // 스택 상한은 고정이 아니다 — 치사의 반주처럼 상한을 올려주는 버프가 켜져 있으면
                  // 그만큼 더 쌓을 수 있고, 폭발형은 넘긴 스택마다 33%씩 더 터진다.
                  const cap = anomalyStackCap(
                    result.damage.breakdown.anomaly,
                    allBuffs,
                    result.item.enabledBuffIds,
                    result.item.disabledBuffIds,
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
                  </div>
                  );
                })()}

                {/* 조화도 파괴 — 배율이 스킬마다 달라서 카드 안에서 바로 고칠 수 있게 둔다. */}
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
                  </div>
                )}
              </div>

              <span className="item-tools">
                <button
                  className="pen"
                  title="이 한 대의 피해 판정 바꾸기"
                  onClick={() => setTypeId(result.item.id)}
                >
                  ✎
                </button>
                <button
                  className="copy"
                  title="이 공격을 버프 설정까지 그대로 복사해 맨 뒤에 추가"
                  onClick={() => duplicateAttack(result.item.id)}
                >
                  ⧉
                </button>
                <button className="x" title="삭제" onClick={() => removeAttack(result.item.id)}>
                  ×
                </button>
              </span>

              {/* 이 뒤에 담을 공격 고르기 — 공격명을 누르면 카드 아래로 펼친다.
                  켜 둔 버프를 그대로 이어받아, 콤보를 이어 담을 때 매번 다시 켜지 않아도 된다. */}
              {addId === result.item.id && (
                <div className="card-add" onClick={(event) => event.stopPropagation()}>
                  <small>이 뒤에 담기 — 켜 둔 버프를 이어받습니다</small>
                  {attackGroups(result.character).map((group) => (
                    <div key={group.label} className="card-add-group">
                      <em>{group.label}</em>
                      <div>
                        {group.attacks.map((attack) => (
                          <button
                            key={attack.id}
                            title={attack.name}
                            onClick={() => {
                              addAttackAfter(result.item.id, attack.id, result.character.id);
                              setAddId(null);
                            }}
                          >
                            {attackLabel(attack.name)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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

      {/* 피해 판정 고르기 — 카드의 공격명을 누르면 뜬다.
          자료가 「공명 스킬」이라고 적어 둔 공격이 실제로는 공명 해방 피해로 들어가는 일이 있어,
          그 한 대만 손으로 바꿀 수 있게 해 둔다. */}
      {typeResult && (
        <div className="formula-backdrop" onClick={() => setTypeId(null)} role="presentation">
          <div className="type-modal" onClick={(event) => event.stopPropagation()}>
            <div className="formula-head">
              <div>
                <small>피해 판정</small>
                <h3>{attackLabel(typeResult.attack.name)}</h3>
                <span>
                  {typeResult.character.name} · 자료에 적힌 판정{" "}
                  {DAMAGE_TYPES.find(
                    (t) => t.value === (typeResult.attack.damageBonusType ?? typeResult.attack.type),
                  )?.label ?? (typeResult.attack.damageBonusType ?? typeResult.attack.type)}
                </span>
              </div>
              <button className="formula-close" onClick={() => setTypeId(null)}>
                ×
              </button>
            </div>

            <div className="type-grid">
              {DAMAGE_TYPES.map((type) => {
                const on = typeResult.item.damageBonusType === type.value;
                return (
                  <button
                    key={type.value}
                    className={on ? "on" : ""}
                    onClick={() => {
                      setAttackDamageType(typeResult.item.id, on ? null : type.value);
                      setTypeId(null);
                    }}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>

            <div className="type-foot">
              <button
                onClick={() => {
                  setAttackDamageType(typeResult.item.id, null);
                  setTypeId(null);
                }}
                disabled={!typeResult.item.damageBonusType}
              >
                자료대로 되돌리기
              </button>
              <small>
                이 한 대에만 걸립니다. 피해 보너스(일반 공격 · 강공격 …)와 버프 판정이 함께 바뀝니다.
              </small>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
