/**
 * 캐릭터 스킬·공명체인의 **원문**만 뽑아 src/data/characterTexts.json으로 저장한다.
 *
 * 버프 확인 탭이 「원문에 적힌 것」과 「우리가 버프로 옮긴 것」을 나란히 놓고 보는 화면이라
 * 원문이 필요한데, api/characters/*.json은 통째로 14MB라 그대로 들고 갈 수 없다.
 * 여기서 이름·종류·설명 세 가지만 남기면 300KB쯤으로 줄어든다.
 *
 *   node scripts/build-character-texts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import apiIds from "../src/data/characterApiIds.json" with { type: "json" };

const SRC = "api/characters";
const OUT = "src/data/characterTexts.json";

/** 도감 id → 우리 캐릭터 id. */
const slugByApiId = new Map(Object.entries(apiIds).map(([slug, id]) => [String(id), slug]));

/**
 * 설명은 색과 굵기를 입힌 HTML로 온다. 태그를 걷어 내고 줄바꿈만 살린다.
 * 굵게 칠해진 조각은 대개 스킬·상태 이름이라, 「」로 감싸 눈에 띄게 남긴다.
 */
function toText(html) {
  return String(html ?? "")
    .replace(/<span[^>]*font-bold[^>]*>(.*?)<\/span>/gs, "「$1」")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

const out = {};
let skills = 0;
let chains = 0;

for (const file of fs.readdirSync(SRC)) {
  if (!file.endsWith(".json")) continue;
  const data = JSON.parse(fs.readFileSync(path.join(SRC, file), "utf8"));
  const slug = slugByApiId.get(String(data.Id));
  if (!slug) continue;

  out[slug] = {
    skills: (data.Skills ?? []).map((s) => ({
      id: String(s.SkillId),
      type: s.SkillType ?? "",
      name: s.SkillName ?? "",
      text: toText(s.SkillDescribe),
    })),
    // 공명체인 여섯 단계. 단계 번호는 GroupIndex다 — NodeIndex는 숫자가 아니라
    // "ResonantChain_124_NodeIndex" 같은 내부 이름이라 쓸 수 없다.
    chain: (data.ResonantChain ?? []).map((c, i) => ({
      step: Number(c.GroupIndex ?? i + 1),
      name: c.NodeName ?? "",
      text: toText(c.AttributesDescription),
    })),
  };
  skills += out[slug].skills.length;
  chains += out[slug].chain.length;
}

fs.writeFileSync(OUT, JSON.stringify(out));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(
  `${OUT}: 캐릭터 ${Object.keys(out).length}명 · 스킬 ${skills}개 · 공명체인 ${chains}개 (${kb}KB)`,
);
