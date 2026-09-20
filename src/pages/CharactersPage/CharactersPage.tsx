import { useState, useEffect, useSyncExternalStore } from "react";
import { characters } from "../../data/sampleData";
import { useAppState } from "../../context/AppStateContext";
import { CharacterRoster } from "./components/CharacterRoster";
import { EchoSelector } from "./components/EchoSelector";
import { WeaponSelector } from "./components/WeaponSelector";
import { CharacterBuffSection } from "./components/CharacterBuffSection";
import { SkillLevelSection } from "./components/SkillLevelSection";
import { CharacterStatsSection } from "./components/CharacterStatsSection";
import { loadEchoLinks, saveEchoLinks } from "../../data/echoStore";
import { rentalBuildOf } from "../../data/rentalBuilds";
import { isRentalCharacter, rentalStoreVersion, subscribeRentalStore } from "../../data/rentalStore";

/** 왼쪽 세로 탭. 순서가 화면 순서이고, id는 어떤 창을 띄울지 고르는 데만 쓴다. */
const TABS = [
  { id: "basic", label: "스탯" },
  { id: "weapon", label: "무기" },
  { id: "echo", label: "에코" },
  { id: "skill", label: "스킬" },
  { id: "chain", label: "공명체인" },
] as const;
// 「버프 정리」 탭이 있던 자리다 — 검수 장치는 2026-09-17에 걷어냈다(값은 캐릭터 자료 본문으로)
// (pages/CharacterBuffReviewPage).

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
  // 대여로 둔 캐릭터는 아래 설정이 계산에 쓰이지 않는다 — 그 사실을 판 위에 적어 둔다.
  const rentalVersion = useSyncExternalStore(subscribeRentalStore, rentalStoreVersion);
  const rented = selectedCharacterId ? isRentalCharacter(selectedCharacterId) : false;
  const rentalBuild = selectedCharacterId ? rentalBuildOf(selectedCharacterId) : undefined;
  void rentalVersion;

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
        return null;
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
          </button>
        ))}
      </nav>

      {/* 판 크기는 **스탯 탭이 정한다.** 다른 탭에서도 스탯 판을 보이지 않게 깔아 두어 그 높이를 잡고,
          고른 탭은 그 자리 위에 겹쳐 그린다 — 넘치면 판 안에서 스크롤한다. 탭을 옮겨도 판이 출렁이지 않는다. */}
      <div className="char-content">
        {selectedCharacterId ? (
          <>
            <div className={tab === "basic" ? "char-sizer" : "char-sizer ghost"} inert={tab !== "basic"}>
              <CharacterStatsSection
                characterId={selectedCharacterId}
                characterEchoLinks={characterEchoLinks}
              />
            </div>
            {tab !== "basic" && (
              <div className="char-pane">
                {rented && rentalBuild && (
                  <p className="char-rent-note">
                    <b>대여</b>
                    지금은 <b>매트릭스 대여 빌드</b>로 계산합니다 — {rentalBuild.weapon?.name}{" "}
                    {rentalBuild.weapon?.level}레벨 {rentalBuild.weapon?.refine}정련 · 에코{" "}
                    {rentalBuild.echoes.length}개 · Lv.{rentalBuild.level} · 스킬{" "}
                    {rentalBuild.skillLevel}레벨. <b>공명체인은 내가 가진 단계</b>를 그대로
                    따릅니다. 나머지 설정은 내 것이라 그대로 남고, 캐릭터 목록의 「대」 단추를
                    끄면 다시 쓰입니다.
                  </p>
                )}
                {content()}
              </div>
            )}
          </>
        ) : (
          content()
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
