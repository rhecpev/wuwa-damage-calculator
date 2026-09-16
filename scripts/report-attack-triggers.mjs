// 공격 트리거 빠진 곳 보고 — `node scripts/report-attack-triggers.mjs [캐릭터키|--sum]`
//
// 감사(check-attack-triggers.mjs)가 「적어 둔 것이 맞는가」를 보는 쪽이라면,
// 이쪽은 「적어야 하는데 안 적은 것이 있는가」를 본다.
//
// 규칙 하나에 기댄다 — 트리거는 반드시 원문 구절을 source에 그대로 옮겨 적는다.
// 그래서 스킬 설명문에서 **부수 효과를 말하는 문장**을 뽑아, 그 문장이 어느 source에도
// 인용돼 있지 않으면 「아직 안 옮긴 후보」로 본다. 사람이 읽고 담을지 말지를 정한다.
//
// 담지 않기로 한 것(남의 공격에 얹히는 것 · 공격에 매달 자리가 없는 것)은 attackTriggers.ts
// 맨 위 TODO에 이유를 적어 두었다. 그 문장들은 여기 계속 뜨므로, 진행표
// (docs/트리거-정리-진행.md)에 회차별로 확인 표시를 남기며 훑는다.

import fs from "node:fs";
import path from "node:path";

const CHAR_DIR = "src/data/characters";
const CR = String.fromCharCode(13);
const strip = (s) => s.replace(/[「」\s·,.]/g, "");

/** 부수 효과를 말하는 문장인지 — 이 말이 들어 있으면 본다. */
const KEYWORDS = [
  "효과를 추가",
  "효과 추가",
  "효과를 부여",
  "효과를 소모",
  "스택을 소모",
  "스택 소모",
  "을 소모",
  "를 소모",
  "이탈",
  "간섭",
  "방어력",
  "저항",
  "받는 피해",
  "획득",
  "회복한다",
  "부여",
  "추가한다",
  "제거",
  "전환",
];

/**
 * 부수 효과가 아닌 것 — 이 말이 들어 있으면 후보에서 뺀다.
 * 스태미나 · 공명 에너지 · 치료 · 실드처럼 캐릭터를 가리지 않고 도는 값과, 전투 밖 문장이다.
 * 트리거로 담는 자원은 캐릭터 고유의 것뿐이다(「기(炁)」 · 「늑대의 불」 …).
 */
const IGNORE = [
  "스태미나",
  "공명 에너지",
  "요리",
  "경직 저항",
  "탐색 도구",
  "HP를 회복",
  "치료 효과",
  "실드",
  "비전투 상태",
  "이동 속도",
];

/** 캐릭터 파일 -> { key, 공격 id 목록 } */
function buildCharacters() {
  const out = [];
  for (const file of fs.readdirSync(CHAR_DIR).filter((f) => f.endsWith(".ts"))) {
    const src = fs.readFileSync(path.join(CHAR_DIR, file), "utf8");
    // 줄 끝이 CRLF인 파일이 섞여 있다 — \r을 넘겨 짚지 않으면 캐릭터 열세 명을 놓친다.
    const key = src.match(/\n {2}id: "([a-z0-9-]+)",\r?\n {2}name:/)?.[1] ?? null;
    const ids = [...new Set([...src.matchAll(/id: "(\d+_\d+)"/g)].map((m) => m[1]))];
    out.push({ file: file.slice(0, -3), key, ids });
  }
  return out;
}

