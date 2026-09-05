// 공격 트리거 자료 감사 — `node scripts/check-attack-triggers.mjs`
//
// 손으로 옮겨 적은 자료라 눈으로는 안 잡히는 사고가 다섯 가지 난다.
//   ① 있지도 않은 공격 id에 트리거를 달아 화면에 영영 안 뜨는 것
//   ② source에 적은 근거가 실은 그 캐릭터 원문에 없는 것(다른 캐릭터 문장을 옮겨 붙였거나 지어낸 것)
//   ③ amount에 적은 수치가 근거 문장의 숫자와 다른 것
//   ④ 붙이는 이상 효과를 characterAnomalies.ts가 선언하지 않아 팔레트에서 빠지는 것
//   ⑤ 같은 트리거를 두 번 적었거나, 넣고 빼는 것이 조건 없이 나란히 선 것
// 다섯 다 계산은 멀쩡히 돌아가므로 숫자만 봐서는 못 잡는다. 그래서 자료 쪽에서 직접 본다.
//
// 나가는 값이 0이 아니면 종료 코드 1이다. 회차마다 돌려서 늘어나지 않는지 본다.

import fs from "node:fs";
import path from "node:path";

const CHAR_DIR = "src/data/characters";
const strip = (s) => s.replace(/[「」\s·]/g, "");

/** 공격 id -> { 파일명, 캐릭터 텍스트 키 } */
function buildOwners() {
  const owners = new Map();
  for (const file of fs.readdirSync(CHAR_DIR).filter((f) => f.endsWith(".ts"))) {
    const src = fs.readFileSync(path.join(CHAR_DIR, file), "utf8");
    // 줄 끝이 CRLF인 파일이 섞여 있다 — \r을 넘겨 짚지 않으면 캐릭터 열세 명을 놓친다.
    const key = src.match(/\n {2}id: "([a-z0-9-]+)",\r?\n {2}name:/)?.[1] ?? null;
    for (const m of src.matchAll(/id: "(\d+_\d+)"/g)) {
      owners.set(m[1], { file: file.slice(0, -3), key });
    }
  }
  return owners;
}

/** 그 캐릭터의 스킬·체인 원문을 한 덩어리로. 비교용으로 괄호와 공백은 지운다. */
function buildCorpus(texts) {
  const corpus = new Map();
  for (const [key, value] of Object.entries(texts)) {
    const parts = [
      ...(value.skills ?? []).map((s) => (typeof s === "string" ? s : s.text)),
      ...(value.chain ?? []).map((c) => (typeof c === "string" ? c : c.text)),
    ];
    corpus.set(key, strip(parts.join("\n")));
  }
  return corpus;
}

/** a와 b의 가장 긴 공통 부분문자열 길이. a가 짧은 쪽이다. */
function longestCommon(a, b) {
  let best = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a.length - i <= best) break;
    for (let j = a.length; j > i + best; j -= 1) {
      if (b.includes(a.slice(i, j))) {
        best = j - i;
        break;
      }
    }
  }
  return best;
}

/**
 * ④ 이상 효과 선언(characterAnomalies.ts)과 실제 트리거가 어긋나는지.
 *    선언은 「누가 무엇을 붙일 수 있는지」의 표라, 붙이는 트리거가 있는데 선언이 없으면
 *    공격 팔레트에 그 이상 효과 버튼이 안 뜬다 — 화면에서만 조용히 빠지는 사고다.
 *    반대쪽(선언은 있는데 add가 없는 것)은 치사처럼 남의 공격을 거쳐 붙는 경우가 있어
 *    경고로만 남기고 실패로 세지 않는다.
 */
function buildDeclaredAnomalies() {
  const src = fs.readFileSync("src/data/characterAnomalies.ts", "utf8");
  const out = new Map();
  for (const m of src.matchAll(/^\s*"?([a-z0-9-]+)"?: \[([^\]]*)\]/gm)) {
    out.set(m[1], new Set([...m[2].matchAll(/"(\w+)"/g)].map((x) => x[1])));
  }
  return out;
}

const owners = buildOwners();
const declaredAnomalies = buildDeclaredAnomalies();
const addedAnomalies = new Map();
const corpus = buildCorpus(JSON.parse(fs.readFileSync("src/data/characterTexts.json", "utf8")));
const data = fs.readFileSync("src/data/attackTriggers.ts", "utf8");

const problems = { unknownId: [], weakSource: [], amountMismatch: [], anomalyNotDeclared: [], duplicate: [], bareContradiction: [] };
let attacks = 0;
let triggers = 0;

