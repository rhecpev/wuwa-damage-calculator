/**
 * 매트릭스 대여(템플릿) 빌드 -> src/data/rentalBuilds.json
 *
 *   node scripts/build-rental-builds.mjs
 *
 * 매트릭스는 보유하지 않은 캐릭터도 **정해진 빌드로 빌려** 쓸 수 있다. 그 빌드는 게임 설정
 * 테이블에만 있고 encore.moe API에는 없다. 테이블 덤프(Dimbreath/WutheringData)를 받아
 * 앱이 읽는 모양으로 추린다.
 *
 *   NewTowerRole.TemplateRoleId (1104990000 = 캐릭터id + 990000)
 *     -> TrialRoleInfo    레벨 · 공명체인 · 스킬 레벨 · 무기 · 에코 다섯 칸
 *     -> TrialWeaponInfo  무기 id · 레벨 · 정련
 *     -> TrailPhantomProp + TrialPhantomPropItem  에코 레벨 · 메인 옵션 · 부옵션
 *     -> PhantomItem      에코 코스트(Rarity) · 도감 id
 *
 * 옵션 값의 눈금은 표에 적혀 있지 않아 실측으로 맞췄다(능양 대여 빌드의 인게임 스탯과 대조).
 *   퍼센트 옵션  메인 1/20 · 부옵션 1/100
 *   고정값 옵션  부메인만 ×5 (공격력 30 -> 150, 생명 456 -> 2280), 부옵션은 그대로
 * 크리티컬 62% · 크리티컬 피해 164% · 공명 효율 152.8%(무기 패시브 12.8 포함)가 인게임과 같다.
 *
 * 에코 이름 · 아이콘 · 화음 세트와 무기 이름은 앱이 이미 가진 데이터에서 붙인다.
 * 다시 생성해도 되는 파일이다.
 */
import { readFileSync, writeFileSync } from "node:fs";

const RAW = "https://raw.githubusercontent.com/Dimbreath/WutheringData/master/ConfigDB";
const OUT = "src/data/rentalBuilds.json";

/** 퍼센트 옵션의 눈금. 메인과 부옵션이 다르다. */
const PCT_MAIN = 20;
const PCT_SUB = 100;
/** 고정값 부메인(공격력 150 · 생명 2280)의 눈금. */
const FLAT_MAIN = 5;

/** PropertyIndex.Key -> 에코 옵션 라벨(src/data/echoOption.json과 같은 표기). */
const LABEL = {
  Crit: "크리티컬(%)",
  CritDamage: "크리티컬 피해(%)",
  EnergyEfficiency: "공명효율(%)",
  HealChange: "치료효과 보너스(%)",
  DamageChangeAuto: "일반공격 피해 보너스(%)",
  DamageChangeNormalSkill: "강공격 피해 보너스(%)",
  DamageChangeCast: "공명스킬 피해 보너스(%)",
  DamageChangeUltra: "공명해방 피해 보너스(%)",
  DamageChangeElement1: "응결 피해 보너스(%)",
  DamageChangeElement2: "용융 피해 보너스(%)",
  DamageChangeElement3: "전도 피해 보너스(%)",
  DamageChangeElement4: "기류 피해 보너스(%)",
  DamageChangeElement5: "회절 피해 보너스(%)",
  DamageChangeElement6: "인멸 피해 보너스(%)",
};

/** 퍼센트가 아니라 깡수치로 붙는 옵션 — 메인 자리에서는 퍼센트, 부메인 · 부옵션 자리에서는 고정값이다. */
const FLAT_LABEL = { GreenAtk: "공격력", GreenLifeMax: "HP", GreenDef: "방어력" };
const PCT_LABEL = { GreenAtk: "공격력(%)", GreenLifeMax: "HP(%)", GreenDef: "방어력(%)" };

/** PhantomItem.Rarity -> 에코 코스트. */
const COST = { 2: 4, 1: 3, 0: 1 };

const local = (path) => JSON.parse(readFileSync(path, "utf8"));

