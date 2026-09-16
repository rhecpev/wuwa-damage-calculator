import { usePartyConfig } from "../../context/PartyConfigContext";
import { usePersistedState } from "../../utils/usePersistedState";
import { useCalculationResults } from "./hooks/useCalculationResults";
import { PartyRosterSection } from "./components/PartySection";
import { AttackPaletteSection } from "./components/AttackPaletteSection";
import { RotationSection } from "./components/RotationSection";
import { EnemySection } from "./components/EnemySection";
import { BuffSection } from "./components/BuffSection";
import { DamageBreakdownSection } from "./components/DamageBreakdownSection";

/** 사이클 구성 아래에 깔리는 세부 탭. 순서대로 위에서 아래로 쓰던 흐름 그대로다. */
const TABS = [
  { id: "buffs", label: "버프 직접 입력" },
  { id: "attacks", label: "공격 추가" },
  { id: "damage", label: "피해 분석" },
] as const;

type SubTab = (typeof TABS)[number]["id"];

export function CalculatorPage() {
  const {
    config,
    addAttack,
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
  const [tab, setTab] = usePersistedState<SubTab>("calc.tab", "buffs");
  const active = TABS.some((item) => item.id === tab) ? tab : TABS[0].id;

  return (
    <>
      {/* 파티 구성 · 콘텐츠 선택 · 몬스터 설정을 사이클 구성 위에 가로로 눕힌다 —
          사이클을 짜기 전에 늘 먼저 정하는 것들이라서다.
          자리를 누르면 캐릭터 목록이 창으로 뜬다. */}
      <div className="calc-party-bar">
        <PartyRosterSection config={config} />
        <EnemySection />
      </div>

      {/* 사이클 구성을 가로로 눕힌다 — 카드를 넓게 늘어놓고 보는 자리다.
          오른쪽 절반은 버프 창·계산식 창이 뜨는 자리(RotationSection 안의 .rotation-dock)다. */}
      <section className="rotation-rail">
        <RotationSection results={results} />
      </section>

      {/* 나머지는 세부 탭으로 접어 둔다 — 한 화면에 다 펼치면 루틴이 위로 밀려서다. */}
      <div className="compare-tabs calc-tabs" role="tablist">
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
      {active === "attacks" && <AttackPaletteSection onAddAttack={addAttack} />}
      {active === "damage" && <DamageBreakdownSection results={results} />}
    </>
  );
}
