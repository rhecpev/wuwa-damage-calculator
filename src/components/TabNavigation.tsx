import type { ReactNode } from "react";
import { useAppState, type TabType } from "../context/AppStateContext";

/**
 * 사이드바 아이콘. 외부 파일 없이 굵기만 맞춘 선 아이콘으로 그린다.
 * currentColor를 쓰므로 활성/비활성 색이 글자와 함께 바뀐다.
 */
const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const TABS: Array<{ id: TabType; label: string; hint: string; icon: ReactNode }> = [
  {
    id: "calculator",
    label: "데미지 계산",
    hint: "루틴 · 피해량",
    icon: icon(
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8M8 11h2m3 0h3M8 15h2m3 0h3" />
      </>,
    ),
  },
  {
    id: "party",
    label: "파티 관리",
    hint: "저장한 파티",
    icon: icon(
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
        <path d="M16 5.5a3 3 0 0 1 0 5.4M17.5 15c2 .7 3.5 2.4 3.5 5" />
      </>,
    ),
  },
  {
    id: "matrixPlanner",
    label: "매트릭스",
    hint: "파티 플래너 · 도는 순서",
    icon: icon(
      <>
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
        <path d="M17.25 14.5v5.5M14.5 17.25h5.5" />
      </>,
    ),
  },
  {
    id: "characters",
    label: "캐릭터 관리",
    hint: "무기 · 에코 · 스킬",
    icon: icon(
      <>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
      </>,
    ),
  },
  {
    id: "weapons",
    label: "무기 관리",
    hint: "보유 무기 등록",
    icon: icon(
      <>
        <path d="M14.5 3.5 20 9l-9.5 9.5H5v-5.5z" />
        <path d="m4 20 3-3" />
      </>,
    ),
  },
  {
    id: "cycles",
    label: "사이클 관리",
    hint: "담아둔 공격 루틴 · 주고받기",
    icon: icon(
      <>
        <path d="M20 12a8 8 0 1 1-2.3-5.7" />
        <path d="M20 4v4h-4" />
      </>,
    ),
  },
  {
    id: "echoes",
    label: "에코 관리",
    hint: "보유 에코 등록",
    icon: icon(
      <>
        <path d="M12 3l2.3 6.2L21 11l-6.7 1.8L12 19l-2.3-6.2L3 11l6.7-1.8z" />
      </>,
    ),
  },
  {
    id: "cycleCompare",
    label: "사이클 대미지 비교",
    hint: "조건을 바꾸면 얼마나 오르나",
    icon: icon(
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>,
    ),
  },
  {
    id: "nicknames",
    label: "별명",
    hint: "공격 이름을 내 말로",
    icon: icon(
      <>
        <path d="M20.5 10.5 13 18a3.5 3.5 0 0 1-5-5l7.5-7.5a2.5 2.5 0 0 1 3.5 3.5L11.5 16" />
      </>,
    ),
  },
  // 옮겨 적은 무기 · 캐릭터 버프를 대조하고 고치는 확인용 탭이다.
  // 배포본에서도 보인다 — 체크 상태를 파일로 내보내 주고받을 수 있게.
  {
    id: "weaponBuffReview",
    label: "무기 버프 확인",
    hint: "설명문과 대조",
    icon: icon(
      <>
        <path d="M14.5 3.5 20 9l-9.5 9.5H5v-5.5z" />
        <path d="m13 14 2 2 4-4" />
      </>,
    ),
  },
  {
    id: "characterBuffReview",
    label: "캐릭터 버프 확인",
    hint: "고유효과 · 체인 정리",
    icon: icon(
      <>
        <circle cx="10" cy="8" r="3.2" />
        <path d="M4 20c0-3.4 2.7-5.6 6-5.6 1.3 0 2.5.3 3.4.9" />
        <path d="m15 18 2 2 4-4" />
      </>,
    ),
  },
  {
    id: "profileImport",
    label: "디스코드 프로필 입력",
    hint: "카드 사진 한 장으로 채우기",
    icon: icon(
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M4 18l5-5 3 3 3-3 5 5" />
      </>,
    ),
  },
];

/**
 * 화면 위에 붙는 가로 네비게이션.
 * 왼쪽에 이름표, 가운데에 탭 목록, 오른쪽에 안내 한 줄.
 * 좁은 화면에서는 탭 줄이 가로로 넘어간다(설명 줄은 title로만 남는다).
 */
export function TabNavigation() {
  const { tab, setTab } = useAppState();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-mark">明</span>
        <span>
          <b>명조 피해량 계산기</b>
          <em>WUTHERING WAVES</em>
        </span>
      </div>

      <nav className="sidebar-nav">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={item.id === tab ? "sidebar-link on" : "sidebar-link"}
            title={`${item.label} — ${item.hint}`}
            onClick={() => setTab(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-text">
              <b>{item.label}</b>
              <em>{item.hint}</em>
            </span>
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <small>설정은 이 기기에만 저장됩니다</small>
      </div>
    </aside>
  );
}
