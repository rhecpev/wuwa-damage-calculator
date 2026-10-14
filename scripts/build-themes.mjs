/**
 * 세피아 · 미드나잇 테마 색을 다크 · 라이트 블록에서 뽑아 styles.css에 다시 적는다.
 *
 *   node scripts/build-themes.mjs
 *
 * styles.css 머리의 두 블록(:root 다크, :root[data-theme="light"])이 원본이다.
 *   미드나잇 — 다크에서. 회색조 면을 더 어둡고 푸르게 가라앉힌다. 강조색은 그대로.
 *   세피아   — 라이트에서. 회색조를 누런 종이 빛으로 옮긴다. 강조색은 그대로.
 * 새 색 변수를 더했으면 다크 · 라이트 두 블록에 적고 이 스크립트를 돌리면 된다.
 *
 * 굿즈 앱(WuwaGoods)에서 가져온 테마 일곱도 여기서 뽑는다(아래 GOODS).
 *   그 앱은 테마마다 바탕 · 글자 · 강조 세 색만 정하고 나머지 면은 바탕과 글자 사이를 섞어 만든다
 *   (ui/theme/Theme.kt의 darkSchemeOf · lightSchemeOf). 여기서도 같은 식으로, 이 앱의 회색조 면 · 글자를
 *   그 테마의 바탕색과 글자색 사이에 명도 순서대로 다시 앉힌다. 강조색(금색)은 그 테마의 강조색으로 바꾼다.
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

const hex = (value) => {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * clamp(t)));
const lightness = (rgb) => toHsl(rgb)[2];

/**
 * 굿즈 앱의 테마. 바탕 · 글자 · 강조 세 색은 그 앱의 값 그대로다.
 * 그 앱의 세피아 · 미드나잇은 이 앱에 이미 같은 이름의 테마가 있어 가져오지 않았다.
 */
const GOODS = [
  { id: "gold", scheme: "dark", bg: "#0a0a0a", text: "#eeeeee", accent: "#f3e85a" },
  { id: "forest", scheme: "dark", bg: "#0c1710", text: "#e4f1e9", accent: "#5fd39b" },
  { id: "lavender", scheme: "dark", bg: "#141021", text: "#eae4fa", accent: "#b69cff" },
  { id: "ivory", scheme: "light", bg: "#fffaf0", text: "#3d2b00", accent: "#b8860b" },
  { id: "ocean", scheme: "light", bg: "#f1f8fb", text: "#0c2f3c", accent: "#0e7490" },
  { id: "rose", scheme: "light", bg: "#fff5f7", text: "#3f1023", accent: "#c2185b" },
  { id: "slate", scheme: "light", bg: "#f6f8fa", text: "#1e293b", accent: "#475569" },
];

/**
 * 회색조 색 하나를 그 테마의 바탕 ↔ 글자 사이에 다시 앉힌다.
 * 원본 블록에서 바탕(--c-242a39)과 글자(--c-e9edf5)의 명도를 재 두고, 그 사이 어디쯤인지를 그대로 옮긴다.
 * 색이 든 것(속성 색 · 꼬리표 색)은 건드리지 않는다 — 세피아 · 미드나잇과 같은 기준이다.
 */
const goodsRamp = (theme, source) => {
  const bg = hex(theme.bg);
  const text = hex(theme.text);
  const find = (name) => lightness(hex(source.find(([k]) => k === name)[1]));
  const bgL = find("--c-242a39");
  const textL = find("--c-e9edf5");
  const dark = theme.scheme === "dark";
  const end = dark ? [255, 255, 255] : [0, 0, 0];
  const far = dark ? [0, 0, 0] : [255, 255, 255];
  return (rgb) => {
    const [h, s, l] = toHsl(rgb);
    // 푸른 기가 도는 아주 어둡거나 아주 밝은 색은 채도가 있어도 면 · 글자로 본다
    // (이 앱의 바탕과 본문 글자가 그렇다 — 빼먹으면 글자색만 옛 푸른 흰색으로 남는다).
    const neutral = isBluish(h) && (l <= 0.25 || l >= 0.85);
    if (s > 0.35 && !neutral) return rgb;
    // 바탕보다 더 바탕 쪽(다크면 더 어두운, 라이트면 더 밝은) 면
    if (dark ? l <= bgL : l >= bgL) return mix(bg, far, dark ? 1 - l / bgL : (l - bgL) / (1 - bgL));
    // 글자보다 더 글자 쪽
    if (dark ? l >= textL : l <= textL) return mix(text, end, dark ? (l - textL) / (1 - textL) : 1 - l / textL);
    return mix(bg, text, (l - bgL) / (textL - bgL));
  };
};

/** 강조색 — 금색 변수와, 고른 칸의 바탕 · 테두리에 쓰는 금빛 어두운 면 둘을 그 테마의 강조색으로 바꾼다. */
const goodsAccent = (theme) => {
  const bg = hex(theme.bg);
  const accent = hex(theme.accent);
  return {
    "--c-e8c66a": theme.accent,
    "--rgb-e8c66a": accent.join(","),
    "--c-3f382b": toHex(mix(bg, accent, 0.16)),
    "--c-66543a": toHex(mix(bg, accent, 0.45)),
  };
};

const renderGoods = (theme, source) => {
  const fn = goodsRamp(theme, source);
  const accent = goodsAccent(theme);
  const body = source.map(([k, v]) => `${k}:${accent[k] ?? mapValue(v, fn)}`).join(";");
  return `:root[data-theme="${theme.id}"]{color-scheme:${theme.scheme};${body}}`;
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
  ...GOODS.map((theme) => renderGoods(theme, theme.scheme === "dark" ? dark : light)),
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
console.log(`sepia ${light.length} · midnight ${dark.length} 변수를 적었습니다 · 굿즈 테마 ${GOODS.map((t) => t.id).join(" ")}`);
