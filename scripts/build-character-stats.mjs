/**
 * api/*.json(캐릭터 원본 덤프) -> src/data/characterStats.json(레벨별 기초 스탯 표)
 *
 *   node scripts/build-character-stats.mjs
 *
 * 캐릭터 데이터 파일(src/data/characters/*.ts)의 baseStats는 레벨 90 고정값이라
 * 레벨 슬라이더가 쓸 수 없다. 원본 덤프의 Properties에는 레벨 1~90 성장표가
 * 들어 있으므로 HP/공격력/방어력 세 줄만 뽑아둔다.
 *
 * 이 파일은 다시 생성해도 되는 파일이다.
 */

import { readFileSync, writeFileSync } from "node:fs";

const OUT = "src/data/characterStats.json";

/**
 * 슬러그 -> API id 지도(src/data/characterApiIds.json)를 읽어
 * api/characters/<id>.json 을 훑는다. 캐릭터를 추가하면
 * scripts/fetch-character.mjs 가 지도에 넣어주므로 여기는 손대지 않아도 된다.
 */
const SOURCES = Object.entries(
  JSON.parse(readFileSync("src/data/characterApiIds.json", "utf8")),
).map(([id, apiId]) => ({ id, file: `api/characters/${apiId}.json` }));

/** Properties의 이름 -> Stats 키. 나머지(크리티컬 등)는 레벨과 무관해 뽑지 않는다. */
const PROP_MAP = { HP: "hp", 공격력: "atk", 방어력: "def" };

const MAX_LEVEL = 90;

/**
 * 돌파 전/후 값이 같은 정수 레벨로 두 번 들어 있다(레벨 20이 1963.83과 2467.11).
 * 뒤쪽(돌파 후) 값을 쓴다 — 게임에서 그 레벨에 도달했을 때의 실제 수치다.
 */
function levelTable(prop) {
  return Array.from({ length: MAX_LEVEL }, (_, i) => {
    const hits = prop.GrowthValues.filter((g) => g.level === i + 1);
    return hits.length ? Number(hits[hits.length - 1].value) : null;
  });
}

const out = {};
const warnings = [];

for (const { id, file } of SOURCES) {
  const role = JSON.parse(readFileSync(file, "utf8"));

  const entry = {};
  for (const prop of role.Properties ?? []) {
    const key = PROP_MAP[prop.Name];
    if (key) entry[key] = levelTable(prop);
  }

  const missing = Object.values(PROP_MAP).filter((k) => !entry[k]);
  if (missing.length) warnings.push(`${id}: ${missing.join(", ")} 없음`);
  out[id] = entry;
}

writeFileSync(OUT, JSON.stringify(out), "utf8");

console.error(`${Object.keys(out).length} characters -> ${OUT}`);
for (const w of warnings) console.error(`확인 필요: ${w}`);
