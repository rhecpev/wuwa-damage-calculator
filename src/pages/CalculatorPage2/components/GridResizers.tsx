import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { usePersistedState } from "../../../utils/usePersistedState";

/**
 * 사이클 구성 줄(.c2-grid)의 크기 — 오른쪽 공격 추가 자리의 너비와 사이클 표의 높이.
 * 손대지 않은 것은 비워 둔다. 그러면 calc2.css의 기본값이 그대로 쓰인다.
 */
export interface GridSizes {
  side?: number;
  height?: number;
}

type GridPart = keyof GridSizes;

const CSS_VAR: Record<GridPart, string> = {
  side: "--side-w",
  height: "--table-h",
};

const TITLE: Record<GridPart, string> = {
  side: "끌어서 공격 추가 너비 조절 · 두 번 누르면 원래대로",
  height: "끌어서 표 높이 조절 · 두 번 누르면 원래대로",
};

/** 사이클 표가 이 너비 아래로 눌리지 않게 남겨 두는 자리. */
const TABLE_MIN = 420;

export function useGridSizes() {
  const [sizes, setSizes] = usePersistedState<GridSizes>("calc2.gridSizes", {});
  const style: Record<string, string> = {};
  for (const part of Object.keys(CSS_VAR) as GridPart[]) {
    const size = sizes[part];
    if (typeof size === "number") style[CSS_VAR[part]] = `${size}px`;
  }
  return { setSizes, style: style as CSSProperties };
}

/**
 * 경계에 놓는 손잡이 하나. 둘 다 .c2-grid 안에 그려야 한다(끄는 동안 그 줄에서 지금 크기를 잰다).
 *   side   — 표와 공격 추가 사이의 세로 경계. 왼쪽으로 끌수록 공격 추가가 넓어진다.
 *   height — 줄 아래의 가로 경계. 아래로 끌수록 표가 높아진다.
 * 두 번 누르면 그 크기만 원래대로 돌아간다.
 */
export function GridResizer({
  part,
  setSizes,
}: {
  part: GridPart;
  setSizes: (update: (prev: GridSizes) => GridSizes) => void;
}) {
  const start = (event: ReactPointerEvent<HTMLDivElement>) => {
    const handle = event.currentTarget;
    const grid = handle.closest<HTMLElement>(".c2-grid");
    if (!grid) return;
    event.preventDefault();

    // 지금 화면에 그려진 크기에서 출발한다 — 기본값이든 저장된 값이든 같다.
    const from =
      part === "side"
        ? (grid.querySelector<HTMLElement>(".c2-side")?.offsetWidth ?? 0)
        : (grid.querySelector<HTMLElement>(".c2-table")?.offsetHeight ?? 0);
    const origin = part === "side" ? event.clientX : event.clientY;
    const [min, max] =
      part === "side"
        ? [300, Math.max(300, grid.clientWidth - TABLE_MIN)]
        : [140, Math.max(140, window.innerHeight - 140)];

    const move = (e: PointerEvent) => {
      const delta = part === "side" ? origin - e.clientX : e.clientY - origin;
      const next = Math.round(Math.min(max, Math.max(min, from + delta)));
      setSizes((prev) => ({ ...prev, [part]: next }));
    };
    const stop = () => {
      handle.classList.remove("dragging");
      document.body.classList.remove("rail-resizing");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    handle.classList.add("dragging");
    document.body.classList.add("rail-resizing");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  };

  const reset = () =>
    setSizes((prev) => {
      const next = { ...prev };
      delete next[part];
      return next;
    });

  return (
    <div
      className={`c2-resizer c2-resizer-${part}`}
      role="separator"
      aria-orientation={part === "height" ? "horizontal" : "vertical"}
      title={TITLE[part]}
      onPointerDown={start}
      onDoubleClick={reset}
    />
  );
}
