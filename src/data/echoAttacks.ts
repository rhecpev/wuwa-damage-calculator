import echoAttackData from "./echoAttacks.json";
import { echoAttackOverrides } from "./echoAttackOverrides";
import { ELEMENT_NAMES } from "./elements";
import { isExcludedEcho } from "./echoExcludes";
import type { Attack, DamageElement, ScalingStat, Skill } from "../types/game";

/**
 * 에코 어빌리티의 피해를 계산 엔진이 먹는 공격(Attack)으로 돌려준다.
 *
 * 다섯 자리 중 첫 번째(메인)에 낀 에코만 어빌리티를 쓸 수 있으므로,
 * 공격 팔레트에도 메인 에코의 것만 뜬다(echoStore.mainEchoOf 참고).
 *
 * 데이터는 두 겹이다.
 *   echoAttacks.json          원문에서 기계로 추린 것. 스크립트가 덮어쓴다.
 *   echoAttackOverrides.ts    사람이 읽고 고친 것. 있으면 이쪽이 이긴다.
 */

interface RawHit {
  motionValue: number;
  fixedDamage: number;
  element: DamageElement;
  scalingStat: ScalingStat;
  count: number;
  /** 원문에서 이 계수가 나온 자리. 검수용으로 화면에 띄운다. */
  context: string;
}

interface RawEntry {
  name: string;
  cooldown: number | null;
  hits: RawHit[];
  review?: string[];
  text: string;
}

const raw = (echoAttackData as { echoes: Record<string, RawEntry | undefined> }).echoes;

/** 공격 팔레트에서 에코 구역을 가리키는 스킬 id. 캐릭터 스킬 id와 겹치지 않는다. */
export const ECHO_SKILL_ID = "echoAbility";

/** 에코 하나의 공격 id. 캐릭터가 달라도 같은 에코면 같은 id를 쓴다. */
const attackId = (echoId: string, index: number) => `echo:${echoId}#${index}`;

export interface EchoAbility {
  /** 도감 id(echo.json의 Id). */
  id: string;
  name: string;
  /** 스킬 쿨타임(초). 원문에 없으면 null. */
  cooldown: number | null;
  attacks: Attack[];
  /** 사람이 한 번 봐야 하는 이유. 비어 있으면 그대로 믿어도 되는 것이다. */
  review: string[];
  /** 손으로 고친 것이면 그 이유. 아니면 undefined. */
  note?: string;
  /** 어빌리티 원문. 화면에서 눈으로 대조할 수 있게 같이 넘긴다. */
  text: string;
  /**
   * 계수를 뽑아낸 원문 조각. 「…돌진하여 《48.00%+96》의 기류 피해」 꼴로,
   * 뽑은 값이 문장의 어디서 왔는지 눈으로 대조할 때 쓴다.
   * 손으로 고쳐 적은 에코는 비어 있다 — 그건 이미 사람이 읽고 정한 값이다.
   */
  contexts: string[];
}

/**
 * 자동 추출분을 공격으로 옮긴다.
 * 속성과 기준 스탯은 공격 하나에 하나씩만 담을 수 있으므로, 섞여 있으면 그 단위로 나눈다
 * (물리 + 회절이 같이 나오는 에코 등). 나뉘면 이름 뒤에 속성을 붙여 구분한다.
 */
