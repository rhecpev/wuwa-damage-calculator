import { ANOMALIES } from "./anomalies";
import type { ManualBuff } from "../types/game";

/**
 * 적에게 걸린 이상 효과 중 **피해가 없고 상태로만 남는 것**을 버프 한 줄로 담는다.
 *
 * 지금은 암흑 효과 하나뿐이다. 암흑은 스택이 곧 방어력 감소라서 공격 루틴에 담을 것이
 * 아니라 「지금 적에게 몇 스택 붙어 있는지」로 관리하는 편이 맞다.
 *
 * 캐릭터마다 두지 않는 이유 —
 *   암흑은 적에게 붙는 상태다. 치사와 현령이 같이 있다고 방어력이 두 번 깎이지 않는다.
 *   예전에는 두 캐릭터 파일에 같은 줄이 하나씩 있어서, 둘을 같이 편성하면 목록에 두 개가
 *   뜨고 둘 다 켜면 두 번 걸렸다. 그래서 파티와 무관한 한 줄로 옮겼다.
 *
 * 스택 상한은 3 고정이 아니다 — 치사의 반주나 현령 3체인처럼 상한을 올려주는 버프가
 * 켜져 있으면 같이 올라간다(calculator/manualBuffs.ts의 anomalyStackCap).
 */
export const HAVOC_BANE_BUFF_ID = "anomaly:HavocBane";

export function anomalyStateBuffs(): ManualBuff[] {
  const def = ANOMALIES.HavocBane;
  return [
    {
      id: HAVOC_BANE_BUFF_ID,
      label: `${def.name} 효과 · 목표 방어력 감소`,
      target: "defReduction",
      damageType: "All",
      // 스택당 2.0101%p — 게임 표기는 2%지만 실측이 2.010048~2.010203%를 요구한다.
      // 치사 풀버프 다섯 줄(가위 2타 크리 4039 · 3타 비크 8793 · 추가 크리 12941 ·
      // 5체인 스킬 크리 2스택 337505 · 3스택 340729)이 암흑 2스택과 3스택으로 갈려 있어서,
      // 스택 수에 비례하는 이 칸 말고는 다섯 줄을 한꺼번에 맞출 자리가 없다.
      // 2스택 5체인 크리가 아래쪽을 2.010048%까지 밀어 올렸다(docs/피해-실측-대조.md).
      value: 0.020101,
      stacks: def.maxStacks,
      maxStacks: def.maxStacks,
      anomalyStacks: "HavocBane",
      modifier: "increase",
      enabled: true,
      // 적에게 실제로 붙어 있을 때만 걸린다 — 켜고 스택을 정해서 쓴다.
      uptime: "active",
      // 적에게 걸린 디버프라 파티 전원이 같이 덕을 본다.
      scope: "party",
      iconUrl: def.icon,
    },
  ];
}
