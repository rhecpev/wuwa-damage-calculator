/**
 * encore.moe API v2에서 리소스 목록과 상세를 전부 받아 api/<resource>.json 으로 저장한다.
 *
 *   node scripts/fetch-encore.mjs weapon
 *   node scripts/fetch-encore.mjs character --lang ko
 *   node scripts/fetch-encore.mjs character 1210        # 단건만
 *
 * 저장 형식: { source, fetchedAt, count, items: [...상세 원본 그대로] }
 * 원본을 손대지 않고 통째로 남긴다. 가공은 build-*.mjs 가 맡는다.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const BASE = "https://api-v2.encore.moe/api";
const CONCURRENCY = 6;

const args = process.argv.slice(2);
const resource = args[0];
const singleId = args[1] && !args[1].startsWith("--") ? args[1] : null;
const lang = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : "ko";

if (!resource) {
  console.error("usage: node scripts/fetch-encore.mjs <resource> [id] [--lang ko]");
  console.error("resources: weapon character echo monster item toa fotg ...");
  process.exit(1);
}

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      if (i === tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
}

/** 목록 응답의 배열 필드 이름이 리소스마다 달라서(weapons, monsterList, ...) 첫 배열을 찾는다. */
function listOf(payload) {
  if (Array.isArray(payload)) return payload;
  const arr = Object.values(payload).find(Array.isArray);
  if (!arr) throw new Error(`목록 배열을 찾지 못했습니다: ${Object.keys(payload)}`);
  return arr;
}

/** 항목마다 id 필드 이름이 다르다(Id, ItemId, ...). */
const idOf = (item) => item.Id ?? item.ItemId ?? item.id;

const listUrl = `${BASE}/${lang}/${resource}`;

let items;
if (singleId) {
  items = [await get(`${listUrl}/${singleId}`)];
} else {
  const list = listOf(await get(listUrl));
  items = new Array(list.length);

  let cursor = 0;
  let done = 0;
  const worker = async () => {
    while (cursor < list.length) {
      const i = cursor++;
      items[i] = await get(`${listUrl}/${idOf(list[i])}`);
      if (++done % 20 === 0) console.error(`  ${done}/${list.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

const out = resolve(process.cwd(), "api", `${resource}.json`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify(
    { source: listUrl, fetchedAt: new Date().toISOString(), count: items.length, items },
    null,
    0,
  ),
  "utf8",
);

const missing = items.filter((x) => !x || idOf(x) === undefined).length;
console.error(`saved ${items.length} ${resource}(s) -> api/${resource}.json (missing=${missing})`);
