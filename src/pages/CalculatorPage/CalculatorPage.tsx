import { useAppState } from "../../context/AppStateContext";
import { usePartyConfig } from "../../context/PartyConfigContext";
import { useCalculationResults } from "./hooks/useCalculationResults";
import { CharacterPickerSection, PartyRosterSection } from "./components/PartySection";
import { AttackPaletteSection } from "./components/AttackPaletteSection";
import { RotationSection } from "./components/RotationSection";
import { EnemySection } from "./components/EnemySection";
import { BuffSection } from "./components/BuffSection";
import { BuffDialog } from "./components/BuffDialog";
import { DamageBreakdownSection } from "./components/DamageBreakdownSection";

export function CalculatorPage() {
  const { selectedId, setSelectedId } = useAppState();
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

  const selected = results.find((result) => result.item.id === selectedId) ?? null;

  return (
    <>
      {/* 공격 루틴을 맨 위에 세로로 둔다 — 카드를 넓게 늘어놓고 보는 자리라
          오른쪽 기둥보다 위쪽 한 줄이 낫다. */}
      <section className="rotation-rail">
        <RotationSection results={results} />
      </section>

      {/* 2×2 — 캐릭터 선택 · 파티 구성 / 몬스터 설정.
          담아둔 파티는 「파티 구성」 제목 옆의 「파티 불러오기」에서 연다
          — 목록을 늘 펼쳐 두면 위쪽이 통째로 길어져서다. */}
      <div className="calc-top">
        <CharacterPickerSection config={config} />
        <PartyRosterSection config={config} />
        <EnemySection />
      </div>
      <BuffSection />
      <AttackPaletteSection onAddAttack={addAttack} />
      <DamageBreakdownSection results={results} />

      {selected && <BuffDialog selected={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}
