import { characters } from "./sampleData";
import { echoSkillOf } from "./echoAttacks";
import { loadEchoLinks, loadMyEchoes, mainEchoOf } from "./echoStore";
import { anomalyFromAttackId } from "./anomalies";
import { isDiscordAttackId } from "./discord";
import type { AttackType } from "../types/game";
import type { EchoLink, MyEcho } from "./echoStore";

/**
 * 공격 id로 그 공격의 **분류**를 찾는다.
 *
 * 「공명 해방을 쓰면 켜진다」처럼 분류로 걸리는 자동 버프(BuffAutoTrigger.triggeredByType)가
 * 루틴 카드를 볼 때 쓴다. 무기·에코 효과는 누가 낄지 모르니 공격 id로는 짚을 수 없다.
 *
 * 판정은 damageBonusType이 아니라 **type**을 본다 — 「해당 피해는 강공격으로 적용된다」는
 * 피해 판정이지 무엇을 눌렀는지가 아니고, 무기 설명의 「공명 스킬 발동 시」는 누른 쪽을 가리킨다.
 *
 * 이상 효과 항목과 조화도 파괴는 스킬이 아니라 상태·별도 항목이라 분류가 없다(undefined).
 * 조화도 파괴를 트리거로 쓰려면 공격 id(DISCORD_ATTACK_ID)로 건다.
 */
export function attackTypeOf(
  characterId: string,
  attackId: string,
  links?: EchoLink[],
  owned?: MyEcho[],
): AttackType | undefined {
  if (isDiscordAttackId(attackId) || anomalyFromAttackId(attackId)) return undefined;

  const character = characters.find((c) => c.id === characterId);
  if (character) {
    for (const skill of character.skills) {
      const attack = skill.attacks.find((a) => a.id === attackId);
      if (attack) return attack.type;
    }
  }

  // 에코 어빌리티 공격은 캐릭터 스킬이 아니라 낀 에코에서 나온다.
  const main = mainEchoOf(characterId, links ?? loadEchoLinks(), owned ?? loadMyEchoes());
  if (!main) return undefined;
  const skill = echoSkillOf(main.id, main.iconUrl, characterId);
  return skill?.attacks.find((a) => a.id === attackId)?.type;
}
