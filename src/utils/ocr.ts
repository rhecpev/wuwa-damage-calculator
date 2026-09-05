import { createWorker, PSM, type Worker } from "tesseract.js";
import echoOptionData from "../data/echoOption.json";
import echoData from "../data/echo.json";
import iconSignatures from "../data/iconSignatures.json";
import characterApiIds from "../data/characterApiIds.json";
import { isExcludedEcho } from "../data/echoExcludes";
import {
  CHARACTER_GRID,
  ECHO_GRID,
  FETTER_GRID,
  artDistance,
  artSignature,
  decodeSignature,
  pickClosest,
  portraitDistance,
  portraitSignature,
} from "./iconSignature";

/**
 * 스크린샷에서 글자를 읽어 오는 공용 도구.
 *
 * 에코 한 장 등록(에코 관리)과 디스코드 프로필 카드 등록이 같은 규칙을 쓴다.
 * 실제 사진 여러 장으로 맞춰 본 결과가 아래 세 가지다.
 *
 * ① **제목과 표는 손질이 서로 다르다.**
 *    표(옵션 줄)는 **원본 그대로**가 제일 정확하다. 키우면 오히려 「공명스킬」이
 *    「ZH AZ」로 깨진다. 반대로 제목 글자는 작아서 원본으로는 통째로 깨진다
 *    (「안개 수존」 → 「바순 . : ,-3965」). 그래서 제목만 잘라 2배로 키워 따로 읽는다.
 * ② **PSM은 SINGLE_COLUMN이 기본이다.** 기본값(AUTO)이나 SINGLE_BLOCK은 「크리티컬 피해」를
 *    「크리티컬 mje」로 읽는다. 잘라 낸 제목 조각도 SINGLE_LINE이 아니라 SINGLE_COLUMN이
 *    맞다 — 조각에 제목과 COST 두 줄이 같이 들어오기 때문이다.
 *    다만 **프로필 카드의 에코 칸만은 두 방식으로 두 번 읽어 합친다** — 서로 놓치는
 *    데가 달라서다(readRowsBothWays 설명 참고).
 * ③ **숫자는 되도록 OCR에 묻지 않는다.** 값이 표에 정해져 있으므로 표에서 되찾는다.
 *    특히 주옵션·메인 서브옵션은 **COST가 값을 완전히 결정**한다 — OCR이 150을 120으로
 *    읽어도 COST 4면 150이다.
 */

/** 기호·공백을 전부 지운 비교용 키. OCR이 「·」를 「ㆍ」로 읽거나 띄어쓰기를 흘려도 붙는다. */
export const normKey = (s: string): string => String(s).replace(/[^0-9a-zA-Z가-힣]/g, "");

/** COST가 정하는 것 — 값 목록에서 몇 번째를 쓰는지. 4코스트가 0번, 3코스트가 1번, 1코스트가 2번. */
const TIER: Record<number, number> = { 4: 0, 3: 1, 1: 2 };

export interface EchoOptionTables {
  mainOption: Record<string, string[]>;
  mainSubOption: Record<string, string[]>;
  subOption: Record<string, string[]>;
}
export const OPTIONS = echoOptionData as unknown as EchoOptionTables;

export interface CatalogEcho {
  Id: number;
  Name: string;
  Icon?: string;
}
export const CATALOG = (echoData as { Echo: CatalogEcho[] }).Echo;

/** 화음(세트) 목록까지 들고 있는 도감. 그림으로 에코를 가릴 때 쓴다. */
interface CatalogEchoFull extends CatalogEcho {
  FetterGroups?: { Name: string; Icon?: string }[];
}
const CATALOG_FULL = (echoData as { Echo: CatalogEchoFull[] }).Echo;

// ─────────────────────────── 이미지 손질 ───────────────────────────

export const loadImage = (src: Blob | string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    img.onload = () => {
      if (typeof src !== "string") URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });

/** 잘라 낼 자리. 0~1 비율로 적는다 — 사진 크기가 달라도 같은 값을 쓸 수 있다. */
export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 잘라내고 · 키우고 · 흑백으로 바꾼 캔버스를 만든다.
 * scale 1에 grayscale false면 원본 그대로다(표를 읽을 때 그렇게 쓴다).
 */
export function prepare(
  img: HTMLImageElement,
  {
    region,
    scale = 1,
    grayscale = false,
  }: { region?: Region; scale?: number; grayscale?: boolean } = {},
): HTMLCanvasElement {
  const r = region ?? { x: 0, y: 0, w: 1, h: 1 };
  const sx = Math.round(img.naturalWidth * r.x);
  const sy = Math.round(img.naturalHeight * r.y);
  const sw = Math.max(1, Math.round(img.naturalWidth * r.w));
  const sh = Math.max(1, Math.round(img.naturalHeight * r.h));

  const canvas = document.createElement("canvas");
  canvas.width = sw * scale;
  canvas.height = sh * scale;
  const ctx = canvas.getContext("2d")!;
  // 키울 때 뭉개지 않는다 — 글자 획이 흐려지면 OCR이 더 못 읽는다.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  if (grayscale) {
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = px.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = g;
      d[i + 1] = g;
      d[i + 2] = g;
    }
    ctx.putImageData(px, 0, 0);
  }
  return canvas;
}

// ─────────────────────────── OCR ───────────────────────────

