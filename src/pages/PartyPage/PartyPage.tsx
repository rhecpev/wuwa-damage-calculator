import { characters } from "../../data/sampleData";
import { PARTY_SLOTS, usePartyConfig } from "../../context/PartyConfigContext";
import {
  CharacterPickerSection,
  PartyRosterSection,
} from "../CalculatorPage/components/PartySection";
import { PartyPresetSection } from "../CalculatorPage/components/PartyPresetSection";

/**
 * 파티 관리 탭.
 * 캐릭터 목록에서 셋을 골라 자리를 채우고, 이름을 붙여 담아두는 자리다.
 *
 * 여기서 짜는 편성은 **데미지 계산 탭의 파티와 따로 논다.** 계산 중인 구성을 잃지 않고
 * 다른 조합을 만져볼 수 있어야 해서다. 다 짜고 나면 「계산 탭으로 보내기」로 옮긴다.
 * 담아둔 파티(프리셋)는 두 탭이 같이 쓴다 — 저장은 여기 편성이, 불러오기는 여기 자리에 들어온다.
 */
export function PartyPage() {
  const { editorConfig, config, sendEditorToCalculator, loadCalculatorIntoEditor } =
    usePartyConfig();

  /** 그 편성에 앉은 캐릭터 이름들. 어느 파티가 어떤지 한 줄로 보여준다. */
  const names = (cfg: typeof config) =>
    PARTY_SLOTS.map((slot) => characters.find((c) => c.id === cfg[slot].characterId)?.name)
      .filter(Boolean)
      .join(" · ") || "비어 있음";

  return (
    <div className="party-page">
      <section className="panel party-bridge">
        <div>
          <small>지금 계산 탭 파티</small>
          <b>{names(config)}</b>
        </div>
        <div className="party-bridge-actions">
          <button onClick={loadCalculatorIntoEditor}>← 계산 탭에서 가져오기</button>
          <button className="primary" onClick={sendEditorToCalculator}>
            계산 탭으로 보내기 →
          </button>
        </div>
        <p>
          여기서 짜는 편성은 계산 탭과 따로 놉니다. 자리를 바꿔도 계산 중인 파티는 그대로고,
          옮기고 싶을 때만 위 버튼으로 주고받습니다 — 로테이션과 몬스터 설정은 건드리지 않습니다.
        </p>
      </section>

      <div className="party-page-top">
        <CharacterPickerSection config={editorConfig} scope="editor" />
        <PartyRosterSection config={editorConfig} scope="editor" />
      </div>

      <PartyPresetSection scope="editor" />
    </div>
  );
}
