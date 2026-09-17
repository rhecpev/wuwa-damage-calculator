// 자동 발동(triggeredBy · triggeredByType)을 걸 수 있는 무기 · 에코 버프 목록 —
//   `node scripts/report-auto-buff-candidates.mjs [갈래]`
//
// 「○○ 발동 후 N초」 꼴로 적힌 조건은 루틴에서 저절로 켤 수 있다(calculator/autoBuffs.ts).
// 버프에 triggeredByType(공격 분류)을 적어 두면 그 분류의 공격을 담은 뒤부터 켜진다.
// 이 스크립트는 **아직 그 칸이 비어 있는 줄**을 조건문에서 갈래별로 모아 보여 준다.
//
// 갈래를 인자로 주면 그것만 본다 — 변주 · 공명스킬 · 공명해방 · 반주 · 에코 · 강공격 · 일반공격 · 기타.
// 자동 발동을 켜면 **이미 담아 둔 루틴의 계산 결과가 올라가므로** 갈래별로 끊어 담는 것이 안전하다.

import fs from "node:fs";

const strip = (s) => s.replace(/\r/g, "");

/** 조건문 -> 어느 공격 분류가 그 버프를 켜는가. autoBuffs의 triggeredByType에 넣을 값이다. */
const KINDS = [
  { key: "변주", type: "Variation", re: /변주 스킬/ },
  { key: "공명해방", type: "Liberation", re: /공명 해방/ },
  { key: "공명스킬", type: "Skill", re: /공명 스킬/ },
  { key: "반주", type: "Intro", re: /반주 스킬/ },
  { key: "에코", type: "Echo", re: /에코 (어빌리티|스킬)/ },
  { key: "강공격", type: "Heavy", re: /강공격/ },
  { key: "일반공격", type: "Basic", re: /일반 공격|기본 공격/ },
];

/** 「그 공격을 쓰면 켜진다」로 읽히는 조건문만 고른다. */
const TRIGGERISH = /발동 후|발동 시|명중 후|명중 시|입힌 후|입힐 시|추가 후|추가 시/;

/**
 * 지금 장치로는 못 거는 조건 — 자동 발동은 **공격 분류**로만 켤 수 있어서(triggeredByType),
 * 「이상 효과를 추가하면」처럼 공격이 아니라 그 공격이 붙인 것을 보는 조건은 매달 자리가 없다.
 * 공격 트리거(data/attackTriggers.ts)를 자동 발동 쪽에서도 읽게 되면 그때 풀린다.
 */
const BLOCKED = [
  { why: "이상 효과 · 상태를 붙여야 한다(공격 분류로 못 건다)", re: /효과[」]?를? (추가|보유)|효과가 있는|이탈|간섭|스택/ },
  { why: "적 · 파티 상태를 봐야 한다", re: /파티 내|적이|목표가|HP|체력|실드|처치/ },
];

/** 조건문 하나가 갈래 둘을 짚는 것도 있다 — 「변주 스킬 혹은 공명 해방 발동 시」. */
const kindsOf = (condition) => KINDS.filter((k) => k.re.test(condition));

const kindOf = (condition) => {
  const hit = KINDS.find((k) => k.re.test(condition));
  if (hit) return hit;
  const blocked = BLOCKED.find((b) => b.re.test(condition));
  return { key: "못 거는 것", type: "—", why: blocked?.why ?? "조건이 공격을 짚지 않는다" };
};

/** `"열쇠": [ … ],` 꼴 블록을 열쇠별로 끊는다. */
function blocksOf(source, startMark) {
  const from = source.indexOf(startMark);
  if (from < 0) throw new Error(`못 찾음: ${startMark}`);
  const body = source.slice(from);
  const out = [];
  for (const m of body.matchAll(/\n  "([^"]+)": \[\n(.*?)\n  \],/gs)) {
    out.push({ key: m[1], body: m[2] });
    if (m.index > body.indexOf("\n};")) break;
  }
  return out;
}

/** 블록 안의 버프 한 줄씩. */
function rowsOf(body) {
  return [...body.matchAll(/\{\n(.*?)\n    \}/gs)].map(([, row]) => ({
    row,
    label: row.match(/label: "(.*?)"/)?.[1] ?? "?",
    condition: row.match(/condition: "(.*?)"/)?.[1] ?? "",
    target: row.match(/target: "(.*?)"/)?.[1] ?? "?",
    uptime: row.match(/uptime: "(.*?)"/)?.[1] ?? "passive",
    value: row.match(/values?: (\[[^\]]*\]|[\d.]+)/)?.[1] ?? "",
    hasTrigger: /triggeredBy(Type)?:/.test(row),
  }));
}

