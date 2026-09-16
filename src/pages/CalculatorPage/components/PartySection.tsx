import { useState, useSyncExternalStore } from "react";
import { characters, getAvailableCharacters } from "../../../data/sampleData";
import type { PartyConfig } from "../../../types/game";
import {
  ENEMY_RES_PRESETS,
  PARTY_SLOTS,
  usePartyConfig,
} from "../../../context/PartyConfigContext";
import { useAppState } from "../../../context/AppStateContext";
import { echoStoreVersion, equippedFetterSets, subscribeEchoStore } from "../../../data/echoStore";
import { PartyPresetSection } from "./PartyPresetSection";

interface PartySectionProps {
  config: PartyConfig;
}

/**
 * 끌어다 놓기로 주고받는 값. 종류를 MIME 타입으로 구분해
 * 자리 위에서 dragover만으로도 무엇이 오는지 알 수 있게 한다.
 *   CHAR_MIME = 캐릭터 선택에서 끌고 온 캐릭터 id
 *   SLOT_MIME = 파티 구성 안에서 끌고 온 자리 번호
 */
export const CHAR_MIME = "application/x-wuwa-character";
const SLOT_MIME = "application/x-wuwa-slot";

const dragHas = (event: React.DragEvent, mime: string) =>
  Array.from(event.dataTransfer.types).includes(mime);

interface CharacterPickerProps {
  /** 지금 고른 파티에 앉아 있는 캐릭터들. 순서가 곧 자리 번호다. */
  memberIds: string[];
  /** 아이콘을 눌렀을 때. 이미 들어 있는 캐릭터를 누르면 빼는 것으로 본다. */
  onPick: (characterId: string) => void;
  /** 제목 옆에 붙일 한 줄 — 「어느 파티에 들어가는지」를 알려 준다. */
  hint?: string;
}

/**
 * 파티에 넣고 뺄 캐릭터 목록.
 * 아이콘을 누르면 고른 파티에 들어가고, 다시 누르면 빠진다. 파티 카드로 끌어다 놓아도 된다.
 */
