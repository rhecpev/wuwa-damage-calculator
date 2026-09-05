/**
 * api/*.json(캐릭터 원본 덤프) -> src/data/characterNodes.json(스킬 트리 스탯 노드)
 *
 *   node scripts/build-character-nodes.mjs
 *
 * 게임 스킬 트리에서 스킬 아이콘 위에 달리는 동그란 스탯 노드 8개다.
 * 4갈래(기본 공격 · 공명 스킬 · 공명 해방 · 변주 스킬)에 두 개씩 붙는다.
 * 덤프의 SkillTree 순서가 곧 그 배치라, 앞 4개가 아래줄(작은 값)이고
 * 뒤 4개가 윗줄(큰 값)이다.
 *
 * 이 파일은 다시 생성해도 되는 파일이다.
 */

import { readFileSync, writeFileSync } from "node:fs";

const OUT = "src/data/characterNodes.json";

/**
 * 슬러그 -> API id 지도(src/data/characterApiIds.json)를 읽어
 * api/characters/<id>.json 을 훑는다. 캐릭터를 추가하면
 * scripts/fetch-character.mjs 가 지도에 넣어주므로 여기는 손대지 않아도 된다.
 */
const SOURCES = Object.entries(
  JSON.parse(readFileSync("src/data/characterApiIds.json", "utf8")),
).map(([id, apiId]) => ({ id, file: `api/characters/${apiId}.json` }));

/** 노드가 붙는 갈래. 덤프 순서(0~3)가 이 순서다. */
const BRANCHES = ["Basic", "Skill", "Liberation", "Variation"];

/** 설명 문구 앞부분 -> Stats 키. "공격력이 1.80% 증가한다" 같은 한 줄을 읽는다. */
const STAT_MAP = {
  공격력: "atkPercent",
  HP: "hpPercent",
  방어력: "defPercent",
  크리티컬: "critRate",
  "크리티컬 피해": "critDamage",
  "공명 효율": "energyRegen",
  "치료 효과 보너스": "healingBonus",
  "기류 피해 보너스": "aeroDamageBonus",
  "응결 피해 보너스": "glacioDamageBonus",
  "전도 피해 보너스": "electroDamageBonus",
  "용융 피해 보너스": "fusionDamageBonus",
  "인멸 피해 보너스": "havocDamageBonus",
  "회절 피해 보너스": "spectroDamageBonus",
  "일반공격 피해 보너스": "basicDamageBonus",
  "강공격 피해 보너스": "heavyDamageBonus",
  "공명스킬 피해 보너스": "skillDamageBonus",
  "공명해방 피해 보너스": "liberationDamageBonus",
};

const ICON_BASE = "https://api.encore.moe/resource/Data";

/** "인멸 피해 보너스가 4.20% 증가한다" -> { havocDamageBonus: 0.042 } */
function parseStats(describe, unmapped) {
  const m = String(describe).match(/^(.+?)(?:이|가)\s+([\d.]+)%\s*증가/);
  if (!m) {
    unmapped.add(describe);
    return {};
  }
  const key = STAT_MAP[m[1].trim()];
  if (!key) {
    unmapped.add(m[1].trim());
    return {};
  }
  // 1.80% -> 0.018. 부동소수점 찌꺼기가 남지 않도록 자릿수를 끊는다.
  return { [key]: Math.round((parseFloat(m[2]) / 100) * 1e6) / 1e6 };
}

const out = {};
const unmapped = new Set();

for (const { id, file } of SOURCES) {
  const role = JSON.parse(readFileSync(file, "utf8"));
  const tree = role.SkillTree ?? [];

  out[id] = tree.map((node, index) => ({
    id: String(node.Id),
    title: node.PropertyNodeTitle,
    description: node.PropertyNodeDescribe,
    icon: node.PropertyNodeIcon ? ICON_BASE + node.PropertyNodeIcon : null,
    // 같은 자리(index % 4)가 같은 갈래다. 위아래는 바로 아래에서 값 크기로 정한다.
    branch: BRANCHES[index % 4],
    row: "lower",
    stats: parseStats(node.PropertyNodeDescribe, unmapped),
  }));

  // 위아래는 인덱스가 아니라 값 크기로 정한다 — 캐릭터마다 덤프 순서가 다르다
  // (단근은 작은 값이 앞, 벨리나는 큰 값이 앞). 게임 배치에서 스킬에 가까운
  // 아래 노드가 작은 값이고 위 노드가 큰 값이다.
  for (const branch of BRANCHES) {
    const pair = out[id].filter((n) => n.branch === branch);
    if (pair.length !== 2) continue;
    const size = (n) => Object.values(n.stats)[0] ?? 0;
    const [small, big] = size(pair[0]) <= size(pair[1]) ? pair : [pair[1], pair[0]];
    small.row = "lower";
    big.row = "upper";
  }
}

writeFileSync(OUT, JSON.stringify(out), "utf8");

console.error(
  `${Object.entries(out)
    .map(([id, nodes]) => `${id} ${nodes.length}`)
    .join(", ")} -> ${OUT}`,
);
if (unmapped.size) console.error(`해석 못한 문구: ${[...unmapped].join(" / ")}`);
