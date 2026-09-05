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
    id: "characterBuffs",
    label: "캐릭터 버프 확인",
    hint: "스킬 원문 · 옮긴 버프",
    icon: icon(
      <>
        <path d="M12 3v18M3 12h18" />
        <circle cx="12" cy="12" r="8.5" />
      </>,
    ),
  },
  {
    id: "characterAttacks",
    label: "캐릭터 공격타입 확인",
    hint: "분류 · 보너스 칸",
    icon: icon(
      <>
        <path d="M4 20 20 4M15 4h5v5" />
        <path d="M4 9V4h5" />
      </>,
    ),
  },
  {
    id: "attackTriggers",
    label: "공격 트리거 확인",
    hint: "이상 효과 · 자원 추가/소모",
    icon: icon(
      <>
        <path d="M13 3 5 13h6l-1 8 8-10h-6z" />
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
 * 왼쪽에 붙는 세로 네비게이션.
 * 위에 이름표, 가운데에 탭 목록, 아래에 안내 한 줄.
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
