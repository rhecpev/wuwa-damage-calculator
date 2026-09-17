import { useState } from "react";

/**
 * 테마 — 다크 · 라이트 · 세피아 · 미드나잇.
 *
 * 색은 styles.css 머리의 변수 블록으로 갈린다 — html의 data-theme 값에 맞는 블록이 쓰인다
 * (다크는 기본 :root). 세피아 · 미드나잇 블록은 scripts/build-themes.mjs가 뽑는다.
 * 화면이 그려지기 전에 정해져야 번쩍이지 않으므로, 다른 설정(persist)처럼 비동기로 올리지 않고
 * localStorage에서 바로 읽는다. 고른 적이 없으면 기기 설정(prefers-color-scheme)을 따른다.
 */
export type Theme = "dark" | "light" | "sepia" | "midnight";

/**
 * swatch — 테마 고르개의 동그라미 색. 그 테마의 바탕색(--c-242a39)이다.
 * 변수로 쓰면 지금 테마 값이 나와 넷이 같은 색이 되므로 값을 그대로 적는다.
 * styles.css의 테마 블록(세피아 · 미드나잇은 build-themes.mjs)을 바꾸면 여기도 맞춘다.
 */
export const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: "dark", label: "다크", swatch: "#232731" },
  { id: "light", label: "라이트", swatch: "#ced3e1" },
  { id: "sepia", label: "세피아", swatch: "#dfd3ba" },
  { id: "midnight", label: "미드나잇", swatch: "#101422" },
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
    setThemeState(next);
  };

  return { theme, setTheme };
}
