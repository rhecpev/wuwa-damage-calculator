import type { Buff } from "../types/game";

/**
 * 데미지 계산 화면에서 공격마다 켜고 끌 수 있는 버프 목록.
 *
 * 아직 비어 있는 상태이며, 여기에 항목을 채우면
 *  - 선택한 공격의 버프 체크박스 목록(DetailsSection)
 *  - 최종 스탯 합산(calculateFinalStats)
 * 양쪽에 자동으로 반영된다.
 *
 * stats에는 Stats의 키를 소수로 넣는다. (예: 공격력 +20% → { atkPercent: 0.2 })
 */
export const buffs: Buff[] = [];
