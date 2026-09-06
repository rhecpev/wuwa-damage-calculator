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
  /**
   * 어느 파티를 만지는지. 계산 탭과 파티 관리 탭이 같은 화면을 쓰지만
   * 건드리는 파티는 서로 다르다(PartyConfigContext 참고).
   *   "calc"   데미지 계산 탭이 쓰는 파티
   *   "editor" 파티 관리 탭에서 짜는 편성
   * 생략하면 계산용이다 — 예전 호출부가 그대로 돌아가도록.
   */
  scope?: "calc" | "editor";
}

/** 이 화면이 만질 파티의 조작 함수 묶음. scope에 맞는 것을 골라 준다. */
function usePartyOps(scope: "calc" | "editor") {
  const ctx = usePartyConfig();
  return scope === "editor"
    ? {
        toggleCharacter: ctx.editorToggleCharacter,
        clearSlot: ctx.editorClearSlot,
        swapSlots: ctx.editorSwapSlots,
        assignCharacterToSlot: ctx.editorAssignCharacterToSlot,
      }
    : {
        toggleCharacter: ctx.toggleCharacter,
        clearSlot: ctx.clearSlot,
        swapSlots: ctx.swapSlots,
        assignCharacterToSlot: ctx.assignCharacterToSlot,
      };
}

/**
 * 끌어다 놓기로 주고받는 값. 종류를 MIME 타입으로 구분해
 * 자리 위에서 dragover만으로도 무엇이 오는지 알 수 있게 한다.
 *   CHAR_MIME = 캐릭터 선택에서 끌고 온 캐릭터 id
 *   SLOT_MIME = 파티 구성 안에서 끌고 온 자리 번호
 */
const CHAR_MIME = "application/x-wuwa-character";
const SLOT_MIME = "application/x-wuwa-slot";

const dragHas = (event: React.DragEvent, mime: string) =>
  Array.from(event.dataTransfer.types).includes(mime);

/** 파티에 넣고 뺄 캐릭터 목록. 아이콘을 누르면 빈 자리에 들어가고, 다시 누르면 빠진다. */
export function CharacterPickerSection({ config, scope = "calc" }: PartySectionProps) {
  const { toggleCharacter } = usePartyOps(scope);
  const { selectedCharacterId, setSelectedCharacterId } = useAppState();
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const availableCharacters = getAvailableCharacters().filter((c) =>
    c.name.toLowerCase().includes(needle),
  );

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>캐릭터 선택</h2>
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
          const slotIndex = PARTY_SLOTS.findIndex(
            (slot) => config[slot].characterId === char.id,
          );
          const inParty = slotIndex >= 0;

          return (
            <button
              key={char.id}
              className={[
                "pick-card",
                inParty ? "in" : "",
                selectedCharacterId === char.id ? "on" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              // 파티 구성의 자리로 끌어다 놓으면 그 번호에 바로 앉는다.
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(CHAR_MIME, char.id);
                event.dataTransfer.effectAllowed = "copyMove";
              }}
              onClick={() => {
                // 같은 아이콘을 다시 누르면 파티에서 빠진다.
                toggleCharacter(char.id);
                setSelectedCharacterId(inParty ? null : char.id);
              }}
              title={
                inParty
                  ? `${char.element} · ${char.weaponType} — ${slotIndex + 1}번 캐릭터 (다시 누르면 해제)`
                  : `${char.element} · ${char.weaponType} (파티 자리로 끌어다 놓을 수 있습니다)`
              }
            >
              {char.iconUrl && <img src={char.iconUrl} alt="" loading="lazy" />}
              <b>{char.name}</b>
              {inParty && <em>{slotIndex + 1}번 캐릭터</em>}
            </button>
          );
        })}

        {availableCharacters.length === 0 && (
          <p style={{ color: "#9ea7b7", gridColumn: "1 / -1", margin: 0 }}>
            이름에 맞는 캐릭터가 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

/** 1·2·3번 자리에 누가 앉았는지. 아래 절반은 콘텐츠(속성 저항 프리셋) 선택이다. */
export function PartyRosterSection({ config, scope = "calc" }: PartySectionProps) {
  const { setEnemyResPreset, partyPresets } = usePartyConfig();
  const { clearSlot, swapSlots, assignCharacterToSlot } = usePartyOps(scope);
  const { selectedCharacterId, setSelectedCharacterId } = useAppState();
  // 담아둔 파티는 평소엔 접어 둔다 — 늘 펼쳐 두면 이 칸이 통째로 길어진다.
  const [presetOpen, setPresetOpen] = useState(false);
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
            <PartyPresetSection compact scope={scope} onLoaded={() => setPresetOpen(false)} />
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
              // 자리를 누르면 그 캐릭터만 파티에서 빠진다. 뒤 캐릭터는 당겨오지 않는다.
              onClick={() => {
                if (!character) return;
                clearSlot(slot);
                if (selectedCharacterId === character.id) setSelectedCharacterId(null);
              }}
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
                  ? `${character.name} — 누르면 파티에서 빠지고, 끌면 자리를 바꿉니다`
                  : `${index + 1}번 자리 — 캐릭터를 끌어다 놓으세요`
              }
            >
              <small>{index + 1}번 캐릭터</small>

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

      {/* 콘텐츠(적 저항)는 계산에만 쓰인다 — 편성만 짜는 파티 관리 탭에서는 감춘다. */}
      {scope === "calc" && (
      <div className="party-half">
        <h2>콘텐츠 선택</h2>
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
        <span className="enemy-hint">기본 저항 / 동일 속성 저항</span>
      </div>
      )}
    </section>
  );
}
