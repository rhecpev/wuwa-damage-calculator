import { useState } from "react";
import { characters } from "../../../data/sampleData";
import { PARTY_SLOTS, usePartyConfig } from "../../../context/PartyConfigContext";

interface PartyPresetSectionProps {
  /**
   * 목록만 보여주는 모드. 계산 화면처럼 불러오기만 필요한 곳에서 쓴다.
   * 저장·이름변경·삭제는 파티 관리 탭에서 한다.
   */
  compact?: boolean;
  /**
   * 저장할 때 어느 파티를 담고, 불러올 때 어디에 앉힐지.
   * 파티 관리 탭은 자기 편성(editorConfig)을 담고 자기 자리에 불러온다.
   */
  scope?: "calc" | "editor";
  /** 하나를 불러온 뒤 부를 것. 다이얼로그로 띄운 쪽이 스스로 닫으려고 쓴다. */
  onLoaded?: () => void;
}

/**
 * 저장해둔 파티 목록. 이름을 붙여 담아두고 눌러서 그대로 되돌린다.
 * 담기는 건 편성뿐 아니라 로테이션과 몬스터 설정까지 한 벌이다.
 */
export function PartyPresetSection({
  compact = false,
  scope = "calc",
  onLoaded,
}: PartyPresetSectionProps) {
  const {
    config: calcConfig,
    editorConfig,
    partyPresets,
    savePartyPreset,
    applyPartyPreset,
    renamePartyPreset,
    removePartyPreset,
  } = usePartyConfig();
  // 이 화면이 다루는 파티. 저장은 이걸 담고, 불러오기도 이쪽에 앉힌다.
  const config = scope === "editor" ? editorConfig : calcConfig;
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  // 이름을 고치는 중인 항목. 한 번에 하나만 연다.
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  /** 그 구성에 앉은 캐릭터들. 목록에 아이콘과 이름을 같이 보여준다. */
  const members = (cfg: typeof config) =>
    PARTY_SLOTS.map((slot) => characters.find((c) => c.id === cfg[slot].characterId)).filter(
      (c): c is (typeof characters)[number] => c !== undefined,
    );

  // 지금 자리에 앉아 있는 캐릭터. 이름을 비워두면 이 이름들로 대신 담는다.
  const current = members(config);

  // 이름으로 거른 목록. 담긴 캐릭터 이름으로도 찾을 수 있게 한다.
  const needle = query.trim().toLowerCase();
  const shown = partyPresets.filter(
    (preset) =>
      preset.name.toLowerCase().includes(needle) ||
      members(preset.config).some((c) => c.name.toLowerCase().includes(needle)),
  );

  const submit = () => {
    savePartyPreset(name.trim() || current.map((c) => c.name).join(" · ") || "빈 파티", config);
    setName("");
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{compact ? "파티 목록" : "파티 선택"}</h2>
        <input
          type="text"
          className="panel-search"
          placeholder="파티 이름 검색..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {!compact && (
        <>
          <div className="preset-add">
            <input
              type="text"
              placeholder="파티 이름 (비우면 캐릭터 이름으로)"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
            />
            <button onClick={submit} disabled={current.length === 0}>
              현재 구성 저장
            </button>
          </div>
        </>
      )}

      {shown.length === 0 ? (
        <p className="preset-empty">
          {partyPresets.length > 0
            ? "이름에 맞는 파티가 없습니다."
            : compact
              ? "저장한 파티가 없습니다. 파티 관리 탭에서 담아두면 여기서 바로 불러올 수 있습니다."
              : "저장한 파티가 없습니다. 편성을 마친 뒤 이름을 붙여 담아두면 그대로 되돌릴 수 있습니다."}
        </p>
      ) : (
        <ul className="preset-list">
          {shown.map((preset) => (
            <li key={preset.id}>
              {editing?.id === preset.id ? (
                <input
                  className="preset-rename"
                  autoFocus
                  value={editing.value}
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
                <span className="preset-name">
                  <span className="preset-faces">
                    {members(preset.config).map((c) => (
                      <i key={c.id}>
                        {c.iconUrl ? <img src={c.iconUrl} alt="" loading="lazy" /> : <u>{c.name[0]}</u>}
                        <em>{c.name}</em>
                      </i>
                    ))}
                  </span>
                  <b className="preset-label">{preset.name}</b>
                </span>
              )}

              <button
                onClick={() => {
                  applyPartyPreset(preset.id, scope);
                  onLoaded?.();
                }}
              >
                불러오기
              </button>
              {!compact && (
                <>
                  <button
                    className="preset-quiet"
                    onClick={() => setEditing({ id: preset.id, value: preset.name })}
                  >
                    이름
                  </button>
                  <button className="preset-quiet" onClick={() => removePartyPreset(preset.id)}>
                    삭제
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
