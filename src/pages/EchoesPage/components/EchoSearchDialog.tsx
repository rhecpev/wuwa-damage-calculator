import { useMemo, useState } from "react";
import type { Echo } from "../../../types/game";
import echoData from "../../../data/echo.json";
import { isExcludedEcho } from "../../../data/echoExcludes";

/**
 * 고를 수 있는 에코 목록.
 *
 * 「목록에서 뺀 에코」는 화면에서 손으로 바뀔 수 있어서 모듈이 뜰 때 한 번 만들면 안 된다
 * — 뺀 직후 바로 사라지도록 부를 때마다 새로 만든다(호출부에서 useMemo로 묶는다).
 */
const buildEchoes = (): Echo[] => Array.from(
  new Map(
    ((echoData as any).Echo || [])
      // 목록에서 빼기로 한 에코(새알심 · 「이상」 중복)는 고를 수 없게 한다.
      .filter((e: any) => !isExcludedEcho(e.Id))
      .map((e: any) => ({
        id: String(e.Id),
        name: e.Name,
        cost: e.PhantomType || 1,
        stats: {},
        effects: e.FetterGroups?.[0]?.Name ? [e.FetterGroups[0].Name] : [],
        iconUrl: e.Icon,
        fetterGroups: e.FetterGroups?.map((fg: any) => ({ name: fg.Name, icon: fg.Icon })) || [],
      }))
      .map((echo: Echo) => [echo.id, echo])
  ).values()
) as Echo[];

interface EchoSearchDialogProps {
  isOpen: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  onSelectEcho: (echo: Echo) => void;
}

export function EchoSearchDialog({
  isOpen,
  searchQuery,
  onSearchChange,
  onClose,
  onSelectEcho,
}: EchoSearchDialogProps) {
  // 제외 목록이 고정이라 한 번만 만들면 된다.
  const echoes = useMemo(() => buildEchoes(), []);
  // 화음 세트로 거른다. ""이면 전체. 창을 닫았다 열어도 남는다 — 같은 세트를 이어서 담기 좋게.
  const [fetter, setFetter] = useState("");
  // 세트 고르개가 펼쳐져 있는지. 옵션에 아이콘을 넣으려고 <select> 대신 직접 그린다.
  const [fetterOpen, setFetterOpen] = useState(false);

  /** 고를 수 있는 화음 세트(이름 · 아이콘) — 에코 목록에 나오는 순서대로. */
  const fetters = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const echo of echoes)
      for (const fg of echo.fetterGroups ?? []) if (!map.has(fg.name)) map.set(fg.name, fg.icon);
    return Array.from(map, ([name, icon]) => ({ name, icon }));
  }, [echoes]);

  if (!isOpen) return null;

  const picked = fetters.find((f) => f.name === fetter);
  const pickFetter = (name: string) => {
    setFetter(name);
    setFetterOpen(false);
  };

  const needle = searchQuery.trim().toLowerCase();
  const shown = echoes.filter(
    (echo) =>
      echo.name.toLowerCase().includes(needle) &&
      (!fetter || (echo.fetterGroups ?? []).some((fg) => fg.name === fetter)),
  );

  return (
    <div className="dialog-backdrop echo-pick-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog echo-pick"
        onClick={(e) => {
          e.stopPropagation();
          // 창 안의 다른 곳을 누르면 세트 고르개를 접는다.
          setFetterOpen(false);
        }}
      >
        <div className="echo-pick-head">
          <h3>에코 검색</h3>
          <button className="echo-pick-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <input
          type="text"
          className="echo-pick-input"
          placeholder="에코 이름으로 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          autoFocus
        />
        {/* 화음 세트로 거르기 — 그 세트에 드는 에코만 남긴다. */}
        <div className="echo-pick-set" onClick={(e) => e.stopPropagation()}>
          <button
            className="echo-pick-input echo-pick-set-button"
            aria-haspopup="listbox"
            aria-expanded={fetterOpen}
            onClick={() => setFetterOpen((open) => !open)}
          >
            {picked?.icon && <img src={picked.icon} alt="" />}
            <span>{picked?.name ?? "화음 세트 전체"}</span>
            <i>▾</i>
          </button>
          {fetterOpen && (
            <div className="echo-pick-set-list" role="listbox">
              <button role="option" aria-selected={!fetter} className={fetter ? undefined : "on"} onClick={() => pickFetter("")}>
                <span>화음 세트 전체</span>
              </button>
              {fetters.map((f) => (
                <button
                  key={f.name}
                  role="option"
                  aria-selected={f.name === fetter}
                  className={f.name === fetter ? "on" : undefined}
                  onClick={() => pickFetter(f.name)}
                >
                  {f.icon && <img src={f.icon} alt="" loading="lazy" />}
                  <span>{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pick-grid echo-pick-grid">
          {shown.map((echo) => (
            <button
              key={echo.id}
              className="pick-card"
              title={[echo.name, ...(echo.fetterGroups ?? []).map((fg) => fg.name)].join("\n")}
              onClick={() => {
                onSelectEcho(echo);
                onClose();
              }}
            >
              {echo.iconUrl && <img src={echo.iconUrl} alt="" loading="lazy" />}
              <b>{echo.name}</b>
              {echo.fetterGroups && echo.fetterGroups.length > 0 && (
                <span className="echo-pick-fetters">
                  {echo.fetterGroups.map((fg, idx) =>
                    fg.icon ? <img key={idx} src={fg.icon} alt={fg.name} loading="lazy" /> : null,
                  )}
                </span>
              )}
            </button>
          ))}
          {shown.length === 0 && <p className="echo-pick-empty">검색 결과가 없습니다</p>}
        </div>
      </div>
    </div>
  );
}
