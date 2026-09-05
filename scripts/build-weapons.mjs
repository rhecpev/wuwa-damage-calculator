/**
 * api/weapons.json(원본 덤프) -> src/data/weapons.json(앱이 읽는 추린 데이터)
 *
 *   node scripts/build-weapons.mjs
 *
 * 이 파일은 다시 생성해도 되는 파일이다. 사람이 해석해서 적은 무기 스킬 버프는
 * src/data/weaponBuffs.ts 에 따로 있으므로 여기서 덮어써도 날아가지 않는다.
 */
import { readFileSync, writeFileSync } from "node:fs";

const IN = "api/weapons.json";
const OUT = "src/data/weapons.json";

/** API의 숫자 WeaponType -> 코드에서 쓰는 WeaponType */
const TYPE_MAP = { 1: "Broadblade", 2: "Sword", 3: "Pistols", 4: "Gauntlets", 5: "Rectifier" };

/** 부옵션 이름 -> Stats 키. 여기 없는 이름은 매핑 없이 null로 두고 경고를 띄운다. */
const STAT_MAP = {
  공격력: "atkPercent",
  크리티컬: "critRate",
  "크리티컬 피해": "critDamage",
  방어력: "defPercent",
  HP: "hpPercent",
  "공명 효율": "energyRegen",
};

/**
 * 부옵션 이름 -> dmgCalType. 공격력/HP/방어력 계산식
 *   (기초 + 무기) × (1 + Σ ~Per) + Σ ~Plus
 * 의 어느 자리로 들어가는지를 데이터에 직접 적어둔다.
 * 무기 부옵션은 전부 퍼센트라 ~Per만 나온다. 여기 없는 부옵션(크리티컬 등)은 null.
 */
const DMG_CAL_TYPE_MAP = {
  공격력: "atkPer",
  방어력: "defPer",
  HP: "hpPer",
};

/** "36.45%" -> 0.3645 / "412.50" -> 412.5 */
function parseValue(raw) {
  const t = String(raw).trim();
  return t.endsWith("%") ? Math.round((parseFloat(t) / 100) * 1e6) / 1e6 : parseFloat(t);
}

/**
 * 같은 레벨이 돌파 전/후로 두 번 들어 있다(GrowthValues 96칸, 최대 레벨 90).
 * 뒤쪽(돌파 후) 값을 쓴다.
 */
function atLevel(prop, level) {
  const hits = prop.GrowthValues.filter((g) => g.Level === level);
  return hits.length ? parseValue(hits[hits.length - 1].Value) : null;
}

const stripHtml = (t) => String(t ?? "").replace(/<[^>]+>/g, "").trim();

const ICON_BASE = "https://api.encore.moe/resource/Data";

/**
 * 아이콘 경로를 실제로 불러올 수 있는 URL로 바꾼다.
 * 원본은 언리얼 애셋 경로라 파일명이 "이름.이름"으로 중복되고 확장자가 없다.
 *   /Game/.../T_IconWeapon21010066_UI.T_IconWeapon21010066_UI
 *   -> https://api.encore.moe/resource/Data/Game/.../T_IconWeapon21010066_UI.webp
 */
function iconUrl(path) {
  if (!path) return null;
  if (String(path).startsWith("http")) return path; // 이미 URL이면 그대로
  const slash = String(path).lastIndexOf("/");
  const dir = String(path).slice(0, slash);
  const name = String(path).slice(slash + 1).split(".")[0];
  return `${ICON_BASE}${dir}/${name}.webp`;
}

/**
 * 레벨 1~90의 값을 배열로 뽑는다. atkLevels[레벨-1] = 그 레벨의 수치.
 * 돌파 구간(20.5, 40.5 …)은 정수 레벨이 아니라서 자연히 빠진다.
 */
function levelTable(prop) {
  return Array.from({ length: 90 }, (_, i) => atLevel(prop, i + 1));
}

const src = JSON.parse(readFileSync(IN, "utf8"));
// fetch-encore.mjs는 items로, 예전 수동 덤프는 weapons로 담았다. 둘 다 받아준다.
const rows = src.items ?? src.weapons;

const unmapped = new Set();
const weapons = rows.map((x) => {
  const [atkProp, subProp] = x.Properties;
  const subStatKey = STAT_MAP[subProp.Name] ?? null;
  if (!subStatKey) unmapped.add(subProp.Name);

  return {
    id: String(x.ItemId),
    name: x.WeaponName,
    weaponType: TYPE_MAP[x.WeaponType],
    typeName: x.WeaponTypeName,
    rarity: x.QualityId, // 1~5 (별 개수). QualityName(R/SR/SSR)은 더 거친 분류라 쓰지 않는다.
    icon: iconUrl(x.Icon),
    baseAtk: atLevel(atkProp, 90),
    // 레벨별 무기 공격력. 무기 레벨 슬라이더가 이 표에서 값을 집어온다.
    atkLevels: levelTable(atkProp),
    subStatName: subProp.Name,
    subStatKey,
    subStatValue: atLevel(subProp, 90),
    // 레벨별 부옵션 값. 공격력과 달리 돌파 구간에서만 오르는 계단형이라
    // 같은 값이 여러 레벨에 걸쳐 이어진다.
    subStatLevels: levelTable(subProp),
    subStatDmgCalType: DMG_CAL_TYPE_MAP[subProp.Name] ?? null,
    passiveName: x.ResonName ?? "",
    passiveDesc: stripHtml(x.Desc),
    // 정련 1~5단계 수치. passiveDesc 안에 "4%/6.2%/..." 형태로 붙어 있는 걸 잘라둔 것.
    passiveParams: (x.DescParams ?? []).map((p) => p.ArrayString),
  };
});

weapons.sort(
  (a, b) =>
    b.rarity - a.rarity ||
    a.weaponType.localeCompare(b.weaponType) ||
    a.name.localeCompare(b.name),
);

writeFileSync(
  OUT,
  JSON.stringify({ source: src.source, fetchedAt: src.fetchedAt, weapons }),
  "utf8",
);

console.error(`${weapons.length} weapons -> ${OUT}`);
if (unmapped.size) console.error(`Stats 매핑 없는 부옵션: ${[...unmapped].join(", ")}`);
const bad = weapons.filter((w) => !w.baseAtk || !w.weaponType);
if (bad.length) console.error(`확인 필요: ${bad.map((w) => w.name).join(", ")}`);