const weaponNames = new Map(
  JSON.parse(fs.readFileSync("src/data/weapons.json", "utf8")).weapons.map((w) => [
    w.id,
    `${w.name} (${w.typeName} ★${w.rarity})`,
  ]),
);
const echoNames = new Map(
  JSON.parse(fs.readFileSync("src/data/echo.json", "utf8")).Echo.map((e) => [String(e.Id), e.Name]),
);

const sources = [
  {
    what: "무기",
    file: "src/data/weaponBuffs.ts",
    start: "export const weaponBuffs",
    name: (key) => weaponNames.get(key) ?? key,
  },
  {
    what: "에코 · 어빌리티",
    file: "src/data/echoBuffs.ts",
    start: "export const echoAbilityBuffs",
    name: (key) => echoNames.get(key) ?? key,
  },
  {
    what: "에코 · 화음 세트",
    file: "src/data/echoBuffs.ts",
    start: "export const echoSetBuffs",
    name: (key) => key,
  },
];

const only = process.argv[2];
const found = [];

for (const src of sources) {
  const text = strip(fs.readFileSync(src.file, "utf8"));
  for (const block of blocksOf(text, src.start)) {
    rowsOf(block.body).forEach((row, index) => {
      if (row.hasTrigger) return;
      if (!row.condition || !TRIGGERISH.test(row.condition)) return;
      const kind = kindOf(row.condition);
      if (only && kind.key !== only) return;
      found.push({ what: src.what, owner: src.name(block.key), key: block.key, index, kind, ...row });
    });
  }
}

const byKind = new Map();
for (const row of found) {
  if (!byKind.has(row.kind.key)) byKind.set(row.kind.key, []);
  byKind.get(row.kind.key).push(row);
}

const order = KINDS.map((k) => k.key);
const doable = order.filter((k) => byKind.has(k)).reduce((n, k) => n + byKind.get(k).length, 0);
const blocked = byKind.get("못 거는 것") ?? [];

console.log(`자동 발동을 지금 걸 수 있는 줄 ${doable}개 · 장치가 더 필요한 줄 ${blocked.length}개\n`);

for (const kindKey of order) {
  const rows = byKind.get(kindKey);
  if (!rows) continue;
  const weapons = rows.filter((r) => r.what === "무기").length;
  console.log(
    `\n${"═".repeat(100)}\n■ ${kindKey} ${rows.length}줄 (무기 ${weapons} · 에코 ${rows.length - weapons})` +
      `  →  triggeredByType: ["${rows[0].kind.type}"]\n`,
  );
  let owner = "";
  for (const row of rows) {
    if (row.owner !== owner) {
      owner = row.owner;
      console.log(`  ${row.what} · ${owner}  [${row.key}]`);
    }
    const also = kindsOf(row.condition).filter((k) => k.key !== kindKey);
    const tail = also.length > 0 ? `  ← ${[row.kind.type, ...also.map((k) => k.type)].map((t) => `"${t}"`).join(" · ")} 둘 다` : "";
    console.log(`    ${row.uptime === "active" ? "·" : "!"} ${row.label} — ${row.condition}${tail}`);
  }
}

if (blocked.length > 0 && !only) {
  console.log(`\n${"═".repeat(100)}\n■ 지금 장치로는 못 거는 줄 ${blocked.length}개\n`);
  const byWhy = new Map();
  for (const row of blocked) {
    if (!byWhy.has(row.kind.why)) byWhy.set(row.kind.why, []);
    byWhy.get(row.kind.why).push(row);
  }
  for (const [why, rows] of byWhy) {
    console.log(`  ${why} — ${rows.length}줄`);
    for (const row of rows.slice(0, 4)) console.log(`     예) ${row.owner} · ${row.label}`);
    if (rows.length > 4) console.log(`     … 그 밖 ${rows.length - 4}줄`);
  }
}

const tally = order
  .filter((k) => byKind.has(k))
  .map((k) => `${k} ${byKind.get(k).length}`)
  .join(" · ");
console.log(`\n${"═".repeat(100)}\n걸 수 있는 ${doable}줄 — ${tally}`);
console.log("자동 발동을 켜면 이미 담아 둔 루틴의 피해가 올라간다 — 갈래별로 끊어 담는다.");
console.log("한 갈래만 보려면: node scripts/report-auto-buff-candidates.mjs 변주");