for (const [, attackId, body] of data.matchAll(/\n {2}"(\d+_\d+)": \[(.*?)\n {2}\],/gs)) {
  attacks += 1;
  // ⑤ 한 공격 안에서 같은 것을 두 번 적었거나, 같은 자원을 조건 없이 넣고 빼는 자리.
  //    자료를 append로 덧붙이며 늘려 왔기 때문에 같은 줄이 두 번 들어가기 쉽다.
  //    넣고 빼는 것이 함께 있는 것 자체는 정상일 수 있으나(양양 · 현령의 암흑 1소모 / 6추가),
  //    그때는 어느 쪽이 어떤 조건인지 condition에 적혀 있어야 카드에서 읽힌다.
  {
    const seen = new Set();
    const byName = new Map();
    for (const [, ent] of body.matchAll(/\{\n(.*?)\n {4}\},/gs)) {
      const act = ent.match(/action: "(\w+)"/)?.[1];
      const name = ent.match(/\n {6}(?:resource|status|anomaly): "(.*?)",/)?.[1];
      if (!name) continue;
      const cond = ent.match(/\n {6}condition: "(.*?)",/)?.[1] ?? "";
      const key = `${act}|${name}|${cond}`;
      if (seen.has(key)) problems.duplicate.push(`${attackId} — ${act} ${name}`);
      seen.add(key);
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push({ act, hasCond: cond.length > 0 });
    }
    for (const [name, list] of byName) {
      if (new Set(list.map((x) => x.act)).size > 1 && !list.every((x) => x.hasCond)) {
        problems.bareContradiction.push(`${attackId} — ${name} (넣고 빼는데 조건이 비어 있다)`);
      }
    }
  }
  const owner = owners.get(attackId);
  if (!owner) {
    problems.unknownId.push(attackId);
    continue;
  }
  const text = corpus.get(owner.key);

  for (const [, entry] of body.matchAll(/\{\n(.*?)\n {4}\},/gs)) {
    triggers += 1;
    const source = entry.match(/\n {6}source: "(.*?)",/)?.[1];
    const amount = entry.match(/\n {6}amount: (\d+),/)?.[1];

    // ② 근거가 그 캐릭터 원문에 실제로 있는가.
    //    우리가 붙인 「— 스킬 이름」 같은 꼬리표 때문에 통째로는 안 맞으므로
    //    가장 길게 겹치는 토막으로 본다. 15자면 우연히 겹칠 길이가 아니다.
    if (source && text && longestCommon(strip(source), text) < 15) {
      problems.weakSource.push(`${owner.file} ${attackId} — ${source.slice(0, 80)}`);
    }
    // ④ 붙이는 이상 효과를 characterAnomalies가 선언하고 있는가.
    const anomaly = entry.match(/\n {6}anomaly: "(\w+)",/)?.[1];
    if (anomaly && /action: "add"/.test(entry)) {
      if (!addedAnomalies.has(owner.key)) addedAnomalies.set(owner.key, new Set());
      addedAnomalies.get(owner.key).add(anomaly);
    }
    // ③ amount의 숫자가 근거 문장에 있는가.
    //    원문에 수치가 없어 사람이 읽어 넣은 자리는 condition에 그 사실을 적어 두었다 —
    //    그런 자리까지 매번 걸리면 진짜 오타가 그 사이에 묻힌다. 그래서 건너뛴다.
    const inferred = /원문에 (횟수|수치|개수)가 없어/.test(entry);
    if (source && amount && !inferred && !new RegExp(`(?<!\\d)${amount}(?!\\d)`).test(source)) {
      problems.amountMismatch.push(`${owner.file} ${attackId} amount=${amount} — ${source.slice(0, 80)}`);
    }
  }
}

for (const [key, kinds] of addedAnomalies) {
  const declared = declaredAnomalies.get(key) ?? new Set();
  for (const kind of kinds) {
    if (!declared.has(kind)) problems.anomalyNotDeclared.push(`${key} — ${kind}`);
  }
}

console.log(`공격 ${attacks}개 · 트리거 ${triggers}개`);
let failed = 0;
for (const [name, label] of [
  ["unknownId", "캐릭터 자료에 없는 공격 id"],
  ["weakSource", "원문에서 근거를 찾지 못한 source"],
  ["amountMismatch", "근거 문장의 숫자와 어긋나는 amount"],
  ["anomalyNotDeclared", "characterAnomalies.ts가 선언하지 않은 이상 효과"],
  ["duplicate", "한 공격에 똑같이 두 번 적힌 트리거"],
  ["bareContradiction", "같은 자원을 조건 없이 넣고 빼는 자리"],
]) {
  const list = problems[name];
  console.log(`${label}: ${list.length}건`);
  for (const line of list) console.log(`  ${line}`);
  failed += list.length;
}
process.exit(failed === 0 ? 0 : 1);
