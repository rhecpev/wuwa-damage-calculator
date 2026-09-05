/**
 * api/*.json(캐릭터 원본 덤프) -> src/data/characterChains.json(공명체인 6단계)
 *
 *   node scripts/build-character-chains.mjs
 *
 * 화면에 그릴 이름 · 설명 · 아이콘만 뽑는다.
 * 계산에 들어가는 수치는 사람이 해석해서 캐릭터 파일의 passiveBuffs / chainEffects에 적는다
 * — 여기 설명문은 표시 전용이다.
 *
 * 이 파일은 다시 생성해도 되는 파일이다.
 */

import { readFileSync, writeFileSync } from "node:fs";

const OUT = "src/data/characterChains.json";

/**
 * 슬러그 -> API id 지도(src/data/characterApiIds.json)를 읽어
 * api/characters/<id>.json 을 훑는다. 캐릭터를 추가하면
 * scripts/fetch-character.mjs 가 지도에 넣어주므로 여기는 손대지 않아도 된다.
 */
const SOURCES = Object.entries(
  JSON.parse(readFileSync("src/data/characterApiIds.json", "utf8")),
).map(([id, apiId]) => ({ id, file: `api/characters/${apiId}.json` }));

const ICON_BASE = "https://api.encore.moe/resource/Data";

/** 설명문에는 색 강조용 span과 용어 링크(te) 태그가 섞여 있다. 글자만 남긴다. */
const stripHtml = (t) =>
  String(t ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const out = {};

for (const { id, file } of SOURCES) {
  const role = JSON.parse(readFileSync(file, "utf8"));

  out[id] = (role.ResonantChain ?? []).map((node, index) => ({
    // GroupIndex가 몇 번째 체인인지(1~6). 없으면 배열 순서로 메운다.
    chain: Number(node.GroupIndex) || index + 1,
    name: node.NodeName,
    description: stripHtml(node.AttributesDescription),
    icon: node.NodeIcon ? ICON_BASE + node.NodeIcon : null,
  }));
}

writeFileSync(OUT, JSON.stringify(out), "utf8");

console.error(
  `${Object.entries(out)
    .map(([id, list]) => `${id} ${list.length}`)
    .join(", ")} -> ${OUT}`,
);
