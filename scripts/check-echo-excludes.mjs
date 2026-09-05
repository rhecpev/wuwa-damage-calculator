// 에코 제외 목록 대조 — `node scripts/check-echo-excludes.mjs`
//
// 제외 목록의 정본은 src/data/excludeEcho.json 하나다. 화면 코드도 이것만 읽으므로
// 여기 담긴 내용이 곧 **모두에게 적용되는** 목록이다.
//
// 그런데 개인 저장(data/userdata.json)에는 예전 방식의 기록이 아직 남아 있다.
//   echoExcludesAdded     그때 손으로 「뺀다」고 표시한 것
//   echoExcludesRestored  뺐다가 「도로 넣는다」고 되돌린 것
// 지금 코드는 이 둘을 읽지 않는다. 다만 새 에코가 추가될 때 손으로 훑던 기록이라
// 지우지 않고 두고, 대신 정본과 어긋나지 않는지 여기서 본다.
//
//   ① added에 있는데 정본이 빼지 않는 것  → 화면에 그대로 뜬다(빠뜨린 것)
//   ② restored인데 정본이 아직 빼는 것    → 도로 넣기로 한 것이 여전히 안 보인다
//   ③ restored인데 정본 keep에 없는 것    → 다음에 스크립트가 다시 빼 버린다
//
// 개인 저장이 없으면(다른 사람의 작업 사본 등) 조용히 통과한다.

import fs from "node:fs";

const SRC = "src/data/excludeEcho.json";
const USER = "data/userdata.json";
const P = "wuwa-calc:v1:";

const source = JSON.parse(fs.readFileSync(SRC, "utf8"));
const excluded = source.excluded ?? {};
// keep은 배열(["6010068", …])이다. 예전 형식이 객체였을 수 있어 둘 다 받아 Set으로 맞춘다
// — 배열에 `in`을 쓰면 값이 아니라 인덱스를 보게 되어 전부 「없음」으로 잘못 나온다.
const keepRaw = source.keep ?? [];
const keep = new Set(Array.isArray(keepRaw) ? keepRaw : Object.keys(keepRaw));

if (!fs.existsSync(USER)) {
  console.log(`정본 ${SRC}: 제외 ${Object.keys(excluded).length}개 · keep ${keep.size}개`);
  console.log("개인 저장이 없어 대조할 것이 없습니다.");
  process.exit(0);
}

const user = JSON.parse(fs.readFileSync(USER, "utf8"));
const read = (name, fallback) => {
  const raw = user[P + name];
  if (raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const added = read("echoExcludesAdded", {});
const restored = read("echoExcludesRestored", []);

const problems = {
  notExcluded: Object.keys(added).filter((id) => !(id in excluded)),
  stillExcluded: restored.filter((id) => id in excluded),
  notKept: restored.filter((id) => !keep.has(id)),
};

console.log(
  `정본 제외 ${Object.keys(excluded).length}개 · keep ${keep.size}개 / ` +
    `개인 기록 added ${Object.keys(added).length}개 · restored ${restored.length}개`,
);

let failed = 0;
for (const [name, label] of [
  ["notExcluded", "빼기로 했는데 정본이 빼지 않는 것"],
  ["stillExcluded", "도로 넣기로 했는데 정본이 아직 빼는 것"],
  ["notKept", "도로 넣었는데 정본 keep에 없는 것(스크립트가 다시 뺀다)"],
]) {
  const list = problems[name];
  console.log(`${label}: ${list.length}건`);
  for (const id of list) console.log(`  ${id} ${added[id]?.name ?? excluded[id]?.name ?? ""}`);
  failed += list.length;
}
process.exit(failed === 0 ? 0 : 1);
