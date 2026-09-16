// 공격 트리거 제안 — `node scripts/propose-attack-triggers.mjs [캐릭터] [--json]`
//
// 원문(characterTexts.json)에서 「무엇을 얻고 · 태우고 · 붙인다」고 말하는 문장을 뽑아,
// 그 문장이 짚는 스킬을 공격 자료의 이름과 맞춰 **트리거 초안**을 만든다.
// 사람이 읽고 고른 뒤 attackTriggers.ts에 넣는다 — 자동으로 쓰지 않는다.
//
// 맞추는 방법 두 가지.
//   ① 문장에 공격 이름이 그대로 나오면(「강공격 · 탕탕탕! · 헌트리스」) 그 공격 하나.
//   ② 스킬 갈래로만 말하면(「기본 공격」 · 「공명 스킬」) 그 갈래의 공격 전부.
//      갈래는 공격 id의 스킬 번호로 가린다(01 기본 · 02 스킬 · 03 해방 · 06 변주 · 07 회로 · 09 반주).
//
// 이미 트리거가 있는 공격, 이미 어느 source에 인용된 문장은 빼고 내놓는다.

import fs from "node:fs";
import path from "node:path";

const CHAR_DIR = "src/data/characters";
const CR = String.fromCharCode(13);
const strip = (s) => s.replace(/[「」\s·,.]/g, "");

/** 이상 효과 이름 -> AnomalyKind. 원문은 「풍식 효과」처럼 앞 두 글자로 적는다. */
const ANOMALY = {
  풍식: "AeroErosion",
  광학: "SpectroFrazzle",
  전자: "ElectroFlare",
  서리: "FrostChafe",
  불꽃: "FusionBurst",
  암흑: "HavocBane",
};

/** 적에게 붙는 상태(부조화 계통). 이 이름이 나오면 status로 본다. */
const STATUSES = [
  "해킹 · 이탈", "해킹 · 간섭",
  "조화 밀집 · 이탈", "조화 밀집 · 간섭",
  "조화 파동 · 이탈", "조화 파동 · 간섭",
];

/** 스킬 갈래 — 공격 id 가운데 두 자리. */
const GROUP = {
  "기본 공격": ["01"],
  "일반 공격": ["01"],
  "공명 스킬": ["02"],
  "공명 해방": ["03"],
  "변주 스킬": ["06"],
  "반주 스킬": ["09"],
};

/** 담지 않는 문장 — 남의 공격에 얹히거나 캐릭터를 가리지 않는 값. */
const SKIP = [
  "파티 내", "근처 파티", "다음 등장", "스태미나", "공명 에너지", "협주 에너지",
  "요리", "경직 저항", "탐색 도구", "HP를 회복", "실드", "비전투", "이동 속도",
  "지속적으로", "초마다", "전투 진입",
];

function characters() {
  const out = [];
  for (const file of fs.readdirSync(CHAR_DIR).filter((f) => f.endsWith(".ts"))) {
    const src = fs.readFileSync(path.join(CHAR_DIR, file), "utf8");
    const key = src.match(/\n {2}id: "([a-z0-9-]+)",\r?\n {2}name:/)?.[1] ?? null;
    const attacks = [...src.matchAll(/id: "(\d+_\d+)",\s*\r?\n\s*name: "([^"]+)",\s*\r?\n\s*type: "(\w+)"/g)]
      .map((m) => ({ id: m[1], name: m[2].replace(/\s*피해$/, "").replace(/\s*\(.*\)$/, ""), type: m[3] }));
    out.push({ file: file.slice(0, -3), key, attacks });
  }
  return out;
}

