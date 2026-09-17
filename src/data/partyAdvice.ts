import { characters } from "./sampleData";
import { anomaliesOf } from "./characterAnomalies";
import {
  ANOMALY_TAG,
  GIVES_CATEGORY_TAG,
  GIVES_ELEMENT_TAG,
  SELF_DAMAGE_TAG,
  tagsOf,
} from "./characterTags";
import { ANOMALIES } from "./anomalies";
import { baseCharacterId } from "./modeVariants";
import { triggersFor } from "./attackTriggers";
import type { AnomalyKind } from "./anomalies";
import type {
  AttackType,
  Character,
  CharacterBuffTemplate,
  DamageElement,
  ResonanceMode,
} from "../types/game";

/**
 * 메인 딜러 하나를 고르면 **같이 세울 나머지**를 점수로 줄 세운다.
 *
 * 근거는 두 가지다 —
 *   1) 캐릭터 태그(data/characterTags.ts) — 인게임이 직접 「무슨 딜러인지 · 무엇을 부스트하는지」를 적어 둔 것
 *   2) 그 캐릭터가 실제로 들고 있는 **파티 버프**(Character.passiveBuffs 중 scope: "party")
 *
 * 태그만 보면 「강공격 피해 부스트」가 얼마짜리인지 알 수 없고, 버프만 보면 「이 조건이 이 딜러에게
 * 서는지」를 알 수 없다. 둘을 같이 본다.
 *
 * 나오는 수치(gain)는 **대략값**이다. 사이클도 장비도 없는 자리에서 내는 값이라
 * 크리티컬 확률 같은 것은 가정을 박아 두고 센다. 정확한 값은 사이클을 짜고 계산 탭에서 본다.
 */

/** 기대 피해로 환산할 때 쓰는 가정. 사이클·장비가 없는 자리라 값을 박아 둔다. */
const ASSUME = {
  /** 크리티컬 확률 — 매트릭스 편성이면 대개 여기쯤이다. 크리티컬 피해 버프를 환산하는 데 쓴다. */
  critRate: 0.7,
  /** 크리티컬 피해 배수(기본 100% + 보너스). 크리티컬 확률 버프를 환산하는 데 쓴다. */
  critDamage: 2.0,
};

/**
 * 그 캐릭터의 공격이 **실제로 무엇을 붙이고 태우는지**(data/attackTriggers.ts).
 *
 * 태그만으로는 「이상 효과를 쓴다」까지만 알 수 있고 「태운다」는 알 수 없다.
 * 수수의 산안개(편지 600)처럼 **이상 효과 스택을 소모해야** 서는 버프가 있어서,
 * 메인 딜러가 태우는 공격을 가졌는지까지 봐야 헛다리를 안 짚는다.
 */
export interface TriggerFacts {
  /** 이 캐릭터의 공격이 붙이는 이상 효과. */
  adds: Set<AnomalyKind>;
  /** 태우는(소모하는) 이상 효과. */
  consumes: Set<AnomalyKind>;
  /** 붙이는 상태(「조화 밀집 · 이탈」 등). */
  statuses: Set<string>;
}

const factsCache = new Map<string, TriggerFacts>();

export function triggerFactsOf(characterId: string): TriggerFacts {
  const had = factsCache.get(characterId);
  if (had) return had;

  const facts: TriggerFacts = { adds: new Set(), consumes: new Set(), statuses: new Set() };
  const character = characters.find((c) => c.id === characterId);
  for (const skill of character?.skills ?? []) {
    for (const attack of skill.attacks) {
      for (const t of triggersFor(characterId, attack.id)) {
        if (t.anomaly) (t.action === "add" ? facts.adds : facts.consumes).add(t.anomaly);
        if (t.status && t.action === "add") facts.statuses.add(t.status);
      }
    }
  }
  factsCache.set(characterId, facts);
  return facts;
}

/**
 * 버프의 조건문이 **무엇을 요구하는지** 읽는다. 엔진이 판정하지 못하는 메모라서 글자로 본다.
 * 옮겨 적은 조건문의 표현이 몇 가지로 정해져 있어 이 정도로도 걸러진다.
 */
function requirementOf(condition?: string): "consume" | "anomaly" | "breach" | null {
  if (!condition) return null;
  if (/이상 효과[^.]{0,14}(소모|태운|터[뜨지])/.test(condition)) return "consume";
  if (/이상 효과[^.]{0,14}(추가|붙)/.test(condition)) return "anomaly";
  if (/이탈|간섭/.test(condition)) return "breach";
  return null;
}

