import { buffOverrideKey, createBuffOverrideStore } from "./buffOverrides";
import type { BuffOverride, BuffOverrideMap } from "./buffOverrides";

/**
 * 에코 화음(세트) 효과·에코 어빌리티 버프의 「상시/발동」과 「본인/파티」 수정분.
 * 에코 데이터 확인 탭에서 고친다.
 *
 * 고친 값은 **계산에 그대로 들어간다** — deriveEchoBuffs가 버프를 만들 때 덧씌우고,
 * PartyConfigContext가 이 저장소를 구독하고 있어서 고치는 즉시 피해량이 따라 바뀐다.
 *   uptime  상시(passive)면 조건 없이 늘 걸리고, 발동(active)이면 공격마다 켜야 걸린다
 *   scope   본인(self)이면 그 캐릭터의 공격에만, 파티(party)면 전원에게 걸린다
 *
 * 키는 `대상id:효과순번`이고, 대상 id는 아래 두 접두사로 갈라 쓴다.
 *   set:<세트 이름>  화음 세트 효과(echoSetBuffs)
 *   echo:<에코 id>   에코 어빌리티(echoAbilityBuffs)
 */
export type EchoBuffOverride = BuffOverride;
export type EchoBuffOverrideMap = BuffOverrideMap;

const store = createBuffOverrideStore("echo-buff-overrides");

export const echoBuffKey = buffOverrideKey;

/** 화음 세트 하나를 가리키는 id. 이름에 콜론이 없어 키가 겹치지 않는다. */
export const echoSetOwnerId = (setName: string) => `set:${setName}`;
/** 에코 어빌리티 하나를 가리키는 id. */
export const echoAbilityOwnerId = (echoId: string) => `echo:${echoId}`;

export const getEchoBuffOverrides = store.get;
export const subscribeEchoBuffOverrides = store.subscribe;
export const setEchoBuffOverride = store.set;
export const clearEchoBuffOverride = store.clear;
export const resetEchoBuffOverrides = store.reset;
