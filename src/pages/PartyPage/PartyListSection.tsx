import { useState } from "react";
import { characters } from "../../data/sampleData";
import { ELEMENT_NAMES, elementIcon } from "../../data/elements";
import { MODE_LABEL, modeOfCharacterId } from "../../data/modeVariants";
import { PARTY_SLOTS, usePartyConfig } from "../../context/PartyConfigContext";
import type { PartyPreset } from "../../context/PartyConfigContext";
import type { PartyConfig } from "../../types/game";
import { CHAR_MIME, CharacterPickerSection } from "../CalculatorPage/components/PartySection";
import { Dialog } from "../../components/Feedback";

/**
 * 끌어다 놓기로 주고받는 값. 무엇이 오는지 MIME 타입으로 가른다.
 *   CHAR_MIME   = 캐릭터 선택에서 끌고 온 캐릭터 id
 *   MEMBER_MIME = 파티 카드 안의 캐릭터 — "파티id|캐릭터id"
 *   CARD_MIME   = 카드 손잡이를 잡고 끄는 파티 id
 */
const MEMBER_MIME = "application/x-wuwa-party-member";
const CARD_MIME = "application/x-wuwa-party-card";

/**
 * 카드에 적을 이름을 「이름」과 「모드」 두 줄로 가른다.
 *
 * 가르는 것은 **공명 모드로 가른 캐릭터**(데니아 · 불꽃)와 속성을 갈아 끼우는 방랑자(방랑자 · 기류)뿐이다.
 * 이름에 가운뎃점이 들어 있다고 다 가르면 안 된다 — 「루크 · 헤르센」·「양양 · 현령」은
 * 모드가 아니라 그대로 한 캐릭터의 이름이라 가운뎃점까지 한 줄로 적는다.
 */
const slotName = (characterId: string, name: string): { title: string; mode: string } => {
  const mode = modeOfCharacterId(characterId);
  const cut = name.indexOf(" · ");
  if (cut < 0 || (!mode && !characterId.startsWith("rover-"))) return { title: name, mode: "" };
  return { title: name.slice(0, cut), mode: mode ? MODE_LABEL[mode] : name.slice(cut + 3) };
};

/** 파티에 앉을 수 있는 인원 — 자리 셋. */
const PARTY_MAX = PARTY_SLOTS.length;

const dragHas = (event: React.DragEvent, mime: string) =>
  Array.from(event.dataTransfer.types).includes(mime);

/** 그 편성에 앉은 캐릭터 id들. 앞에서부터 1·2·3번 자리다. */
export const membersOf = (cfg: PartyConfig) =>
  PARTY_SLOTS.map((slot) => cfg[slot].characterId).filter(Boolean);

/**
 * 그룹 이름들 — 「그룹 추가」로 만든 것이 먼저, 그 순서대로. 「미설정」(그룹 없음)은 넣지 않는다.
 * 파티에만 적혀 있고 목록에 없는 이름(그룹 추가가 생기기 전에 적어 둔 것)도 뒤에 붙여 잃지 않는다.
 */
export const groupsOf = (groups: string[], presets: PartyPreset[]) =>
  Array.from(new Set([...groups, ...presets.map((p) => p.group ?? "").filter(Boolean)]));

interface PartyListSectionProps {
  /** 지금 캐릭터를 고르고 있는 파티. 카드에 금색 테두리를 두른다. */
  activeId: string | null;
  /** 카드를 눌렀을 때 — 그 파티의 캐릭터 고르는 창을 연다. */
  onActivate: (id: string) => void;
  /** 「파티 추가」를 눌렀을 때 — 새 파티 창을 연다. 그룹을 골라 보고 있었으면 그 그룹을 넘긴다. */
  onAdd: (group: string) => void;
}

/**
 * 파티 목록 — 파티를 만들고, 캐릭터를 채우고, 순서를 바꾸는 자리.
 *
 * 카드 안에서는 캐릭터를 끌어 자리 순서를, 카드 손잡이를 끌면 목록에서 보이는 순서를 바꾼다.
 * 캐릭터는 카드를 눌러 뜨는 창에서 고른다. 다른 파티 카드에서 끌어다 놓아도 된다.
 */