/**
 * 그 조건이 이 편성에서 설 수 있는지. 못 서면 까닭을 돌려준다.
 *
 * 「이상 효과 소모」는 **메인 딜러**가 태울 수 있어야 한다 — 나와 있는 캐릭터가 태우는 것이라
 * 버프를 주는 쪽이 태워도 소용이 없다.
 * 「이상 효과 추가」·「이탈」은 둘 중 **누가 붙여도** 성립한다.
 */
function unmetReason(
  condition: string | undefined,
  dps: TriggerFacts,
  giver: TriggerFacts,
): string | null {
  switch (requirementOf(condition)) {
    case "consume":
      return dps.consumes.size > 0 ? null : "이 딜러에게 이상 효과를 태우는 공격이 없습니다";
    case "anomaly":
      return dps.adds.size > 0 || giver.adds.size > 0
        ? null
        : "둘 다 이상 효과를 붙이지 못합니다";
    case "breach":
      return dps.statuses.size > 0 || giver.statuses.size > 0
        ? null
        : "둘 다 「이탈」을 붙이지 못합니다";
    default:
      return null;
  }
}

/** 「이 딜러가 무엇으로 때리는가」 — 추천의 기준이 되는 한 장의 그림. */
export interface DpsProfile {
  characterId: string;
  element: DamageElement;
  /** 태그가 가리키는 주력 피해 분류(강공격 · 공명 스킬 …). 없을 수도 있다. */
  categories: AttackType[];
  /** 이 딜러가 쓰는 이상 효과. 태그와 characterAnomalies 표를 합친 것이다. */
  anomalies: AnomalyKind[];
}

export function dpsProfile(character: Character): DpsProfile {
  const tags = tagsOf(character.id);
  const fromTag = tags.map((t) => ANOMALY_TAG[t]).filter(Boolean) as AnomalyKind[];
  return {
    characterId: character.id,
    element: character.element,
    categories: tags.map((t) => SELF_DAMAGE_TAG[t]).filter(Boolean) as AttackType[],
    anomalies: [...new Set([...fromTag, ...anomaliesOf(character.id)])],
  };
}

/** 이 버프가 그 딜러에게 실제로 걸리는지. 안 걸리면 점수에 넣지 않는다. */
function hits(buff: CharacterBuffTemplate, dps: DpsProfile): boolean {
  if (buff.onlyFor && !buff.onlyFor.includes(baseCharacterId(dps.characterId))) return false;
  const type = buff.damageType;
  if (type === "All") return true;
  if (type in ANOMALIES) return dps.anomalies.includes(type as AnomalyKind);
  if (["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"].includes(type))
    return type === dps.element;
  // 남은 것은 공격 분류다. 딜러의 주력 분류를 태그로 모르면 걸리는 것으로 본다(놓치는 것보다 낫다).
  return dps.categories.length === 0 || dps.categories.includes(type as AttackType);
}

/**
 * 이 버프가 **캐릭터를 바꾸면 사라지는지**.
 *
 * 반주처럼 「다음 등장 캐릭터에게 … 전환하면 즉시 끝난다」로 적힌 것이 여기 해당한다.
 * 그런 버프는 **메인 딜러 바로 앞자리**에서 써야 값어치를 한다 — 사이에 다른 캐릭터가 끼면 끊긴다.
 *
 * endsOn을 적어 둔 줄이 먼저고(자동 발동 장치가 쓰는 칸), 아직 안 적은 줄은 조건 메모에서 읽는다.
 * 조건 메모는 원문을 옮긴 것이라 표현이 몇 가지로 정해져 있다.
 */
const SWITCH_WORDS = /전환하면|전환 시|교체하면|교체 시|퇴장|물러나/;
export function endsOnSwitch(buff: CharacterBuffTemplate): boolean {
  if (buff.endsOn) return buff.endsOn === "switch";
  return buff.condition ? SWITCH_WORDS.test(buff.condition) : false;
}

/** 이 버프 한 줄의 적용치(소수). 스탯 비례는 상한값으로 어림한다. */
function amountOf(buff: CharacterBuffTemplate): number {
  const stacks = buff.stacks ?? buff.maxStacks ?? 1;
  if (buff.scaleFrom) return buff.maxValue ?? 0;
  return buff.value * stacks;
}

/**
 * 배타 묶음(exclusiveGroup)은 하나만 센다 — 「HP 60% 이상 / 미만」처럼 동시에 설 수 없는 줄이라
 * 다 더하면 있지도 않은 버프가 얹힌다. 같은 묶음에서는 가장 큰 것만 남긴다.
 */
