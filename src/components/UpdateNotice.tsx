import { CHANGELOG } from "../data/changelog";
import { KIND_LABEL, KIND_ORDER } from "../pages/UpdatesPage/UpdatesPage";
import { useAppState } from "../context/AppStateContext";
import { usePersistedState } from "../utils/usePersistedState";
import { isReturningVisitor } from "../utils/persist";

/**
 * 업데이트 알림 — 알림을 걸어 둔 업데이트(changelog의 `notice`)가 나온 뒤 처음 들어온 사람에게
 * 그날 바뀐 것을 한 번 띄운다.
 *
 * 「봤다」는 표시는 그 업데이트의 날짜로 남긴다(저장 키 updates.seenNotice). 확인을 누르면 같은
 * 업데이트로는 다시 뜨지 않고, 다음에 알림을 건 업데이트가 올라오면 그때 다시 한 번 뜬다.
 *
 * **처음 온 사람에게는 띄우지 않는다.** 저장된 것이 하나도 없으면(브라우저 저장도, 고른 파일도)
 * 바뀌기 전을 본 적이 없으니 「무엇이 바뀌었는지」가 뜻이 없다 — 지금 것을 이미 본 것으로 적어 둔다.
 */
export function UpdateNotice() {
  const { setTab } = useAppState();
  // 맨 위가 가장 최근이다 — 알림을 건 것 가운데 가장 최근 것 하나만 본다.
  const day = CHANGELOG.find((d) => d.notice);
  // 기본값은 저장된 표시가 없을 때만 쓰인다 — 전에 쓰던 사람은 「아직 안 봄」, 처음 온 사람은 「이미 봄」.
  const [seen, setSeen] = usePersistedState<string>(
    "updates.seenNotice",
    isReturningVisitor() ? "" : (day?.date ?? ""),
  );

  // 날짜는 YYYY-MM-DD라 글자 비교가 곧 날짜 비교다.
  if (!day || seen >= day.date) return null;

  const items = [...day.items].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  );
  const close = () => setSeen(day.date);

  return (
    <div className="dialog-backdrop" onClick={close} role="presentation">
      <div className="dialog update-notice" onClick={(e) => e.stopPropagation()}>
        <h3>업데이트 알림</h3>
        <p className="update-notice-date">
          {day.date}
          {day.title ? ` · ${day.title}` : ""}
        </p>
        <ul className="update-notice-list">
          {items.map((item, index) => (
            <li key={index}>
              <span className={`updates-tag ${item.kind}`}>{KIND_LABEL[item.kind]}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
        <div className="dialog-buttons">
          <button
            onClick={() => {
              close();
              setTab("updates");
            }}
          >
            업데이트 내역 보기
          </button>
          <button className="primary" onClick={close}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
