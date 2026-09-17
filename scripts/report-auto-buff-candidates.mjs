// 자동 발동(triggeredBy · triggeredByType)을 걸 수 있는 무기 · 에코 버프 목록 —
//   `npm run report:autobuffs` · `node scripts/report-auto-buff-candidates.mjs 변주`
//
// 조건이 「○○ 발동 후 N초」 꼴이면 루틴에서 저절로 켤 수 있다(calculator/autoBuffs.ts).
// 그 칸이 아직 비어 있는 줄을 갈래별로 모아 보여 준다.
//
// **자료는 앱과 같은 것을 읽는다** — src/data/autoBuffCandidates.ts를 esbuild로 묶어 그대로
// 불러온다. 한때 이 스크립트가 .ts를 정규식으로 훑었는데, 그러면 줄을 열 개쯤 놓쳐
// 「자동 발동 후보」 탭과 수가 어긋났다. 규칙을 한 곳에 두려고 묶어 쓰는 쪽으로 바꿨다.

import { build } from "esbuild";

const bundled = await build({
  stdin: {
    contents: 'export * from "./src/data/autoBuffCandidates";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  logLevel: "error",
});

const source = Buffer.from(bundled.outputFiles[0].text).toString("base64");
const { autoBuffCandidates, AUTO_BUFF_KINDS } = await import(
  `data:text/javascript;base64,${source}`
);

const rows = autoBuffCandidates();
const doable = rows.filter((r) => r.kinds.length > 0);
const blocked = rows.filter((r) => r.kinds.length === 0);

const only = process.argv[2];
const kinds = AUTO_BUFF_KINDS.map((k) => k.key);
if (only && only !== "못 거는 것" && !kinds.includes(only)) {
  console.error(`갈래 이름이 아닙니다: ${only}\n고를 수 있는 것 — ${kinds.join(" · ")} · 못 거는 것`);
  process.exit(1);
}

const pct = (v) => (Math.abs(v) < 5 ? `${+(v * 100).toFixed(2)}%` : String(v));
const valueText = (row) =>
  row.values.length === 0
    ? "—"
    : row.values.length === 1
      ? pct(row.values[0])
      : `${pct(row.values[0])} → ${pct(row.values[row.values.length - 1])}`;

console.log(`자동 발동을 지금 걸 수 있는 줄 ${doable.length}개 · 장치가 더 필요한 줄 ${blocked.length}개`);
console.log("같은 목록을 앱에서 보려면 「자동 발동 후보」 탭 — 거기서는 걸러 보고 한 줄씩 복사할 수 있다.");

for (const kind of AUTO_BUFF_KINDS) {
  if (only && only !== kind.key) continue;
  const list = doable.filter((r) => r.kinds.some((k) => k.key === kind.key));
  if (list.length === 0) continue;
  const weapons = list.filter((r) => r.what === "무기").length;
  console.log(
    `\n${"═".repeat(100)}\n■ ${kind.key} ${list.length}줄 (무기 ${weapons} · 에코 ${list.length - weapons})` +
      `  →  triggeredByType: ["${kind.type}"]\n`,
  );
  let owner = "";
  for (const row of list) {
    if (row.owner !== owner) {
      owner = row.owner;
      console.log(`  ${row.what} · ${owner}  [${row.key}]`);
    }
    const also = row.kinds.filter((k) => k.key !== kind.key);
    const tail = also.length > 0 ? `  ← ${row.kinds.map((k) => `"${k.type}"`).join(" · ")} 함께` : "";
    console.log(`    · ${row.label} (${row.target} ${valueText(row)}) — ${row.condition}${tail}`);
  }
}

if (!only || only === "못 거는 것") {
  console.log(`\n${"═".repeat(100)}\n■ 지금 장치로는 못 거는 줄 ${blocked.length}개\n`);
  const byWhy = new Map();
  for (const row of blocked) {
    if (!byWhy.has(row.blockedWhy)) byWhy.set(row.blockedWhy, []);
    byWhy.get(row.blockedWhy).push(row);
  }
  for (const [why, list] of byWhy) {
    console.log(`  ${why} — ${list.length}줄`);
    const show = only ? list : list.slice(0, 4);
    for (const row of show) console.log(`     · ${row.owner} · ${row.label} — ${row.condition}`);
    if (!only && list.length > 4) console.log(`     … 그 밖 ${list.length - 4}줄 (인자로 「못 거는 것」을 주면 전부)`);
  }
}

const tally = AUTO_BUFF_KINDS.map(
  (k) => `${k.key} ${doable.filter((r) => r.kinds.some((x) => x.key === k.key)).length}`,
).join(" · ");
console.log(`\n${"═".repeat(100)}\n걸 수 있는 ${doable.length}줄 — ${tally}`);
console.log("갈래 둘을 짚는 줄이 20개쯤 있어 갈래별 합은 전체보다 크다.");
console.log("자동 발동을 켜면 이미 담아 둔 루틴의 피해가 올라간다 — 갈래별로 끊어 담는다.");