let worker: Worker | null = null;
let ready: Promise<Worker> | null = null;

/** 워커는 한 번만 만든다. 언어 데이터를 받아오는 데 몇 초 걸려서 매번 만들면 느리다. */
async function getWorker(): Promise<Worker> {
  if (worker) return worker;
  if (!ready) ready = createWorker("kor+eng").then((w) => (worker = w));
  return ready;
}

/** 다 쓰고 나서 부른다. 안 불러도 되지만 메모리를 잡고 있다. */
export async function disposeOcr(): Promise<void> {
  if (worker) await worker.terminate();
  worker = null;
  ready = null;
}

/** 글자를 읽어 빈 줄을 뺀 줄 목록으로 돌려준다. */
export async function readLines(
  canvas: HTMLCanvasElement,
  psm: PSM = PSM.SINGLE_COLUMN,
): Promise<string[]> {
  const w = await getWorker();
  await w.setParameters({ tessedit_pageseg_mode: psm });
  const { data } = await w.recognize(canvas);
  return data.text.split("\n").filter((line) => line.trim());
}

export { PSM };

/** 좌표로 묶은 한 줄. 이름 쪽과 숫자 쪽을 따로 들고 있다. */
export interface TextRow {
  text: string;
  /** 숫자를 뺀 앞부분에서 기호·공백을 지운 것. 옵션 이름을 찾을 때 쓴다. */
  name: string;
  /** 줄 끝의 숫자. 없으면 null. */
  value: number | null;
  pct: boolean;
  /** 줄이 놓인 자리. 프로필 카드의 스킬 노드처럼 자리로 뜻이 갈리는 곳에서 쓴다. */
  x: number;
  y: number;
}

/**
 * 글자를 **좌표로 묶어** 줄을 만든다.
 *
 * 줄 단위 텍스트(readLines)를 그대로 믿으면 위험하다 — 카드가 좁으면 Tesseract가
 * 왼쪽 이름들을 먼저 한 덩어리로, 오른쪽 숫자들을 그 뒤에 따로 뱉는다. 그러면
 * 「공격력 18%」가 「공명 효율 = 18%」로 붙어 버린다.
 * 단어마다 자리가 나오므로 같은 높이에 있는 것끼리 묶으면 그 사고가 사라진다.
 */
export async function readRows(
  canvas: HTMLCanvasElement,
  psm: PSM = PSM.SINGLE_COLUMN,
): Promise<TextRow[]> {
  const w = await getWorker();
  await w.setParameters({ tessedit_pageseg_mode: psm });
  const { data } = await w.recognize(canvas, {}, { blocks: true });

  const words: { text: string; x: number; y: number; h: number }[] = [];
  for (const block of data.blocks ?? [])
    for (const para of block.paragraphs)
      for (const line of para.lines)
        for (const word of line.words) {
          const t = word.text.trim();
          if (t) {
            const { x0, y0, y1 } = word.bbox;
            words.push({ text: t, x: x0, y: (y0 + y1) / 2, h: y1 - y0 });
          }
        }
  if (words.length === 0) return [];

  // 글자 높이의 절반쯤 벌어지면 다른 줄로 본다. 사진 크기에 따라 자동으로 정해진다.
  const gap = (words.reduce((sum, x) => sum + x.h, 0) / words.length) * 0.6;
  words.sort((a, b) => a.y - b.y || a.x - b.x);

  const groups: (typeof words)[] = [];
  for (const word of words) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(word.y - last[0].y) <= gap) last.push(word);
    else groups.push([word]);
  }

  return groups.map((g) => {
    const text = [...g].sort((a, b) => a.x - b.x).map((x) => x.text).join(" ");
    const v = readValue(text);
    return {
      text,
      name: normKey(v.value === null ? text : text.slice(0, v.at)),
      value: v.value,
      pct: v.pct,
      x: Math.min(...g.map((w) => w.x)),
      y: g[0].y,
    };
  });
}

/**
 * 같은 자리를 **두 가지 방식으로 읽어 좋은 쪽을 남긴다.**
 *
 * 프로필 카드의 에코 칸은 「왼쪽 이름 · 오른쪽 숫자」로 벌어져 있어서 한 방식으로는
 * 늘 어딘가를 놓친다. 실제 카드 다섯 장으로 재 본 결과가 이렇다 —
 *   SINGLE_COLUMN  이름은 잘 읽는데, 칸에 따라 **오른쪽 숫자를 통째로 버린다**
 *                  (「인멸 프리즘」 자리에서 부옵션이 한 줄도 안 나오던 원인이다)
 *   SINGLE_BLOCK   숫자는 잘 붙는데, 주옵션 줄을 통째로 놓치는 칸이 있다
 * 서로 놓치는 데가 달라서, 두 번 읽고 **줄 높이로 짝지어** 나은 쪽을 고르면 둘 다 산다.
 */
