import { useState, useEffect } from "react";
import { characters } from "../../data/sampleData";
import { useAppState } from "../../context/AppStateContext";
import { CharacterRoster } from "./components/CharacterRoster";
import { EchoSelector } from "./components/EchoSelector";
import { WeaponSelector } from "./components/WeaponSelector";
import { CharacterBuffSection } from "./components/CharacterBuffSection";
import { CharacterBuffReviewSection } from "./components/CharacterBuffReviewSection";
import { SkillLevelSection } from "./components/SkillLevelSection";
import { CharacterStatsSection } from "./components/CharacterStatsSection";
import { loadEchoLinks, saveEchoLinks } from "../../data/echoStore";

/** 왼쪽 세로 탭. 순서가 화면 순서이고, id는 어떤 창을 띄울지 고르는 데만 쓴다. */
const TABS = [
  { id: "basic", label: "기본창", hint: "레벨 · 스탯" },
  { id: "weapon", label: "무기선택창", hint: "무기 · 레벨 · 정련" },
  { id: "echo", label: "에코장착창", hint: "보유 에코 장착" },
  { id: "skill", label: "스킬 노드 관리", hint: "스킬 레벨" },
  { id: "chain", label: "공명체인 관리", hint: "체인 단계 · 고유 버프" },
] as const;
// 「버프 정리」는 탭에서 뺐다 — 위 창을 보면서 같이 대조해야 하는 내용이라
// 아래쪽에 늘 펼쳐 둔다(탭으로 감춰두면 번갈아 눌러야 해서 비교가 안 된다).

type TabId = (typeof TABS)[number]["id"];

export function CharactersPage() {
  const { selectedCharacterId, setSelectedCharacterId } = useAppState();
  // 아무것도 안 고른 상태로 두지 않는다 — 들어오자마자 볼 게 있어야 한다.
  // 보던 캐릭터가 있으면 그대로 이어 보고(AppState가 브라우저에 남긴다), 없으면 첫 번째.
  useEffect(() => {
    if (selectedCharacterId && characters.some((c) => c.id === selectedCharacterId)) return;
    if (characters.length) setSelectedCharacterId(characters[0].id);
  }, [selectedCharacterId, setSelectedCharacterId]);
  // 캐릭터-에코 연결도 브라우저에 저장한다(src/data/echoStore.ts). 서버는 쓰지 않는다.
  const [characterEchoLinks, setCharacterEchoLinks] = useState(loadEchoLinks);
  const [tab, setTab] = useState<TabId>("basic");

  useEffect(() => {
    saveEchoLinks(characterEchoLinks);
  }, [characterEchoLinks]);

  /**
   * 에코는 실물이 하나씩이라 두 캐릭터가 같이 낄 수 없다.
   * 이미 다른 캐릭터가 끼고 있으면 거기서 떼어내고 이쪽에 옮겨 단다.
   */
  function toggleEcho(characterId: string, echoId: string) {
    const echoIdNum = parseInt(echoId);
    const mine = characterEchoLinks
      .filter((link) => link.characterId === characterId)
      .map((link) => link.echoId);

    if (mine.includes(echoIdNum)) {
      setCharacterEchoLinks(
        characterEchoLinks.filter(
          (link) => !(link.characterId === characterId && link.echoId === echoIdNum),
        ),
      );
      return;
    }

    if (mine.length >= 5) return;

    setCharacterEchoLinks([
      ...characterEchoLinks.filter((link) => link.echoId !== echoIdNum),
      { characterId, echoId: echoIdNum },
    ]);
  }

  /**
   * 이 캐릭터의 에코 목록을 통째로 갈아끼운다. 드래그로 자리를 바꿀 때 쓴다.
   * 목록 순서가 곧 슬롯 순서라 첫 번째가 메인 에코다.
   * 여기 담기는 에코는 다른 캐릭터에서 자동으로 떨어져 나간다(중복 장착 금지).
   */
  function setEchoes(charId: string, echoIds: number[]) {
    const next = echoIds.slice(0, 5);

    setCharacterEchoLinks([
      ...characterEchoLinks.filter(
        (link) => link.characterId !== charId && !next.includes(link.echoId),
      ),
      ...next.map((echoId) => ({ characterId: charId, echoId })),
    ]);
  }

  /** 고른 탭 하나만 그린다. 캐릭터가 없으면 어느 탭이든 안내만 띄운다. */
  function content() {
    if (!selectedCharacterId) {
      return (
        <div className="char-empty">
          <p>오른쪽 목록에서 캐릭터를 고르세요.</p>
        </div>
      );
    }

    switch (tab) {
      case "basic":
        return (
          <CharacterStatsSection
            characterId={selectedCharacterId}
            characterEchoLinks={characterEchoLinks}
          />
        );
      case "weapon":
        return <WeaponSelector characterId={selectedCharacterId} />;
      case "echo":
        return (
          <EchoSelector
            characterId={selectedCharacterId}
            onToggleEcho={toggleEcho}
            onSetEchoes={setEchoes}
            characterEchoLinks={characterEchoLinks}
          />
        );
      case "skill":
        return <SkillLevelSection characterId={selectedCharacterId} />;
      case "chain":
        return <CharacterBuffSection characterId={selectedCharacterId} />;
    }
  }

  return (
    <div className="char-workspace">
      <nav className="char-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={item.id === tab ? "char-tab on" : "char-tab"}
            onClick={() => setTab(item.id)}
          >
            <b>{item.label}</b>
            <em>{item.hint}</em>
          </button>
        ))}
      </nav>

      <div className="char-content">
        {content()}

        {/* 버프 정리는 늘 아래에 펼쳐 둔다 — 위 창과 같이 봐야 하는 내용이다. */}
        {selectedCharacterId && (
          <CharacterBuffReviewSection characterId={selectedCharacterId} />
        )}
      </div>

      <CharacterRoster
        characters={characters}
        selectedId={selectedCharacterId}
        onSelect={setSelectedCharacterId}
      />
    </div>
  );
}
