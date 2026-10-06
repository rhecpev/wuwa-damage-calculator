import { useState } from "react";
import { characters } from "../../data/sampleData";
import { PARTY_SLOTS, usePartyConfig } from "../../context/PartyConfigContext";
import { CharacterPickerSection } from "../CalculatorPage/components/PartySection";
import { GroupCombo, groupsOf } from "../../components/GroupCombo";
import { PartyListSection, membersOf } from "./PartyListSection";

/** 파티 창에서 고치는 중인 값. 「저장」을 눌러야 파티에 들어간다. */
interface PartyDraft {
  /** 고치는 파티. null이면 새 파티다 — 저장할 때 만든다. */
  partyId: string | null;
  name: string;
  members: string[];
  /** 빈 값이면 「미설정」 그룹이다. */
  group: string;
}

/**
 * 파티 관리 탭.
 * 파티를 여러 벌 만들어 두는 자리다 — 「파티 추가」나 파티 카드를 누르면 창이 뜨고,
 * 거기서 파티명 · 캐릭터 · 그룹을 정한다.
 *
 * 여기서 짜는 파티는 **데미지 계산 탭의 파티와 따로 논다.** 계산 중인 구성을 잃지 않고
 * 다른 조합을 만들어 둘 수 있어야 해서다. 계산 탭의 「파티 불러오기」로 자리 편성만 옮긴다.
 */
export function PartyPage() {
  const {
    partyPresets,
    addPartyPreset,
    setPartyPresetMembers,
    renamePartyPreset,
    setPartyPresetGroup,
    partyGroups,
  } = usePartyConfig();
  const [draft, setDraft] = useState<PartyDraft | null>(null);

  /** copy면 새 파티로 연다 — 캐릭터 · 그룹만 그 파티에서 가져오고 이름은 비워 둔다. */
  const openFor = (id: string, copy = false) => {
    const preset = partyPresets.find((p) => p.id === id);
    if (!preset) return;
    setDraft({
      partyId: copy ? null : id,
      name: copy ? "" : preset.name,
      members: membersOf(preset.config),
      group: preset.group ?? "",
    });
  };

  /** 아이콘을 누르면 들어가고, 이미 있으면 빠진다. 자리 셋이 차면 더 받지 않는다. */
  const pick = (characterId: string) =>
    setDraft((cur) => {
      if (!cur) return cur;
      if (cur.members.includes(characterId))
        return { ...cur, members: cur.members.filter((id) => id !== characterId) };
      if (cur.members.length >= PARTY_SLOTS.length) return cur;
      return { ...cur, members: [...cur.members, characterId] };
    });

  const save = () => {
    if (!draft) return;
    const id = draft.partyId ?? addPartyPreset();
    // 이름을 비워 두면 그대로 둔다 — 새 파티는 「파티 N」이 붙는다.
    renamePartyPreset(id, draft.name);
    setPartyPresetMembers(id, draft.members);
    setPartyPresetGroup(id, draft.group);
    setDraft(null);
  };

  const groups = groupsOf(partyGroups, partyPresets);

  return (
    <div className="party-page">
      <PartyListSection
        activeId={draft?.partyId ?? null}
        onActivate={(id) => openFor(id)}
        onCopy={(id) => openFor(id, true)}
        onAdd={(group) => setDraft({ partyId: null, name: "", members: [], group })}
      />

      {draft && (
        <div className="formula-backdrop" onClick={() => setDraft(null)} role="presentation">
          <div className="formula-modal party-pick-modal" onClick={(e) => e.stopPropagation()}>
            <div className="formula-head">
              <h3>{draft.partyId ? "파티 수정" : "파티 추가"}</h3>
              <button className="formula-close" onClick={() => setDraft(null)} aria-label="닫기">
                ×
              </button>
            </div>

            {/* 위 줄 — 왼쪽에 자리 셋, 오른쪽에 파티명과 그룹을 위아래로. 창이 세로로 길어지지 않게. */}
            <div className="party-form-top">
              <div className="party-form-field">
                <b>
                  1. 캐릭터
                  <em>
                    {draft.members.length} / {PARTY_SLOTS.length}
                  </em>
                </b>
                {/* 계산 탭의 「파티 구성」과 같은 모양 — 지금 고른 캐릭터를 자리 순서대로 보여 준다. */}
                <div className="party">
                  {PARTY_SLOTS.map((slot, index) => {
                    const character = characters.find((c) => c.id === draft.members[index]);

                    return (
                      <article key={slot} className={character ? "filled" : ""}>
                        <small>{index + 1}번 캐릭터</small>
                        {character ? (
                          <>
                            <button
                              className="party-clear"
                              title={`${character.name} — 이 자리를 비웁니다`}
                              onClick={() => pick(character.id)}
                            >
                              ×
                            </button>
                            <div className="party-face">
                              {character.iconUrl && (
                                <img
                                  src={character.iconUrl}
                                  alt=""
                                  loading="lazy"
                                  draggable={false}
                                />
                              )}
                            </div>
                            <strong>{character.name}</strong>
                          </>
                        ) : (
                          <span className="party-empty">미선택</span>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="party-form-side">
                <label className="party-form-field">
                  <b>2. 파티명</b>
                  <input
                    type="text"
                    autoFocus
                    placeholder={`파티 ${partyPresets.length + 1}`}
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </label>

                <div className="party-form-field">
                  <b>3. 그룹</b>
                  {/* 「그룹 추가」로 만들어 둔 그룹에서만 고른다. 안 고르면 「미설정」으로 묶인다. */}
                  <GroupCombo
                    value={draft.group}
                    groups={groups}
                    onChange={(group) => setDraft({ ...draft, group: group ?? "" })}
                  />
                </div>
              </div>
            </div>

            <div className="party-form-field party-form-grow">
              <CharacterPickerSection memberIds={draft.members} onPick={pick} />
            </div>

            <div className="dialog-buttons">
              <button
                className="primary"
                disabled={draft.members.length === 0}
                title={draft.members.length === 0 ? "캐릭터를 한 명 이상 고르세요" : undefined}
                onClick={save}
              >
                저장
              </button>
              <button onClick={() => setDraft(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