async function table(name) {
  const res = await fetch(`${RAW}/${name}.json`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

const round = (n) => Math.round(n * 100) / 100;

function main() {
  return Promise.all([
    table("NewTowerRole"),
    table("TrialRoleInfo"),
    table("TrialWeaponInfo"),
    table("TrailPhantomProp"),
    table("TrialPhantomPropItem"),
    table("PhantomItem"),
    table("PropertyIndex"),
  ]).then(([roles, trialRoles, trialWeapons, phantomProps, propItems, phantomItems, propIndex]) => {
    const trial = new Map(trialRoles.map((r) => [r.Id, r]));
    const weaponById = new Map(trialWeapons.map((w) => [w.Id, w]));
    const propById = new Map(phantomProps.map((p) => [p.Id, p]));
    const itemById = new Map(propItems.map((p) => [p.Id, p.Prop]));
    const phantomById = new Map(phantomItems.map((p) => [p.ItemId, p]));
    const keyById = new Map(propIndex.map((p) => [p.Id, p.Key]));

    const apiIds = local("src/data/characterApiIds.json");
    const weapons = new Map(local("src/data/weapons.json").weapons.map((w) => [String(w.id), w]));
    const echoes = new Map(local("src/data/echo.json").Echo.map((e) => [e.Id, e]));
    /** 화음 세트 id -> 이름 · 아이콘. 에코마다 붙어 있는 것을 한 번 모은다. */
    const fetterById = new Map();
    for (const echo of echoes.values()) {
      for (const g of echo.FetterGroups ?? []) fetterById.set(g.Id, { name: g.Name, icon: g.Icon });
    }

    /** 옵션 한 칸을 앱이 읽는 {type, value} 꼴로. slot: main · mainSub · sub */
    const option = (propId, slot) => {
      const prop = itemById.get(propId);
      if (!prop) return null;
      const key = keyById.get(prop.Id);
      const flat = FLAT_LABEL[key];
      if (flat) {
        if (slot === "main") return { type: PCT_LABEL[key], value: String(round(prop.Value / PCT_MAIN)) };
        const value = slot === "mainSub" ? prop.Value * FLAT_MAIN : prop.Value;
        return { type: flat, value: String(round(value)) };
      }
      const label = LABEL[key];
      if (!label) return null; // 앱이 모르는 옵션 — 합산에서 빠지므로 적지 않는다
      return { type: label, value: String(round(prop.Value / (slot === "sub" ? PCT_SUB : PCT_MAIN))) };
    };

    const builds = {};
    const skipped = [];

    for (const [slug, roleId] of Object.entries(apiIds)) {
      const role = roles.find((r) => r.Id === roleId);
      const template = trial.get(role?.TemplateRoleId ?? roleId * 1000000 + 990000);
      if (!template) {
        skipped.push(slug);
        continue;
      }

      const tw = weaponById.get(template.TrailWeapon);
      const weapon = weapons.get(String(tw?.WeaponId ?? ""));

      const echoList = [];
      for (const slot of template.PhantomEquipList ?? []) {
        const item = phantomById.get(slot.Item1);
        const prop = propById.get(slot.Item2);
        if (!item || !prop) continue;
        const echo = echoes.get(item.MonsterId);
        const [mainId, mainSubId] = prop.MainProps ?? [];
        const subs = (prop.SubPropList ?? []).map((id) => option(id, "sub")).filter(Boolean);
        // 템플릿이 골라 둔 화음 세트(TrailPhantomProp.FetterGroupId)를 그대로 따른다.
        // 에코가 낼 수 있는 세트 목록(echo.json)이 덤프보다 오래된 경우가 있어 — 카를로타
        // 대여 빌드의 「거대 인형」이 그렇다 — 목록에 없더라도 템플릿 쪽을 믿고 붙여 준다.
        const fetter = fetterById.get(prop.FetterGroupId);
        const groups = (echo?.FetterGroups ?? []).map((g) => ({ name: g.Name, icon: g.Icon }));
        if (fetter && !groups.some((g) => g.name === fetter.name)) groups.unshift(fetter);
        const selected = fetter?.name ?? groups[0]?.name ?? null;

        echoList.push({
          id: String(item.MonsterId),
          name: echo?.Name ?? String(item.MonsterId),
          iconUrl: echo?.Icon ?? null,
          cost: COST[item.Rarity] ?? 0,
          level: prop.Level,
          fetterGroups: groups,
          options: {
            mainOption: option(mainId, "main"),
            mainSubOption: option(mainSubId, "mainSub"),
            mainSelects: subs.map((s) => s.type),
            subSelects: subs.map((s) => s.value),
            selectedFetter: selected,
          },
        });
      }

      builds[slug] = {
        roleId,
        templateId: template.Id,
        level: template.Level,
        chain: template.ResonanceLevel,
        skillLevel: template.UnlockSkillLevel,
        weapon: tw
          ? {
              weaponId: String(tw.WeaponId),
              name: weapon?.name ?? String(tw.WeaponId),
              level: tw.WeaponLevel,
              refine: tw.WeaponResonanceLevel,
            }
          : null,
        echoes: echoList,
      };
    }

    writeFileSync(
      OUT,
      JSON.stringify(
        {
          source: `${RAW} (NewTowerRole · TrialRoleInfo · TrialWeaponInfo · TrailPhantomProp · TrialPhantomPropItem · PhantomItem)`,
          fetchedAt: new Date().toISOString(),
          count: Object.keys(builds).length,
          builds,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );

    console.log(`${OUT}: ${Object.keys(builds).length}명`);
    if (skipped.length) console.log(`대여 빌드가 없는 캐릭터(덤프에 없음): ${skipped.join(", ")}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
