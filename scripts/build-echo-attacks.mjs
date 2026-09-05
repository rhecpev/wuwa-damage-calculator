// 에코 어빌리티 원문(src/data/echoDetails.json)에서 「피해 계수」만 추려
// src/data/echoAttacks.json을 만든다.
//
//   node scripts/build-echo-attacks.mjs
//
// 목록에서 뺄 에코도 함께 가려내 src/data/excludeEcho.json에 적는다 — 그건 씨앗이고,
// 화면에서 손으로 더 빼거나 되돌린 것은 브라우저에 따로 쌓인다(src/data/echoExcludes.ts).
//
// 원문은 사람이 읽으라고 쓴 문장이라 기계로 100% 옮길 수 없다.
// 그래서 이 스크립트는 확실한 것만 뽑고, 애매한 것은 review에 이유를 적어 남긴다.
//   - 손으로 고친 값은 src/data/echoAttackOverrides.ts에 둔다(이 파일은 덮어써진다).
//   - review가 붙은 에코는 화면에도 「검수 필요」로 뜬다.
//
// 뽑는 규칙(자세한 근거는 아래 각 정규식 옆에 적어둔다):
//   계수  "268.20%의 기류 피해" 처럼 퍼센트 뒤 30자 안에 「속성 + 피해」가 오는 것만.
//         그 사이에 증가/감소/보너스/저항 같은 말이 끼면 버프 문장이므로 버린다.
//   깡수치 "48.00%+96의 기류 피해" 의 +96. 뒤에 %가 또 오면(553.60%+276.80%) 계수 둘이다.
//   타수  퍼센트 앞뒤의 "3단" · "3회" · "매 단마다"(+ 앞선 "최대 N단").
//   기준스탯 "HP 최대치의 15.86%" → HP, "방어력의 N%" → DEF, 그 외 공격력.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(resolve(root, p), "utf-8"));

const ELEMENTS = {
  응결: "Glacio",
  용융: "Fusion",
  전도: "Electro",
  기류: "Aero",
  회절: "Spectro",
  인멸: "Havoc",
  물리: "Physical",
};
const ELEMENT_RE = Object.keys(ELEMENTS).join("|");

/** 퍼센트와 「피해」 사이에 이 말이 끼면 피해 계수가 아니라 버프 문장이다. */
const NOT_DAMAGE = ["증가", "감소", "상승", "회복", "보너스", "저항", "에너지", "무시", "실드", "치료", "부스트"];

/** 계수 + (깡수치). 깡수치 뒤에 숫자·점·%가 이어지면 그건 다음 계수다(553.60%+276.80%). */
const PCT = /(\d+(?:\.\d+)?)%(?:\+(\d+(?:\.\d+)?)(?![\d.%]))?/g;
/** 퍼센트 바로 앞의 "3단" · "3회" · "3줄기". 사이에 다른 숫자가 끼면 안 본다. */
const COUNT_BEFORE = /(\d+)\s*(?:단|회|줄기|번)[^0-9%]{0,6}$/;
/** "…피해를 3단 입힌다" 처럼 뒤에 붙는 타수. */
const COUNT_AFTER = /^[^.]{0,20}?(\d+)\s*단\s*(?:입힌|가한)/;
/** "매 단마다" 류. 이때 타수는 앞에 나온 "최대 N단"에서 가져온다. */
const EVERY = /매\s*(?:회|단|번)|각\s*단마다|매회|매번|각각/;
const MAX_COUNT = /최대\s*(\d+)\s*(?:단|회)/g;

/**
 * 어빌리티 피해 일부가 다른 분류로 판정된다고 적힌 경우.
 * 어느 타격까지 해당되는지는 문장을 읽어야 알 수 있어(대개 일부만이다) 자동으로 바꾸지 않는다.
 * 검수 메모로만 남기고, 실제 분류 변경은 echoAttackOverrides.ts에서 손으로 한다.
 */
const RECLASSIFY = [
  [/반주 스킬 피해로/, "반주 스킬"],
  [/공명 스킬 피해로/, "공명 스킬"],
  [/공명 해방 피해로/, "공명 해방"],
  [/일반 공격 피해로/, "일반 공격"],
  [/강공격 피해로/, "강공격"],
  [/협동 공격 피해로/, "협동 공격"],
];

/** "두 번 연속" 처럼 숫자가 아닌 타수. */
const NUMERALS = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10 };
const COUNT_WORD = new RegExp(`(${Object.keys(NUMERALS).join("|")})\\s*(?:번|단|회)[^0-9%]{0,6}$`);

/** 사람이 한 번 봐야 하는 문장인지. 붙은 이유를 그대로 화면에 띄운다. */
const REVIEW_HINTS = [
  [/짧게|길게/, "짧게/길게 누르기로 나뉜다 — 실제로 쓴 쪽만 남겨야 한다"],
  [/회차/, "사용 회차마다 계수가 다르다 — 회차별로 나눠야 한다"],
  [/받으면|받을 때|반격/, "반격·피격 조건이 붙어 있다 — 상황에 따라 안 들어간다"],
  [/초당|초마다/, "지속 피해(초당·N초마다)가 섞여 있다 — 지속 시간만큼 타수를 곱해야 한다"],
  [/혹은|또는/, "갈라지는 조건이 있다"],
];

