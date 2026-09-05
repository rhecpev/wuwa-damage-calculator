import { useMemo, useRef, useState } from "react";
import { characters } from "../../data/sampleData";
import { usePartyConfig } from "../../context/PartyConfigContext";
import { useAppState } from "../../context/AppStateContext";
import {
  cycleFileName,
  decodeCycle,
  downloadCycle,
  encodeCycle,
  type CycleMember,
  type CyclePreset,
} from "../../data/cyclePresets";

/**
 * 사이클 관리 탭.
 *
 * 담아둔 공격 루틴을 목록으로 보고, 계산 탭에 그대로 앉히거나 남과 주고받는다.
 *
 * ── 불러올 때 무엇을 조심하는가 ─────────────────────────────
 * 공격마다 켜둔 버프는 id로 적혀 있고, 그 id에는 만들어진 자리가 박혀 있다.
 *   character:jinhsi:12   금희의 12번째 고유·체인 버프
 *   weapon:...·echoset:...·echoability:...
 * 남의 사이클을 열면 내 체인이 1돌인데 상대는 3돌이라 그 id가 아예 없을 수 있다.
 * 그러면 켜둔 체크가 조용히 사라져 「같은 루틴인데 딜이 다른」 상태가 된다.
 *
 * 그래서 앉히기 전에 지금 환경(allBuffs)에 그 id가 실제로 있는지 하나씩 본다.
 * 없는 것이 있으면 무엇이 왜 빠지는지 보여 주고, 사람이 「그건 빼고 넣기」를 고르게 한다.
 */

/** 버프 id 앞머리로 무엇에서 나온 버프인지 가른다. 사람에게 이유를 말해 주려고 쓴다. */
function originOf(buffId: string): string {
  if (buffId.startsWith("character:")) return "캐릭터 고유 · 공명체인";
  if (buffId.startsWith("weapon:")) return "무기";
  if (buffId.startsWith("echoset:")) return "에코 세트";
  if (buffId.startsWith("echoability:")) return "에코 어빌리티";
  return "직접 입력";
}

/** 그 버프 id가 어느 캐릭터 것인지. `종류:캐릭터id:…` 꼴에서 뽑는다. */
function ownerOf(buffId: string): string | null {
  const parts = buffId.split(":");
  if (parts.length < 2) return null;
  // weapon만 두 번째 칸이 무기 id다 — 캐릭터를 짚을 수 없다.
  return parts[0] === "weapon" ? null : parts[1];
}

