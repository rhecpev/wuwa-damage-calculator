import type { AttackType, ManualBuff, RotationAttack } from "../types/game";

/**
 * 「이 공격을 쓰면 그 뒤로 걸려 있는 버프」를 루틴 전체에 걸쳐 짚어 준다.
 *
 * 반주처럼 원문이 「발동 후 N초간」인 버프는 공격 하나하나에 손으로 켜 주기엔 성가시다.
 * 버프에 triggeredBy(그 버프를 켜는 공격 id)를 적어 두면 루틴에서 그 공격 카드를 찾아
 * **뒤따르는 카드에 저절로** 켜 준다. 켜지는 자리는 트리거 카드 **다음** 카드부터다 —
 * 반주는 그 캐릭터가 물러난 뒤 다음 캐릭터에게 걸리는 것이라 트리거 카드 자신은 받지 않는다.
 *
 * 끝(ManualBuff.endsOn)은 두 갈래다.
 *   "switch" — 받은 캐릭터가 물러나면 끝. 반주 중 「다음 등장 캐릭터에게 … 전환하면 즉시 끝난다」로
 *     적힌 것(절지 「글레이징 기법」)이 여기 해당한다. 받는 사람은 트리거 카드 **다음 카드의
 *     캐릭터**로 잡고, 그 뒤로 다른 캐릭터 카드가 하나라도 끼면 거기서 끊는다.
 *     A A B A로 이어지면 마지막 A는 꺼진 채로 남는다 — 돌아와도 되살아나지 않는다.
 *     시간이 아니라 등장으로 끝나는 것이라 사이클 경계를 보지 않는다.
 *   "rotation" — 루틴이 끝날 때까지. 적에게 쌓여 다음 사이클로 넘어가는 것(「조화 밀집 · 간섭」).
 *   "cycle"  — 사이클이 끝나면 끝(적지 않으면 이쪽). 수수 「일렁이는 맑은 물결」처럼
 *     파티 전원에게 시간으로 걸리는 것은 교체로 끊기지 않아 끝을 잡을 데가 사이클뿐이다
 *     — 루틴에는 시간축이 없다(RotationAttack에는 순서와 cycle 번호뿐).
 *
 * 결과는 파생값이다 — 루틴에 써 넣지 않고 계산할 때마다 다시 낸다.
 * 그래야 트리거 카드를 지우거나 순서를 바꿔도 켜 둔 체크가 남아 틀어지지 않는다.
 *
 * 스택이 쌓이는 버프(ManualBuff.stacksPerTrigger)는 트리거가 나올 때마다 그만큼 더한다 —
 * 「조화도 파괴를 쓸 때마다 「조화 밀집 · 간섭」이 1스택씩」이 그 꼴이다. 상한은 여기서 보지 않는다
 * (파티 구성으로 정해지는 값이라 쓰는 쪽에서 자른다).
 *
 * @returns 루틴 항목 id → (버프 id → 그 카드에서의 스택)
 */
export function autoBuffIds(
  rotation: RotationAttack[],
  buffs: ManualBuff[],
  /**
   * 카드의 공격 **분류**를 찾아 주는 함수(data/attackLookup.ts의 attackTypeOf).
   * 무기·에코처럼 공격 id가 아니라 분류로 걸리는 버프(triggeredByType) 때문에 필요하다.
   * 넘기지 않으면 분류로 거는 버프는 켜지지 않는다.
   */
  typeOf?: (item: RotationAttack) => AttackType | undefined,
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  const triggers = buffs.filter(
    (buff) => buff.triggeredBy?.length || buff.triggeredByType?.length,
  );
  if (triggers.length === 0) return out;

  /**
   * 지금 걸려 있는 것.
   *   recipient "switch" 버프가 받은 캐릭터(아직 안 정해졌으면 null)
   *   stacks    지금까지 쌓인 스택. stacksPerTrigger가 없으면 늘 1이다.
   */
  const live = new Map<
    string,
    { endsOn: "cycle" | "switch" | "rotation"; cycle: number; recipient: string | null; stacks: number }
  >();

  for (const item of rotation) {
    const cycle = item.cycle ?? 1;

    // 1) 이 카드에 닿기 전에 끝난 것을 걷어낸다.
    for (const [id, state] of live) {
      // 루틴이 끝날 때까지 가는 것은 걷어낼 일이 없다.
      if (state.endsOn === "rotation") continue;
      if (state.endsOn === "cycle") {
        if (cycle !== state.cycle) live.delete(id);
        continue;
      }
      // "switch" — 트리거 바로 다음 카드의 주인이 받는 사람이다. 그 뒤로 남이 끼면 끊긴다.
      if (state.recipient === null) state.recipient = item.characterId;
      else if (state.recipient !== item.characterId) live.delete(id);
    }

    // 2) 남은 것을 이 카드에 건다. 스택도 같이 넘긴다.
    if (live.size > 0) {
      const row = new Map<string, number>();
      for (const [id, state] of live) row.set(id, state.stacks);
      out.set(item.id, row);
    }

    // 3) 이 카드가 트리거면 담는다 — 위에서 이미 걸고 난 뒤라 자기 자신은 받지 않는다.
    // 분류로 거는 버프가 하나라도 있을 때만 찾는다 — 카드마다 부르면 값이 비싸다.
    const type = triggers.some((b) => b.triggeredByType?.length) ? typeOf?.(item) : undefined;

    for (const buff of triggers) {
      const byId = buff.triggeredBy?.includes(item.attackId) ?? false;
      const byType = type !== undefined && (buff.triggeredByType?.includes(type) ?? false);
      if (!byId && !byType) continue;
      // 버프 주인이 있는 것은 그 주인이 쓴 카드여야 한다 — 공격 id는 캐릭터 사이에서 겹칠 수 있다
      // (RotationAttack이 characterId를 같이 담는 이유다).
      if (buff.ownerId && buff.ownerId !== item.characterId) continue;
      // 스택이 쌓이는 버프(조화도 파괴마다 「간섭」 1스택)는 이미 걸려 있으면 더 얹는다.
      // 상한은 여기서 보지 않는다 — 파티 구성으로 정해지는 값이라 계산·화면 쪽에서 자른다.
      const per = buff.stacksPerTrigger ?? 0;
      const had = live.get(buff.id);
      if (per > 0 && had) {
        had.stacks += per;
        had.cycle = cycle;
        continue;
      }
      // 같은 반주를 또 쓰면 받는 사람을 다시 잡는다(앞서 끊긴 것도 여기서 되살아난다).
      live.set(buff.id, {
        endsOn: buff.endsOn ?? "cycle",
        cycle,
        recipient: null,
        stacks: per > 0 ? per : 1,
      });
    }
  }

  return out;
}

/** 빈 표 하나를 돌려 쓴다 — 카드마다 새로 만들면 아래 비교가 매번 어긋난다. */
export const NO_AUTO_BUFFS: ReadonlyMap<string, number> = new Map<string, number>();