function attacksFromRaw(echoId: string, entry: RawEntry): Attack[] {
  const groups = new Map<string, RawHit[]>();
  for (const hit of entry.hits) {
    const key = `${hit.element}|${hit.scalingStat}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(hit);
    else groups.set(key, [hit]);
  }

  const many = groups.size > 1;
  return [...groups.values()].map((hits, index) => {
    const [first] = hits;
    return {
      id: attackId(echoId, index),
      name: many ? `에코 스킬 (${ELEMENT_NAMES[first.element]})` : "에코 스킬",
      type: "Echo",
      element: first.element,
      scalingStat: first.scalingStat,
      // 에코 어빌리티는 스킬 레벨이 없다 — 레벨 한 칸짜리 배열로 담는다.
      hits: hits.flatMap((hit) => Array.from({ length: hit.count }, () => [hit.motionValue])),
      skillLevel: 1,
      // 깡피해는 공격 하나에 한 번만 더해지므로 타격별 값을 합쳐 둔다.
      fixedDamage: hits.reduce((sum, hit) => sum + hit.fixedDamage * hit.count, 0) || undefined,
    } satisfies Attack;
  });
}

/**
 * 손으로 고친 정의를 공격으로 옮긴다.
 *
 * characterId를 넘기면 그 사람이 쓸 수 있는 갈래만 남는다(아담 · 스매셔처럼 낀 사람에
 * 따라 어빌리티가 통째로 갈리는 에코). 안 넘기면 전부 — 에코 데미지 확인 탭은
 * 어느 캐릭터의 것도 아니라서 다 보여 줘야 한다.
 *
 * **id는 거르기 전 자리로 매긴다.** 걸러진 뒤의 순서로 매기면 캐릭터가 바뀔 때 같은 id가
 * 다른 공격을 가리키게 되어, 루틴에 담아둔 공격이 조용히 딴것으로 바뀐다.
 */
function attacksFromOverride(echoId: string, characterId?: string): Attack[] {
  return echoAttackOverrides[echoId].attacks
    .map((def, index) => ({ def, index }))
    .filter(({ def }) => {
      if (!characterId) return true;
      if (def.onlyCharacters && !def.onlyCharacters.includes(characterId)) return false;
      if (def.exceptCharacters && def.exceptCharacters.includes(characterId)) return false;
      return true;
    })
    .map(({ def, index }) => ({
      id: attackId(echoId, index),
      name: def.name,
      type: "Echo",
      ...(def.damageBonusType ? { damageBonusType: def.damageBonusType } : {}),
      element: def.element,
      scalingStat: def.scalingStat,
      hits: def.hits.map((mv) => [mv]),
      skillLevel: 1,
      fixedDamage: def.fixedDamage,
    }));
}

/**
 * 이 에코(도감 id)의 어빌리티 공격. 피해가 없는 에코(치료·제어·버프 전용)는 undefined.
 * characterId를 넘기면 그 캐릭터가 쓸 수 있는 갈래만 담긴다.
 */
export function echoAbilityOf(echoId: string, characterId?: string): EchoAbility | undefined {
  const entry = raw[echoId];
  const override = echoAttackOverrides[echoId];
  if (!entry && !override) return undefined;

  return {
    id: echoId,
    name: entry?.name ?? echoId,
    cooldown: entry?.cooldown ?? null,
    attacks: override
      ? attacksFromOverride(echoId, characterId)
      : attacksFromRaw(echoId, entry!),
    // 손으로 고친 것은 검수가 끝난 것이다 — 자동 추출 때 붙은 경고를 그대로 들고 다니지 않는다.
    review: override ? [] : (entry?.review ?? []),
    note: override?.note,
    text: entry?.text ?? "",
    contexts: override ? [] : (entry?.hits.map((hit) => hit.context) ?? []),
  };
}

/**
 * 피해가 있는 에코 전부. 에코 데미지 확인 탭이 목록을 세울 때 쓴다.
 * 자동 추출분과 손수정본을 합쳐 도감 id 순으로 돌려준다.
 */
export function allEchoAbilities(): EchoAbility[] {
  const ids = new Set([...Object.keys(raw), ...Object.keys(echoAttackOverrides)]);
  return [...ids]
    .filter((id) => !isExcludedEcho(id))
    .map((id) => echoAbilityOf(id))
    .filter((a): a is EchoAbility => a !== undefined && a.attacks.length > 0);
}

/** 공격 팔레트에 끼워 넣을 스킬 한 벌. 어빌리티가 없는 에코면 undefined. */
export function echoSkillOf(echoId: string, icon?: string, characterId?: string): Skill | undefined {
  // 목록에서 뺀 에코는 공격 팔레트에도 뜨지 않는다.
  if (isExcludedEcho(echoId)) return undefined;
  const ability = echoAbilityOf(echoId, characterId);
  if (!ability?.attacks.length) return undefined;

  return {
    id: ECHO_SKILL_ID,
    name: ability.name,
    attacks: ability.attacks,
    icon,
  };
}
