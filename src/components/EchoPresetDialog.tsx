import { useState } from "react";
import { loadMyEchoes } from "../data/echoStore";
import type { EchoPreset } from "../data/echoStore";

interface EchoPresetDialogProps {
  /** 프리셋을 끼울 캐릭터 이름 — 창 설명에 적는다. */
  characterName: string;
  /** 창 설명을 갈아 쓴다 — 실제로 끼우지 않고 「끼웠다고 치는」 자리(사이클 비교)에서 준다. */
  hint?: string;
  presets: EchoPreset[];
  /** 지금 그 캐릭터가 끼고 있는 프리셋. 줄에 「장착 중」을 붙인다. */
  activeId?: string;
  onApply: (preset: EchoPreset) => void;
  /** 주면 줄마다 「삭제」가 붙는다 — 프리셋을 관리하는 자리(캐릭터 탭)에서만 준다. */
  onDelete?: (preset: EchoPreset) => void;
  onClose: () => void;
}

/**
 * 에코 프리셋 고르는 창 — 담아 둔 한 벌을 이름으로 찾아 캐릭터에 끼운다.
 * 캐릭터 탭의 「프리셋 불러오기」와 계산 탭 파티 카드가 같이 쓴다.
 */
export function EchoPresetDialog({
  characterName,
  hint,
  presets,
  activeId,
  onApply,
  onDelete,
  onClose,
}: EchoPresetDialogProps) {
  const [query, setQuery] = useState("");
  const myEchoes = loadMyEchoes();
  const needle = query.trim().toLowerCase();
  const shown = presets.filter((p) => p.name.toLowerCase().includes(needle));

  return (
    <div className="formula-backdrop" onClick={onClose} role="presentation">
      <div
        className="formula-modal party-load-modal echo-preset-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="formula-head">
          <div>
            <small>ECHO PRESET</small>
            <h3>에코 프리셋 불러오기</h3>
            <span>
              {hint ?? `담아 둔 한 벌을 ${characterName}에게 그대로 끼웁니다. 지금 낀 에코는 빠집니다.`}
            </span>
          </div>
          <button className="formula-close" onClick={onClose}>
            ×
          </button>
        </div>

        {presets.length === 0 ? (
          <p className="preset-empty">
            담아 둔 프리셋이 없습니다. 캐릭터 탭의 에코 화면에서 에코를 장착한 뒤 「프리셋 저장」을
            누르면 여기에 쌓입니다.
          </p>
        ) : (
          <>
            <div className="panel-head">
              <input
                type="text"
                className="panel-search"
                autoFocus
                placeholder="프리셋 이름 검색..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {shown.length === 0 && <p className="preset-empty">이름에 맞는 프리셋이 없습니다.</p>}
            <ul className="preset-list">
              {shown.map((preset) => {
                // 프리셋에 담긴 에코들 — 그 뒤에 지운 에코는 빠진다.
                const echoes = preset.echoIds
                  .map((pk) => myEchoes.find((e) => e.pk === pk))
                  .filter((e) => e !== undefined);
                return (
                  <li key={preset.id}>
                    <span className="preset-name">
                      <span className="preset-faces">
                        {echoes.map((e) => (
                          <i key={e.pk} title={e.name}>
                            {e.iconUrl ? (
                              <img src={e.iconUrl} alt="" loading="lazy" />
                            ) : (
                              <u>{e.name[0]}</u>
                            )}
                            <em>{e.options?.mainOption?.type ?? e.name}</em>
                          </i>
                        ))}
                      </span>
                      <b className="preset-label">{preset.name}</b>
                      {preset.id === activeId && <em>장착 중</em>}
                    </span>

                    <button disabled={echoes.length === 0} onClick={() => onApply(preset)}>
                      불러오기
                    </button>
                    {onDelete && <button onClick={() => onDelete(preset)}>삭제</button>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
