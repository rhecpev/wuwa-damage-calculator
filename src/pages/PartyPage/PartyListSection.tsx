import { useState } from "react";
import { characters } from "../../data/sampleData";
import { PARTY_SLOTS, usePartyConfig } from "../../context/PartyConfigContext";
import type { PartyConfig } from "../../types/game";
import { CHAR_MIME } from "../CalculatorPage/components/PartySection";

/**
 * 끌어다 놓기로 주고받는 값. 무엇이 오는지 MIME 타입으로 가른다.
 *   CHAR_MIME   = 캐릭터 선택에서 끌고 온 캐릭터 id
 *   MEMBER_MIME = 파티 카드 안의 캐릭터 — "파티id|캐릭터id"
 *   CARD_MIME   = 카드 손잡이를 잡고 끄는 파티 id
 */
const MEMBER_MIME = "application/x-wuwa-party-member";
const CARD_MIME = "application/x-wuwa-party-card";

/** 파티에 앉을 수 있는 인원 — 자리 셋. */
const PARTY_MAX = PARTY_SLOTS.length;

const dragHas = (event: React.DragEvent, mime: string) =>
  Array.from(event.dataTransfer.types).includes(mime);

/** 그 편성에 앉은 캐릭터 id들. 앞에서부터 1·2·3번 자리다. */
export const membersOf = (cfg: PartyConfig) =>
  PARTY_SLOTS.map((slot) => cfg[slot].characterId).filter(Boolean);

interface PartyListSectionProps {
  /** 지금 고른 파티. 캐릭터 선택에서 누른 캐릭터가 이 파티에 들어간다. */
  activeId: string | null;
  onActivate: (id: string) => void;
}

/**
 * 파티 목록 — 파티를 만들고, 캐릭터를 채우고, 순서를 바꾸는 자리.
 *
 * 카드 안에서는 캐릭터를 끌어 자리 순서를, 카드 손잡이를 끌면 목록에서 보이는 순서를 바꾼다.
 * 캐릭터는 왼쪽 「캐릭터 선택」에서 눌러 넣거나 카드로 끌어다 놓는다.
 */
export function PartyListSection({ activeId, onActivate }: PartyListSectionProps) {
  const {
    partyPresets,
    addPartyPreset,
    setPartyPresetMembers,
    movePartyPreset,
    renamePartyPreset,
    removePartyPreset,
  } = usePartyConfig();

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
      <div className="panel-head">
        <h2>파티 목록</h2>
        <button
          className="party-add"
          onClick={() => onActivate(addPartyPreset())}
          title="빈 파티를 하나 만듭니다"
        >
          + 파티 추가
        </button>
      </div>

      {partyPresets.length === 0 ? (
        <p className="preset-empty">
          아직 파티가 없습니다. 「파티 추가」로 빈 파티를 만들고, 왼쪽 캐릭터 선택에서 눌러 넣거나
          카드로 끌어다 놓으세요.
        </p>
      ) : (
        <div className="party-list">
          {partyPresets.map((preset) => {
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

                <div className="party-list-slots">
                  {members.map((characterId, index) => {
                    const character = characterOf(characterId);
                    const key = `${preset.id}|${index}`;

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
                        <small>{index + 1}번</small>
                        {character?.iconUrl && (
                          <img src={character.iconUrl} alt="" loading="lazy" draggable={false} />
                        )}
                        <strong>{character?.name ?? characterId}</strong>
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
                        {active ? "캐릭터를 고르거나 끌어다 놓으세요" : "끌어다 놓으세요"}
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