export function CyclePage() {
  const {
    cyclePresets,
    addCyclePreset,
    applyCyclePreset,
    renameCyclePreset,
    removeCyclePreset,
    currentCycleMembers,
    allBuffs,
  } = usePartyConfig();
  const { setTab } = useAppState();

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  /** 추출물을 띄운 사이클. 글자를 그대로 보여 주고 복사하게 한다. */
  const [exporting, setExporting] = useState<CyclePreset | null>(null);
  /** 불러오기 창. 붙여넣은 글자와 읽다가 난 문제를 같이 들고 있다. */
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  /** 파일 고르기 입력. 화면에는 감추고 단추가 대신 눌러 준다. */
  const fileRef = useRef<HTMLInputElement>(null);

  /** 고른 파일을 읽어 목록에 담는다. 여러 개를 한 번에 골라도 순서대로 받는다. */
  const readFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const failed: string[] = [];
    for (const file of Array.from(files)) {
      const result = decodeCycle(await file.text());
      if ("error" in result) failed.push(`${file.name} — ${result.error}`);
      else addCyclePreset(result.preset);
    }
    setImportError(failed.join("\n"));
    if (failed.length === 0) setImportOpen(false);
  };
  /** 환경이 어긋나 확인을 기다리는 사이클. 앉히기 직전에 뜬다. */
  const [confirming, setConfirming] = useState<{ preset: CyclePreset; orphans: string[] } | null>(
    null,
  );

  const buffIds = useMemo(() => new Set(allBuffs.map((b) => b.id)), [allBuffs]);
  // 컨텍스트가 다시 그려질 때마다 새로 읽는다 — 지금 파티·체인을 그대로 봐야 해서
  // 기억해 두면 안 된다(useMemo를 걸면 옛 환경과 견주게 된다).
  const here = currentCycleMembers();

  const shown = cyclePresets.filter((preset) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return (
      preset.name.toLowerCase().includes(needle) ||
      preset.members.some((m) => m.characterName.toLowerCase().includes(needle))
    );
  });

  /**
   * 이 사이클을 지금 환경에 앉히면 살아남지 못하는 버프 체크.
   * 손으로 넣은 버프는 사이클과 함께 통째로 옮겨지므로 늘 살아난다 — 그래서 따지지 않는다.
   */
  const orphansOf = (preset: CyclePreset): string[] => {
    const manual = new Set(preset.manualBuffs.map((b) => b.id));
    const seen = new Set<string>();
    for (const item of preset.rotation) {
      for (const id of item.enabledBuffIds) {
        if (manual.has(id) || buffIds.has(id)) continue;
        seen.add(id);
      }
    }
    return [...seen];
  };

  /** 담긴 환경과 지금 환경이 캐릭터별로 어디서 갈리는지. */
  const diffOf = (preset: CyclePreset) => {
    const mine = new Map(here.map((m) => [m.characterId, m]));
    return preset.members
      .map((them) => {
        const me = mine.get(them.characterId);
        const changes: string[] = [];
        if (!me) changes.push("지금 파티에 없음");
        else {
          if (me.resonanceChain !== them.resonanceChain)
            changes.push(`공명체인 ${them.resonanceChain}돌 → ${me.resonanceChain}돌`);
          if (me.weaponId !== them.weaponId) changes.push("무기가 다름");
          else if (me.weaponRefine !== them.weaponRefine)
            changes.push(`정련 ${them.weaponRefine} → ${me.weaponRefine}`);
          if (me.resonanceMode !== them.resonanceMode) changes.push("공명 모드가 다름");
          if (me.echoIds.join(",") !== them.echoIds.join(",")) changes.push("에코 구성이 다름");
        }
        return { member: them, changes };
      })
      .filter((row) => row.changes.length > 0);
  };

  /** 앉히기. 어긋난 것이 있으면 먼저 물어보고, 없으면 바로 넣는다. */
  const applyOrAsk = (preset: CyclePreset) => {
    const orphans = orphansOf(preset);
    if (orphans.length === 0 && diffOf(preset).length === 0) {
      applyCyclePreset(preset.id);
      setTab("calculator");
      return;
    }
    setConfirming({ preset, orphans });
  };

  const memberFace = (member: CycleMember) => {
    const character = characters.find((c) => c.id === member.characterId);
    return (
      <i key={member.slot} title={`${member.characterName} · ${member.resonanceChain}돌`}>
        {character?.iconUrl ? (
          <img src={character.iconUrl} alt="" loading="lazy" />
        ) : (
          <u>{member.characterName[0]}</u>
        )}
        <em>
          {member.characterName}
          <b>{member.resonanceChain}돌</b>
        </em>
      </i>
    );
  };

  return (
    <>
      <header>
        <div>
          <h1>사이클 관리</h1>
          <p>
            다 짜 놓은 공격 루틴을 담아 두고, 계산 탭에 그대로 앉히거나 남과 주고받습니다.
            캐릭터 · 무기 · 공명체인 · 손 버프 · 공격마다 켜둔 버프까지 한 벌로 담깁니다.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <h2>담아둔 사이클 {cyclePresets.length > 0 && `(${cyclePresets.length})`}</h2>
          <input
            className="panel-search"
            placeholder="사이클 · 캐릭터 이름으로 찾기"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            className="viz-toggle"
            onClick={() => {
              setImportOpen(true);
              setImportText("");
              setImportError("");
            }}
          >
            불러오기
          </button>
        </div>

        {shown.length === 0 ? (
          <p className="preset-empty">
            {cyclePresets.length === 0
              ? "담아둔 사이클이 없습니다. 데미지 계산 탭에서 루틴을 짜고 「사이클 저장」을 누르세요."
              : "이름에 맞는 사이클이 없습니다."}
          </p>
        ) : (
          <ul className="cycle-list">
            {shown.map((preset) => {
              const orphans = orphansOf(preset);
              const diff = diffOf(preset);
              const cycles = new Set(preset.rotation.map((r) => r.cycle ?? 1)).size;

              return (
                <li key={preset.id}>
                  <div className="cycle-row-main">
                    <span className="preset-faces">{preset.members.map(memberFace)}</span>

                    <div className="cycle-row-name">
                      {editing?.id === preset.id ? (
                        <input
                          className="preset-rename"
                          autoFocus
                          value={editing.value}
                          onChange={(event) =>
                            setEditing({ id: preset.id, value: event.target.value })
                          }
                          onBlur={() => {
                            renameCyclePreset(preset.id, editing.value);
                            setEditing(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                            if (event.key === "Escape") setEditing(null);
                          }}
                        />
                      ) : (
                        <b>{preset.name}</b>
                      )}
                      <em>
                        {preset.rotation.length}대 · {cycles}사이클 ·{" "}
                        {new Date(preset.savedAt).toLocaleDateString("ko-KR")}
                        {preset.note && ` · ${preset.note}`}
                      </em>
                      {(orphans.length > 0 || diff.length > 0) && (
                        <span className="cycle-warn">
                          지금 환경과 다름
                          {orphans.length > 0 && ` · 버프 체크 ${orphans.length}개가 빠집니다`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="cycle-row-actions">
                    <button className="primary" onClick={() => applyOrAsk(preset)}>
                      대미지 계산에 세팅
                    </button>
                    <button
                      onClick={() => downloadCycle(preset)}
                      title={`${cycleFileName(preset)} 로 내려받습니다`}
                    >
                      사이클 추출
                    </button>
                    <button className="preset-quiet" onClick={() => setExporting(preset)}>
                      내용 보기
                    </button>
                    <button
                      className="preset-quiet"
                      onClick={() => setEditing({ id: preset.id, value: preset.name })}
                    >
                      이름
                    </button>
                    <button className="preset-quiet" onClick={() => removeCyclePreset(preset.id)}>
                      삭제
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── 추출 ── */}
      {exporting && (
        <div className="formula-backdrop" onClick={() => setExporting(null)} role="presentation">
          <div className="formula-modal cycle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="formula-head">
              <div>
                <small>EXPORT</small>
                <h3>{exporting.name}</h3>
                <span>
                  파일로 주고받는 것이 편하지만, 채팅으로 넘길 때는 아래 내용을 그대로 복사해도
                  됩니다.
                </span>
              </div>
              <button className="formula-close" onClick={() => setExporting(null)}>
                ×
              </button>
            </div>
            <textarea className="cycle-code" readOnly value={encodeCycle(exporting)} />
            <div className="cycle-modal-actions">
              <button onClick={() => navigator.clipboard?.writeText(encodeCycle(exporting))}>
                클립보드로 복사
              </button>
              <button className="primary" onClick={() => downloadCycle(exporting)}>
                JSON 파일로 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 불러오기 ── */}
      {importOpen && (
        <div className="formula-backdrop" onClick={() => setImportOpen(false)} role="presentation">
          <div className="formula-modal cycle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="formula-head">
              <div>
                <small>IMPORT</small>
                <h3>사이클 불러오기</h3>
                <span>받은 추출 내용을 그대로 붙여넣으세요.</span>
              </div>
              <button className="formula-close" onClick={() => setImportOpen(false)}>
                ×
              </button>
            </div>
            <div className="cycle-import-file">
              <button className="primary" onClick={() => fileRef.current?.click()}>
                JSON 파일 고르기
              </button>
              <small>추출로 내려받은 .wuwa-cycle.json — 여러 개를 한 번에 골라도 됩니다.</small>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                multiple
                hidden
                onChange={(event) => {
                  void readFiles(event.target.files);
                  // 같은 파일을 다시 고를 수 있도록 값을 비운다.
                  event.target.value = "";
                }}
              />
            </div>

            <small className="formula-section">또는 내용을 그대로 붙여넣기</small>
            <textarea
              className="cycle-code"
              placeholder='{ "kind": "wuwa-cycle", ... }'
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value);
                setImportError("");
              }}
            />
            {importError && <pre className="cycle-error">{importError}</pre>}
            <div className="cycle-modal-actions">
              <button
                className="primary"
                disabled={importText.trim() === ""}
                onClick={() => {
                  const result = decodeCycle(importText);
                  if ("error" in result) {
                    setImportError(result.error);
                    return;
                  }
                  addCyclePreset(result.preset);
                  setImportOpen(false);
                }}
              >
                목록에 담기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 환경이 다를 때 물어보는 창 ── */}
      {confirming && (
        <div className="formula-backdrop" onClick={() => setConfirming(null)} role="presentation">
          <div className="formula-modal cycle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="formula-head">
              <div>
                <small>CHECK</small>
                <h3>지금 환경과 다릅니다</h3>
                <span>
                  담을 때와 지금이 달라, 켜둔 버프 가운데 일부는 지금 환경에 존재하지 않습니다.
                </span>
              </div>
              <button className="formula-close" onClick={() => setConfirming(null)}>
                ×
              </button>
            </div>

            {diffOf(confirming.preset).length > 0 && (
              <>
                <small className="formula-section">달라진 것</small>
                <ul className="cycle-diff">
                  {diffOf(confirming.preset).map((row) => (
                    <li key={row.member.characterId}>
                      <b>{row.member.characterName}</b>
                      <span>{row.changes.join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {confirming.orphans.length > 0 && (
              <>
                <small className="formula-section">
                  빠지는 버프 체크 {confirming.orphans.length}개
                </small>
                <ul className="cycle-diff">
                  {confirming.orphans.map((id) => {
                    const owner = ownerOf(id);
                    const name = characters.find((c) => c.id === owner)?.name;
                    return (
                      <li key={id}>
                        <b>{name ?? "—"}</b>
                        <span>
                          {originOf(id)}
                          <em>{id}</em>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="cycle-note">
                  이 체크들은 지금 환경에 없는 버프를 가리킵니다. 빼고 넣으면 루틴과 나머지 체크는
                  그대로 살아나고, 빠진 자리만 꺼진 채로 들어옵니다.
                </p>
              </>
            )}

            <div className="cycle-modal-actions">
              <button
                className="primary"
                onClick={() => {
                  applyCyclePreset(confirming.preset.id, confirming.orphans);
                  setConfirming(null);
                  setTab("calculator");
                }}
              >
                {confirming.orphans.length > 0 ? "빼고 넣기" : "그대로 넣기"}
              </button>
              <button onClick={() => setConfirming(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
