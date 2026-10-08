import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { usePersistedState } from "../../../utils/usePersistedState";

/**
 * 사이클 구성 줄(.rotation-rail)의 세 칸 크기 — 버프 창 너비 · 트리거 탑 너비 · 줄 높이.
 * 손대지 않은 칸은 비워 둔다. 그러면 styles.css의 기본값(clamp)이 그대로 쓰인다.
 */
export interface RailSizes {
  dock?: number;
  trig?: number;
  height?: number;
}

type RailPart = keyof RailSizes;

const CSS_VAR: Record<RailPart, string> = {
  dock: "--dock-w",
  trig: "--trig-w",
  height: "--rail-h",
};

const TITLE: Record<RailPart, string> = {
  dock: "끌어서 버프 창 너비 조절 · 두 번 누르면 원래대로",
  trig: "끌어서 트리거 칸 너비 조절 · 두 번 누르면 원래대로",
  height: "끌어서 높이 조절 · 두 번 누르면 원래대로",
};

/** 사이클 판이 이 너비 아래로 눌리지 않게 남겨 두는 자리. */
const PANEL_MIN = 320;

export function useRailSizes() {
  const [sizes, setSizes] = usePersistedState<RailSizes>("calc.railSizes", {});
  const style: Record<string, string> = {};
  for (const part of Object.keys(CSS_VAR) as RailPart[]) {
    const size = sizes[part];
    if (typeof size === "number") style[CSS_VAR[part]] = `${size}px`;
  }
  return { sizes, setSizes, style: style as CSSProperties };
}

/** 칸 사이 경계에 놓는 손잡이. .rotation-rail 바로 아래에 그려야 한다(자리를 그 줄의 변수로 잡는다). */
export function RailResizers({
  setSizes,
}: {
  setSizes: (update: (prev: RailSizes) => RailSizes) => void;
}) {
  const start = (part: RailPart) => (event: ReactPointerEvent<HTMLDivElement>) => {
    const handle = event.currentTarget;
    const rail = handle.parentElement;
    if (!rail) return;
    event.preventDefault();

    // 지금 화면에 그려진 크기에서 출발한다 — 기본값(clamp)이든 저장된 값이든 같다.
    const dock = rail.querySelector<HTMLElement>(".rotation-dock")?.offsetWidth ?? 0;
    const trig = rail.querySelector<HTMLElement>(".trigger-tower")?.offsetWidth ?? 0;
    // 높이는 판 제목 줄이 끼어 있어 그려진 크기로는 못 잰다 — 변수가 그대로 걸린 max-height를 읽는다.
    const wrap = rail.querySelector<HTMLElement>(".rotation-wrap");
    const height = (wrap && parseFloat(getComputedStyle(wrap).maxHeight)) || wrap?.offsetHeight || 0;
    const from = { dock, trig, height }[part];
    const origin = part === "height" ? event.clientY : event.clientX;
    // 두 칸이 합쳐서 줄 너비를 넘기면 사이클 판이 사라진다.
    const room = rail.clientWidth - PANEL_MIN - 40;
    const limit: Record<RailPart, [number, number]> = {
      dock: [220, Math.max(220, room - trig)],
      trig: [60, Math.max(60, Math.min(360, room - dock))],
      height: [160, Math.max(160, window.innerHeight - 160)],
    };

    const move = (e: PointerEvent) => {
      // 너비 손잡이는 칸의 왼쪽 변에 있어서 왼쪽으로 끌수록 넓어진다. 높이는 아래로 끌수록 커진다.
      const delta = part === "height" ? e.clientY - origin : origin - e.clientX;
      const [min, max] = limit[part];
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

  const reset = (part: RailPart) => () =>
    setSizes((prev) => {
      const next = { ...prev };
      delete next[part];
      return next;
    });

  return (
    <>
      {(Object.keys(CSS_VAR) as RailPart[]).map((part) => (
        <div
          key={part}
          className={`rail-resizer rail-resizer-${part}`}
          role="separator"
          aria-orientation={part === "height" ? "horizontal" : "vertical"}
          title={TITLE[part]}
          onPointerDown={start(part)}
          onDoubleClick={reset(part)}
        />
      ))}
    </>
  );
}
