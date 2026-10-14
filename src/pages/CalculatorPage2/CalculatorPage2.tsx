import { usePartyConfig } from "../../context/PartyConfigContext";
import { usePersistedState } from "../../utils/usePersistedState";
import { useCalculationResults } from "./hooks/useCalculationResults";
import { PartyRosterSection } from "./components/PartySection";
import { RotationSection } from "./components/RotationSection";
import { EnemySection } from "./components/EnemySection";
import { BuffSection } from "./components/BuffSection";
import { DamageBreakdownSection } from "./components/DamageBreakdownSection";
import "./calc2.css";

/**
 * 사이클 구성 아래에 깔리는 세부 탭 — 걸리는 것을 손보고(버프 직접 입력), 결과를 본다(피해 분석).
 * 공격 추가는 사이클 표 오른쪽에 늘 떠 있다(RotationSection의 .c2-side).
 */
const TABS = [
  { id: "buffs", label: "버프 직접 입력" },
  { id: "damage", label: "피해 분석" },
] as const;

type SubTab = (typeof TABS)[number]["id"];

/**
 * 대미지 계산 탭의 복사본 — 화면 꼴만 다르다(wuwalab.com의 로테이션 화면을 본떴다).
 * 사이클 구성이 카드 판이 아니라 한 대가 한 줄인 표로 서고, 오른쪽에 공격 추가가 붙는다.
 * 버프 창은 고른 줄 바로 아래에 열린다.
 * 파티 · 루틴 · 버프 상태는 원본 탭과 같은 것을 본다. 색과 모양은 calc2.css가 .c2 안에서만 바꾼다.
 */
export function CalculatorPage2() {
  const {
    config,
    characterWeapons,
    allBuffs,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
  } = usePartyConfig();
  const results = useCalculationResults(
    config,
    characterWeapons,
    allBuffs,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
  );
  // 바깥 탭으로 나갔다 와도 보던 세부 탭이 남는다.
  // 예전에 저장된 이름(없어진 탭)이 남아 있으면 첫 탭으로 돌린다 — 아무것도 안 보이지 않게.
  const [tab, setTab] = usePersistedState<SubTab>("calc2.tab", TABS[0].id);
  const active = TABS.some((item) => item.id === tab) ? tab : TABS[0].id;

  return (
    <div className="c2">
      <header className="c2-title">
        <h1>대미지 계산</h1>
        <em>Rotation</em>
      </header>

      {/* 파티 구성 · 콘텐츠 선택 · 몬스터 설정을 사이클 구성 위에 가로로 눕힌다 —
          사이클을 짜기 전에 늘 먼저 정하는 것들이라서다.
          자리를 누르면 캐릭터 목록이 창으로 뜬다. */}
      <div className="calc-party-bar">
        <PartyRosterSection config={config} />
        <EnemySection />
      </div>

      {/* 왼쪽에 사이클 표, 오른쪽에 공격 추가(RotationSection 안의 .c2-side). */}
      <RotationSection results={results} />

      {/* 나머지는 세부 탭으로 접어 둔다 — 한 화면에 다 펼치면 루틴이 위로 밀려서다. */}
      <div className="calc-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={active === item.id}
            className={active === item.id ? "on" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {active === "buffs" && <BuffSection />}
      {active === "damage" && <DamageBreakdownSection results={results} />}
    </div>
  );
}
