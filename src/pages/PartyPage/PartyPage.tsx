import { useState } from "react";
import { usePartyConfig } from "../../context/PartyConfigContext";
import { CharacterPickerSection } from "../CalculatorPage/components/PartySection";
import { PartyListSection, membersOf } from "./PartyListSection";

/**
 * 파티 관리 탭.
 * 파티를 여러 벌 만들어 두는 자리다 — 왼쪽 캐릭터 목록에서 고르고, 오른쪽 파티 목록에 채운다.
 *
 * 여기서 짜는 파티는 **데미지 계산 탭의 파티와 따로 논다.** 계산 중인 구성을 잃지 않고
 * 다른 조합을 만들어 둘 수 있어야 해서다. 계산 탭의 「파티 불러오기」로 자리 편성만 옮긴다.
 */
export function PartyPage() {
  const { partyPresets, addPartyPreset, setPartyPresetMembers } = usePartyConfig();
  // 캐릭터 선택에서 누른 캐릭터가 들어갈 파티. 없어진 파티를 가리키면 맨 앞 파티로 본다.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const active = partyPresets.find((p) => p.id === pickedId) ?? partyPresets[0] ?? null;
  const members = active ? membersOf(active.config) : [];

  /** 아이콘을 누르면 고른 파티에 들어가고, 이미 있으면 빠진다. 파티가 없으면 하나 만들어 넣는다. */
  const pick = (characterId: string) => {
    if (!active) {
      const id = addPartyPreset();
      setPickedId(id);
      setPartyPresetMembers(id, [characterId]);
      return;
    }
    setPickedId(active.id);
    setPartyPresetMembers(
      active.id,
      members.includes(characterId)
        ? members.filter((id) => id !== characterId)
        : [...members, characterId],
    );
  };

  return (
    <div className="party-page">
      <div className="party-page-top">
        <CharacterPickerSection
          memberIds={members}
          onPick={pick}
          hint={active ? `→ ${active.name}` : "누르면 파티를 만들어 넣습니다"}
        />
        <PartyListSection activeId={active?.id ?? null} onActivate={setPickedId} />
      </div>
    </div>
  );
}