function pickBest(rows: { buff: CharacterBuffTemplate; amount: number }[]) {
  const best = new Map<string, { buff: CharacterBuffTemplate; amount: number }>();
  const out: { buff: CharacterBuffTemplate; amount: number }[] = [];
  for (const row of rows) {
    const group = row.buff.exclusiveGroup;
    if (!group) {
      out.push(row);
      continue;
    }
    const had = best.get(group);
    if (!had || row.amount > had.amount) best.set(group, row);
  }
  return [...out, ...best.values()];
}

/** 버프가 붙는 자리별 합계 → 기대 피해 배수 하나로. */
function gainOf(rows: { buff: CharacterBuffTemplate; amount: number }[]): number {
  const sum = (targets: string[]) =>
    rows.filter((r) => targets.includes(r.buff.target)).reduce((a, r) => a + r.amount, 0);

  const atk = 1 + sum(["atkPercent"]);
  const bonus = 1 + sum(["damageBonus"]);
  // 부스트 · 최종 피해 · 받는 피해는 각자 독립 곱연산이다.
  const boost = 1 + sum(["boost"]);
  const total = 1 + sum(["totalDamage"]);
  const taken = 1 + sum(["damageTaken"]);
  // 방어력 감소 · 저항 무시는 대체로 그만큼 피해가 오르는 것으로 어림한다.
  const armor = 1 + sum(["defIgnore", "defReduction", "resPen", "resReduction"]);
  // 크리티컬은 기대 피해로 환산한다 — 확률 버프는 (크리 배수 - 1)만큼, 피해 버프는 확률만큼 붙는다.
  const crit =
    1 + sum(["critRate"]) * (ASSUME.critDamage - 1) + sum(["critDamage"]) * ASSUME.critRate;

  return atk * bonus * boost * total * taken * armor * crit;
}

export interface AdviceRow {
  character: Character;
  /** 이 딜러에게 실제로 걸리는 파티 버프 줄 수. */
  count: number;
  /** 그 버프들을 큰 것부터. 화면이 이름과 수치를 그대로 늘어놓는다. */
  buffs: { label: string; amount: number; target: string; switchBound: boolean }[];
  /**
   * 어느 자리에 서야 하는지.
   *   2 — 교체하면 사라지는 버프를 준다. 메인 딜러 **바로 앞(2번 자리)**에 서야 한다.
   *   1 — 교체해도 남는 파티 버프만 준다. 앞쪽(3번 자리)에서 먼저 깔아 두면 된다.
   */
  group: 1 | 2;
  /** 대략적인 기대 피해 증가(소수. 0.35면 +35%). */
  gain: number;
  /** 왜 추천하는지 — 굵직한 것부터 몇 줄. */
  reasons: string[];
  /**
   * 조건이 이 편성에서 서지 않아 **점수에서 뺀** 버프들.
   * 수수의 산안개(편지 600)처럼 「이상 효과 스택 소모 후」가 조건인데 메인 딜러가
   * 이상 효과를 태우지 못하면 있으나 마나다 — 그런 줄을 여기 담고 화면에 까닭을 적는다.
   */
  skipped: { label: string; why: string }[];
  /** 정렬에 쓰는 점수. gain에 태그로 얻은 가산점을 얹은 것이다. */
  score: number;
  /** "best" 최선책 · "good" 차선책 · "ok" 그 외. */
  tier: "best" | "good" | "ok";
}

/**
 * 고른 메인 딜러에게 맞는 순서로 후보를 줄 세운다.
 *
 * candidateIds에는 **보유한 캐릭터**만 넘긴다. 메인 딜러 자신은 빠진다.
 */
