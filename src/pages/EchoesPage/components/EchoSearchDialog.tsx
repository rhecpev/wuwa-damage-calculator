import { useMemo } from "react";
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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(22,26,36,0.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#434343",
          padding: "20px",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "500px",
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, color: "#fff" }}>에코 검색</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#ccc" }}
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          placeholder="에코 이름으로 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "0",
            border: "1px solid #585858",
            borderTopLeftRadius: "4px",
            borderTopRightRadius: "4px",
            boxSizing: "border-box",
            fontSize: "14px",
            background: "#505050",
            color: "#fff",
          }}
        />

        <div
          style={{
            border: "1px solid #585858",
            borderTop: "none",
            borderBottomLeftRadius: "4px",
            borderBottomRightRadius: "4px",
            maxHeight: "300px",
            overflowY: "auto",
            background: "#4a4a4a",
          }}
        >
          {echoes
            .filter((echo) => echo.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((echo) => (
              <div
                key={echo.id}
                onClick={() => {
                  const rawEcho = (echoData as any).Echo.find((e: any) => String(e.Id) === echo.id);
                  if (rawEcho) {
                    onSelectEcho({
                      ...echo,
                      iconUrl: rawEcho.Icon,
                      fetterGroups: rawEcho.FetterGroups?.map((fg: any) => ({name: fg.Name, icon: fg.Icon})) || [],
                    } as any);
                    onClose();
                  }
                }}
                style={{
                  padding: "12px",
                  borderBottom: "1px solid #585858",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#505050")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#4a4a4a")}
              >
                {echo.iconUrl && (
                  <img
                    src={echo.iconUrl}
                    alt={echo.name}
                    style={{ width: "32px", height: "32px", flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <strong style={{ color: "#fff" }}>{echo.name}</strong>
                  {/* 같은 이름이 여러 벌인 에코가 있다 — 어느 것인지 도감 id로 가른다.
                      목록에서 뺀 것과 남은 것이 이름만 같은 경우가 많아 id가 없으면 헷갈린다. */}
                  <span style={{ color: "#9aa3b3", fontSize: "11px", marginLeft: "6px" }}>
                    #{echo.id}
                  </span>
                  {echo.fetterGroups && echo.fetterGroups.length > 0 && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                      {echo.fetterGroups.map((fg, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "#585858",
                            padding: "4px 8px",
                            borderRadius: "3px",
                            fontSize: "12px",
                          }}
                        >
                          {fg.icon && (
                            <img src={fg.icon} alt="" style={{ width: "16px", height: "16px" }} />
                          )}
                          <span style={{ color: "#ccc" }}>{fg.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          {echoes.filter((echo) => echo.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
            <div style={{ padding: "12px", color: "#727272", textAlign: "center" }}>
              검색 결과가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
