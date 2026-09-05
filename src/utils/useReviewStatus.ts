import { useMemo, useState } from "react";

/**
 * 「체크 완료」와 「나중에 처리」 — 목록을 하나씩 훑어보는 화면이 공통으로 쓰는 상태.
 *
 * 완료 — 확인이 끝난 것
 * 나중에 — 지금은 넘기지만 다시 봐야 하는 것
 * 둘은 함께 설 수 없어서 하나를 누르면 다른 하나는 풀린다.
 * 표시한 항목은 목록에서 감추고, 화면 위쪽 토글을 켜면 다시 보인다.
 *
 * 표시는 **저장하지 않는다.** 화면을 새로 열면 비어 있다 — 계산에 쓰이는 값이 아니라
 * 한 자리에 앉아 훑는 동안만 필요한 흔적이라서다.
 * name은 화면을 구분하려고 남겨 둔 이름이다(지금은 쓰이지 않는다).
 */
export function useReviewStatus(name: string) {
  // 저장하지 않는다 — 자료를 훑는 동안만 쓰는 표시라, 새로고침하면 비운다.
  // 예전에는 localStorage에 담았는데 개인 저장이 검토 흔적으로만 15KB 넘게 불어났다.
  void name;
  const [checked, setChecked] = useState<string[]>([]);
  const [deferred, setDeferred] = useState<string[]>([]);

  const checkedSet = useMemo(() => new Set(checked), [checked]);
  const deferredSet = useMemo(() => new Set(deferred), [deferred]);

  /** 완료와 나중에는 함께 설 수 없다 — 한쪽을 켜면 다른 쪽에서 빼낸다. */
  const toggleChecked = (id: string) => {
    const on = checkedSet.has(id);
    setChecked((prev) => (on ? prev.filter((x) => x !== id) : [...prev, id]));
    if (!on) setDeferred((prev) => prev.filter((x) => x !== id));
  };

  const toggleDeferred = (id: string) => {
    const on = deferredSet.has(id);
    setDeferred((prev) => (on ? prev.filter((x) => x !== id) : [...prev, id]));
    if (!on) setChecked((prev) => prev.filter((x) => x !== id));
  };

  /**
   * 여러 개를 한 번에 켜거나 끈다. 표의 한 열을 통째로 확인 표시할 때 쓴다.
   * 하나씩 toggle을 부르면 그 사이의 상태를 서로 덮어쓸 수 있어서 따로 둔다.
   */
  const checkMany = (ids: string[], on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const id of ids) (on ? next.add(id) : next.delete(id));
      return [...next];
    });
    // 완료로 표시한 것은 「나중에」에서 빠진다 — 하나씩 누를 때와 같은 규칙이다.
    if (on) setDeferred((prev) => prev.filter((x) => !ids.includes(x)));
  };

  return {
    checkMany,
    checked,
    deferred,
    checkedSet,
    deferredSet,
    toggleChecked,
    toggleDeferred,
    clearChecked: () => setChecked([]),
    clearDeferred: () => setDeferred([]),
  };
}
