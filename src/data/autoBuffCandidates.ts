import { echoAbilityBuffs, echoSetBuffs } from "./echoBuffs";
import { echoesById } from "./echoes";
import { weaponBuffs } from "./weaponBuffs";
import { weaponsById } from "./weapons";
import type { AttackType, BuffTarget, BuffUptime } from "../types/game";

/**
 * 자동 발동(`triggeredBy` · `triggeredByType`)을 **아직 안 건** 무기 · 에코 버프 모으기.
 *
 * 조건문이 「○○ 발동 후 N초」 꼴이면 루틴이 그 공격을 담은 뒤부터 저절로 켤 수 있다
 * (calculator/autoBuffs.ts). 그런데 지금 그 칸이 채워진 자리는 몇 군데뿐이라, 나머지는
 * 사람이 공격마다 손으로 켜고 있다. 어느 줄에 걸 수 있는지 조건문에서 읽어 모아 둔다.
 *
 * **조건문을 글자로 읽는다.** 엔진이 판정하지 못하는 조건을 사람이 적어 둔 메모라서
 * 그것밖에 볼 것이 없다 — 표현이 몇 가지로 정해져 있어 이 정도로도 갈린다.
 * 같은 규칙을 터미널에서 보는 것이 `scripts/report-auto-buff-candidates.mjs`다.
 */

/** 조건문이 짚는 공격 갈래. triggeredByType에 넣을 값이 type이다. */
export const AUTO_BUFF_KINDS: { key: string; type: AttackType; test: RegExp }[] = [
  { key: "변주", type: "Variation", test: /변주 스킬/ },
  { key: "공명 해방", type: "Liberation", test: /공명 해방/ },
  { key: "공명 스킬", type: "Skill", test: /공명 스킬/ },
  { key: "반주", type: "Intro", test: /반주 스킬/ },
  { key: "에코 어빌리티", type: "Echo", test: /에코 (어빌리티|스킬)/ },
  { key: "강공격", type: "Heavy", test: /강공격/ },
  { key: "일반 공격", type: "Basic", test: /일반 공격|기본 공격/ },
];

/** 「그 공격을 쓰면 켜진다」로 읽히는 조건문. */
const TRIGGERISH = /발동 후|발동 시|명중 후|명중 시|입힌 후|입힐 시|추가 후|추가 시/;

/**
 * 지금 장치로는 못 거는 조건. 자동 발동은 **공격 분류**로만 켜므로,
 * 「이상 효과를 추가하면」처럼 그 공격이 *붙인 것*을 봐야 하는 조건은 매달 자리가 없다.
 * 공격 트리거(data/attackTriggers.ts)를 자동 발동 쪽에서도 읽게 되면 그때 풀린다.
 */
const BLOCKED: { why: string; test: RegExp }[] = [
  {
    why: "이상 효과 · 상태를 붙여야 켜진다 — 공격 분류로는 못 건다",
    test: /효과[」]?를? (추가|보유)|효과가 있는|이탈|간섭|스택/,
  },
  { why: "치료 · 적 상태 · HP를 봐야 한다", test: /치료|파티 내|적이|목표가|HP|체력|실드|처치/ },
];

export interface AutoBuffCandidate {
  /** 무기 · 에코 어빌리티 · 화음 세트 중 어느 표에서 왔는지. */
  what: "무기" | "에코 어빌리티" | "화음 세트";
  /** 그 표의 열쇠(무기 id · 에코 id · 세트 이름). */
  key: string;
  /** 화면에 띄울 이름. */
  owner: string;
  /** 아이콘이 있으면 같이 띄운다. */
  icon?: string;
  /** 그 표 안에서의 줄 번호 — 자료에서 찾을 때 쓴다. */
  index: number;
  label: string;
  target: BuffTarget;
  uptime: BuffUptime;
  condition: string;
  /** 무기는 정련 1~5, 에코는 한 값. */
  values: number[];
  /** 걸 수 있는 갈래. 조건문이 둘을 짚으면 둘 다 담긴다. 비어 있으면 못 거는 줄이다. */
  kinds: { key: string; type: AttackType }[];
  /** 못 거는 줄이면 그 이유. */
  blockedWhy?: string;
}