export async function readRowsBothWays(canvas: HTMLCanvasElement): Promise<TextRow[]> {
  const column = await readRows(canvas, PSM.SINGLE_COLUMN);
  const block = await readRows(canvas, PSM.SINGLE_BLOCK);

  // 값이 있는 줄이 이긴다. 둘 다 있으면 **이름이 긴 쪽**이다 — 글자 길이로 고르면
  // 「크 리 티 컬 피 해」처럼 띄어 읽힌 쪽이 이겨서 이름이 도리어 나빠진다.
  // 이름까지 같으면 잡글자가 적은 쪽을 남긴다(화면에 「읽은 글자」로 그대로 보여 준다).
  const better = (a: TextRow, b: TextRow) => {
    if ((a.value === null) !== (b.value === null)) return a.value === null ? b : a;
    if (a.name.length !== b.name.length) return b.name.length > a.name.length ? b : a;
    return b.text.length < a.text.length ? b : a;
  };

  const merged: TextRow[] = [];
  for (const row of [...column, ...block]) {
    // 같은 줄인지는 높이로 본다. 글자 한 줄 높이의 절반이면 충분하다.
    const twin = merged.findIndex((m) => Math.abs(m.y - row.y) <= 12);
    if (twin < 0) merged.push(row);
    else merged[twin] = better(merged[twin], row);
  }
  return merged.sort((a, b) => a.y - b.y);
}

// ─────────────────────────── 옵션 표 맞추기 ───────────────────────────

/**
 * 옵션 이름을 「줄 안에 들어 있는지」로 찾는다.
 *
 * 줄 앞의 아이콘이 X · 2 · ※ 같은 글자로 읽히기 때문에, 앞에서부터 정확히 맞추면 늘 실패한다.
 * 가장 긴 이름이 이긴다 — 「크리티컬」이 「크리티컬 피해」를 가로채지 않게 하려는 것이다.
 * %는 따로 본다. 표에 「방어력」과 「방어력(%)」가 둘 다 있어서, %를 지우고 비교하면
 * 10.0%가 깡방어력으로 붙어 버린다.
 */
/**
 * 줄 끝의 숫자와 % 여부를 꺼낸다.
 *
 * OCR이 **「%」를 「96」으로 읽는 일이 잦다** — 12.8% → 12.896, 44% → 4496.
 * 숫자 뒤에 96이 더 붙어 있으면 그건 값이 아니라 %다. 그냥 두면
 * 12.896이 「깡 방어력」으로 붙어 버린다.
 */
export function readValue(text: string): { value: number | null; pct: boolean; at: number } {
  const m = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(%?)[^0-9%]*$/);
  if (!m) return { value: null, pct: false, at: text.length };
  const raw = m[1].replace(",", ".");
  // 소수 자리가 없는 값에도 붙는다 — 44%가 4496으로, 21%가 2196으로 나온다.
  const dropped = raw.match(/^([0-9]+(?:\.[0-9])?)96$/);
  return {
    value: Number(dropped ? dropped[1] : raw),
    pct: m[2] === "%" || !!dropped,
    at: m.index ?? 0,
  };
}

export function findOptionKey(
  table: Record<string, string[]>,
  lineName: string,
  pct: boolean,
): string | undefined {
  const pick = (wantPct: boolean) => {
    let best: string | undefined;
    for (const key of Object.keys(table)) {
      if (key.includes("%") !== wantPct) continue;
      const n = normKey(key);
      if (!lineName.includes(n)) continue;
      if (!best || n.length > normKey(best).length) best = key;
    }
    return best;
  };
  // %가 글자로 안 읽히는 일이 있어서, 찾는 쪽에 없으면 반대쪽도 본다.
  // 「공명 해방 피해 보너스」처럼 %짜리만 있는 항목이 그래서 통째로 빠졌다.
  return pick(pct) ?? pick(!pct);
}

export type ValueState = "정확" | "소수점복원" | "근사" | "벗어남" | "못찾음";

/** 표에 있는 값으로 되돌린다. 소수점이 날아간 경우(8.1 → 81)까지 되살린다. */
export function matchOptionValue(
  list: string[],
  v: number,
): { value: string; state: ValueState } {
  const nums = list.map(Number);
  const exact = nums.findIndex((n) => Math.abs(n - v) < 0.001);
  if (exact >= 0) return { value: list[exact], state: "정확" };
  // 「8.1%」를 「81」로 읽는 일이 잦다. 10으로 나눈 값이 표에 딱 있으면 그것이다.
  const dot = nums.findIndex((n) => Math.abs(n - v / 10) < 0.001);
  if (dot >= 0) return { value: list[dot], state: "소수점복원" };

  let bi = 0;
  for (let i = 1; i < nums.length; i += 1)
    if (Math.abs(nums[i] - v) < Math.abs(nums[bi] - v)) bi = i;
  const step = nums.length > 1 ? Math.abs(nums[1] - nums[0]) : 1;
  return { value: list[bi], state: Math.abs(nums[bi] - v) <= step ? "근사" : "벗어남" };
}

/** 글자 수 기준 편집 거리. 이름이 깨졌을 때 후보를 좁히는 데 쓴다. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...(Array(b.length).fill(0) as number[]),
  ]);
  for (let j = 0; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1)
    for (let j = 1; j <= b.length; j += 1)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return d[a.length][b.length];
}

export interface NameMatch {
  echo?: CatalogEcho;
  /** 어떻게 정해졌는지 — 화면에 그대로 보여 준다. */
  note: string;
  candidates: CatalogEcho[];
}