export function PartyListSection({ activeId, onActivate, onAdd }: PartyListSectionProps) {
  const {
    partyPresets,
    setPartyPresetMembers,
    movePartyPreset,
    renamePartyPreset,
    setPartyPresetGroup,
    partyGroups,
    addPartyGroup,
    removePartyGroup,
    removePartyPreset,
  } = usePartyConfig();

  // 「그룹 추가」를 눌러 이름을 적는 중이면 그 값. 닫혀 있으면 null.
  const [newGroup, setNewGroup] = useState<string | null>(null);
  const groups = groupsOf(partyGroups, partyPresets);
  // 그룹으로 거른다. null이면 전체, ""이면 그룹을 안 정한 파티(미설정).
  const [picked, setPicked] = useState<string | null>(null);
  // 지운 그룹을 가리키고 있으면 전체로 본다.
  const filter = picked && !groups.includes(picked) ? null : picked;
  // 캐릭터로 거른다. 고른 캐릭터가 **들어 있는** 파티가 남는다 — 하나만 골라도 그 캐릭터가 든 파티가 다 나오고,
  // 여럿을 고르면 그 캐릭터들이 모두 든 파티로 좁혀진다. 비어 있으면 거르지 않는다.
  const [charFilter, setCharFilter] = useState<string[]>([]);
  const [charFilterOpen, setCharFilterOpen] = useState(false);
  const shown = partyPresets.filter(
    (p) =>
      (filter === null || (p.group ?? "") === filter) &&
      (charFilter.length === 0 || charFilter.every((id) => membersOf(p.config).includes(id))),
  );
  // 체크해 둔 파티들 — 「다중 그룹 변경」으로 한꺼번에 그룹을 옮긴다. 지워진 파티는 세지 않는다.
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const checked = checkedIds.filter((id) => partyPresets.some((p) => p.id === id));
  // 그룹 변경 창에서 고른 그룹. 창이 닫혀 있으면 null. ""이면 「미설정」이다.
  const [moveTo, setMoveTo] = useState<string | null>(null);
  // 지울지 묻는 중인 그룹.
  const [removing, setRemoving] = useState<string | null>(null);

  // 이름을 고치는 중인 파티. 한 번에 하나만 연다.
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  // 끌고 있는 카드와, 지금 카드가 올라와 있는 카드.
  const [dragCard, setDragCard] = useState<string | null>(null);
  const [overCard, setOverCard] = useState<string | null>(null);
  // 캐릭터가 들어갈 자리 — "파티id|자리번호".
  const [overSlot, setOverSlot] = useState<string | null>(null);

  const characterOf = (id: string) => characters.find((c) => c.id === id);

  /**
   * 캐릭터를 그 파티의 index번째 자리에 놓는다.
   * index가 자리 수를 넘으면 맨 뒤에 붙인다 — 빈 자리에 떨어뜨린 경우다.
   */
  const dropCharacter = (partyId: string, index: number, event: React.DragEvent) => {
    const carried = event.dataTransfer.getData(MEMBER_MIME);
    const [fromPartyId, dragged] = carried
      ? carried.split("|")
      : ["", event.dataTransfer.getData(CHAR_MIME)];
    if (!dragged) return;

    const target = partyPresets.find((p) => p.id === partyId);
    if (!target) return;
    const current = membersOf(target.config);
    const at = current.indexOf(dragged);
    // 제자리에 다시 놓은 것.
    if (at >= 0 && at === index) return;
    // 남의 자리를 밀어내지는 않는다 — 꽉 찬 파티에는 바깥에서 더 들어갈 수 없다.
    if (at < 0 && current.length >= PARTY_MAX) return;

    // 다른 파티에서 끌어왔으면 그쪽에서 뺀다.
    if (fromPartyId && fromPartyId !== partyId) {
      const source = partyPresets.find((p) => p.id === fromPartyId);
      if (source) {
        setPartyPresetMembers(
          fromPartyId,
          membersOf(source.config).filter((id) => id !== dragged),
        );
      }
    }

    const rest = current.filter((id) => id !== dragged);
    const anchor = current[index];
    // 놓인 자리에 있던 캐릭터 **앞**에 끼운다. 다만 제 자리보다 뒤로 옮길 때는
    // 자기를 빼면서 뒤가 한 칸 당겨지므로 그만큼 뒤로 민다.
    const pos =
      anchor === undefined ? rest.length : rest.indexOf(anchor) + (at >= 0 && at < index ? 1 : 0);
    setPartyPresetMembers(partyId, [...rest.slice(0, pos), dragged, ...rest.slice(pos)]);
  };

  /** 카드를 그 카드 자리에 놓는다. 위로 끌면 그 앞에, 아래로 끌면 그 뒤에 선다. */
  const dropCard = (targetId: string, event: React.DragEvent) => {
    const id = event.dataTransfer.getData(CARD_MIME);
    if (!id || id === targetId) return;
    const from = partyPresets.findIndex((p) => p.id === id);
    const to = partyPresets.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    movePartyPreset(id, from < to ? (partyPresets[to + 1]?.id ?? null) : targetId);
  };

  const clearDrag = () => {
    setDragCard(null);
    setOverCard(null);
    setOverSlot(null);
  };

  return (
    <section className="panel party-list-panel">
      {/* 제목 · 단추 · 필터 — 파티가 많아 스크롤을 내려도 위 막대 바로 아래에 붙어 있는다.
          창(다이얼로그)은 이 묶음 밖에 둔다 — 안에 두면 묶음의 쌓임 순서에 갇혀 위 막대 밑으로 들어간다. */}
      <div className="party-list-top">
        <div className="panel-head">
          <h2>파티 목록</h2>
          <button
            className="party-add"
            onClick={() => onAdd(filter ?? "")}
            title="캐릭터를 골라 새 파티를 만듭니다"
          >
            + 파티 추가
          </button>
          {newGroup === null ? (
            <button
              className="party-add"
              onClick={() => setNewGroup("")}
              title="파티를 묶을 그룹을 만듭니다"
            >
              + 그룹 추가
            </button>
          ) : (
            <input
              className="preset-rename party-group-input"
              autoFocus
              placeholder="그룹 이름 — Enter로 추가"
              value={newGroup}
              onChange={(event) => setNewGroup(event.target.value)}
              onBlur={() => {
                addPartyGroup(newGroup);
                setNewGroup(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") setNewGroup(null);
              }}
            />
          )}
          <button
            className="party-add"
            disabled={checked.length === 0}
            onClick={() => setMoveTo(filter ?? "")}
            title={
              checked.length === 0
                ? "파티 카드의 체크박스로 옮길 파티를 먼저 고르세요"
                : `체크한 파티 ${checked.length}개의 그룹을 한꺼번에 바꿉니다`
            }
          >
            다중 그룹 변경{checked.length > 0 ? ` (${checked.length})` : ""}
          </button>
        </div>

        {/* 캐릭터로 거르기 — 누르면 캐릭터 고르는 창이 뜬다. 고른 캐릭터는 옆에 얼굴로 늘어선다. */}
        <div className="party-char-filter">
          <button
            className={charFilter.length > 0 ? "party-load on" : "party-load"}
            onClick={() => setCharFilterOpen(true)}
            title="고른 캐릭터가 들어 있는 파티만 봅니다"
          >
            캐릭터 필터{charFilter.length > 0 ? ` (${charFilter.length})` : ""}
          </button>
          {charFilter.map((id) => {
            const character = characterOf(id);
            return character?.iconUrl ? (
              <img key={id} src={character.iconUrl} alt={character.name} title={character.name} />
            ) : (
              <em key={id}>{character?.name ?? id}</em>
            );
          })}
          {charFilter.length > 0 && (
            <button className="party-load" onClick={() => setCharFilter([])}>
              해제
            </button>
          )}
        </div>
        {/* 그룹으로 거르기 — 고른 그룹 오른쪽에 그 그룹을 지우는 휴지통이 붙는다. */}
        {groups.length > 0 && (
          <div className="echo-filters party-groups">
            <button className={filter === null ? "on" : ""} onClick={() => setPicked(null)}>
              전체
            </button>
            {groups.map((group) => (
              <span key={group} className="party-group-chip">
                <button className={filter === group ? "on" : ""} onClick={() => setPicked(group)}>
                  {group}
                </button>
                {filter === group && (
                  <button
                    className="party-group-trash"
                    title={`「${group}」 그룹과 그 안의 파티를 모두 지웁니다`}
                    aria-label={`${group} 그룹 삭제`}
                    onClick={() => setRemoving(group)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
            <button className={filter === "" ? "on" : ""} onClick={() => setPicked("")}>
              미설정
            </button>
          </div>
        )}
      </div>

      {moveTo !== null && (
        <div className="dialog-backdrop" onClick={() => setMoveTo(null)} role="presentation">
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>다중 그룹 변경</h3>
            <label className="party-form-field">
              <b>체크한 파티 {checked.length}개를 옮길 그룹</b>
              <select value={moveTo} autoFocus onChange={(event) => setMoveTo(event.target.value)}>
                <option value="">미설정</option>
                {groups.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="dialog-buttons">
              <button
                className="primary"
                onClick={() => {
                  for (const id of checked) setPartyPresetGroup(id, moveTo);
                  setCheckedIds([]);
                  setMoveTo(null);
                }}
              >
                변경
              </button>
              <button onClick={() => setMoveTo(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {charFilterOpen && (
        <div
          className="formula-backdrop"
          onClick={() => setCharFilterOpen(false)}
          role="presentation"
        >
          <div className="formula-modal party-pick-modal" onClick={(e) => e.stopPropagation()}>
            <div className="formula-head">
              <div>
                <h3>캐릭터 필터</h3>
                <span>고른 캐릭터가 들어 있는 파티가 보입니다 — {charFilter.length}명 고름</span>
              </div>
              <button
                className="formula-close"
                onClick={() => setCharFilterOpen(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <CharacterPickerSection
              memberIds={charFilter}
              pickedLabel="고름"
              onPick={(id) =>
                setCharFilter((cur) =>
                  cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
                )
              }
            />
            <div className="dialog-buttons">
              <button onClick={() => setCharFilter([])}>모두 해제</button>
              <button className="primary" onClick={() => setCharFilterOpen(false)}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {removing !== null && (
        <Dialog
          title="그룹 삭제"
          lines={[
            `「${removing}」 그룹과 그 안의 파티 ${
              partyPresets.filter((p) => p.group === removing).length
            }개를 모두 지웁니다.`,
            "되돌릴 수 없습니다.",
          ]}
          buttons={[
            {
              label: "삭제",
              primary: true,
              onClick: () => {
                removePartyGroup(removing);
                setRemoving(null);
                setPicked(null);
              },
            },
            { label: "취소", onClick: () => setRemoving(null) },
          ]}
          onDismiss={() => setRemoving(null)}
        />
      )}

      {shown.length === 0 ? (
        <p className="preset-empty">
          {partyPresets.length === 0
            ? "아직 파티가 없습니다. 「파티 추가」를 눌러 캐릭터를 고르세요."
            : "조건에 맞는 파티가 없습니다."}
        </p>
      ) : (
        <div className="party-list">
          {shown.map((preset) => {
            const members = membersOf(preset.config);
            const active = preset.id === activeId;

            return (
              <article
                key={preset.id}
                className={[
                  "party-list-card",
                  active ? "on" : "",
                  dragCard === preset.id ? "dragging" : "",
                  overCard === preset.id ? "over" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onActivate(preset.id)}
                // 카드끼리의 자리바꿈만 여기서 받는다. 캐릭터는 아래 자리 칸이 따로 받는다.
                onDragOver={(event) => {
                  if (!dragHas(event, CARD_MIME)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setOverCard(preset.id);
                }}
                onDragLeave={() => setOverCard((cur) => (cur === preset.id ? null : cur))}
                onDrop={(event) => {
                  if (!dragHas(event, CARD_MIME)) return;
                  event.preventDefault();
                  dropCard(preset.id, event);
                  clearDrag();
                }}
              >
                <header className="party-list-head">
                  {/* 여러 파티를 골라 그룹을 한꺼번에 옮길 때 쓴다(다중 그룹 변경). */}
                  <input
                    type="checkbox"
                    className="party-list-check"
                    title="다중 그룹 변경에 넣을 파티로 고릅니다"
                    checked={checked.includes(preset.id)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      const on = event.target.checked;
                      setCheckedIds((cur) =>
                        on ? [...cur, preset.id] : cur.filter((id) => id !== preset.id),
                      );
                    }}
                  />
                  <span
                    className="party-grip"
                    title="끌어서 목록 순서를 바꿉니다"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(CARD_MIME, preset.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDragCard(preset.id);
                    }}
                    onDragEnd={clearDrag}
                  >
                    ⠿
                  </span>

                  {editing?.id === preset.id ? (
                    <input
                      className="preset-rename"
                      autoFocus
                      value={editing.value}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setEditing({ id: preset.id, value: event.target.value })}
                      onBlur={() => {
                        renamePartyPreset(preset.id, editing.value);
                        setEditing(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") setEditing(null);
                      }}
                    />
                  ) : (
                    <b
                      className="party-list-name"
                      title="눌러서 이름을 고칩니다"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditing({ id: preset.id, value: preset.name });
                      }}
                    >
                      {preset.name}
                    </b>
                  )}

                  <em className="party-list-count">
                    {members.length} / {PARTY_MAX}
                  </em>
                  <button
                    className="party-list-remove"
                    title="이 파티를 목록에서 지웁니다"
                    onClick={(event) => {
                      event.stopPropagation();
                      removePartyPreset(preset.id);
                    }}
                  >
                    삭제
                  </button>
                </header>

                {/* 파티 이름 아래 — 어느 그룹인지. */}
                <div className={preset.group ? "party-list-group" : "party-list-group none"}>
                  {preset.group || "미설정"}
                </div>

                <div className="party-list-slots">
                  {members.map((characterId, index) => {
                    const character = characterOf(characterId);
                    const key = `${preset.id}|${index}`;
                    // 모드로 가른 캐릭터는 이름이 「데니아 · 불꽃」 꼴이라 한 줄에 안 들어간다
                    // — 이름과 모드를 두 줄로 가른다. 모드가 없는 캐릭터도 둘째 줄을 비워 높이를 맞춘다.
                    const { title, mode } = slotName(characterId, character?.name ?? characterId);

                    return (
                      <div
                        key={characterId}
                        className={["party-slot", overSlot === key ? "over" : ""]
                          .filter(Boolean)
                          .join(" ")}
                        title={`${character?.name ?? characterId} — ${index + 1}번 캐릭터 (끌어서 순서를 바꿉니다)`}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(MEMBER_MIME, `${preset.id}|${characterId}`);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={clearDrag}
                        onDragOver={(event) => {
                          if (!dragHas(event, CHAR_MIME) && !dragHas(event, MEMBER_MIME)) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setOverSlot(key);
                        }}
                        onDragLeave={() => setOverSlot((cur) => (cur === key ? null : cur))}
                        onDrop={(event) => {
                          if (!dragHas(event, CHAR_MIME) && !dragHas(event, MEMBER_MIME)) return;
                          event.preventDefault();
                          event.stopPropagation();
                          dropCharacter(preset.id, index, event);
                          clearDrag();
                        }}
                      >
                        <small className="party-slot-no">
                          {character && elementIcon(character.element) && (
                            <img
                              src={elementIcon(character.element)}
                              alt={ELEMENT_NAMES[character.element]}
                              title={ELEMENT_NAMES[character.element]}
                              draggable={false}
                            />
                          )}
                        </small>
                        {character?.iconUrl && (
                          <img src={character.iconUrl} alt="" loading="lazy" draggable={false} />
                        )}
                        <strong className="party-slot-name">
                          <span>{title}</span>
                          <em>{mode ? `<${mode}>` : ""}</em>
                        </strong>
                        <button
                          className="party-clear"
                          title="이 캐릭터를 파티에서 뺍니다"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPartyPresetMembers(
                              preset.id,
                              members.filter((id) => id !== characterId),
                            );
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}

                  {/* 남은 자리 — 여기에 떨어뜨리면 맨 뒤에 붙는다. */}
                  {members.length < PARTY_MAX && (
                    <div
                      className={[
                        "party-slot empty",
                        overSlot === `${preset.id}|tail` ? "over" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onDragOver={(event) => {
                        if (!dragHas(event, CHAR_MIME) && !dragHas(event, MEMBER_MIME)) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setOverSlot(`${preset.id}|tail`);
                      }}
                      onDragLeave={() =>
                        setOverSlot((cur) => (cur === `${preset.id}|tail` ? null : cur))
                      }
                      onDrop={(event) => {
                        if (!dragHas(event, CHAR_MIME) && !dragHas(event, MEMBER_MIME)) return;
                        event.preventDefault();
                        event.stopPropagation();
                        dropCharacter(preset.id, PARTY_MAX, event);
                        clearDrag();
                      }}
                    >
                      <span className="party-empty">
                        눌러서 캐릭터 추가
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