const data = fs.readFileSync("src/data/attackTriggers.ts", "utf8").split(CR).join("");
const withTrigger = new Set([...data.matchAll(/\n {2}"(\d+_\d+)": \[/g)].map((m) => m[1]));
const sources = strip([...data.matchAll(/\n {6}source: "(.*?)",/g)].map((m) => m[1]).join("\n"));
const texts = JSON.parse(fs.readFileSync("src/data/characterTexts.json", "utf8"));

/** 그 문장이 이미 어느 트리거의 근거로 쓰였는지. */
function quoted(line) {
  const flat = strip(line);
  if (flat.length < 20) return sources.includes(flat);
  for (let i = 0; i + 20 <= flat.length; i += 1) {
    if (sources.includes(flat.slice(i, i + 20))) return true;
  }
  return false;
}

/** 문장에서 「얻는 것 · 태우는 것」을 뽑는다. */
function effectsOf(line) {
  const out = [];
  // 「이름」 …을/를 N스택|Npt … 획득|회복|추가|소모|제거
  const re = /「+([^「」]{2,20})」+(?:[^。.]{0,24}?)(획득|회복|추가|소모|제거)/g;
  for (const m of line.matchAll(re)) {
    const name = m[1].trim();
    const verb = m[2];
    const action = verb === "소모" || verb === "제거" ? "consume" : "add";
    // 수치는 이름 뒤 24자 안의 「N스택」 · 「Npt」에서만 읽는다.
    // 수치는 이름 바로 앞(「3스택의 「올곧은 심지」」)에도, 뒤(「…를 1스택 추가한다」)에도 온다.
    const before = line.slice(Math.max(0, m.index - 10), m.index);
    const near = line.slice(m.index, m.index + m[0].length + 6);
    const amount = (near.match(/(\d+)\s*(?:스택|pt)/) ?? before.match(/(\d+)\s*(?:스택|pt)/))?.[1];
    out.push({ name, action, amount: amount ? Number(amount) : undefined });
  }
  return out;
}

/**
 * 그 문장이 짚는 공격들.
 * 문장 안의 「…」 토막을 공격 이름 앞머리와 맞춘다 — 원문은 「일반 공격 · 선인의 몸」이라고만 적고
 * 공격 자료는 「일반 공격 · 선인의 몸 1단」처럼 단수까지 달려 있어, 앞머리로 맞춰야 네 타가 다 걸린다.
 */
function targetsOf(line, attacks) {
  const phrases = [...line.matchAll(/「+([^「」]{2,30})」+/g)].map((m) => m[1].trim());
  const named = new Map();
  for (const phrase of phrases) {
    if (phrase.length < 3) continue;
    for (const a of attacks) {
      if (a.name === phrase || a.name.startsWith(phrase + " ") || a.name.startsWith(phrase)) {
        named.set(a.id, a);
      }
    }
  }
  if (named.size) return { ids: [...named.keys()], how: "이름" };
  for (const [word, groups] of Object.entries(GROUP)) {
    if (!line.includes(`「${word}」`)) continue;
    const ids = attacks.filter((a) => groups.includes(a.id.slice(5, 7))).map((a) => a.id);
    if (ids.length) return { ids, how: `갈래(${word})` };
  }
  return null;
}

const only = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const asJson = process.argv.includes("--json");
const all = [];

for (const c of characters()) {
  if (only && c.file !== only) continue;
  const value = texts[c.key];
  if (!value) continue;
  const blocks = [
    ...(value.skills ?? []).map((s) => (typeof s === "string" ? s : s.text)),
    ...(value.chain ?? []).map((x) => (typeof x === "string" ? x : x.text)),
  ];
  const rows = [];
  for (const block of blocks) {
    for (const raw of block.split(/\n+|(?<=다)\.\s*/)) {
      const line = raw.trim();
      if (line.length < 10 || quoted(line)) continue;
      if (SKIP.some((k) => line.includes(k))) continue;
      const effects = effectsOf(line);
      if (!effects.length) continue;
      const target = targetsOf(line, c.attacks);
      if (!target) continue;
      // 이미 트리거가 달린 공격도 내놓되 표시한다 — 줄을 하나 더 얹어야 하는 자리가 있다.
      const open = target.ids;
      for (const e of effects) {
        // 이름 자체가 스킬이면(「강공격 · 현검」 발동 시 …) 효과가 아니다 — 공격 이름과 같으면 뺀다.
        if (c.attacks.some((a) => a.name === e.name)) continue;
        const anomaly = ANOMALY[e.name.replace(/\s*효과$/, "")];
        const status = STATUSES.find((s) => strip(s) === strip(e.name));
        rows.push({
          character: c.file,
          ids: open,
          how: target.how,
          kind: anomaly ? "anomaly" : status ? "status" : "resource",
          value: anomaly ?? status ?? e.name,
          action: e.action,
          amount: e.amount,
          source: line,
        });
      }
    }
  }
  if (rows.length) all.push({ character: c.file, rows });
}

if (asJson) {
  console.log(JSON.stringify(all, null, 1));
} else {
  let n = 0;
  for (const c of all) {
    console.log(`## ${c.character}`);
    for (const r of c.rows) {
      n += 1;
      const amount = r.amount ? ` ${r.amount}` : "";
      console.log(
        `${String(n).padStart(3)} ${r.action} ${r.kind} ${r.value}${amount} [${r.how}] ` +
          r.ids.map((id) => (withTrigger.has(id) ? `${id}*` : id)).join(","),
      );
      console.log(`    ${r.source.slice(0, 110)}`);
    }
  }
  console.log(`\n제안 ${n}건`);
}