/** OCR로 읽은 제목에서 도감의 에코를 찾는다. 확신이 없으면 후보만 준다. */
export function matchEchoName(rawName: string): NameMatch {
  const key = normKey(rawName.split("+")[0]);
  const exact = CATALOG.find((e) => normKey(e.Name) === key);
  if (exact) return { echo: exact, note: "정확 일치", candidates: [] };

  const ranked = CATALOG.map((e) => ({ e, d: editDistance(key, normKey(e.Name)) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);
  const top = ranked[0];
  // 1등이 2등보다 확실히 가깝고, 틀린 글자가 이름 길이의 40%를 넘지 않을 때만 자동 채택한다.
  const limit = Math.max(2, Math.ceil(normKey(top?.e.Name ?? "").length * 0.4));
  if (top && top.d <= limit && (ranked[1] === undefined || ranked[1].d > top.d))
    return { echo: top.e, note: `추정 (다른 글자 ${top.d}자)`, candidates: ranked.map((r) => r.e) };
  return { echo: undefined, note: "자동 판정 불가", candidates: ranked.map((r) => r.e) };
}

// ─────────────────────────── 에코 한 장 읽기 ───────────────────────────

export interface ReadOption {
  key?: string;
  /** 표에서 되찾은 값. 못 찾았으면 빈 문자열. */
  value: string;
  /** OCR이 실제로 읽은 숫자. 사람이 확인할 때 보여 준다. */
  ocr: number | null;
  state: ValueState;
  raw: string;
}

export interface ReadEcho {
  cost?: number;
  rawName: string;
  match: NameMatch;
  mainOption: ReadOption;
  mainSubOption: ReadOption;
  subOptions: ReadOption[];
  lines: string[];
}

/** 옵션 한 줄을 「이름 + 숫자 + %」로 쪼갠다. 줄 끝의 잡글자는 버린다. */
function parseRow(line: string) {
  const v = readValue(line);
  if (v.value === null) return null;
  return { name: normKey(line.slice(0, v.at)), value: v.value, pct: v.pct, raw: line.trim() };
}

/**
 * 에코 카드 한 장의 글자 줄들을 값으로 바꾼다.
 *
 * 줄 순서를 그대로 믿는다 — COST 줄 다음이 주옵션, 그 다음이 메인 서브옵션, 나머지가 부옵션.
 * 이름으로 찾으면 「이상 · 봉정계유」처럼 공격력이 세 줄(30% · 100 · 부옵션) 나오는 카드에서
 * 엉뚱한 줄을 잡는다.
 */
export function parseEchoLines(lines: string[], rawName: string): ReadEcho {
  const costIdx = lines.findIndex((l) => /COST/i.test(l));
  const cost = costIdx >= 0 ? Number((lines[costIdx].match(/COST\s*([0-9])/i) ?? [])[1]) : undefined;
  const tier = cost !== undefined ? TIER[cost] : undefined;

  const rows = lines
    .slice(costIdx + 1)
    .map(parseRow)
    .filter((r): r is NonNullable<typeof r> => !!r);

  // 주옵션 — 값은 COST가 정한다. OCR 숫자는 맞는지 확인하는 데만 쓴다.
  const mainRow = rows[0];
  const mainKey = mainRow && findOptionKey(OPTIONS.mainOption, mainRow.name, mainRow.pct);
  const mainList = mainKey ? OPTIONS.mainOption[mainKey] : [];
  const mainValue =
    (mainList.length === 1 ? mainList[0] : tier !== undefined ? mainList[tier] : "") ?? "";
  const mainOption: ReadOption = {
    key: mainKey,
    value: mainValue,
    ocr: mainRow?.value ?? null,
    state: !mainKey
      ? "못찾음"
      : mainRow && Math.abs(Number(mainValue) - mainRow.value) < 0.15
        ? "정확"
        : "근사",
    raw: mainRow?.raw ?? "",
  };

  // 메인 서브옵션 — 1코스트만 HP고 나머지는 공격력. 값도 COST가 정한다.
  const subRow = rows[1];
  const subKey = cost === 1 ? "HP" : "공격력";
  const subList = OPTIONS.mainSubOption[subKey] ?? [];
  const subValue = (subList.length === 1 ? subList[0] : subList[cost === 4 ? 1 : 0]) ?? "";
  const mainSubOption: ReadOption = {
    key: subKey,
    value: subValue,
    ocr: subRow?.value ?? null,
    state: subRow && String(subRow.value) === subValue ? "정확" : "근사",
    raw: subRow?.raw ?? "",
  };

  const subOptions = rows.slice(2).map<ReadOption>((r) => {
    const key = findOptionKey(OPTIONS.subOption, r.name, r.pct);
    if (!key) return { value: "", ocr: r.value, state: "못찾음", raw: r.raw };
    const m = matchOptionValue(OPTIONS.subOption[key], r.value);
    return { key, value: m.value, ocr: r.value, state: m.state, raw: r.raw };
  });

  return {
    cost,
    rawName,
    match: matchEchoName(rawName),
    mainOption,
    mainSubOption,
    subOptions,
    lines,
  };
}

/**
 * 에코 상세 스크린샷 한 장을 읽는다.
 * 표는 원본으로, 제목은 위쪽을 잘라 2배로 키워 — 두 번 읽는 이유는 파일 맨 위 설명 참고.
 */
export async function readEchoCard(
  file: Blob,
  onProgress?: (step: string, done: number, total: number) => void,
): Promise<ReadEcho> {
  const img = await loadImage(file);
  onProgress?.("옵션 표", 0, 2);
  const lines = await readLines(prepare(img));
  onProgress?.("에코 이름", 1, 2);
  const headLines = await readLines(
    prepare(img, { region: { x: 0, y: 0, w: 1, h: 0.2 }, scale: 2, grayscale: true }),
  );
  onProgress?.("끝", 2, 2);
  return parseEchoLines(lines, headLines[0] ?? lines[0] ?? "");
}

// ─────────────────── 디스코드 프로필 카드 한 장 읽기 ───────────────────

/**
 * 프로필 카드는 게임이 만들어 주는 **정해진 판**이라 글자 자리가 늘 같다.
 * 그래서 통째로 읽지 않고 자리별로 잘라 읽는다 — 통째로 읽으면 그림과 QR 때문에 다 깨진다.
 * 좌표는 0~1 비율이라 사진 크기가 달라도 그대로 쓸 수 있다.
 *
 * 아래 숫자는 전부 **1920x1080 카드에서 실제로 잰 픽셀**이다. 비율로 바로 적으면
 * 소수점이 길어져 어디서 온 값인지 알 수 없게 되므로 px()로 옮겨 적는다.
 */
const CARD_W = 1920;
const CARD_H = 1080;
const px = (x: number, y: number, w: number, h: number): Region => ({
  x: x / CARD_W,
  y: y / CARD_H,
  w: w / CARD_W,
  h: h / CARD_H,
});

/** 에코 카드 다섯 장의 왼쪽 끝과 간격(픽셀). */
const ECHO_SLOT_X = 21;
const ECHO_SLOT_PITCH = 374;
export const PROFILE_REGIONS = {
  /** 왼쪽 위 — 캐릭터 이름과 레벨이 한 줄에 같이 있다. */
  name: { x: 0.015, y: 0.0, w: 0.16, h: 0.06 } as Region,
  /**
   * 캐릭터 반신 그림이 놓이는 자리. 도감의 FormationRoleCard와 **같은 그림**이라
   * 그대로 견줄 수 있다. 아래 22%는 공명 체인 별과 에코 카드가 덮어서 뺐다
   * (iconSignature.ts의 CHARACTER_TOP).
   */
  portrait: px(141, 1, 498, 535),
  /** 가운데 — 스킬 노드 다섯 개의 「LV.n/10」이 원을 그리며 흩어져 있다. */
  skills: { x: 0.4, y: 0.14, w: 0.32, h: 0.45 } as Region,
  /** 오른쪽 — 무기 이름과 무기 레벨. */
  weaponName: { x: 0.74, y: 0.39, w: 0.21, h: 0.06 } as Region,
  weaponLevel: { x: 0.75, y: 0.44, w: 0.1, h: 0.045 } as Region,
};

/**
 * 아래쪽 에코 카드 다섯 장. 첫 장 왼쪽 끝에서 같은 간격으로 늘어서 있다.
 * 간격은 카드에서 직접 재서 374픽셀이 나왔다 — 눈대중으로 385를 쓰던 때는 네 번째·
 * 다섯 번째 카드가 40픽셀 가까이 밀려서 오른쪽 숫자가 잘려 나갔다.
 */
export const profileEchoRegion = (i: number): Region => px(ECHO_SLOT_X + ECHO_SLOT_PITCH * i, 642, 366, 430);

/** 에코 그림. 도감 아이콘 한 장이 통째로 이 정사각형에 그려진다. */
export const profileEchoArtRegion = (i: number): Region =>
  px(ECHO_SLOT_X + ECHO_SLOT_PITCH * i + 2, 647, 189, 189);

/** 코스트 마름모 왼쪽의 동그란 화음(세트) 아이콘. */
export const profileEchoFetterRegion = (i: number): Region =>
  px(ECHO_SLOT_X + ECHO_SLOT_PITCH * i + 246, 662, 49, 49);

/**
 * 주옵션 값에서 COST를 거꾸로 알아낸다.
 *
 * 프로필 카드에는 「COST 4」 글자가 없고 작은 마름모 안 숫자뿐이라 OCR로는 못 읽는다.
 * 그런데 주옵션 값 자체가 COST마다 다르다 — 크리티컬 피해는 44.0 하나뿐(4코스트),
 * 공격력%는 33.0 / 30.0 / 18.0이 각각 4 · 3 · 1코스트다. 그래서 값으로 되짚을 수 있다.
 */
export function inferCost(mainKey: string, value: number): number | undefined {
  const list = OPTIONS.mainOption[mainKey];
  if (!list) return undefined;
  let bi = -1;
  let best = Infinity;
  list.forEach((v, i) => {
    const d = Math.abs(Number(v) - value);
    if (d < best) {
      best = d;
      bi = i;
    }
  });
  if (bi < 0) return undefined;
  // 값이 하나뿐인 주옵션(치료 효과 · 속성 피해 보너스 등)은 4코스트에만 붙는다.
  return [4, 3, 1][bi] ?? 4;
}

/**
 * 스킬 노드 다섯 개의 레벨을 **자리 순서대로** 읽는다.
 *
 * 카드에서 노드는 원을 그리며 놓여 있고, 어느 것이 무슨 스킬인지는 **자리로만** 구분된다
 * (그림에는 글자가 없다). 순서는 12시에서 시작해 **반시계 방향**으로
 *   기본 공격 → 공명 스킬 → 변주 스킬 → 공명 회로 → 공명 해방
 * 이다. 그래서 읽은 줄을 그대로 쓰지 않고 각 「LV.n/10」의 좌표를 원 중심 기준
 * 각도로 바꿔 정렬한다 — OCR이 뱉는 순서(대체로 위에서 아래)와는 다르다.
 */
async function readSkillLevels(img: HTMLImageElement): Promise<number[]> {
  const canvas = prepare(img, { region: PROFILE_REGIONS.skills, scale: 2, grayscale: true });
  const rows = await readRows(canvas, PSM.SPARSE_TEXT);

  const found: { level: number; x: number; y: number }[] = [];
  for (const row of rows) {
    // 「LV.10/10」 · 「1V.10/10」처럼 앞글자가 흔들려서 「숫자/10」만 본다.
    const m = row.text.match(/([0-9]{1,2})\s*\/\s*10/);
    if (m) found.push({ level: Number(m[1]), x: row.x, y: row.y });
  }
  if (found.length < 2) return found.map((f) => f.level);

  const cx = found.reduce((sum, f) => sum + f.x, 0) / found.length;
  const cy = found.reduce((sum, f) => sum + f.y, 0) / found.length;
  // 12시를 0으로 두고 반시계로 커지는 각도. 화면 y는 아래로 커지므로 부호가 뒤집힌다.
  const angle = (f: { x: number; y: number }) => {
    const a = Math.atan2(-(f.x - cx), -(f.y - cy));
    return a < 0 ? a + Math.PI * 2 : a;
  };
  return [...found].sort((a, b) => angle(a) - angle(b)).map((f) => f.level);
}

// ─────────────────── 그림으로 알아내기 (이름이 글자로 없는 것들) ───────────────────

/**
 * 카드에서 **글자로 못 읽는 것**을 그림으로 알아낸다 — 캐릭터 · 에코 · 화음(세트).
 *
 * 도감 그림 390장의 서명은 미리 뽑아 두었다(src/data/iconSignatures.json,
 * scripts/build-icon-signatures.mjs). 여기서는 카드에서 잘라 낸 일곱 장만 계산해서
 * 견주면 된다 — 견주는 방법은 utils/iconSignature.ts에 적어 두었다.
 */

type SignatureTable = Record<string, string>;
const SIGNATURES = iconSignatures as {
  echo: SignatureTable;
  fetter: SignatureTable;
  character: SignatureTable;
};

/** 서명을 풀어 놓고 쓴다. 한 번 풀면 그대로 두고 다시 쓴다. */
const decodeTable = (table: SignatureTable) =>
  Object.entries(table).map(([key, text]) => ({ key, sig: decodeSignature(text) }));

let echoSignatures: { key: string; sig: Uint8Array }[] | null = null;
let fetterSignatures: { key: string; sig: Uint8Array }[] | null = null;
let characterSignatures: { key: string; sig: Uint8Array }[] | null = null;

/** 화음 아이콘의 파일 이름. 도감의 Icon 주소와 서명 표를 잇는 열쇠다. */
const fetterIconKey = (url?: string): string =>
  (url ?? "").split("/").pop()?.replace(".webp", "") ?? "";

/** 도감 id → 우리 캐릭터 id. characterApiIds.json이 반대 방향이라 뒤집어 둔다. */
const CHARACTER_BY_API_ID: Record<string, string> = Object.fromEntries(
  Object.entries(characterApiIds as Record<string, number>).map(([id, apiId]) => [String(apiId), id]),
);

/** 잘라 낸 자리를 정해진 크기로 다시 그려 픽셀을 꺼낸다. 도감 쪽 서명과 같은 크기여야 한다. */
function regionPixels(img: HTMLImageElement, region: Region, w: number, h: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    Math.round(img.naturalWidth * region.x),
    Math.round(img.naturalHeight * region.y),
    Math.round(img.naturalWidth * region.w),
    Math.round(img.naturalHeight * region.h),
    0,
    0,
    w,
    h,
  );
  return ctx.getImageData(0, 0, w, h);
}

export interface IconGuess {
  /** 얼마나 닮았나. 작을수록 확실하다. 30을 넘으면 사람이 봐야 한다. */
  distance: number;
  /** 2등과의 거리 차이. 작으면 「비슷한 게 둘 있다」는 뜻이다. */
  margin: number;
}

/** 반신 그림으로 캐릭터를 알아낸다. 이름 OCR이 흔들려도 이쪽은 잘 맞는다. */
function matchCharacter(img: HTMLImageElement): (IconGuess & { characterId: string }) | undefined {
  characterSignatures ??= decodeTable(SIGNATURES.character);
  const card = portraitSignature(
    regionPixels(img, PROFILE_REGIONS.portrait, 174, 187),
    CHARACTER_GRID,
  );
  const hit = pickClosest(characterSignatures, (c) => portraitDistance(card, c.sig));
  const characterId = hit && CHARACTER_BY_API_ID[hit.best.key];
  return hit && characterId
    ? { characterId, distance: hit.distance, margin: hit.margin }
    : undefined;
}

export interface EchoIconGuess extends IconGuess {
  /** 도감 id. 못 정했으면 비어 있다. */
  catalogId: string;
  /** 고른 화음(세트) 이름. 카드의 아이콘이 도감 목록에 없으면 비어 있다. */
  fetter: string;
  fetterDistance: number;
}

/**
 * 에코 한 자리를 그림으로 알아낸다.
 *
 * **화음 아이콘이 에코를 갈라 준다.** 「우글글」과 「악몽 · 우글글」처럼 그림이 거의
 * 같은 짝이 있는데, 붙일 수 있는 세트가 서로 달라서 코스트 왼쪽의 동그란 아이콘 하나로
 * 어느 쪽인지 정해진다. 그래서 그림 1등을 그냥 쓰지 않고, 그 아이콘을 가진 후보가
 * 상위권에 있으면 그쪽을 고른다.
 */
function matchEcho(img: HTMLImageElement, slot: number): EchoIconGuess | undefined {
  echoSignatures ??= decodeTable(SIGNATURES.echo);
  fetterSignatures ??= decodeTable(SIGNATURES.fetter);

  const art = artSignature(
    regionPixels(img, profileEchoArtRegion(slot), 64, 64),
    ECHO_GRID,
  );
  if (!art) return undefined;

  const fetterArt = artSignature(
    regionPixels(img, profileEchoFetterRegion(slot), 64, 64),
    FETTER_GRID,
  );
  const fetterHit = fetterArt
    ? pickClosest(fetterSignatures, (c) => artDistance(fetterArt, c.sig))
    : undefined;

  // 목록에서 빼둔 에코(이름만 같은 다른 계열)는 애초에 후보가 아니다.
  const ranked = echoSignatures
    .filter((c) => !isExcludedEcho(c.key))
    .map((c) => ({ key: c.key, d: artDistance(art, c.sig) }))
    .sort((a, b) => a.d - b.d);
  if (ranked.length === 0) return undefined;

  const groupsOf = (id: string) =>
    CATALOG_FULL.find((e) => String(e.Id) === id)?.FetterGroups ?? [];
  const wanted = fetterHit?.best.key;
  const byFetter = wanted
    ? ranked.find((c) => groupsOf(c.key).some((g) => fetterIconKey(g.Icon) === wanted))
    : undefined;
  // 12은 「그림만으로는 가릴 수 없는 차이」의 눈금이다. 이보다 벌어지면 그림을 믿는다.
  const pick = byFetter && byFetter.d <= ranked[0].d + 12 ? byFetter : ranked[0];
  const group = wanted
    ? groupsOf(pick.key).find((g) => fetterIconKey(g.Icon) === wanted)
    : undefined;

  return {
    catalogId: pick.key,
    distance: pick.d,
    margin: (ranked.find((c) => c.key !== pick.key)?.d ?? Infinity) - pick.d,
    fetter: group?.Name ?? "",
    fetterDistance: fetterHit?.distance ?? Infinity,
  };
}

export interface ProfileEcho {
  cost?: number;
  mainOption: ReadOption;
  mainSubOption: ReadOption;
  subOptions: ReadOption[];
  /** 읽은 줄 그대로. 확인 화면에서 「무엇을 보고 이렇게 정했는지」를 보여 줄 때 쓴다. */
  lines: string[];
  /** 그림으로 알아낸 에코와 화음. 못 알아냈으면 undefined다. */
  icon?: EchoIconGuess;
}

export interface ProfileRead {
  characterName: string;
  /** 왼쪽 위 반신 그림으로 알아낸 캐릭터. 이름 OCR과 따로 본다. */
  characterIcon?: IconGuess & { characterId: string };
  characterLevel?: number;
  skillLevels: number[];
  weaponName: string;
  weaponLevel?: number;
  echoes: ProfileEcho[];
}

/**
 * 이름과 값이 **다른 줄로 갈라진 것**을 붙인다.
 *
 * 카드가 좁아서 주옵션이 「공격력」과 「18%」 두 줄로 읽히는 일이 잦다.
 * 이름만 있는 줄 바로 뒤에 숫자만 있는 줄이 오면 한 줄로 본다.
 * (같은 높이에 있는 것끼리는 readRows가 이미 묶어 놨다.)
 */
function pairRows(rows: TextRow[]) {
  type Row = { name: string; value: number; pct: boolean; raw: string };
  const out: Row[] = [];
  // 한글 두 자 이상이나 HP가 있으면 이름 줄로 본다. 줄 앞의 아이콘은 X · 2 · ® 같은
  // 글자로 읽히므로 이름으로 치지 않는다.
  // **글자 그대로가 아니라 기호·공백을 지운 이름으로 본다** — OCR이 「크 리 티 컬 피 해」
  // 처럼 한 자씩 띄어 읽는 일이 있어서, 원문으로 재면 한글이 연달아 두 자가 아니게 된다.
  const hasName = (row: TextRow) => /[가-힣]{2,}/.test(row.name) || /HP/i.test(row.name);
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    if (hasName(r) && r.value !== null) {
      out.push({ name: r.name, value: r.value, pct: r.pct, raw: r.text });
      continue;
    }
    if (!hasName(r)) continue; // 숫자만 있는 줄은 바로 앞 이름이 이미 가져갔다
    const next = rows[i + 1];
    if (next && next.value !== null && !hasName(next)) {
      out.push({ name: r.name, value: next.value, pct: next.pct, raw: `${r.text} ${next.text}` });
      i += 1;
    }
  }
  return out;
}

