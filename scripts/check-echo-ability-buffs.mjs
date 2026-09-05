import { readFileSync } from "node:fs";

/**
 * 에코 어빌리티의 「메인 슬롯 장착 시」 버프가 빠지지 않았는지 본다.
 *
 * 1번 자리에 낀 에코만 어빌리티가 열리고, 그 설명에 「메인 슬롯에 … 장착 시 …」로 적힌 것은
 * 끼고만 있으면 늘 걸리는 상시 개인 버프다. 그런데 이 표(src/data/echoBuffs.ts의
 * echoAbilityBuffs)는 사람이 원문을 보고 옮겨 적는 것이라, 옮기지 못한 것을 빈 배열과
 * 주석으로 남겨 두는 자리가 있다. 그 주석이 틀리면(옮길 수 있는데 못 옮긴다고 적어 두면)
 * 버프가 조용히 사라진 채로 남는다 — 실제로 금희 에코 9개가 그랬다.
 *
 * 그래서 원문에 「메인 슬롯」이 있는 에코는 전부 등록을 요구하고, 정말 옮길 수 없는 것만
 * 아래 SKIP에 이유를 적어 예외로 둔다. 예외에 적으려면 이유가 있어야 하므로,
 * 「귀찮아서 건너뛴 것」이 예외에 섞여 들어가기 어렵다.
 */

/** 원문에 「메인 슬롯」이 있지만 피해식에 옮길 자리가 없어 비워 두는 것. 이유를 반드시 적는다. */
const SKIP = {
  "6000216": "치료 효과 보너스 — BuffTarget에 치료 자리가 없고 치료는 피해식에 들어가지 않는다",
  "6010216": "봉정계유(6000216)와 같다",
  "391090205": "봉정계유(6000216)와 같다",
};

const details = JSON.parse(readFileSync("src/data/echoDetails.json", "utf8")).echoes;
const catalog = JSON.parse(readFileSync("src/data/echo.json", "utf8")).Echo;
const nameOf = new Map(catalog.map((e) => [String(e.Id), e.Name]));

const source = readFileSync("src/data/echoBuffs.ts", "utf8");
const block = source.slice(source.indexOf("export const echoAbilityBuffs"));
const filled = new Set([...block.matchAll(/\r?\n {2}"(\d+)": \[\r?\n/g)].map((m) => m[1]));
const empty = new Set([...block.matchAll(/\r?\n {2}"(\d+)": \[\],/g)].map((m) => m[1]));

const wanted = Object.entries(details).filter(([, v]) => (v.skill ?? "").includes("메인 슬롯"));

const missing = [];
const unregistered = [];
const staleSkips = [];

for (const [id] of wanted) {
  if (filled.has(id)) continue;
  if (SKIP[id]) continue;
  if (empty.has(id)) missing.push(id);
  else unregistered.push(id);
}

// 예외로 적어 두었는데 실제로는 채워져 있다면, 그 예외는 이제 거짓말이다.
for (const id of Object.keys(SKIP)) if (filled.has(id)) staleSkips.push(id);

const label = (id) => `${id} ${nameOf.get(id) ?? "(도감에 없음)"}`;

console.log(`원문에 「메인 슬롯」이 있는 에코 ${wanted.length}개 · 예외 ${Object.keys(SKIP).length}개`);

const report = (title, list, hint) => {
  console.log(`${title}: ${list.length}건`);
  for (const id of list) console.log(`  ${label(id)}${hint ? ` — ${hint}` : ""}`);
};

report("빈 배열로 남아 버프가 빠진 것", missing, "echoAbilityBuffs에 채우거나 SKIP에 이유를 적어야 한다");
report("표에 아예 없는 것", unregistered);
report("SKIP에 적혔는데 실제로는 채워진 것", staleSkips, "SKIP에서 지워야 한다");

const failed = missing.length + unregistered.length + staleSkips.length;
if (failed > 0) process.exit(1);
