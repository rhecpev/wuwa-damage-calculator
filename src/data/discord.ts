import type { Attack } from "../types/game";

/**
 * 조화도 파괴(부조화 피해).
 *
 * 스킬 피해도 이상 효과 피해도 아닌 **세 번째 피해 갈래**다. 셋이 어떻게 다른지는
 * docs/조화도-이상-대미지-공식.md의 표에 정리해 두었고, 요점만 옮기면 —
 *
 *   최종스탯      공격력을 전혀 타지 않는다. **10027.14 고정**이다.
 *   크리티컬      걸리지 않는다(에이메스 6체인만 예외).
 *   피해 보너스   걸리지 않는다.
 *   부스트        걸리지 않는다(속성·스킬타입·이상 부스트 전부).
 *   방어력        무시와 감소가 **둘 다** 걸린다(이상 효과는 감소만 걸리는 것과 다르다).
 *   속성저항      걸린다. **물리 피해**라 적의 속성과 같아지는 일이 없다.
 *   최종피해      입히는 쪽·받는 쪽 모두 걸린다.
 *   조화도 파괴 증폭  **여기에만** 걸린다(스킬 피해에는 안 걸린다).
 *
 * 배율은 스킬마다 다르고 기본 조화도 파괴는 1600%다.
 */

/** 부조화 피해의 고정 기초값. 공명자 스탯과 무관하다. */
export const DISCORD_BASE = 10027.14;

/** 기본 조화도 파괴 스킬의 배율. 공명자마다 다른 값을 갖는 경우 여기 대신 스킬에 적는다. */
export const DISCORD_DEFAULT_RATE = 16.0;

/** 공격 팔레트·루틴이 쓰는 조화도 파괴 항목의 id. 캐릭터 공격 id와 겹치지 않는다. */
export const DISCORD_ATTACK_ID = "discord:break";

export const isDiscordAttackId = (id: string): boolean => id === DISCORD_ATTACK_ID;

/**
 * 조화도 파괴를 계산 엔진이 먹는 공격(Attack) 모양으로 감싼다.
 *
 * 피해는 이 안의 hits가 아니라 calculator/discord.ts가 따로 낸다 — discord가 켜져 있으면
 * 계산이 그쪽 길로 간다(이상 효과가 anomaly로 갈라지는 것과 같은 구조다).
 * 속성은 **물리**라 Element에 없는 값이고, DamageElement의 "Physical"을 쓴다.
 */
export function discordAttack(): Attack {
  return {
    id: DISCORD_ATTACK_ID,
    name: "조화도 파괴",
    // 피해 보너스 칸을 쓰지 않으므로 분류는 의미가 없다. 이상 효과와 같은 이유로 Echo를 둔다.
    type: "Echo",
    element: "Physical",
    scalingStat: "ATK",
    hits: [],
    skillLevel: 1,
    discord: true,
  };
}