const details = read("src/data/echoDetails.json").echoes;
const catalogList = read("src/data/echo.json").Echo;
const catalog = new Map(catalogList.map((e) => [String(e.Id), e]));

/**
 * 계산에 쓸 일이 없어서 빼는 에코를 가려낸다.
 *
 * 덤프에는 실제로 끼고 쓰는 에코 말고도 다른 계열이 섞여 있다. 그대로 두면
 * 목록이 두 배로 불어나고, 이름이 같은 다른 계열이 섞여 잘못 고르기 쉽다.
 * 뺀 것은 버리지 않고 excluded에 이유와 함께 남긴다 — 왜 없는지 나중에 알 수 있도록.
 *
 * ① 새알심 (6030xxx, 12종)
 *    금희 · 장리 · 카카루처럼 캐릭터 이름을 달고 나오는 미니게임용이다.
 *    본문에 「새알심」이 들어가는 에코가 정확히 이 12종뿐인 것을 확인했다.
 *
 * ② 「이상 · XX」 중복 (43종)
 *    이름에서 「이상 · 」만 떼면 같은 이름이 따로 있고, 어빌리티 원문까지 글자 그대로
 *    같은 것들이다. 완전히 겹치므로 「이상」이 붙은 쪽을 뺀다.
 *    원문이 다르면(같은 「이상 · 무망자」라도 내용이 다른 것이 있다) 남긴다 — 그건 다른 에코다.
 */
const skillOf = (id) => details[String(id)]?.skill ?? "";
/** 공백을 지운 원문. 줄바꿈·띄어쓰기만 다른 것을 같은 것으로 보기 위한 비교용. */
const squashed = (id) => skillOf(id).replace(/\s+/g, "");

const byName = new Map();
for (const echo of catalogList) {
  const list = byName.get(echo.Name);
  if (list) list.push(echo);
  else byName.set(echo.Name, [echo]);
}

/** 이 에코를 뺄 이유. 뺄 것이 없으면 null. */
function exclusionReason(id) {
  const echo = catalog.get(String(id));
  if (!echo) return null;

  if (skillOf(id).includes("새알심")) return "새알심 — 미니게임용이라 계산에 쓰지 않는다";

  const base = /^이상\s*·\s*(.+)$/.exec(echo.Name)?.[1];
  if (base) {
    const text = squashed(id);
    const twin = text && (byName.get(base) ?? []).find((c) => squashed(c.Id) === text);
    if (twin) return `「${base}」(${twin.Id})와 이름·원문이 같은 중복 — 「이상」이 붙은 쪽을 뺀다`;
  }

  return null;
}

/** 원문 한 벌에서 피해 계수를 순서대로 뽑는다. */
function parseHits(text) {
  // 「스킬 쿨타임: 8초」는 피해와 무관한 숫자라 지운다.
  //
  // 줄 단위로 버리면 안 된다 — 새알심 에코(6030xxx)처럼 코어 스킬 설명과 쿨타임이
  // 한 줄에 붙어 있는 것들이 있어서, 줄을 통째로 버리면 그 줄의 피해 계수까지 같이 날아간다.
  // 그래서 쿨타임 구절만 도려낸다. 「쿨타임이 50% 감소」 같은 버프 문장은
  // 어차피 NOT_DAMAGE가 걸러내므로 손대지 않는다.
  const body = text.replace(/(?:스킬\s*)?쿨타임\s*[::]\s*[\d.]+\s*초/g, " ");

  const hits = [];
  for (const m of body.matchAll(PCT)) {
    const tail = body.slice(m.index + m[0].length, m.index + m[0].length + 30);
    const at = tail.indexOf("피해");
    if (at < 0) continue;

    const gap = tail.slice(0, at);
    if (NOT_DAMAGE.some((word) => gap.includes(word))) continue;
    if (tail.slice(at + 2).trimStart().startsWith("보너스")) continue;

    const element = gap.match(ELEMENT_RE);
    if (!element) continue; // 속성이 안 적힌 것은 치료·실드처럼 피해가 아닌 경우가 많다

    const head = body.slice(Math.max(0, m.index - 25), m.index);

    // 타수 — 앞에 붙은 "3단"이 우선, 없으면 뒤의 "3단 입힌다", 그것도 없으면 "매 단마다 + 최대 N단".
    let count = 1;
    const before = head.match(COUNT_BEFORE);
    const word = head.match(COUNT_WORD);
    const after = tail.slice(at).match(COUNT_AFTER);
    if (before) count = Number(before[1]);
    else if (word) count = NUMERALS[word[1]];
    else if (after) count = Number(after[1]);
    else if (EVERY.test(head)) {
      const maxes = [...body.slice(0, m.index).matchAll(MAX_COUNT)];
      if (maxes.length) count = Number(maxes[maxes.length - 1][1]);
    }
    if (count > 30) count = 1; // "최대 100회" 같은 표현에 끌려가지 않게

    hits.push({
      // 0.1 단위 부동소수점 찌꺼기(5.5360000000000005)가 데이터에 남지 않게 자른다.
      motionValue: Math.round(Number(m[1]) * 1e4) / 1e6,
      fixedDamage: m[2] ? Number(m[2]) : 0,
      element: ELEMENTS[element[0]],
      // "HP 최대치의 15.86%에 해당하는 회절 피해" 처럼 기준 스탯이 공격력이 아닌 것이 있다.
      scalingStat: /HP 최대치의\s*$|HP의\s*$/.test(head) ? "HP" : /방어력의\s*$/.test(head) ? "DEF" : "ATK",
      count,
      /** 원문에서 이 계수가 나온 자리. 검수할 때 눈으로 대조하려고 남긴다. */
      context: (head.slice(-20) + "《" + m[0] + "》" + tail.slice(0, at + 2)).replace(/\n/g, " "),
    });
  }
  return hits;
}