/** 프로필 카드의 에코 한 장. COST 글자가 없어서 주옵션 값으로 코스트를 되짚는다. */
function parseProfileEcho(textRows: TextRow[]): ProfileEcho {
  const rows = pairRows(textRows);

  // 카드 위쪽의 아이콘·코스트 마름모가 글자로 읽히기도 한다.
  // 주옵션 표에 이름이 걸리는 첫 줄부터가 진짜 시작이다.
  // 주옵션은 전부 %짜리인데 「44%」가 「449」로 읽히는 일이 잦아 % 여부는 따지지 않는다.
  const mainOf = (r: { name: string }) => findOptionKey(OPTIONS.mainOption, r.name, true);
  const start = rows.findIndex(mainOf);
  const body = start >= 0 ? rows.slice(start) : rows;

  const mainRow = body[0];
  const mainKey = mainRow && mainOf(mainRow);
  const cost = mainKey && mainRow ? inferCost(mainKey, mainRow.value) : undefined;
  const tier = cost !== undefined ? TIER[cost] : undefined;
  const mainList = mainKey ? OPTIONS.mainOption[mainKey] : [];
  const mainValue =
    (mainList.length === 1 ? mainList[0] : tier !== undefined ? mainList[tier] : "") ?? "";

  const mainOption: ReadOption = {
    key: mainKey,
    value: mainValue,
    ocr: mainRow?.value ?? null,
    state: !mainKey ? "못찾음" : "정확",
    raw: mainRow?.raw ?? "",
  };

  const subRow = body[1];
  const subKey = cost === 1 ? "HP" : "공격력";
  const subList = OPTIONS.mainSubOption[subKey] ?? [];
  const subValue = (subList.length === 1 ? subList[0] : subList[cost === 4 ? 1 : 0]) ?? "";
  const mainSubOption: ReadOption = {
    key: subKey,
    value: subValue,
    ocr: subRow?.value ?? null,
    state: subRow && String(subRow.value) === subValue ? "정확" : "근사",
    raw: subRow?.raw ?? "",
  };

  const subOptions = body.slice(2, 7).map<ReadOption>((r) => {
    const key = findOptionKey(OPTIONS.subOption, r.name, r.pct);
    if (!key) return { value: "", ocr: r.value, state: "못찾음", raw: r.raw };
    const m = matchOptionValue(OPTIONS.subOption[key], r.value);
    return { key, value: m.value, ocr: r.value, state: m.state, raw: r.raw };
  });

  return { cost, mainOption, mainSubOption, subOptions, lines: textRows.map((r) => r.text) };
}

