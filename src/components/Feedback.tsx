/**
 * 사진을 읽는 동안·다 읽은 뒤에 사람에게 말을 거는 두 조각.
 *
 * 사진 한 장을 읽는 데 몇 초가 걸린다(에코 다섯 자리를 두 가지 방식으로 두 번씩 읽는다).
 * 그동안 아무 말이 없으면 멈춘 것으로 보이기 때문에 **어디까지 왔는지**를 띄운다.
 * 저장이 끝난 뒤에도 마찬가지다 — 조용히 끝내면 됐는지 안 됐는지 알 수가 없다.
 */

export interface Progress {
  /** 지금 무엇을 하고 있는지. 「에코 3/5」처럼 사람 말로 적는다. */
  label: string;
  done: number;
  total: number;
}

export function ProgressBar({ progress }: { progress: Progress }) {
  const percent =
    progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-head">
        <span>{progress.label}</span>
        <b>{percent}%</b>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export interface DialogButton {
  label: string;
  onClick: () => void;
  /** 눈에 띄게 할 단추 하나. 보통 「확인」이다. */
  primary?: boolean;
}

/** 화면 한가운데 뜨는 알림·물음 창. 바깥을 눌러도 닫힌다(맨 끝 단추가 눌린 것으로 본다). */
export function Dialog({
  title,
  lines,
  buttons,
  onDismiss,
}: {
  title: string;
  lines: string[];
  buttons: DialogButton[];
  onDismiss: () => void;
}) {
  return (
    <div className="dialog-backdrop" onClick={onDismiss}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="dialog-body">
          {lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="dialog-buttons">
          {buttons.map((b) => (
            <button key={b.label} className={b.primary ? "primary" : ""} onClick={b.onClick}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
