import { useState } from "react";

/**
 * 라이트 · 다크 테마.
 *
 * 색은 styles.css 머리의 변수 두 벌로 갈린다 — html에 data-theme="light"가 붙으면 라이트 값.
 * 화면이 그려지기 전에 정해져야 번쩍이지 않으므로, 다른 설정(persist)처럼 비동기로 올리지 않고
 * localStorage에서 바로 읽는다. 고른 적이 없으면 기기 설정(prefers-color-scheme)을 따른다.
 */
export type Theme = "light" | "dark";

const KEY = "theme";

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
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
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme | undefined) ?? initialTheme(),
  );

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // 저장이 안 돼도 이번 화면에서는 바뀐다.
    }
    setTheme(next);
  };

  return { theme, toggle };
}