const data = fs.readFileSync("src/data/attackTriggers.ts", "utf8").split(CR).join("");
const withTrigger = new Set([...data.matchAll(/\n {2}"(\d+_\d+)": \[/g)].map((m) => m[1]));
/** 트리거가 근거로 삼은 원문 구절을 전부 이어 붙인 것. 인용됐는지만 보면 되므로 한 덩이면 된다. */
const sources = strip([...data.matchAll(/\n {6}source: "(.*?)",/g)].map((m) => m[1]).join("\n"));

const texts = JSON.parse(fs.readFileSync("src/data/characterTexts.json", "utf8"));
const characters = buildCharacters();
const only = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;

/**
 * 3회차 검사 — 자원마다 「채우는 자리」와 「태우는 자리」가 짝을 이루는지.
 * 한쪽만 있으면 대개 빠뜨린 것이다. 시간으로 차거나 파티 조건으로 도는 자원은 한쪽만 있는 것이
 * 맞으므로, 그런 것은 attackTriggers.ts 맨 위 TODO에 이유가 적혀 있어야 한다.
 */
const TRIGGER_BLOCK = new RegExp(String.raw`
  "(\d+_\d+)": \[([\s\S]*?)
  \],`, "g");
const TRIGGER_ENTRY = new RegExp(String.raw`\{
([\s\S]*?)
    \},`, "g");
const NAME_RE = new RegExp(String.raw`
      resource: "(.*?)",`);

function pairs() {
  const owner = new Map();
  for (const c of characters) for (const id of c.ids) owner.set(id, c.file);
  const res = new Map();
  for (const m of data.matchAll(TRIGGER_BLOCK)) {
    const who = owner.get(m[1]) ?? "?";
    for (const e of m[2].matchAll(TRIGGER_ENTRY)) {
      const action = e[1].match(/action: "(\w+)"/)?.[1];
      const name = e[1].match(NAME_RE)?.[1];
      if (!name) continue;
      const key = `${who}|${name}`;
      const cur = res.get(key) ?? { add: 0, consume: 0 };
      cur[action] += 1;
      res.set(key, cur);
    }
  }
  const onlyAdd = [...res].filter(([, v]) => !v.consume).map(([k]) => k);
  const onlyCon = [...res].filter(([, v]) => !v.add).map(([k]) => k);
  console.log(`자원 ${res.size}종 · 채우기만 ${onlyAdd.length} · 태우기만 ${onlyCon.length}`);
  console.log("");
  console.log("[태우는 자리만 있는 자원 — 채우는 쪽을 빠뜨렸는지 본다]");
  for (const k of onlyCon.sort()) console.log(`  ${k.replace("|", " — ")}`);
  console.log("");
  console.log("[채우기만 하는 자원 — 태우는 쪽을 빠뜨렸는지 본다]");
  for (const k of onlyAdd.sort()) console.log(`  ${k.replace("|", " — ")}`);
}

if (process.argv.includes("--pairs")) {
  pairs();
  process.exit(0);
}

/** 그 캐릭터 원문에서 부수 효과를 말하는 문장 — 이미 인용된 것과 아닌 것으로 가른다. */
function sentencesOf(key) {
  const value = texts[key];
  if (!value) return [];
  const blocks = [
    ...(value.skills ?? []).map((s) => (typeof s === "string" ? s : `${s.name ?? ""}\n${s.text}`)),
    ...(value.chain ?? []).map((c) => (typeof c === "string" ? c : `${c.name ?? ""}\n${c.text}`)),
  ];
  const out = [];
  for (const block of blocks) {
    for (const raw of block.split(/\n+|(?<=다)\.\s*/)) {
      const line = raw.trim();
      if (line.length < 8) continue;
      if (!KEYWORDS.some((k) => line.includes(k))) continue;
      if (IGNORE.some((k) => line.includes(k))) continue;
      // 인용 여부는 20자 토막이 source 덩이에 있는지로 본다 — 꼬리표를 붙여 적은 것도 걸리게.
      const flat = strip(line);
      let quoted = false;
      for (let i = 0; i + 20 <= flat.length && !quoted; i += 1) {
        if (sources.includes(flat.slice(i, i + 20))) quoted = true;
      }
      if (flat.length < 20) quoted = sources.includes(flat);
      out.push({ line, quoted });
    }
  }
  return out;
}

let totalAttacks = 0;
let totalWith = 0;
let totalOpen = 0;
const rows = [];

for (const c of characters) {
  const have = c.ids.filter((id) => withTrigger.has(id)).length;
  const sentences = c.key ? sentencesOf(c.key) : [];
  const open = sentences.filter((s) => !s.quoted);
  totalAttacks += c.ids.length;
  totalWith += have;
  totalOpen += open.length;
  rows.push({ ...c, have, sentences, open });
}

if (only) {
  const row = rows.find((r) => r.file === only || r.key === only);
  if (!row) {
    console.error(`그런 캐릭터가 없습니다: ${only}`);
    process.exit(1);
  }
  console.log(`${row.file} (${row.key}) — 공격 ${row.ids.length} · 트리거 ${row.have}`);
  console.log(`인용된 문장 ${row.sentences.length - row.open.length} · 아직 아닌 것 ${row.open.length}`);
  for (const s of row.open) console.log(`  · ${s.line}`);
  process.exit(0);
}

console.log(`공격 ${totalAttacks} · 트리거 달린 공격 ${totalWith} · 아직 안 옮긴 문장 ${totalOpen}`);
console.log("");
console.log("캐릭터           공격  트리거  남은 문장");
for (const r of [...rows].sort((a, b) => b.open.length - a.open.length)) {
  const name = r.file.padEnd(14, " ");
  console.log(`${name} ${String(r.ids.length).padStart(4)} ${String(r.have).padStart(6)} ${String(r.open.length).padStart(8)}`);
}
