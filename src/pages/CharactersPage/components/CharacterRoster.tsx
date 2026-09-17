import { useMemo, useState, useSyncExternalStore } from "react";
import type { Character } from "../../../types/game";
import {
  isOwnedCharacter,
  ownedStoreVersion,
  subscribeOwnedStore,
  toggleOwnedCharacter,
} from "../../../data/ownedStore";

interface CharacterRosterProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (characterId: string) => void;
}

const ELEMENT_NAMES: Record<Character["element"], string> = {
  Glacio: "응결",
  Fusion: "용융",
  Electro: "전도",
  Aero: "기류",
  Spectro: "회절",
  Havoc: "인멸",
};

/**
 * 캐릭터 관리 화면 오른쪽에 세로로 붙는 목록.
 * 한 줄에 아이콘 하나 + 그 오른쪽에 이름, 세로로 길게 스크롤된다.
 *
 * 이름이 60명을 넘어가서 검색이 없으면 찾기가 어렵다. 이름·속성 둘 다로 걸린다.
 * 줄 오른쪽의 ✓ / ✕가 보유 표시다 — 눌러서 켜고 끄며, 보유한 것만 보도록 걸러낼 수도 있다.
 * 목록은 보유한 것을 먼저 세우고 그 안에서 이름순으로 둔다 — 쓰는 캐릭터가 늘 위에 있게.
 */
export function CharacterRoster({ characters, selectedId, onSelect }: CharacterRosterProps) {
  const version = useSyncExternalStore(subscribeOwnedStore, ownedStoreVersion);
  const [query, setQuery] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return characters
      .filter((c) => (ownedOnly ? isOwnedCharacter(c.id) : true))
      .filter((c) =>
        q ? c.name.toLowerCase().includes(q) || ELEMENT_NAMES[c.element].includes(q) : true,
      )
      // 보유한 것이 먼저, 그 안에서는 이름순. sort는 원본을 뒤집으므로
      // 위 filter가 만든 새 배열에만 건다(characters를 직접 정렬하면 안 된다).
      .sort((a, b) => {
        const owned = Number(isOwnedCharacter(b.id)) - Number(isOwnedCharacter(a.id));
        return owned !== 0 ? owned : a.name.localeCompare(b.name, "ko");
      });
    // version이 바뀌면 보유 필터와 정렬 결과가 달라진다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters, query, ownedOnly, version]);

  const ownedCount = characters.filter((c) => isOwnedCharacter(c.id)).length;

  return (
    <aside className="char-list">
      <div className="char-list-head">
        <small>ROSTER</small>
        <span>
          {list.length}명 · 보유 {ownedCount}
        </span>
      </div>

      <input
        className="char-list-search"
        placeholder="이름 · 속성으로 찾기"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <label className="char-list-filter">
        <input
          type="checkbox"
          checked={ownedOnly}
          onChange={(e) => setOwnedOnly(e.target.checked)}
        />
        보유한 캐릭터만
      </label>

      <div className="char-list-scroll">
        {list.map((character) => {
          const owned = isOwnedCharacter(character.id);
          return (
            <div
              key={character.id}
              className={character.id === selectedId ? "char-list-item on" : "char-list-item"}
            >
              <button className="char-list-pick" onClick={() => onSelect(character.id)}>
                {character.iconUrl ? (
                  <img src={character.iconUrl} alt="" loading="lazy" />
                ) : (
                  <span className="char-list-blank" />
                )}
                <span className="char-list-name">
                  <b>{character.name}</b>
                  <em>{ELEMENT_NAMES[character.element]}</em>
                </span>
              </button>

              {/* 보유는 ✓, 미보유는 ✕. 목록이 좁아 글자 대신 기호를 쓴다. */}
              <button
                className={owned ? "char-list-own on" : "char-list-own"}
                title={owned ? "보유 중 — 누르면 해제" : "미보유 — 누르면 보유로 표시"}
                onClick={() => toggleOwnedCharacter(character.id)}
              >
                {owned ? "✓" : "✕"}
              </button>
            </div>
          );
        })}

        {list.length === 0 && (
          <p className="char-list-empty">
            {ownedOnly && ownedCount === 0
              ? "보유 표시한 캐릭터가 없습니다. 목록 오른쪽의 ✕를 눌러 표시하세요."
              : "조건에 맞는 캐릭터가 없습니다."}
          </p>
        )}
      </div>
    </aside>
  );
}
