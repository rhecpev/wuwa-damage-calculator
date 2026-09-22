import { CHANGELOG, type ChangeKind } from "../../data/changelog";

/** 갈래 꼬리표 이름. */
const KIND_LABEL: Record<ChangeKind, string> = {
  new: "새 기능",
  improve: "개선",
  fix: "수정",
};

/** 같은 날 안에서는 새 기능 → 개선 → 수정 차례로 보인다. */
const KIND_ORDER: ChangeKind[] = ["new", "improve", "fix"];

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return `${y}. ${m}. ${d}. (${WEEKDAY[day]})`;
}

/**
 * 업데이트 내역 — data/changelog.ts를 날짜별 타임라인으로 그린다.
 */
export function UpdatesPage() {
  return (
    <div className="updates">
      <section className="panel updates-head">
        <h2>업데이트 내역</h2>
        <p>계산기에 무엇이 바뀌었는지 날짜별로 모았습니다.</p>
      </section>

      <ol className="updates-timeline">
        {CHANGELOG.map((day) => {
          const items = [...day.items].sort(
            (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
          );
          return (
            <li key={day.date} className="updates-day">
              <span className="updates-dot" aria-hidden="true" />
              <article className="panel updates-card">
                <header>
                  <time dateTime={day.date}>{formatDate(day.date)}</time>
                  {day.title && <b>{day.title}</b>}
                </header>
                <ul>
                  {items.map((item, index) => (
                    <li key={index}>
                      <span className={`updates-tag ${item.kind}`}>{KIND_LABEL[item.kind]}</span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