const out = {};
const excluded = {};
let withDamage = 0;
let needsReview = 0;

// 뺄 에코는 도감 전체를 훑어 먼저 정한다.
// 어빌리티 원문이 없는 에코(치료·제어형)도 목록에서는 똑같이 빠져야 하므로
// details가 아니라 catalog를 돈다 — 이 목록을 화면 쪽에서도 그대로 쓴다.
for (const echo of catalogList) {
  const id = String(echo.Id);
  const reason = exclusionReason(id);
  if (reason) excluded[id] = { name: echo.Name, reason };
}

// 계수는 제외 여부와 상관없이 전부 뽑아 둔다. 목록에서 뺄지는 화면이 정한다
// — 손으로 되돌리면 바로 다시 보여야 하므로 데이터 쪽에서 미리 지우지 않는다.
for (const [id, detail] of Object.entries(details)) {
  if (!detail?.skill) continue;

  const hits = parseHits(detail.skill);
  if (!hits.length) continue; // 치료·제어·버프 전용 에코는 공격이 없다
  withDamage += 1;

  const review = REVIEW_HINTS.filter(([re]) => re.test(detail.skill)).map(([, why]) => why);
  const elements = new Set(hits.map((h) => h.element));
  const scalings = new Set(hits.map((h) => h.scalingStat));
  if (elements.size > 1) review.push("한 어빌리티에 속성이 여러 개다");
  if (scalings.size > 1) review.push("기준 스탯이 섞여 있다");

  const reclass = RECLASSIFY.find(([re]) => re.test(detail.skill));
  if (reclass) review.push(`피해 일부가 「${reclass[1]} 피해」로 판정된다 — 어느 타격까지인지 확인 필요`);

  if (review.length) needsReview += 1;

  const entry = catalog.get(id);
  out[id] = {
    name: entry?.Name ?? id,
    cooldown: detail.cooldown ?? null,
    hits,
    ...(review.length ? { review } : {}),
    text: detail.skill,
  };
}

writeFileSync(
  resolve(root, "src/data/echoAttacks.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), echoes: out }, null, 1) + "\n",
  "utf-8",
);

// 목록에서 뺄 에코는 src/data/excludeEcho.json에 담는다.
//
// 이 파일만은 **덮어쓰지 않고 합친다.** 사람이 손으로 넣거나 뺀 결정이 들어 있어서,
// 스크립트를 다시 돌릴 때마다 날아가면 안 되기 때문이다.
//   excluded  목록에서 빼는 에코. 규칙이 찾은 것 + 사람이 넣은 것
//   keep      규칙이 뺐지만 사람이 「그대로 두기로」 정한 것 — 다시 넣지 않는다
let previous = { excluded: {}, keep: [] };
try {
  previous = read("src/data/excludeEcho.json");
} catch {
  // 첫 실행이면 파일이 없다.
}

const keep = new Set(previous.keep ?? []);
const mergedExcluded = { ...(previous.excluded ?? {}) };
let addedByRule = 0;
for (const [id, entry] of Object.entries(excluded)) {
  if (keep.has(id) || mergedExcluded[id]) continue;
  mergedExcluded[id] = entry;
  addedByRule += 1;
}

writeFileSync(
  resolve(root, "src/data/excludeEcho.json"),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), excluded: mergedExcluded, keep: [...keep] },
    null,
    1,
  ) + "\n",
  "utf-8",
);

console.log(
  `에코 ${Object.keys(details).length}종 중 ` +
    `피해 계수가 잡힌 것 ${withDamage}종, 그중 검수 필요 ${needsReview}종 → echoAttacks.json`,
);
console.log(
  `제외 목록 ${Object.keys(mergedExcluded).length}종` +
    `(이번에 규칙으로 새로 추가 ${addedByRule}종 · 그대로 두기로 한 것 ${keep.size}종)` +
    ` → excludeEcho.json`,
);
