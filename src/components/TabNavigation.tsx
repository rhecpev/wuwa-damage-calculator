import { useState, type ReactNode } from "react";
import { useAppState, type TabType } from "../context/AppStateContext";
import { THEMES, useTheme, type Theme } from "../utils/theme";

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

/**
 * 인게임 기능 아이콘을 그대로 쓰는 자리. 원본 주소를 직접 참조한다 —
 * 캐릭터 · 에코 그림과 같은 규칙이다(파일을 받아 리포지토리에 넣지 않는다).
 *
 * 선 아이콘과 달리 currentColor를 타지 않아 활성/비활성 색이 따라오지 않는다.
 * 대신 styles.css의 .sidebar-icon img가 밝기로 흐리고 켜는 것을 맡는다.
 */
const gameIcon = (url: string) => <img src={url} alt="" loading="lazy" />;

/**
 * 브랜드 마크 — 선이 아니라 **면**으로 그려진 로고를 담는다.
 * 위 icon()은 stroke 방식이라 면으로 된 로고를 그리지 못한다. currentColor는 그대로 탄다.
 */
const brandIcon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
    {path}
  </svg>
);

/** 디스코드 공식 마크(브랜드 자산의 24×24 경로). */
const DISCORD_MARK =
  "M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.198.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z";

/** 테마 고르개 아이콘 — 다크 달 · 라이트 해 · 세피아 책 · 미드나잇 별. */
const THEME_ICONS: Record<Theme, ReactNode> = {
  dark: icon(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />),
  light: icon(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>,
  ),
  sepia: icon(
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    </>,
  ),
  midnight: icon(
    <path d="M12 3l2.4 5.6 6.1.5-4.6 4 1.4 5.9L12 16l-5.3 3 1.4-5.9-4.6-4 6.1-.5z" />,
  ),
};

const ENCORE = "https://encore.moe/_nuxt/";

/** 인게임 아이콘 원본 서버. 무기 종류 아이콘이 여기 있다(API의 WeaponTypeIcon). */
const AKI = "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/";

const TABS: Array<{ id: TabType; label: string; hint: string; icon: ReactNode }> = [
  {
    id: "calculator",
    label: "대미지 계산",
    hint: "루틴 · 피해량",
    icon: icon(
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8M8 11h2m3 0h3M8 15h2m3 0h3" />
      </>,
    ),
  },
  {
    id: "characters",
    label: "캐릭터",
    hint: "무기 · 에코 · 스킬",
    icon: gameIcon(`${ENCORE}SP_FuncIconRole.B66doHXn.svg`),
  },
  {
    id: "weapons",
    label: "무기",
    hint: "보유 무기 등록",
    // 대검 아이콘 — 무기 종류 다섯 중 생김새가 가장 또렷해 「무기」를 대표시킨다.
    icon: gameIcon(`${AKI}SP_IconNorSword.webp`),
  },
  {
    id: "echoes",
    label: "에코",
    hint: "보유 에코 등록",
    icon: gameIcon(`${ENCORE}SP_FuncIconMonster.DjNJIuuu.svg`),
  },
  {
    id: "party",
    label: "파티",
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
    id: "cycles",
    label: "사이클",
    hint: "담아둔 공격 루틴 · 주고받기",
    icon: icon(
      <>
        <path d="M20 12a8 8 0 1 1-2.3-5.7" />
        <path d="M20 4v4h-4" />
      </>,
    ),
  },
  {
    id: "matrixPlanner",
    label: "매트릭스",
    hint: "파티 플래너 · 도는 순서",
    icon: gameIcon(`${ENCORE}SP_IconActivityTowerGuide.CveSAbrf.svg`),
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
    id: "profileImport",
    label: "디스코드 프로필 입력",
    hint: "카드 사진 한 장으로 채우기",
    icon: brandIcon(<path d={DISCORD_MARK} />),
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
];

/**
 * 화면 위에 붙는 가로 네비게이션.
 * 왼쪽에 이름표, 가운데에 탭 목록, 오른쪽에 안내 한 줄.
 * 좁은 화면에서는 탭 줄이 가로로 넘어간다(설명 줄은 title로만 남는다).
 */
export function TabNavigation() {
  const { tab, setTab } = useAppState();
  const { theme, setTheme } = useTheme();
  // 세로로 긴 화면에서만 쓰는 접이식 메뉴. 가로 화면에서는 늘 펼쳐져 있어 이 값을 보지 않는다.
  const [menuOpen, setMenuOpen] = useState(false);
  const current = TABS.find((item) => item.id === tab);

  return (
    <aside className={menuOpen ? "sidebar open" : "sidebar"}>
      {/* 세로 화면 전용 — ☰을 누르면 탭 목록과 테마 고르개가 아래로 펼쳐진다. */}
      <button
        className="sidebar-menu-button"
        aria-label="메뉴"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? "✕" : "☰"}
      </button>
      {/* 인게임 그림 아이콘을 글자색으로 칠하는 필터. 색은 styles.css가 테마 변수로 준다.
          (encore.moe 그림은 다른 출처라 mask로는 못 칠한다 — 필터는 출처와 상관없이 걸린다.) */}
      <svg className="sidebar-tint-defs" aria-hidden="true">
        <filter id="sidebar-icon-tint" colorInterpolationFilters="sRGB">
          <feFlood className="sidebar-tint-flood" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </svg>
      {/* 접혀 있을 때 지금 탭 — 탭 줄과 같은 아이콘을 글자색으로 붙인다. */}
      <span className="sidebar-current">
        {current && <span className="sidebar-icon">{current.icon}</span>}
        <b>{current?.label}</b>
      </span>

      <div className="sidebar-brand">
        <span>
          <b>명조 피해량 계산기</b>
          <em>WUTHERING WAVES</em>
        </span>
      </div>

      {/* 가로 화면에서는 display:contents라 막대에 그대로 늘어서고, 세로 화면에서는 펼침 판이 된다. */}
      <div className="sidebar-menu">
      <nav className="sidebar-nav">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={item.id === tab ? "sidebar-link on" : "sidebar-link"}
            title={`${item.label} — ${item.hint}`}
            onClick={() => {
              setTab(item.id);
              setMenuOpen(false);
            }}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-text">
              <b>{item.label}</b>
              <em>{item.hint}</em>
            </span>
          </button>
        ))}
      </nav>

      {/* 테마 넷을 아이콘만 가로로 늘어놓는다. 이름은 title로만 남긴다. */}
      <div className="theme-toggle" role="radiogroup" aria-label="테마">
        {THEMES.map((item) => (
          <button
            key={item.id}
            role="radio"
            aria-checked={item.id === theme}
            aria-label={item.label}
            title={item.label}
            className={item.id === theme ? "on" : undefined}
            onClick={() => setTheme(item.id)}
          >
            {THEME_ICONS[item.id]}
          </button>
        ))}
      </div>
      </div>

      <div className="sidebar-foot">
        <small>설정은 이 기기에만 저장됩니다</small>
      </div>
    </aside>
  );
}
