/**
 * 세피아 · 미드나잇 테마 색을 다크 · 라이트 블록에서 뽑아 styles.css에 다시 적는다.
 *
 *   node scripts/build-themes.mjs
 *
 * styles.css 머리의 두 블록(:root 다크, :root[data-theme="light"])이 원본이다.
 *   미드나잇 — 다크에서. 회색조 면을 더 어둡고 푸르게 가라앉힌다. 강조색은 그대로.
 *   세피아   — 라이트에서. 회색조를 누런 종이 빛으로 옮긴다. 강조색은 그대로.
 * 새 색 변수를 더했으면 다크 · 라이트 두 블록에 적고 이 스크립트를 돌리면 된다.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../src/styles.css", import.meta.url);
const css = readFileSync(FILE, "utf8");

const block = (selector) => {
  const start = css.indexOf(`${selector}{`);
  if (start < 0) throw new Error(`${selector} 블록이 없습니다`);
  const body = css.slice(start + selector.length + 1, css.indexOf("}", start));
  return body
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair.startsWith("--"))
    .map((pair) => {
      const i = pair.indexOf(":");
      return [pair.slice(0, i), pair.slice(i + 1)];
    });
};

const toHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};

const toRgb = ([h, s, l]) => {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255));
};

const clamp = (v) => Math.max(0, Math.min(1, v));

/** 값 하나(#hex 또는 r,g,b)를 바꾼다. */
const mapValue = (value, fn) => {
  if (value.startsWith("#")) {
    const n = parseInt(value.slice(1), 16);
    const rgb = fn([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
    return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }
  const parts = value.split(",").map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) return fn(parts).join(",");
  return value;
};

const isBluish = (h) => h >= 190 && h <= 260;

/** 미드나잇 — 회색조 면은 어둡고 푸르게, 밝은 글자는 살짝 푸르게. */
const midnight = (rgb) => {
  const [h, s, l] = toHsl(rgb);
  // 푸른 기가 도는 아주 어두운 면은 채도가 있어도 면으로 본다(초록 · 빨강 꼬리표 바탕은 그대로).
  if (s > 0.35 && !(l <= 0.25 && isBluish(h))) return rgb;
  if (l < 0.5) return toRgb([228, clamp(s + 0.2), l * 0.6]);
  return toRgb([222, clamp(s + 0.08), l]);
};

/** 세피아 — 회색조를 누런 종이 빛으로. 밝은 면은 조금 더 가라앉혀 눈부시지 않게. */
const sepia = (rgb) => {
  const [h, s, l] = toHsl(rgb);
  // 푸른 기가 도는 아주 밝은 면은 채도가 있어도 면으로 본다(초록 · 빨강 꼬리표 바탕은 그대로).
  if (s > 0.35 && !(l >= 0.85 && isBluish(h))) return rgb;
  if (l > 0.55) return toRgb([40, clamp(0.3 + s * 0.3), clamp(l * 0.95)]);
  return toRgb([28, clamp(0.28 + s * 0.3), l * 0.95]);
};

const render = (selector, scheme, pairs, fn) =>
  `${selector}{color-scheme:${scheme};${pairs.map(([k, v]) => `${k}:${mapValue(v, fn)}`).join(";")}}`;

const dark = block(":root");
const light = block(':root[data-theme="light"]');

const START = "/* @generated themes — scripts/build-themes.mjs */";
const END = "/* @end generated themes */";
const generated = [
  START,
  render(':root[data-theme="sepia"]', "light", light, sepia),
  render(':root[data-theme="midnight"]', "dark", dark, midnight),
  END,
].join("\n");

let next;
if (css.includes(START)) {
  next = css.slice(0, css.indexOf(START)) + generated + css.slice(css.indexOf(END) + END.length);
} else {
  // 라이트 블록 바로 아래에 넣는다.
  const lightStart = css.indexOf(':root[data-theme="light"]{');
  const lineEnd = css.indexOf("\n", lightStart);
  next = `${css.slice(0, lineEnd + 1)}${generated}\n${css.slice(lineEnd + 1)}`;
}
writeFileSync(FILE, next);
console.log(`sepia ${light.length} · midnight ${dark.length} 변수를 적었습니다`);
