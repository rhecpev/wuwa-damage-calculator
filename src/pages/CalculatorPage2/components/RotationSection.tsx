import { Fragment, useEffect, useState, useSyncExternalStore } from "react";
import { usePersistedState } from "../../../utils/usePersistedState";
import {
  attackDisplayName,
  attackNameByNickname,
  attackNicknamesVersion,
  subscribeAttackNicknames,
} from "../../../data/attackNicknames";
import { createPortal } from "react-dom";
import type { CalculationResult } from "../hooks/useCalculationResults";
import { useAppState } from "../../../context/AppStateContext";
import { PARTY_SLOTS, usePartyConfig } from "../../../context/PartyConfigContext";
import { characters } from "../../../data/sampleData";
import { useCharacterColor } from "./characterColors";
import { DamageFormulaModal } from "./DamageFormulaModal";
import { buildDamageSnapshot } from "./DamageBreakdownSection";
import { BuffDialog } from "./BuffDialog";
import { GridResizer, useGridSizes } from "./GridResizers";
import { num } from "../../../utils/format";
import { DeleteDialog } from "../../../components/Feedback";
import type { DeleteAsk } from "../../../components/Feedback";
import {
  DAMAGE_TYPE_LABEL,
  tuneLabelOf,
  TUNE_RESPONSE_SECTION,
} from "../../../utils/buffLabels";
import { AttackPaletteSection, isExtraAttack } from "./AttackPaletteSection";
import { anomalyStackCap } from "../../../calculator/manualBuffs";

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
export function cardKind(result: CalculationResult): string {
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
 * 카드 맨 아래 꼬리표에 적을 피해 타입. 갈래(cardKind)와 달리 공격 자체의 타입을 그대로 쓴다 —
 * 공명 회로에 든 공격도 강공격이면 강공격 피해다. 이상 효과 · 조화도 파괴는 피해식이 달라 따로 적는다.
 */
function damageTypeOf(result: CalculationResult): { key: string; label: string } {
  if (result.damage.kind === "anomaly") return { key: "anomaly", label: "이상 효과 피해" };
  if (result.damage.kind === "discord") return { key: "discord", label: "조화도 파괴 피해" };
  // 「조화 파동 피해」는 Ultimate 칸을 빌려 담은 것이라 그대로 적으면 「궁극기 피해」가 된다.
  if (result.attack.tune) return { key: "tune", label: `${tuneLabelOf(result.attack)} 피해` };
  // 「해당 피해는 ○○ 피해로 적용된다」처럼 판정이 따로 적힌 공격은 그 판정을 적는다.
  const type = result.attack.damageBonusType ?? result.attack.type;
  return { key: type, label: `${DAMAGE_TYPE_LABEL[type] ?? type} 피해` };
}

/**
 * 「공격 바꾸기」 목록에 세울 공격들. 스킬 갈래로 묶는다 — 공격 추가 팔레트와 같은 순서다.
 * 이상 효과·조화도 파괴는 스킬이 아니라 상태·별도 항목이라 여기 나오지 않는다(위 팔레트에서 담는다).
 */
function attackGroups(character: CalculationResult["character"], chain: number) {
  const order: { category: string; label: string }[] = [
    { category: "Basic", label: "기본 공격" },
    { category: "Skill", label: "공명 스킬" },
    { category: "Circuit", label: "공명 회로" },
    { category: "Liberation", label: "공명 해방" },
    { category: "Variation", label: "변주 스킬" },
    { category: "Intro", label: "반주 스킬" },
    { category: "Sync", label: TUNE_RESPONSE_SECTION },
    { category: "Passive", label: "고유 스킬" },
  ];
  const bucket = new Map<string, CalculationResult["attack"][]>();
  for (const skill of character.skills) {
    for (const attack of skill.attacks) {
      // 조화 파동 대응은 어느 스킬에 들어 있든 따로 세운다(공격 추가 팔레트와 같은 규칙).
      const key = attack.tune === "response" ? "Sync" : (skill.category ?? "Basic");
      // 체인이 모자라 생기지 않는 공격은 바꿀 후보에서도 뺀다(공격 추가 팔레트와 같은 규칙).
      if ((attack.resonanceChain ?? 0) > chain) continue;
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
export const attackLabel = (name: string) => name.replace(/\s*피해$/, "");

export function RotationSection({ results }: RotationSectionProps) {
  const { selectedId, setSelectedId } = useAppState();
  // 캐릭터 색 — 속성 색이되, 파티에 같은 속성이 겹치면 뒤 사람부터 조금씩 옮긴 색이다.
  const colorOf = useCharacterColor();
  // 끌어서 바꾼 공격 추가 너비 · 표 높이. 저장해 두고 다음에도 그대로 쓴다.
  const grid = useGridSizes();
  // 사이클을 어떤 꼴로 볼지 — 한 대가 한 줄인 리스트, 또는 원본 탭의 카드 판. 고른 쪽을 기억한다.
  const [view, setView] = usePersistedState<"list" | "card">("calc2.view", "list");
  // 공격 추가 목록의 「인게임 명칭 / 별명」 토글을 같이 따른다 — 토글이나 별명이 바뀌면 다시 그린다.
  useSyncExternalStore(subscribeAttackNicknames, attackNicknamesVersion);
  /** 카드에 적을 공격 이름. 별명 모드면 별명(없으면 규칙 별명), 아니면 인게임 명칭에서 「피해」를 뗀 것. */
  const nameOf = (characterId: string, attack: { id: string; name: string }) =>
    attackNameByNickname()
      ? attackDisplayName(characterId, attack.id, attackLabel(attack.name), true)
      : attackLabel(attack.name);
  const {
    addAttack,
    removeAttack,
    duplicateAttack,
    clearRotation,
    setAnomalyStacks,
    setDiscordRate,
    setDiscordOccurrences,
    setRepeat,
    addCycle,
    moveAttack,
    duplicateCycle,
    removeCycle,
    setAttackId,
    openCycle,
    saveCyclePreset,
    allBuffs,
    config,
    characterChains,
    autoBuffIdsFor,
  } = usePartyConfig();
  // 상세보기를 연 항목의 id. 카드 선택(selectedId)과는 별개로 둔다 —
  // 카드를 눌러 히트별로 펼치는 것과 계산식을 여는 것은 다른 동작이다.
  const [formulaId, setFormulaId] = useState<string | null>(null);
  // 사이클 저장 — 이름을 물어보는 작은 줄. 담고 나면 다시 접는다.
  // 「일괄 삭제」·「사이클 삭제」를 눌러 지울지 묻는 중이면 그 물음.
  const [deleteAsk, setDeleteAsk] = useState<DeleteAsk | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saved, setSaved] = useState(false);
  // 끌어다 놓기 — 집은 카드와 지금 걸쳐 있는 카드.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // 공격을 갈아 끼우는 창을 연 항목.
  const [swapId, setSwapId] = useState<string | null>(null);
  // 이름을 눌러 밝게 볼 캐릭터. 파티에서 빠졌으면 고르지 않은 것으로 본다.
  const [focusCharId, setFocusCharId] = useState<string | null>(null);
  const partyNames = PARTY_SLOTS.flatMap((slot, index) => {
    const character = characters.find((c) => c.id === config[slot].characterId);
    return character ? [{ ...character, no: index + 1 }] : [];
  });
  const focusChar = partyNames.some((c) => c.id === focusCharId) ? focusCharId : null;
  const formulaResult = results.find((r) => r.item.id === formulaId);
  const swapResult = results.find((r) => r.item.id === swapId);
  // 버프 창은 고른 줄 바로 아래(.c2-inline)에 열고, 계산식은 화면 위에 창으로 띄운다.
  const selected = results.find((r) => r.item.id === selectedId) ?? null;

  // ── 다중선택 ──
  // Ctrl(⌘)+클릭으로 한 장씩 더하고, Shift+클릭으로 기준 카드부터 그 카드까지 한꺼번에 고른다.
  // selectedId는 **기준 카드**(버프 창이 수치를 보여 주는 카드)로 남고, 여기에는 함께 고른 카드 전부를 담는다.
  // 기준 카드가 빠졌거나 한 장뿐이면 다중선택이 아닌 것으로 본다.
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const picked =
    selected && multiIds.includes(selected.item.id)
      ? results.filter((r) => multiIds.includes(r.item.id))
      : [];
  const peers = picked.length > 1 ? picked.filter((r) => r.item.id !== selected!.item.id) : [];
  const isPicked = (id: string) => id === selectedId || peers.some((r) => r.item.id === id);

  // 마지막으로 누른 공격 — 여러 개를 고르는 동안에는 버프 창을 이 공격 아래에 연다.
  const [lastPickedId, setLastPickedId] = useState<string | null>(null);

  // Ctrl(⌘) · Shift를 누르고 있는 동안에는 버프 창을 잠깐 감춘다 — 여러 공격을 고르는 중에
  // 창이 줄 사이에 끼어 있으면 다음에 누를 공격이 밀려나 고르기 어렵다. 키를 떼면 다시 나온다.
  // 입력칸에 글자를 적는 중의 Shift(대문자 등)는 고르는 동작이 아니므로 보지 않는다.
  const [modHeld, setModHeld] = useState(false);
  useEffect(() => {
    const typing = (target: EventTarget | null) =>
      target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]") !== null;
    const sync = (event: KeyboardEvent) => {
      if (typing(event.target)) return;
      setModHeld(event.ctrlKey || event.metaKey || event.shiftKey);
    };
    // 키를 누른 채 다른 창으로 넘어가면 keyup이 오지 않는다 — 돌아왔을 때 감춰진 채로 남지 않게 푼다.
    const clear = () => setModHeld(false);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", clear);
    };
  }, []);

  const pickCard = (id: string, event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
    setLastPickedId(id);
    const now = peers.length > 0 ? picked.map((r) => r.item.id) : selectedId ? [selectedId] : [];

    if (event.shiftKey && selectedId) {
      // 기준 카드부터 누른 카드까지 — 화면에 선 순서 그대로.
      const from = results.findIndex((r) => r.item.id === selectedId);
      const to = results.findIndex((r) => r.item.id === id);
      if (from >= 0 && to >= 0) {
        setMultiIds(results.slice(Math.min(from, to), Math.max(from, to) + 1).map((r) => r.item.id));
        return;
      }
    }
    if (event.ctrlKey || event.metaKey) {
      const next = now.includes(id) ? now.filter((x) => x !== id) : [...now, id];
      setMultiIds(next);
      // 기준 카드를 뺐으면 남은 것 가운데 하나를 기준으로 세운다. 처음 고르는 것이면 그 카드가 기준이다.
      if (!selectedId || !next.includes(selectedId)) setSelectedId(next[0] ?? null);
      return;
    }
    // 그냥 누르면 한 장만 — 고른 카드를 다시 누르면 닫는다(여러 장 고른 중이면 그 한 장으로 좁힌다).
    setMultiIds([]);
    setSelectedId(selectedId === id && peers.length === 0 ? null : id);
  };

  // 버프 창을 붙일 공격. 마지막으로 누른 공격이 지금도 골라져 있으면 그 아래, 아니면(방금 누른 것을 뺐으면) 기준 공격 아래다.
  const anchorId =
    lastPickedId && isPicked(lastPickedId) ? lastPickedId : (selected?.item.id ?? null);

  const closeBuffs = () => {
    setMultiIds([]);
    setSelectedId(null);
  };

  // 담는 순간의 피해를 그래프 값 그대로 같이 담는다 — 나중에 자료가 바뀌어도 그때 숫자로 다시 그린다.
  const saveCycle = () => {
    saveCyclePreset(
      saveName || "이름 없는 사이클",
      buildDamageSnapshot(
        results,
        PARTY_SLOTS.map((slot) => config[slot].characterId),
      ),
    );
    setSaveName("");
    setSaved(true);
    setSaveOpen(false);
  };

  // 표 머리에 적는 총 기대 피해.
  const total = results.reduce((sum, r) => sum + r.damage.expectedDamage, 0);

  return (
    <div className="c2-grid" style={grid.style}>
    <section className="c2-rot">
      <div className="c2-rot-bar">
        <h2>사이클 구성</h2>
        {/* 총 기대 피해는 표 머리에 늘 띄운다 — 자세한 것은 아래 「피해 분석」 탭에 있다. */}
        <span className="c2-rot-total">
          <em>총 기대 피해</em>
          <b>{num(total)}</b>
        </span>

        {/* 파티 자리 순서대로 캐릭터 이름 — 누르면 그 캐릭터의 줄만 밝게 두고 나머지는 어둡게 한다. */}
        {partyNames.length > 0 && (
          <div className="c2-who">
            {partyNames.map(({ id, name, iconUrl, element }) => (
              <button
                key={id}
                className={focusChar === id ? "on" : ""}
                aria-pressed={focusChar === id}
                style={{ "--who": colorOf({ id, element }) } as React.CSSProperties}
                title={
                  focusChar === id
                    ? "다시 누르면 전부 밝게 돌아갑니다"
                    : `${name}의 공격만 밝게 봅니다`
                }
                onClick={() => setFocusCharId(focusChar === id ? null : id)}
              >
                {iconUrl && <img src={iconUrl} alt="" loading="lazy" />}
                {name}
                <span>{results.filter((r) => r.character.id === id).length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="rotation-tools">
          {/* 보기 전환 — 카드(원본 탭의 카드 판) / 리스트(한 대가 한 줄). */}
          <span className="c2-view" role="radiogroup" aria-label="사이클 보기 방식">
            {(["card", "list"] as const).map((mode) => (
              <button
                key={mode}
                role="radio"
                aria-checked={view === mode}
                className={view === mode ? "on" : ""}
                onClick={() => setView(mode)}
              >
                {mode === "card" ? "카드" : "리스트"}
              </button>
            ))}
          </span>
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
                title="지금 사이클 구성을 버프 체크까지 통째로 담아 사이클 관리 탭에서 다시 쓴다"
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
                onClick={() =>
                  setDeleteAsk({
                    title: "일괄 삭제",
                    lines: [`담아둔 공격 ${results.length}대를 전부 지웁니다.`],
                    run: () => clearRotation(),
                  })
                }
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
              if (event.key === "Enter") saveCycle();
              if (event.key === "Escape") setSaveOpen(false);
            }}
          />
          <button
            className="primary"
            onClick={saveCycle}
          >
            담기
          </button>
          <small>캐릭터 · 무기 · 체인 · 손 버프 · 공격마다 켜둔 버프까지 함께 담깁니다.</small>
        </div>
      )}
      {saved && <p className="cycle-saved">사이클 관리 탭에 담았습니다.</p>}

      {/* 리스트는 공격 한 대가 한 줄인 표, 카드는 원본 탭의 카드 판이다(머리 줄의 토글).
          어느 쪽이든 누른 공격 바로 아래에 버프 창이 열린다. */}
      <div className={view === "card" ? "c2-table c2-cards" : "c2-table"}>
        {view === "list" && (
        <div className="c2-tr c2-th">
          <span>#</span>
          <span>캐릭터</span>
          <span>공격</span>
          <span>피해 타입</span>
          <span className="r">기대 피해</span>
          <span />
        </div>
        )}

        {/* 카드는 원본 탭의 카드 판(.rotation) 규칙을 그대로 받는다. 리스트는 그릇 없이 줄이 바로 선다. */}
        <div className={view === "card" ? "rotation" : "c2-rows"}>

        {results.map((result, index) => {
          const open = isPicked(result.item.id);
          // 사이클이 바뀌는 자리마다 머리 줄을 하나 세운다.
          // 예전에 담은 공격에는 cycle이 없어 1사이클로 본다.
          const cycle = result.item.cycle ?? 1;
          const prevCycle = index > 0 ? (results[index - 1].item.cycle ?? 1) : 0;
          const cycleStarts = cycle !== prevCycle;
          const cycleRows = cycleStarts ? results.filter((r) => (r.item.cycle ?? 1) === cycle) : [];
          const cycleCount = cycleRows.length;
          const type = damageTypeOf(result);

          return (
          <Fragment key={result.item.id}>
          {cycleStarts && (
            <div className="c2-cycle">
              <b>{cycle}사이클</b>
              <span>{cycleCount}대</span>
              <span className="c2-cycle-sum">
                {num(cycleRows.reduce((sum, r) => sum + r.damage.expectedDamage, 0))}
              </span>
              <button
                className="cycle-copy"
                title="이 사이클을 통째로 복사해 맨 뒤에 새 사이클로 붙입니다"
                onClick={() => duplicateCycle(cycle)}
              >
                ⧉ 사이클 복제
              </button>
              <button
                className="cycle-copy cycle-remove"
                title={`${cycle}사이클의 공격 ${cycleCount}대를 통째로 지웁니다 — 뒤 사이클 번호는 하나씩 당겨집니다`}
                onClick={() =>
                  setDeleteAsk({
                    title: "사이클 삭제",
                    lines: [
                      `${cycle}사이클의 공격 ${cycleCount}대를 통째로 지웁니다.`,
                      "뒤 사이클 번호는 하나씩 당겨집니다.",
                    ],
                    run: () => removeCycle(cycle),
                  })
                }
              >
                × 사이클 삭제
              </button>
            </div>
          )}
          {/* 줄 안에 스택·횟수 입력칸이 들어가서 button으로 둘 수 없다
              — button 안의 input은 표준이 아니고 누르는 판정도 엉킨다. */}
          {view === "card" ? (
            <div
              className={[
                "item",
                dragId === result.item.id ? "dragging" : "",
                overId === result.item.id ? "over" : "",
                focusChar && result.character.id !== focusChar ? "dim" : "",
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
                className={`card kind-${cardKind(result)} ${open ? "selected" : ""} ${
                  isExtraAttack(result.attack) ? "card-extra" : ""
                }`}
                role="button"
                tabIndex={0}
                title={`${result.character.name} · ${result.attack.name}`}
                data-kind={cardKind(result)}
                // Shift+클릭이 글자를 긁어 선택하지 않게 한다.
                onMouseDown={(event) => {
                  if (event.shiftKey) event.preventDefault();
                }}
                onClick={(event) => pickCard(result.item.id, event)}
                onKeyDown={(event) => {
                  // 안쪽 입력칸에서 누른 키는 카드를 여닫지 않는다.
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  pickCard(result.item.id, event);
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
                  {/* 공격명은 그냥 글자다 — 누르면 카드가 눌린 것으로 쳐서 버프 창이 열린다. */}
                  <span className="card-title">
                    {index + 1}. {nameOf(result.character.id, result.attack)}
                  </span>
                </span>

                {/* 기대 피해 줄. 숫자는 그냥 글자라 누르면 카드가 눌린 것으로 쳐서 버프 창이 열린다
                    (계산식은 카드 옆 돋보기 ⌕로 뺐다). 이상 효과는 스택이 곧 피해라
                    아래로 내리지 않고 이 줄 왼쪽에 붙여 둔다. */}
                <div className="card-line">
                  {result.damage.kind === "anomaly" && (() => {
                    // 스택 상한은 고정이 아니다 — 치사의 반주처럼 상한을 올려주는 버프가 켜져 있으면
                    // 그만큼 더 쌓을 수 있고, 폭발형은 넘긴 스택마다 33%씩 더 터진다.
                    const cap = anomalyStackCap(
                      result.damage.breakdown.anomaly,
                      allBuffs,
                      // 앞 카드의 트리거로 저절로 켜진 버프도 상한을 올릴 수 있다.
                      [...result.item.enabledBuffIds, ...autoBuffIdsFor(result.item.id).keys()],
                      result.item.disabledBuffIds,
                    );
                    return (
                      <label className="card-stack" onClick={(event) => event.stopPropagation()}>
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
                    );
                  })()}
                  {/* 발수 — 발마다 스택이 오르는 버프(모르테피 「자유로운 리듬」)가 걸리는 공격에만 연다.
                      N발을 카드 한 장으로 담고, 발마다 스택을 1씩 올려 따로 계산한 뒤 더한다. */}
                  {result.damage.kind === "normal" &&
                    ((result.item.repeat ?? 1) > 1 ||
                      allBuffs.some(
                        (b) =>
                          b.rampsWithRepeat &&
                          (b.attackId === result.attack.id ||
                            b.attackIds?.includes(result.attack.id)),
                      )) && (
                      <label
                        className="card-stack"
                        title="이 카드를 몇 발로 볼지 — 발마다 따로 계산해 더합니다. 「자유로운 리듬」을 켜 두면 1발째는 버프 창에서 정한 스택(없으면 0), 그 뒤로 발마다 +1스택입니다"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <em>발</em>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={result.item.repeat ?? 1}
                          onChange={(event) =>
                            setRepeat(result.item.id, Number(event.target.value))
                          }
                        />
                      </label>
                    )}
                  <span className="card-exp">
                    {num(result.damage.expectedDamage)}
                    {result.damage.hits.length > 1 && <i>{result.damage.hits.length}타</i>}
                  </span>
                </div>

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

                {/* 어떤 타입의 피해인지 — 카드 맨 아래. 타입마다 색이 다르다. */}
                {(() => {
                  const type = damageTypeOf(result);
                  return (
                    <span className="card-tags">
                      <span className={`card-type type-${type.key}`}>{type.label}</span>
                      {/* 체인으로 생기는 추가 공격 — 원래 스킬 공격과 다른 것임을 꼬리표로도 알린다. */}
                      {isExtraAttack(result.attack) && (
                        <span className="card-type type-extra">
                          {result.attack.resonanceChain !== undefined
                            ? `${result.attack.resonanceChain}체인 추가`
                            : "추가 타격"}
                        </span>
                      )}
                    </span>
                  );
                })()}
              </div>

              <span className="item-tools">
                <button
                  className="mag"
                  title="이 한 대의 계산식 펼치기"
                  onClick={() => setFormulaId(result.item.id)}
                >
                  ⌕
                </button>
                <button
                  className="pen"
                  title="이 카드의 공격 바꾸기"
                  onClick={() => setSwapId(result.item.id)}
                >
                  ✎
                </button>
                <button
                  className="copy"
                  title="이 공격을 버프 설정까지 그대로 복사해 바로 뒤에 추가"
                  onClick={() => duplicateAttack(result.item.id)}
                >
                  ⧉
                </button>
                <button className="x" title="삭제" onClick={() => removeAttack(result.item.id)}>
                  ×
                </button>
              </span>

              </div>

              {/* 다음 카드가 같은 사이클일 때만 화살표로 잇는다 — 사이클을 넘어가면 줄이 끊긴다. */}
              {index < results.length - 1 &&
                (results[index + 1].item.cycle ?? 1) === cycle && <em>→</em>}
            </div>
          ) : (
          <div
            className={[
              "c2-tr",
              "c2-row",
              `kind-${cardKind(result)}`,
              open ? "selected" : "",
              isExtraAttack(result.attack) ? "extra" : "",
              dragId === result.item.id ? "dragging" : "",
              overId === result.item.id ? "over" : "",
              focusChar && result.character.id !== focusChar ? "dim" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ "--who": colorOf(result.character) } as React.CSSProperties}
            role="button"
            tabIndex={0}
            title={`${result.character.name} · ${result.attack.name}`}
            // 줄을 끌어 순서를 바꾼다. 놓인 자리의 사이클을 따라가므로 사이클 이동도 이걸로 한다.
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
            // Shift+클릭이 글자를 긁어 선택하지 않게 한다.
            onMouseDown={(event) => {
              if (event.shiftKey) event.preventDefault();
            }}
            onClick={(event) => pickCard(result.item.id, event)}
            onKeyDown={(event) => {
              // 안쪽 입력칸 · 단추에서 누른 키는 줄을 여닫지 않는다.
              if (event.target !== event.currentTarget) return;
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              pickCard(result.item.id, event);
            }}
          >
            <span className="c2-num">{index + 1}</span>
            <span className="c2-char">
              {result.character.iconUrl && (
                <img src={result.character.iconUrl} alt="" loading="lazy" draggable={false} />
              )}
              {result.character.name}
            </span>
            <span className="c2-skill">
              <b>{nameOf(result.character.id, result.attack)}</b>
              {/* 체인으로 생기는 추가 공격 — 원래 스킬 공격과 다른 것임을 꼬리표로 알린다. */}
              {isExtraAttack(result.attack) && (
                <i className="c2-extra">
                  {result.attack.resonanceChain !== undefined
                    ? `${result.attack.resonanceChain}체인 추가`
                    : "추가 타격"}
                </i>
              )}
              {result.damage.kind === "anomaly" && (() => {
                // 스택 상한은 고정이 아니다 — 치사의 반주처럼 상한을 올려주는 버프가 켜져 있으면
                // 그만큼 더 쌓을 수 있고, 폭발형은 넘긴 스택마다 33%씩 더 터진다.
                const cap = anomalyStackCap(
                  result.damage.breakdown.anomaly,
                  allBuffs,
                  // 앞 공격의 트리거로 저절로 켜진 버프도 상한을 올릴 수 있다.
                  [...result.item.enabledBuffIds, ...autoBuffIdsFor(result.item.id).keys()],
                  result.item.disabledBuffIds,
                );
                return (
                  <label className="card-stack" onClick={(event) => event.stopPropagation()}>
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
                );
              })()}
              {/* 발수 — 발마다 스택이 오르는 버프(모르테피 「자유로운 리듬」)가 걸리는 공격에만 연다.
                  N발을 한 줄로 담고, 발마다 스택을 1씩 올려 따로 계산한 뒤 더한다. */}
              {result.damage.kind === "normal" &&
                ((result.item.repeat ?? 1) > 1 ||
                  allBuffs.some(
                    (b) =>
                      b.rampsWithRepeat &&
                      (b.attackId === result.attack.id ||
                        b.attackIds?.includes(result.attack.id)),
                  )) && (
                  <label
                    className="card-stack"
                    title="이 줄을 몇 발로 볼지 — 발마다 따로 계산해 더합니다. 「자유로운 리듬」을 켜 두면 1발째는 버프 창에서 정한 스택(없으면 0), 그 뒤로 발마다 +1스택입니다"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <em>발</em>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={result.item.repeat ?? 1}
                      onChange={(event) =>
                        setRepeat(result.item.id, Number(event.target.value))
                      }
                    />
                  </label>
                )}
              {/* 조화도 파괴 — 배율이 스킬마다 달라서 줄 안에서 바로 고칠 수 있게 둔다. */}
              {result.damage.kind === "discord" && (
                <>
                  <label className="card-stack" onClick={(event) => event.stopPropagation()}>
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
                  <label className="card-stack" onClick={(event) => event.stopPropagation()}>
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
                </>
              )}
            </span>
            {/* 어떤 타입의 피해인지. 갈래마다 색이 다르다. */}
            <span>
              <i className="c2-type" data-kind={cardKind(result)} data-type={type.key}>
                {type.label}
              </i>
            </span>
            <span className="r c2-dmg">{num(result.damage.expectedDamage)}</span>
            {/* 단추를 눌러도 줄이 골라지지 않게 막는다. */}
            <span className="item-tools" onClick={(event) => event.stopPropagation()}>
              <button
                className="mag"
                title="이 한 대의 계산식 펼치기"
                onClick={() => setFormulaId(result.item.id)}
              >
                ⌕
              </button>
              <button
                className="pen"
                title="이 줄의 공격 바꾸기"
                onClick={() => setSwapId(result.item.id)}
              >
                ✎
              </button>
              <button
                className="copy"
                title="이 공격을 버프 설정까지 그대로 복사해 바로 뒤에 추가"
                onClick={() => duplicateAttack(result.item.id)}
              >
                ⧉
              </button>
              <button className="x" title="삭제" onClick={() => removeAttack(result.item.id)}>
                ×
              </button>
            </span>
          </div>
          )}
          {/* 버프 창 — 고른 공격 바로 아래에 열린다. 여러 개를 골랐으면 마지막으로 누른 공격 아래다.
              Ctrl · Shift를 누르고 있는 동안에는 감춘다(지우지 않고 가리기만 해서 창 안의 상태는 남는다). */}
          {selected && result.item.id === anchorId && (
            <div className="c2-inline" hidden={modHeld} style={{ "--who": colorOf(result.character) } as React.CSSProperties}>
              <BuffDialog selected={selected} peers={peers} onClose={closeBuffs} />
            </div>
          )}
          </Fragment>
          );
        })}

        {/* 「+ 사이클」을 눌러 열어 둔 빈 사이클. 줄이 없으면 아무것도 안 보여
            단추가 먹지 않은 것처럼 느껴지므로, 자리를 그려서 다음에 담을 곳을 알린다. */}
        {(() => {
          const last = results.reduce((max, r) => Math.max(max, r.item.cycle ?? 1), 0);
          if (openCycle <= last) return null;
          return (
            <>
              <div className="c2-cycle">
                <b>{openCycle}사이클</b>
                <span>아직 비어 있음</span>
                <span className="c2-cycle-sum" />
                <button
                  className="cycle-copy cycle-remove"
                  title="열어 둔 빈 사이클을 거둡니다"
                  onClick={() => removeCycle(openCycle)}
                >
                  × 사이클 삭제
                </button>
              </div>
              <div className="c2-empty">여기에 담으면 {openCycle}사이클에 들어갑니다.</div>
            </>
          );
        })()}

        {results.length === 0 && openCycle <= 1 && (
          <div className="c2-empty">오른쪽 「공격 추가」에서 공격을 눌러 딜사이클을 만들어보세요.</div>
        )}
        </div>
      </div>

      <p className="c2-hint">
        줄을 누르면 그 아래에 버프 창이 열립니다 · 돋보기(⌕)는 타수별 계산식 · Ctrl+클릭(한 줄씩) ·
        Shift+클릭(범위)으로 여러 줄을 고르면 공통 버프를 한꺼번에 켜고 끕니다
      </p>

      {deleteAsk && <DeleteDialog ask={deleteAsk} onClose={() => setDeleteAsk(null)} />}

      {/* 공격 바꾸기 — 카드의 펜(✎)을 누르면 뜬다.
          담아 둔 카드가 「이 타수가 아니었네」일 때 지우고 다시 담지 않고 갈아 끼운다.
          자리·사이클·버프 체크는 그대로 남는다. */}
      {swapResult && (
        <div className="formula-backdrop" onClick={() => setSwapId(null)} role="presentation">
          <div className="type-modal" onClick={(event) => event.stopPropagation()}>
            <div className="formula-head">
              <div>
                <small>공격 바꾸기</small>
                <h3>{nameOf(swapResult.character.id, swapResult.attack)}</h3>
                <span>{swapResult.character.name} · 버프 체크와 자리는 그대로 남습니다</span>
              </div>
              <button className="formula-close" onClick={() => setSwapId(null)}>
                ×
              </button>
            </div>

            <div className="swap-list">
              {attackGroups(
                swapResult.character,
                characterChains[swapResult.character.id] ?? 0,
              ).map((group) => (
                <div key={group.label} className="card-add-group">
                  <em>{group.label}</em>
                  <div>
                    {group.attacks.map((attack) => (
                      <button
                        key={attack.id}
                        className={[
                          attack.id === swapResult.item.attackId ? "on" : "",
                          isExtraAttack(attack) ? "attack-extra" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title={attack.name}
                        onClick={() => {
                          setAttackId(swapResult.item.id, attack.id);
                          setSwapId(null);
                        }}
                      >
                        {nameOf(swapResult.character.id, attack)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>

    {/* 표와 공격 추가 사이 경계 — 끌어서 공격 추가 너비를 바꾼다. */}
    <GridResizer part="side" setSizes={grid.setSizes} />

    {/* 표 오른쪽 자리 — 공격 추가. 표를 보면서 바로 옆에서 눌러 담는다(예전에는 아래 세부 탭에 있었다).
        버프 창은 고른 줄 아래에 열리고, 피해 요약은 아래 「피해 분석」 탭에 있다. */}
    <aside className="c2-side">
      <AttackPaletteSection onAddAttack={addAttack} />
    </aside>

    {/* 줄 맨 아래 경계 — 표와 공격 추가 아래를 가로지른다. 끌어서 표 높이를 바꾼다. */}
    <GridResizer part="height" setSizes={grid.setSizes} />

    {/* 타수별 계산식 — 버프 창 아래에 붙이지 않고 화면 위에 창으로 띄운다.
        루틴 판(.rotation-rail)이 sticky · z-index로 쌓임 맥락을 만들어서, 그 안에서 그리면
        창이 판 높이에 갇혀 판 밖의 것에 가려진다. body로 빼서 그린다. */}
    {formulaResult &&
      createPortal(
        // .c2 밖에 그려지므로 색 · 모서리 규칙이 따라오게 .c2-pop으로 싼다(calc2.css).
        <div className="c2-pop">
          <DamageFormulaModal result={formulaResult} onClose={() => setFormulaId(null)} />
        </div>,
        document.body,
      )}
    </div>
  );
}