/**
 * 디스코드 프로필 카드 한 장을 읽는다.
 *
 * 자리마다 크기가 달라서 손질도 다르게 한다 — 작은 글자(이름 · 무기)는 3배로 키우고,
 * 에코 표는 원본 그대로가 제일 정확하다(에코 카드 등록 때와 같은 이유).
 * 결과는 그대로 쓰지 않고 반드시 사람이 확인하는 화면을 거친다.
 */
export async function readProfileCard(
  file: Blob,
  onProgress?: (step: string, done: number, total: number) => void,
): Promise<ProfileRead> {
  const img = await loadImage(file);
  const R = PROFILE_REGIONS;

  // 게이지에 쓸 눈금. 에코 다섯 자리는 두 번씩 읽으므로 그만큼 무겁게 잡는다.
  const TOTAL = 4 + 5 * 2 + 1;
  let done = 0;
  const step = (label: string, weight = 1) => {
    onProgress?.(label, done, TOTAL);
    done += weight;
  };

  step("캐릭터 이름");
  const nameLines = await readLines(
    prepare(img, { region: R.name, scale: 3, grayscale: true }),
    PSM.SINGLE_LINE,
  );
  const nameText = nameLines.join(" ");
  // 「치사  LV.90」처럼 이름과 레벨이 한 줄이다. 레벨을 떼어 내고 나머지를 이름으로 본다.
  const lvMatch = nameText.match(/LV\.?\s*([0-9]{1,3})/i);
  const characterLevel = lvMatch ? Number(lvMatch[1]) : undefined;
  const characterName = nameText.replace(/LV\.?\s*[0-9]{1,3}/i, "").trim();

  step("스킬 레벨");
  const skillLevels = await readSkillLevels(img);

  step("무기");
  const weaponLines = await readLines(
    prepare(img, { region: R.weaponName, scale: 3, grayscale: true }),
    PSM.SINGLE_LINE,
  );
  const weaponName = (weaponLines[0] ?? "").trim();
  step("무기 레벨");
  const weaponLvLines = await readLines(
    prepare(img, { region: R.weaponLevel, scale: 3, grayscale: true }),
    PSM.SINGLE_LINE,
  );
  const wl = weaponLvLines.join(" ").match(/([0-9]{1,3})/);
  const weaponLevel = wl ? Number(wl[1]) : undefined;

  const echoes: ProfileEcho[] = [];
  for (let i = 0; i < 5; i += 1) {
    step(`에코 ${i + 1}/5`, 2);
    const echo = parseProfileEcho(
      await readRowsBothWays(prepare(img, { region: profileEchoRegion(i) })),
    );
    // 에코 이름과 화음은 카드에 글자로 없다 — 그림으로 알아낸다.
    echoes.push({ ...echo, icon: matchEcho(img, i) });
  }

  step("캐릭터 그림");
  const characterIcon = matchCharacter(img);

  onProgress?.("끝", TOTAL, TOTAL);
  return {
    characterName,
    characterIcon,
    characterLevel,
    skillLevels,
    weaponName,
    weaponLevel,
    echoes,
  };
}