export function adviseFor(
  mainId: string,
  candidateIds: string[],
  /**
   * 캐릭터별 보유 공명체인(캐릭터 탭에서 정한 값). 안 넘기면 0으로 본다.
   * **이걸 안 보면 2체인이 아닌 캐릭터의 2체인 버프까지 세어 버린다.**
   */
  chains: Record<string, number> = {},
  /** 캐릭터별 공명 모드. 모드로 갈리는 버프를 가릴 때 쓴다. */
  modes: Record<string, ResonanceMode | undefined> = {},
): AdviceRow[] {
  const main = characters.find((c) => c.id === mainId);
  if (!main) return [];
  const dps = dpsProfile(main);
  const dpsFacts = triggerFactsOf(mainId);
  const mainTags = tagsOf(mainId);

  const rows: AdviceRow[] = [];
  for (const id of candidateIds) {
    if (id === mainId) continue;
    const character = characters.find((c) => c.id === id);
    if (!character) continue;

    const chain = chains[id] ?? 0;
    const mode = modes[id] ?? character.resonanceModes?.[0];
    const party = (character.passiveBuffs ?? []).filter(
      (b) =>
        b.scope === "party" &&
        // 캐릭터 탭에서 정한 체인 · 모드를 그대로 지킨다(deriveCharacterBuffs와 같은 규칙).
        !(b.resonanceChain !== undefined && chain < b.resonanceChain) &&
        !(b.resonanceMode !== undefined && mode !== b.resonanceMode),
    );

    // 조건문이 요구하는 것을 이 편성이 채울 수 있는지 — 공격 트리거로 따져 본다.
    const giverFacts = triggerFactsOf(id);
    const skipped: { label: string; why: string }[] = [];
    const standing = party.filter((buff) => {
      const why = unmetReason(buff.condition, dpsFacts, giverFacts);
      if (why) skipped.push({ label: buff.label, why });
      return !why;
    });

    const matched = pickBest(
      standing
        .map((buff) => ({ buff, amount: amountOf(buff) }))
        .filter((r) => hits(r.buff, dps) && r.amount > 0),
    );

    const gain = gainOf(matched) - 1;
    const tags = tagsOf(id);
    const reasons: string[] = [];
    let bonus = 0;

    // ── 태그가 딜러의 성격과 맞는지 ──
    for (const tag of tags) {
      const category = GIVES_CATEGORY_TAG[tag];
      if (category && dps.categories.includes(category)) {
        reasons.push(`${tag} — 이 딜러의 주력 분류`);
        bonus += 0.12;
        continue;
      }
      const element = GIVES_ELEMENT_TAG[tag];
      if (element && element === dps.element) {
        reasons.push(`${tag} — 딜러와 같은 속성`);
        bonus += 0.12;
        continue;
      }
      const anomaly = ANOMALY_TAG[tag];
      if (anomaly && dps.anomalies.includes(anomaly)) {
        reasons.push(`${tag} 효과를 같이 쓴다`);
        bonus += 0.1;
      }
    }

    // ── 이 딜러의 이상 효과를 직접 거드는 버프(스택 상한을 올리거나 그 효과에 붙는 것) ──
    const anomalyHelp = standing.filter(
      (b) =>
        (b.raisesAnomalyKinds?.some((k) => dps.anomalies.includes(k)) ?? false) ||
        (b.anomalyStacks ? dps.anomalies.includes(b.anomalyStacks) : false) ||
        (b.damageType in ANOMALIES && dps.anomalies.includes(b.damageType as AnomalyKind)),
    );
    if (anomalyHelp.length > 0) {
      const name = ANOMALIES[dps.anomalies[0]]?.name ?? "이상";
      reasons.push(`${name} 효과를 직접 거드는 줄 ${anomalyHelp.length}개`);
      bonus += 0.08 * anomalyHelp.length;
    }

    // ── 굵직한 버프 이름 몇 줄 ──
    for (const r of [...matched].sort((a, b) => b.amount - a.amount).slice(0, 3)) {
      reasons.push(`${r.buff.label} (+${(r.amount * 100).toFixed(0)}%)`);
    }

    if (mainTags.includes("메인 딜러") && tags.includes("메인 딜러")) {
      reasons.push("메인 딜러끼리라 자리를 나눠 써야 한다");
      bonus -= 0.1;
    }

    if (skipped.length > 0) {
      reasons.push(`조건이 안 서는 줄 ${skipped.length}개는 뺐습니다`);
    }

    rows.push({
      character,
      count: matched.length,
      skipped,
      buffs: [...matched]
        .sort((a, b) => b.amount - a.amount)
        .map((r) => ({
          label: r.buff.label,
          amount: r.amount,
          target: r.buff.target,
          switchBound: endsOnSwitch(r.buff),
        })),
      // 교체로 끊기는 버프를 하나라도 주면 2번 자리다 — 그 줄이 자리를 못 박기 때문이다.
      group: matched.some((r) => endsOnSwitch(r.buff)) ? 2 : 1,
      gain,
      reasons,
      score: gain + bonus,
      tier: "ok",
    });
  }

  rows.sort((a, b) => b.score - a.score);

  // 최선책 · 차선책은 1등 대비 몇 할인지로 가른다 — 딜러마다 판이 다르므로 절대값으로는 못 가른다.
  const top = rows[0]?.score ?? 0;
  for (const row of rows) {
    if (top <= 0) row.tier = "ok";
    else if (row.score >= top * 0.7) row.tier = "best";
    else if (row.score >= top * 0.35) row.tier = "good";
    else row.tier = "ok";
  }
  return rows;
}
