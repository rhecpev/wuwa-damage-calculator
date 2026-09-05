/**
 * 「나중에 처리」 · 「체크 완료」 버튼 한 쌍과, 표시 상태를 알리는 꼬리표.
 * 무기 · 캐릭터 · 에코 확인 화면이 같은 모양을 쓰므로 여기 한 번만 그린다.
 */

export function ReviewActions({
  checked,
  deferred,
  onToggleChecked,
  onToggleDeferred,
  /** 버튼 글자를 줄인 작은 판(표 안의 줄 단위)에서 쓴다. */
  compact = false,
}: {
  checked: boolean;
  deferred: boolean;
  onToggleChecked: () => void;
  onToggleDeferred: () => void;
  compact?: boolean;
}) {
  return (
    <>
      {/* 둘 다 누르면 목록에서 사라진다. 위쪽 토글을 켜면 다시 보이고 여기서 해제할 수 있다. */}
      <button
        className={deferred ? "data-later on" : "data-later"}
        onClick={onToggleDeferred}
        title={deferred ? "나중에 처리를 해제합니다" : "지금은 넘기고 나중에 다시 봅니다"}
      >
        {deferred ? (compact ? "해제" : "나중에 해제") : compact ? "⏱ 나중에" : "⏱ 나중에 처리"}
      </button>
      <button
        className={checked ? "data-check on" : "data-check"}
        onClick={onToggleChecked}
        title={checked ? "확인 완료를 해제합니다" : "확인을 끝내고 목록에서 감춥니다"}
      >
        {checked ? (compact ? "해제" : "완료 해제") : compact ? "✓ 완료" : "✓ 체크 완료"}
      </button>
    </>
  );
}

/** 카드 제목 옆에 붙는 상태 꼬리표. */
export function ReviewTags({ checked, deferred }: { checked: boolean; deferred: boolean }) {
  return (
    <>
      {checked && <span className="data-checked-tag">확인 완료</span>}
      {deferred && <span className="data-later-tag">나중에</span>}
    </>
  );
}
