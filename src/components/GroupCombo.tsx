import { useState } from "react";
import type { PartyPreset } from "../context/PartyConfigContext";

/**
 * 그룹 이름들 — 「그룹 추가」로 만든 것이 먼저, 그 순서대로. 「미설정」(그룹 없음)은 넣지 않는다.
 * 파티에만 적혀 있고 목록에 없는 이름(그룹 추가가 생기기 전에 적어 둔 것)도 뒤에 붙여 잃지 않는다.
 */
export const groupsOf = (groups: string[], presets: PartyPreset[]) =>
  Array.from(new Set([...groups, ...presets.map((p) => p.group ?? "").filter(Boolean)]));

interface GroupComboProps {
  /** 고른 그룹. ""이면 「미설정」, null이면 「전체」다 — null은 allowAll일 때만 쓴다. */
  value: string | null;
  groups: string[];
  onChange: (group: string | null) => void;
  /** 「전체」를 고를 수 있게 한다 — 그룹으로 목록을 거르는 자리에서 쓴다. */
  allowAll?: boolean;
}

const labelOf = (group: string | null) => (group === null ? "전체" : group || "미설정");

/**
 * 그룹 고르는 칸. 누르면 목록이 아래로 펼쳐지고, 글자를 적으면 그 글자가 든 그룹만 남는다.
 * 「전체」·「미설정」은 검색어와 상관없이 늘 맨 위에 있다.
 */
export function GroupCombo({ value, groups, onChange, allowAll = false }: GroupComboProps) {
  // 적는 중인 검색어. null이면 목록이 닫혀 있고, 칸에는 고른 그룹 이름이 보인다.
  const [query, setQuery] = useState<string | null>(null);
  const needle = (query ?? "").trim().toLowerCase();
  const matched = groups.filter((name) => name.toLowerCase().includes(needle));
  const fixed: (string | null)[] = allowAll ? [null, ""] : [""];

  return (
    <div className="group-combo">
      <input
        type="text"
        placeholder="그룹 검색..."
        value={query ?? labelOf(value)}
        onFocus={() => setQuery("")}
        onBlur={() => setQuery(null)}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.blur();
          // Enter는 맨 위에 걸린 그룹을 고른다.
          if (event.key === "Enter" && query !== null) {
            onChange(matched[0] ?? fixed[0]);
            event.currentTarget.blur();
          }
        }}
      />
      {query !== null && (
        // 누르는 동안 칸이 초점을 잃으면 목록이 먼저 닫혀 버린다 — mousedown을 막아 둔다.
        <ul className="group-combo-list" onMouseDown={(event) => event.preventDefault()}>
          {[...fixed, ...matched].map((name) => (
            <li key={name ?? "\0all"}>
              <button
                className={name === value ? "on" : ""}
                onClick={() => {
                  onChange(name);
                  (document.activeElement as HTMLElement | null)?.blur();
                }}
              >
                {labelOf(name)}
              </button>
            </li>
          ))}
          {matched.length === 0 && needle && <li className="none">맞는 그룹이 없습니다.</li>}
        </ul>
      )}
    </div>
  );
}
