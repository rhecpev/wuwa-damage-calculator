import { useState, useSyncExternalStore } from "react";
import { loadPersisted, savePersisted } from "./persist";

/**
 * 테마 — 다크 · 라이트 · 세피아 · 미드나잇, 그리고 굿즈 앱에서 가져온 일곱.
 *
 * 색은 styles.css 머리의 변수 블록으로 갈린다 — html의 data-theme 값에 맞는 블록이 쓰인다
 * (다크는 기본 :root). 세피아 · 미드나잇 블록은 scripts/build-themes.mjs가 뽑는다.
 * 화면이 그려지기 전에 정해져야 번쩍이지 않으므로, 다른 설정(persist)처럼 비동기로 올리지 않고
 * localStorage에서 바로 읽는다. 고른 적이 없으면 기기 설정(prefers-color-scheme)을 따른다.
 */
export type Theme =
  | "dark"
  | "light"
  | "sepia"
  | "midnight"
  // 굿즈 앱(WuwaGoods)에서 가져온 테마 — 바탕 · 글자 · 강조 세 색이 그 앱의 값이다(scripts/build-themes.mjs의 GOODS).
  | "gold"
  | "forest"
  | "lavender"
  | "ivory"
  | "ocean"
  | "rose"
  | "slate";

/**
 * swatch — 테마 고르개의 동그라미 색. 그 테마의 바탕색(--c-242a39)이다.
 * 변수로 쓰면 지금 테마 값이 나와 넷이 같은 색이 되므로 값을 그대로 적는다.
 * styles.css의 테마 블록(세피아 · 미드나잇은 build-themes.mjs)을 바꾸면 여기도 맞춘다.
 */
export const THEMES: { id: Theme; label: string; swatch: string; scheme: "dark" | "light" }[] = [
  { id: "dark", label: "다크", swatch: "#232731", scheme: "dark" },
  { id: "light", label: "라이트", swatch: "#ced3e1", scheme: "light" },
  { id: "sepia", label: "세피아", swatch: "#dfd3ba", scheme: "light" },
  { id: "midnight", label: "미드나잇", swatch: "#101422", scheme: "dark" },
  // 굿즈 앱 테마 — 바탕만으로는 서로 닮아(검정 · 흰색 계열) 동그라미를 바탕과 강조색 반반으로 칠한다.
  { id: "gold", label: "블랙 골드", swatch: "linear-gradient(135deg,#0a0a0a 50%,#f3e85a 50%)", scheme: "dark" },
  { id: "forest", label: "포레스트", swatch: "linear-gradient(135deg,#0c1710 50%,#5fd39b 50%)", scheme: "dark" },
  { id: "lavender", label: "라벤더", swatch: "linear-gradient(135deg,#141021 50%,#b69cff 50%)", scheme: "dark" },
  { id: "ivory", label: "아이보리", swatch: "linear-gradient(135deg,#fffaf0 50%,#b8860b 50%)", scheme: "light" },
  { id: "ocean", label: "오션", swatch: "linear-gradient(135deg,#f1f8fb 50%,#0e7490 50%)", scheme: "light" },
  { id: "rose", label: "로즈", swatch: "linear-gradient(135deg,#fff5f7 50%,#c2185b 50%)", scheme: "light" },
  { id: "slate", label: "슬레이트", swatch: "linear-gradient(135deg,#f6f8fa 50%,#475569 50%)", scheme: "light" },
];

const KEY = "theme";

const isTheme = (value: unknown): value is Theme => THEMES.some((t) => t.id === value);

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // 저장소를 못 쓰면 기기 설정만 본다.
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  // 밝은 계열 전용 규칙(옅은 그림자 · 아이콘 뒤집기)은 테마 이름이 아니라 이 명암으로 건다(styles.css).
  document.documentElement.dataset.scheme = THEMES.find((t) => t.id === theme)?.scheme ?? "dark";
}

/** 앱이 뜨기 전에 한 번 부른다. */
export function initTheme() {
  applyTheme(initialTheme());
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const current = document.documentElement.dataset.theme;
    return isTheme(current) ? current : initialTheme();
  });

  const setTheme = (next: Theme) => {
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // 저장이 안 돼도 이번 화면에서는 바뀐다.
    }
    savePersisted(KEY, next);
    setThemeState(next);
  };

  return { theme, setTheme };
}

/**
 * 디자인 — 네모나게(대미지 계산 2에서 만든 각진 꼴, 기본)와 둥글게(이전 디자인 그대로).
 * 둥글게면 탭들이 .c2 껍데기 없이 원래 페이지를 그리고, 계산 탭은 원래 계산 화면(CalculatorPage)을 쓴다.
 * 여러 컴포넌트가 같은 값을 봐야 해서 모듈 하나에 두고 바뀌면 알린다. 테마처럼 localStorage에서 바로 읽는다.
 */
export type Shape = "square" | "round";

export const SHAPES: { id: Shape; label: string; hint: string }[] = [
  { id: "square", label: "네모나게", hint: "새 디자인 · 기본" },
  { id: "round", label: "둥글게", hint: "이전 디자인" },
];

const SHAPE_KEY = "shape";
let currentShape: Shape = "square";
const shapeListeners = new Set<() => void>();

export function initShape() {
  try {
    if (localStorage.getItem(SHAPE_KEY) === "round") currentShape = "round";
  } catch {
    // 저장소를 못 쓰면 기본값.
  }
  document.documentElement.dataset.shape = currentShape;
}

function setShape(next: Shape) {
  currentShape = next;
  document.documentElement.dataset.shape = next;
  try {
    localStorage.setItem(SHAPE_KEY, next);
  } catch {
    // 저장이 안 돼도 이번 화면에서는 바뀐다.
  }
  savePersisted(SHAPE_KEY, next);
  shapeListeners.forEach((listener) => listener());
}

const subscribeShape = (listener: () => void) => {
  shapeListeners.add(listener);
  return () => shapeListeners.delete(listener);
};

export function useShape() {
  const shape = useSyncExternalStore(subscribeShape, () => currentShape);
  return { shape, setShape };
}

/**
 * 색 · 모양을 앱 저장(persist — 개발 서버 파일 · 고른 파일 · 브라우저)에도 담는다.
 * 첫 화면은 번쩍이지 않게 위의 localStorage 값으로 먼저 칠하고, hydrate()가 끝나면 여기서 저장값으로 맞춘다.
 * 저장값이 없으면(처음 쓰는 사람 · 이 기능 전의 저장 파일) 지금 값을 담아 둔다.
 */
export function syncAppearance() {
  const savedTheme = loadPersisted<unknown>(KEY, null);
  if (isTheme(savedTheme)) {
    applyTheme(savedTheme);
    try {
      localStorage.setItem(KEY, savedTheme);
    } catch {
      // 이번 화면에는 이미 칠했다.
    }
  } else {
    const current = document.documentElement.dataset.theme;
    if (isTheme(current)) savePersisted(KEY, current);
  }

  const savedShape = loadPersisted<unknown>(SHAPE_KEY, null);
  if (savedShape === "square" || savedShape === "round") setShape(savedShape);
  else savePersisted(SHAPE_KEY, currentShape);
}
