/**
 * encore.moe 에코 상세 -> src/data/echoDetails.json
 *
 *   node scripts/fetch-echo-details.mjs
 *
 * src/data/echo.json(목록)에는 에코 어빌리티 본문과 화음 세트 효과 수치가 없다.
 * 상세 엔드포인트(/ko/echo/{id})에만 들어 있어서 297종을 한 번씩 받아 추려둔다.
 *
 *   echoes[에코id] = { skill, simple, cooldown }   에코 어빌리티
 *   fetters[화음이름] = { keys:[2,5], descriptions:[...] }  세트 효과
 *
 * 화음 설명은 어느 에코에서 받아도 같아서 이름 하나당 한 벌만 남긴다.
 * 이 파일은 다시 생성해도 되는 파일이다.
 */
import { readFileSync, writeFileSync } from "node:fs";

const IN = "src/data/echo.json";
const OUT = "src/data/echoDetails.json";
const BASE = "https://api.encore.moe/ko/echo";
const CONCURRENCY = 8;

/** <br>은 줄바꿈으로, 나머지 태그는 지운다. */
const clean = (t) =>
  String(t ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

const ids = JSON.parse(readFileSync(IN, "utf8")).Echo.map((e) => String(e.Id));

const echoes = {};
const fetters = {};
let done = 0;
let failed = 0;

async function one(id) {
  try {
    const res = await fetch(`${BASE}/${id}`);
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();

    if (d.Skill?.DescriptionEx) {
      echoes[id] = {
        skill: clean(d.Skill.DescriptionEx),
        simple: clean(d.Skill.SimplyDescription),
        cooldown: d.Skill.SkillCD ?? null,
      };
    }

    // 화음 효과 — 이름당 한 벌만. 먼저 받은 것이 이기게 두면 충분하다(내용이 같다).
    for (const [name, detail] of Object.entries(d.FetterDetails ?? {})) {
      if (fetters[name]) continue;
      fetters[name] = {
        keys: detail.EffectKeys ?? [],
        descriptions: (detail.EffectDescriptions ?? []).map(clean),
      };
    }
  } catch (err) {
    failed++;
    console.error(`  ${id}: ${err.message}`);
  } finally {
    done++;
    if (done % 40 === 0) console.error(`  ${done}/${ids.length}`);
  }
}

// 동시에 CONCURRENCY개씩만 굴린다 — 한꺼번에 297개를 던지면 거절당한다.
const queue = [...ids];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await one(queue.shift());
  }),
);

writeFileSync(OUT, JSON.stringify({ echoes, fetters }), "utf8");
console.error(
  `에코 어빌리티 ${Object.keys(echoes).length}종 · 화음 ${Object.keys(fetters).length}종 -> ${OUT}` +
    (failed ? ` (실패 ${failed})` : ""),
);
