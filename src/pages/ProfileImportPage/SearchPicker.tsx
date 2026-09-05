import { useMemo, useRef, useState } from "react";

/**
 * 검색해서 하나 고르는 칸.
 *
 * 목록이 길어서(캐릭터 58명 · 무기 100자루 넘음 · 에코 200개 넘음) 드롭다운만으로는
 * 못 찾는다. 글자를 치면 좁혀 주고, 고르면 이름이 칸에 남는다.
 * 검색은 공백·기호를 무시한다 — 「플뢰르 드 리스」를 「플뢰르드리스」로 쳐도 나온다.
 */

const norm = (s: string) => s.replace(/[^0-9a-zA-Z가-힣]/g, "").toLowerCase();

export interface PickerItem {
  id: string;
  name: string;
  /** 이름 옆에 흐리게 붙는 한 줄. 무기 종류나 에코 코스트 같은 것. */
  note?: string;
  iconUrl?: string;
}

interface SearchPickerProps {
  items: PickerItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** 목록에 한 번에 보여 줄 개수. 너무 많으면 화면이 무거워진다. */
  limit?: number;
}

export function SearchPicker({
  items,
  value,
  onChange,
  placeholder = "이름을 치세요",
  limit = 40,
}: SearchPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // 목록을 클릭하는 순간 blur가 먼저 일어나 목록이 닫혀 버린다. 그 사이를 막는 표시.
  const picking = useRef(false);

  const chosen = items.find((i) => i.id === value);

  const hits = useMemo(() => {
    const q = norm(query);
    if (!q) return items.slice(0, limit);
    return items.filter((i) => norm(i.name).includes(q)).slice(0, limit);
  }, [items, query, limit]);

  return (
    <div className="search-picker">
      <input
        type="text"
        value={open ? query : (chosen?.name ?? "")}
        placeholder={chosen ? chosen.name : placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => {
          if (!picking.current) setOpen(false);
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {chosen && !open && (
        <button className="clear" title="지우기" onMouseDown={() => onChange("")}>
          ×
        </button>
      )}

      {open && (
        <div
          className="picker-list"
          onMouseDown={() => {
            picking.current = true;
          }}
          onMouseUp={() => {
            picking.current = false;
          }}
        >
          {hits.length === 0 && <div className="picker-empty">찾는 것이 없습니다.</div>}
          {hits.map((item) => (
            <button
              key={item.id}
              className={item.id === value ? "on" : ""}
              onClick={() => {
                onChange(item.id);
                setOpen(false);
                picking.current = false;
              }}
            >
              {item.iconUrl && <img src={item.iconUrl} alt="" loading="lazy" />}
              <span>{item.name}</span>
              {item.note && <em>{item.note}</em>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