const kindsOf = (condition: string) =>
  AUTO_BUFF_KINDS.filter((k) => k.test.test(condition)).map(({ key, type }) => ({ key, type }));

const blockedWhy = (condition: string) =>
  BLOCKED.find((b) => b.test.test(condition))?.why ?? "조건이 공격을 짚지 않는다";

/** 자동 발동을 안 건 줄 전부. 걸 수 있는 것과 못 거는 것이 섞여 있고 kinds로 갈린다. */
export function autoBuffCandidates(): AutoBuffCandidate[] {
  const out: AutoBuffCandidate[] = [];

  const push = (
    what: AutoBuffCandidate["what"],
    key: string,
    owner: string,
    icon: string | undefined,
    index: number,
    row: {
      label: string;
      target: BuffTarget;
      uptime?: BuffUptime;
      condition?: string;
      value?: number;
      values?: readonly number[];
      triggeredBy?: string[];
      triggeredByType?: AttackType[];
    },
  ) => {
    if (row.triggeredBy?.length || row.triggeredByType?.length) return;
    const condition = row.condition ?? "";
    if (!TRIGGERISH.test(condition)) return;
    const kinds = kindsOf(condition);
    out.push({
      what,
      key,
      owner,
      icon,
      index,
      label: row.label,
      target: row.target,
      uptime: row.uptime ?? "passive",
      condition,
      values: row.values ? [...row.values] : row.value !== undefined ? [row.value] : [],
      kinds,
      ...(kinds.length === 0 ? { blockedWhy: blockedWhy(condition) } : {}),
    });
  };

  for (const [id, rows] of Object.entries(weaponBuffs)) {
    const weapon = weaponsById.get(id);
    const owner = weapon ? `${weapon.name} (${weapon.typeName} ★${weapon.rarity})` : id;
    rows.forEach((row, index) => push("무기", id, owner, weapon?.icon ?? undefined, index, row));
  }

  for (const [id, rows] of Object.entries(echoAbilityBuffs)) {
    const echo = echoesById.get(id);
    rows.forEach((row, index) =>
      push("에코 어빌리티", id, echo?.name ?? id, echo?.icon ?? undefined, index, row),
    );
  }

  for (const [name, rows] of Object.entries(echoSetBuffs)) {
    rows.forEach((row, index) => push("화음 세트", name, name, undefined, index, row));
  }

  return out;
}

/**
 * 버프 id 하나가 자동 발동 후보인지 — 버프 창이 그 줄에 색을 달리 칠하는 데 쓴다.
 *
 * 화면에 뜨는 버프 id는 만든 자리에서 붙인 것이라(equippedBuffs) 자료 쪽 열쇠와 모양이 다르다.
 *   weapon:<무기id>:<순번>
 *   echoability:<캐릭터id>:<에코id>:<순번>
 *   echoset:<캐릭터id>:<세트 이름>:<순번>
 * 캐릭터 고유 버프(character:…)는 여기 대상이 아니다 — 자동 발동은 무기 · 에코에만 걸어 둔다.
 */
let byKey: Map<string, AutoBuffCandidate> | null = null;

export function autoBuffRecommendation(buffId: string): AutoBuffCandidate | null {
  if (!byKey) {
    byKey = new Map(
      autoBuffCandidates()
        .filter((row) => row.kinds.length > 0)
        .map((row) => [`${row.what}|${row.key}|${row.index}`, row]),
    );
  }
  const parts = buffId.split(":");
  if (parts[0] === "weapon" && parts.length === 3) {
    return byKey.get(`무기|${parts[1]}|${parts[2]}`) ?? null;
  }
  if (parts[0] === "echoability" && parts.length === 4) {
    return byKey.get(`에코 어빌리티|${parts[2]}|${parts[3]}`) ?? null;
  }
  // 세트 이름에는 콜론이 없다 — 앞뒤를 떼면 가운데가 통째로 이름이다.
  if (parts[0] === "echoset" && parts.length >= 4) {
    const name = parts.slice(2, -1).join(":");
    return byKey.get(`화음 세트|${name}|${parts[parts.length - 1]}`) ?? null;
  }
  return null;
}
