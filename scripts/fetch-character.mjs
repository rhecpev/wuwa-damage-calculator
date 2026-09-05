/**
 * 캐릭터 원본 하나를 받아 api/characters/<id>.json 으로 저장한다.
 *
 *   node scripts/fetch-character.mjs 1409
 *   node scripts/fetch-character.mjs 1409 cartethyia   # 슬러그까지 지도에 등록
 *
 * 슬러그를 같이 주면 src/data/characterApiIds.json 에 기록해서
 * 레벨·노드·공명체인 표를 만드는 스크립트가 이 캐릭터를 찾을 수 있게 한다.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const [id, slug] = process.argv.slice(2);
if (!id) {
  console.error("usage: node scripts/fetch-character.mjs <apiId> [slug]");
  process.exit(2);
}

const res = await fetch(`https://api.encore.moe/ko/character/${id}`);
if (!res.ok) {
  console.error(`${id}: HTTP ${res.status}`);
  process.exit(1);
}
const role = await res.json();

mkdirSync("api/characters", { recursive: true });
writeFileSync(`api/characters/${id}.json`, JSON.stringify(role), "utf8");

const name = role?.Name?.Content ?? role?.Name ?? id;
console.error(`${name} (${id}) -> api/characters/${id}.json`);
console.error(
  `  Properties ${role.Properties?.length ?? 0} · Skills ${role.Skills?.length ?? 0}` +
    ` · SkillTree ${role.SkillTree?.length ?? 0} · ResonantChain ${role.ResonantChain?.length ?? 0}`,
);

if (slug) {
  const MAP = "src/data/characterApiIds.json";
  const map = existsSync(MAP) ? JSON.parse(readFileSync(MAP, "utf8")) : {};
  map[slug] = Number(id);
  writeFileSync(MAP, JSON.stringify(map, null, 2) + "\n", "utf8");
  console.error(`  지도에 등록: ${slug} -> ${id}`);
}
