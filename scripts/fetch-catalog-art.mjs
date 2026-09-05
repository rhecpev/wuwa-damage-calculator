/**
 * 서명을 만들 밑그림을 내려받는다 — 에코 아이콘 · 화음(세트) 아이콘 · 캐릭터 파일아트.
 * tmp/ 아래에만 쌓이고 저장소에는 들어가지 않는다. build-icon-signatures.mjs 참고.
 */
import fs from "node:fs";
import path from "node:path";
import echoData from "../src/data/echo.json" with { type: "json" };

const jobs = [];

for (const e of echoData.Echo) if (e.Icon) jobs.push(["tmp/icons", `${e.Id}.webp`, e.Icon]);

const fetters = new Map();
for (const e of echoData.Echo)
  for (const g of e.FetterGroups ?? [])
    if (g.Icon) fetters.set(path.basename(g.Icon, ".webp"), g.Icon);
for (const [name, url] of fetters) jobs.push(["tmp/fetters", `${name}.webp`, url]);

// 캐릭터는 프로필 카드에 쓰이는 반신 그림(FormationRoleCard)이 필요하다.
for (const f of fs.readdirSync("api/characters")) {
  const c = JSON.parse(fs.readFileSync(path.join("api/characters", f), "utf8"));
  if (c.FormationRoleCard) jobs.push(["tmp/piles", `${c.Id}.webp`, c.FormationRoleCard]);
}

for (const dir of new Set(jobs.map((j) => j[0]))) fs.mkdirSync(dir, { recursive: true });

let done = 0;
let skipped = 0;
// 한 번에 열두 개씩. 도감 서버가 남의 것이라 몰아치지 않는다.
for (let i = 0; i < jobs.length; i += 12) {
  await Promise.all(
    jobs.slice(i, i + 12).map(async ([dir, name, url]) => {
      const out = path.join(dir, name);
      if (fs.existsSync(out)) {
        skipped += 1;
        return;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      done += 1;
    }),
  );
}
console.log(`받음 ${done} · 이미 있음 ${skipped} (모두 ${jobs.length})`);
