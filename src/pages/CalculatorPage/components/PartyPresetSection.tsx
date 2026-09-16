import { useState } from "react";
import { characters } from "../../../data/sampleData";
import { PARTY_SLOTS, usePartyConfig } from "../../../context/PartyConfigContext";
import type { PartyConfig } from "../../../types/game";

interface PartyPresetSectionProps {
  /** 하나를 불러온 뒤 부를 것. 다이얼로그로 띄운 쪽이 스스로 닫으려고 쓴다. */
  onLoaded?: () => void;
}

/**
 * 파티 관리 탭에서 짜둔 파티 목록. 눌러서 계산 탭 자리에 그대로 앉힌다.
 * 만들고 지우고 순서를 바꾸는 것은 파티 관리 탭이 한다 — 여기서는 고르기만 한다.
 */
export function PartyPresetSection({ onLoaded }: PartyPresetSectionProps) {
  const { partyPresets, applyPartyPreset } = usePartyConfig();
  const [query, setQuery] = useState("");

  /** 그 구성에 앉은 캐릭터들. 목록에 아이콘과 이름을 같이 보여준다. */
  const members = (cfg: PartyConfig) =>
    PARTY_SLOTS.map((slot) => characters.find((c) => c.id === cfg[slot].characterId)).filter(
      (c): c is (typeof characters)[number] => c !== undefined,
    );

  // 이름으로 거른 목록. 담긴 캐릭터 이름으로도 찾을 수 있게 한다.
  const needle = query.trim().toLowerCase();
  const shown = partyPresets.filter(
    (preset) =>
      preset.name.toLowerCase().includes(needle) ||
      members(preset.config).some((c) => c.name.toLowerCase().includes(needle)),
  );

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>파티 목록</h2>
        <input
          type="text"
          className="panel-search"
          placeholder="파티 이름 검색..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {shown.length === 0 ? (
        <p className="preset-empty">
          {partyPresets.length > 0
            ? "이름에 맞는 파티가 없습니다."
            : "만들어둔 파티가 없습니다. 파티 관리 탭에서 파티를 추가하면 여기서 바로 불러올 수 있습니다."}
        </p>
      ) : (
        <ul className="preset-list">
          {shown.map((preset) => (
            <li key={preset.id}>
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

              <button
                onClick={() => {
                  applyPartyPreset(preset.id);
                  onLoaded?.();
                }}
              >
                불러오기
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