export function CharacterPickerSection({ memberIds, onPick, hint }: CharacterPickerProps) {
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const availableCharacters = getAvailableCharacters().filter((c) =>
    c.name.toLowerCase().includes(needle),
  );

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>캐릭터 선택</h2>
        {hint && <em className="pick-hint">{hint}</em>}
        <input
          type="text"
          className="panel-search"
          placeholder="캐릭터 검색..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="pick-grid">
        {availableCharacters.map((char) => {
          const slotIndex = memberIds.indexOf(char.id);
          const inParty = slotIndex >= 0;

          return (
            <button
              key={char.id}
              className={["pick-card", inParty ? "in" : ""].filter(Boolean).join(" ")}
              // 파티 카드로 끌어다 놓으면 놓은 자리에 바로 앉는다.
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(CHAR_MIME, char.id);
                event.dataTransfer.effectAllowed = "copyMove";
              }}
              onClick={() => onPick(char.id)}
              title={
                inParty
                  ? `${char.element} · ${char.weaponType} — ${slotIndex + 1}번 캐릭터 (다시 누르면 해제)`
                  : `${char.element} · ${char.weaponType} (파티 카드로 끌어다 놓을 수 있습니다)`
              }
            >
              {char.iconUrl && <img src={char.iconUrl} alt="" loading="lazy" />}
              <b>{char.name}</b>
              {inParty && <em>{slotIndex + 1}번 캐릭터</em>}
            </button>
          );
        })}

        {availableCharacters.length === 0 && (
          <p style={{ color: "var(--c-9ea7b7)", gridColumn: "1 / -1", margin: 0 }}>
            이름에 맞는 캐릭터가 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

/** 1·2·3번 자리에 누가 앉았는지. 아래 절반은 콘텐츠(속성 저항 프리셋) 선택이다. */
export function PartyRosterSection({ config }: PartySectionProps) {
  const { setEnemyResPreset, partyPresets, clearSlot, swapSlots, assignCharacterToSlot } =
    usePartyConfig();
  const { selectedCharacterId, setSelectedCharacterId } = useAppState();
  // 담아둔 파티는 평소엔 접어 둔다 — 늘 펼쳐 두면 이 칸이 통째로 길어진다.
  const [presetOpen, setPresetOpen] = useState(false);
  // 캐릭터 목록 다이얼로그를 띄운 자리 번호. null이면 닫힌 것.
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  // 끌고 있는 자리 번호와, 지금 아이콘이 올라와 있는 자리 번호.
  // 에코 저장소는 React 상태가 아니라 localStorage 한 벌이다. 에코를 갈아끼우면
  // 화음 세트도 달라지므로, 저장될 때마다 올라가는 번호를 보고 다시 그린다.
  useSyncExternalStore(subscribeEchoStore, echoStoreVersion);

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [overSlot, setOverSlot] = useState<number | null>(null);
  // 예전에 만들어진 설정에는 프리셋이 없다 — 필드로 본다.
  const preset = config.enemy.resPreset ?? "field";

  // 제목이 위, 자리 셋이 아래. 격자는 안쪽 div가 맡는다
  // — section에 .party를 걸면 제목까지 격자 칸으로 들어가 옆으로 밀린다.
  return (
    <section className="panel party-panel">
      <div className="panel-head party-head">
        <h2>파티 구성</h2>
        <button
          className={presetOpen ? "party-load on" : "party-load"}
          onClick={() => setPresetOpen((open) => !open)}
          title="담아둔 파티를 불러옵니다"
        >
          파티 불러오기{partyPresets.length > 0 && ` (${partyPresets.length})`}
        </button>
      </div>

      {presetOpen && (
        // 섹션 안에서 펼치면 파티 구성 카드가 아래로 밀려 화면이 출렁인다.
        // 계산식 창과 같은 방식으로 위에 띄우고, 바깥이나 Esc로 닫는다.
        <div
          className="formula-backdrop"
          onClick={() => setPresetOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setPresetOpen(false);
          }}
          role="presentation"
        >
          <div className="formula-modal party-load-modal" onClick={(e) => e.stopPropagation()}>
            <div className="formula-head">
              <div>
                <small>PARTY</small>
                <h3>파티 불러오기</h3>
                <span>담아둔 파티를 눌러 이 자리에 그대로 앉힙니다.</span>
              </div>
              <button className="formula-close" onClick={() => setPresetOpen(false)}>
                ×
              </button>
            </div>
            <PartyPresetSection onLoaded={() => setPresetOpen(false)} />
          </div>
        </div>
      )}

      <div className="party">
        {PARTY_SLOTS.map((slot, index) => {
          const character = characters.find((c) => c.id === config[slot].characterId);

          return (
            <article
              key={slot}
              className={[
                character ? "filled" : "",
                dragFrom === index ? "dragging" : "",
                overSlot === index ? "over" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              // 자리를 누르면 캐릭터 목록이 뜨고, 고른 캐릭터가 이 번호에 앉는다.
              onClick={() => setPickSlot(index)}
              draggable={Boolean(character)}
              onDragStart={(event) => {
                if (!character) return;
                event.dataTransfer.setData(SLOT_MIME, String(index));
                event.dataTransfer.effectAllowed = "move";
                setDragFrom(index);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setOverSlot(null);
              }}
              onDragOver={(event) => {
                if (!dragHas(event, CHAR_MIME) && !dragHas(event, SLOT_MIME)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setOverSlot(index);
              }}
              onDragLeave={() => setOverSlot((cur) => (cur === index ? null : cur))}
              onDrop={(event) => {
                event.preventDefault();
                const from = event.dataTransfer.getData(SLOT_MIME);
                const characterId = event.dataTransfer.getData(CHAR_MIME);
                // 파티 안에서 끌었으면 자리끼리 맞바꾸고,
                // 캐릭터 선택에서 끌어왔으면 이 번호에 앉힌다.
                if (from !== "") swapSlots(PARTY_SLOTS[Number(from)], slot);
                else if (characterId) assignCharacterToSlot(slot, characterId);
                setDragFrom(null);
                setOverSlot(null);
              }}
              title={
                character
                  ? `${character.name} — 누르면 캐릭터를 바꾸고, 끌면 자리를 바꿉니다`
                  : `${index + 1}번 자리 — 눌러서 캐릭터를 고르거나 끌어다 놓으세요`
              }
            >
              <small>{index + 1}번 캐릭터</small>

              {/* 자리를 누르면 목록이 뜨므로, 빼는 단추를 따로 둔다. */}
              {character && (
                <button
                  className="party-clear"
                  title={`${character.name} — 이 자리를 비웁니다`}
                  onClick={(event) => {
                    event.stopPropagation();
                    clearSlot(slot);
                    if (selectedCharacterId === character.id) setSelectedCharacterId(null);
                  }}
                >
                  ×
                </button>
              )}

              {character ? (
                <>
                  {/* 캐릭터 그림 옆에 맞춰 둔 화음 세트를 붙인다 — 어느 세트를 끼고 있는지
                      파티를 짜면서 바로 보이도록. 개수는 아이콘 위 작은 숫자로 적는다. */}
                  <div className="party-face">
                    {character.iconUrl && (
                      <img src={character.iconUrl} alt="" loading="lazy" draggable={false} />
                    )}
                    {(() => {
                      const sets = equippedFetterSets(character.id);
                      if (sets.length === 0) return null;
                      return (
                        <span className="party-sets">
                          {sets.map((set) => (
                            <i key={set.name} title={`${set.name} · ${set.count}개`}>
                              {set.icon ? (
                                <img src={set.icon} alt="" loading="lazy" draggable={false} />
                              ) : (
                                set.name[0]
                              )}
                              <b>{set.count}</b>
                            </i>
                          ))}
                        </span>
                      );
                    })()}
                  </div>
                  <strong>{character.name}</strong>
                </>
              ) : (
                <span className="party-empty">미선택</span>
              )}
            </article>
          );
        })}
      </div>

      {pickSlot !== null && (
        <SlotPickerDialog
          config={config}
          slotIndex={pickSlot}
          onClose={() => setPickSlot(null)}
          onPick={(characterId) => {
            assignCharacterToSlot(PARTY_SLOTS[pickSlot], characterId);
            setSelectedCharacterId(characterId);
            setPickSlot(null);
          }}
          onClear={() => {
            const current = config[PARTY_SLOTS[pickSlot]].characterId;
            clearSlot(PARTY_SLOTS[pickSlot]);
            if (current && selectedCharacterId === current) setSelectedCharacterId(null);
            setPickSlot(null);
          }}
        />
      )}

      <div className="party-half">
        {/* 저항 안내는 제목 옆에 붙인다 — 칩이 남는 높이를 다 쓰도록 아래를 비워 둬야 해서다. */}
        <div className="party-half-head">
          <h2>콘텐츠 선택</h2>
          <em className="party-half-note">기본 저항 / 동일 속성 저항</em>
        </div>
        <div className="enemy-elements">
          {ENEMY_RES_PRESETS.map((item) => (
            <label
              key={item.id}
              className={item.id === preset ? "enemy-element on" : "enemy-element"}
            >
              <input
                type="radio"
                name="enemy-res-preset"
                value={item.id}
                checked={item.id === preset}
                onChange={() => setEnemyResPreset(item.id)}
              />
              {item.label}
              <em className="enemy-res">
                {Math.round(item.baseRes * 100)} / {Math.round(item.sameElementRes * 100)}%
              </em>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * 파티 자리를 눌렀을 때 뜨는 캐릭터 목록.
 * 고르면 그 자리에 바로 앉는다 — 이미 파티에 있는 캐릭터를 고르면 두 자리가 맞바뀐다
 * (assignCharacterToSlot이 그렇게 처리한다).
 */
function SlotPickerDialog({
  config,
  slotIndex,
  onPick,
  onClear,
  onClose,
}: {
  config: PartyConfig;
  slotIndex: number;
  onPick: (characterId: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const list = getAvailableCharacters().filter((c) => c.name.toLowerCase().includes(needle));
  const current = config[PARTY_SLOTS[slotIndex]].characterId;

  return (
    <div
      className="formula-backdrop"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div className="formula-modal slot-pick-modal" onClick={(e) => e.stopPropagation()}>
        <div className="formula-head">
          <div>
            <small>PARTY</small>
            <h3>{slotIndex + 1}번 캐릭터</h3>
            <span>고른 캐릭터가 이 자리에 앉습니다. 파티에 있는 캐릭터를 고르면 자리가 맞바뀝니다.</span>
          </div>
          <button className="formula-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="panel-head slot-pick-head">
          {current && (
            <button className="party-load" onClick={onClear} title="이 자리를 비웁니다">
              자리 비우기
            </button>
          )}
          <input
            type="text"
            className="panel-search"
            placeholder="캐릭터 검색..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
        </div>

        <div className="pick-grid slot-pick-grid">
          {list.map((char) => {
            const at = PARTY_SLOTS.findIndex((slot) => config[slot].characterId === char.id);
            return (
              <button
                key={char.id}
                className={["pick-card", at >= 0 ? "in" : "", char.id === current ? "on" : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onPick(char.id)}
                title={`${char.element} · ${char.weaponType}${at >= 0 ? ` — 지금 ${at + 1}번 자리` : ""}`}
              >
                {char.iconUrl && <img src={char.iconUrl} alt="" loading="lazy" />}
                <b>{char.name}</b>
                {at >= 0 && <em>{at + 1}번 캐릭터</em>}
              </button>
            );
          })}

          {list.length === 0 && (
            <p style={{ color: "var(--c-9ea7b7)", gridColumn: "1 / -1", margin: 0 }}>
              이름에 맞는 캐릭터가 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
