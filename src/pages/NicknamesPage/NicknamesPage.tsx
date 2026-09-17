import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { characters } from "../../data/sampleData";
import { useAppState } from "../../context/AppStateContext";
import { CharacterRoster } from "../CharactersPage/components/CharacterRoster";
import {
  attackNickname,
  attackNicknamesVersion,
  autoNickname,
  clearCharacterNicknames,
  nicknameCountOf,
  setAttackNickname,
  subscribeAttackNicknames,
} from "../../data/attackNicknames";
import { useReviewStatus } from "../../utils/useReviewStatus";
import { ReviewActions, ReviewTags } from "../../components";
import type { Attack, SkillCategory } from "../../types/game";

/**
 * 별명 — 공격을 평소 부르는 이름으로 적어 두는 화면.
 *
 * 인게임 명칭은 자료 그대로라 「공명 스킬 2단」처럼 읽힌다. 루틴을 짤 때는 그것보다
 * 평소 쓰는 말이 빠르므로, 공격마다 별명을 적어 두고 계산 탭의 「공격 추가」에서
 * 토글로 갈아 볼 수 있게 한다(data/attackNicknames.ts).
 *
 * 적은 것만 저장된다 — 비워 두면 **규칙으로 지은 별명**(평1 · E · R · F …)이 대신 보인다.
 * 규칙은 data/attackNicknames.ts의 autoNicknamesOf가 짓는다.
 *
 * 캐릭터마다 「체크 완료」를 달 수 있다 — 쉰 명이 넘어 한 번에 다 볼 수 없으니
 * 어디까지 손봤는지 표시해 두고 이어서 훑는다.
 */

/** 공격을 묶는 구역과 순서. 공격 추가 화면과 같게 맞춘다. */
const SECTIONS: { category: SkillCategory; label: string }[] = [
  { category: "Basic", label: "일반 공격" },
  { category: "Skill", label: "공명 스킬" },
  { category: "Circuit", label: "공명 회로" },
  { category: "Liberation", label: "공명 해방" },
  { category: "Variation", label: "변주 스킬" },
  { category: "Intro", label: "반주 스킬" },
  { category: "Sync", label: "조화도 파괴" },
  { category: "Passive", label: "고유 스킬" },
];

/** category가 없는 옛 데이터는 공격 타입으로 구역을 추정한다(공격 추가 화면과 같은 규칙). */
function fallbackCategory(attack: Attack): SkillCategory {
  switch (attack.type) {
    case "Basic":
    case "Heavy":
    case "Aerial":
    case "DodgeCounter":
      return "Basic";
    case "Liberation":
    case "Ultimate":
      return "Liberation";
    case "Variation":
    case "Outro":
      return "Variation";
    case "Intro":
      return "Intro";
    case "Chain":
      return "Circuit";
    default:
      return "Skill";
  }
}

export function NicknamesPage() {
  const { selectedCharacterId, setSelectedCharacterId } = useAppState();
  // 별명 표는 React 상태가 아니라서, 바뀔 때마다 올라가는 번호를 구독해 다시 그린다.
  useSyncExternalStore(subscribeAttackNicknames, attackNicknamesVersion);
  const [query, setQuery] = useState("");

  // 캐릭터 관리 탭과 같은 자리를 쓴다 — 보던 캐릭터를 그대로 이어 본다.
  useEffect(() => {
    if (selectedCharacterId && characters.some((c) => c.id === selectedCharacterId)) return;
    if (characters.length) setSelectedCharacterId(characters[0].id);
  }, [selectedCharacterId, setSelectedCharacterId]);

  const character = characters.find((c) => c.id === selectedCharacterId) ?? null;

  /** 이 캐릭터의 공격을 구역별로 모은다. 구역 아이콘은 그 구역에 처음 나온 스킬 것을 쓴다. */
  const sections = useMemo(() => {
    const grouped = new Map<
      SkillCategory,
      { rows: { attack: Attack; skill: string }[]; icon?: string }
    >();
    for (const skill of character?.skills ?? []) {
      for (const attack of skill.attacks) {
        const category = skill.category ?? fallbackCategory(attack);
        const bucket = grouped.get(category);
        if (bucket) {
          bucket.rows.push({ attack, skill: skill.name });
          if (!bucket.icon) bucket.icon = skill.icon;
        } else {
          grouped.set(category, { rows: [{ attack, skill: skill.name }], icon: skill.icon });
        }
      }
    }
    return SECTIONS.map((section) => ({
      ...section,
      rows: grouped.get(section.category)?.rows ?? [],
      icon: grouped.get(section.category)?.icon,
    })).filter((section) => section.rows.length > 0);
  }, [character]);

  // 적어 둔 별명을 읽는 자리마다 version을 봐야 고친 순간 다시 그려진다.
  const needle = query.trim().toLowerCase();
  const nicknameOf = (attackId: string) =>
    character ? (attackNickname(character.id, attackId) ?? "") : "";
  /** 적어 둔 것이 없을 때 대신 보일 이름 — 규칙으로 지은 별명. */
  const autoOf = (attackId: string) => (character ? autoNickname(character.id, attackId) : undefined);

  const filtered = sections
    .map((section) => ({
      ...section,
      rows: needle
        ? section.rows.filter(
            (row) =>
              row.attack.name.toLowerCase().includes(needle) ||
              row.skill.toLowerCase().includes(needle) ||
              nicknameOf(row.attack.id).toLowerCase().includes(needle),
          )
        : section.rows,
    }))
    .filter((section) => section.rows.length > 0);

  const named = character ? nicknameCountOf(character.id) : 0;
  const total = sections.reduce((sum, section) => sum + section.rows.length, 0);
  // 캐릭터 단위로 「체크 완료」를 단다. 다른 확인 화면과 같은 자리·같은 규칙이다.
  const review = useReviewStatus("nicknames");
  const doneCount = characters.filter((c) => review.checkedSet.has(c.id)).length;

  return (
    <div className="nick-workspace">
      <div className="nick-content">
        <section className="panel nick-intro">
          <div>
            <small>NICKNAMES</small>
            <h2>별명</h2>
            <p>
              공격마다 평소 부르는 이름을 적어 둡니다. <b>대미지 계산</b> 탭의 공격 추가에서{" "}
              <b>인게임 명칭 / 별명</b> 토글로 갈아 볼 수 있습니다.
            </p>
            <p className="nick-note">
              비워 두면 <b>규칙으로 지은 별명</b>이 대신 보입니다 — 일반 공격 <b>평</b>, 공명 스킬{" "}
              <b>E</b>, 공명 해방 <b>R</b>, 조화도 파괴 <b>F</b>, 점프 공격 <b>점공</b>, 공중 공격{" "}
              <b>공중</b>, 낙하 공격 <b>낙공</b>, 반주 · 변주 스킬 <b>반주 · 변주</b>에 단수를 붙여
              「일반 공격 1단 피해」는 <b>평1</b>이 됩니다(그 밖에 강공격 <b>강공</b>, 회피 반격{" "}
              <b>회반</b>, 협동 공격 <b>협공</b>). 한 캐릭터 안에서 겹치면 뒤에 -2 · -3이 붙으니 그것만 손보면 됩니다.
            </p>
          </div>

          <div className="nick-tally">
            {character && (
              <>
                <span>
                  <b>{named}</b>
                  <em>적어 둠</em>
                </span>
                <span>
                  <b>{total}</b>
                  <em>공격</em>
                </span>
              </>
            )}
            {/* 쉰 명이 넘는다 — 어디까지 봤는지 여기서 센다. */}
            <span>
              <b className={doneCount ? "data-done-count" : undefined}>
                {doneCount} / {characters.length}
              </b>
              <em>완료</em>
            </span>
          </div>
        </section>

        {!character ? (
          <section className="panel">
            <p className="nick-empty">오른쪽 목록에서 캐릭터를 고르세요.</p>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-head">
              <h2 className="nick-title">
                {character.iconUrl && (
                  <img className="nick-face" src={character.iconUrl} alt="" loading="lazy" />
                )}
                {character.name}
                <ReviewTags
                  checked={review.checkedSet.has(character.id)}
                  deferred={review.deferredSet.has(character.id)}
                />
              </h2>
              <div className="nick-actions">
                <input
                  type="text"
                  className="panel-search"
                  placeholder="공격 · 별명"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <button
                  disabled={named === 0}
                  title="이 캐릭터에 적어 둔 별명을 전부 지웁니다"
                  onClick={() => clearCharacterNicknames(character.id)}
                >
                  별명 지우기
                </button>
                {/* 이 캐릭터의 별명을 다 봤다는 표시. 다른 확인 화면과 같은 단추다. */}
                <ReviewActions
                  compact
                  checked={review.checkedSet.has(character.id)}
                  deferred={review.deferredSet.has(character.id)}
                  onToggleChecked={() => review.toggleChecked(character.id)}
                  onToggleDeferred={() => review.toggleDeferred(character.id)}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="nick-empty">
                {total === 0
                  ? `${character.name}의 공격 데이터가 아직 등록되지 않았습니다.`
                  : "찾는 이름의 공격이 없습니다."}
              </p>
            ) : (
              <div className="nick-groups">
                {filtered.map((section) => (
                  <div className="nick-group" key={section.category}>
                    <div className="nick-group-head">
                      {section.icon ? (
                        <img src={section.icon} alt="" loading="lazy" />
                      ) : (
                        <span className="nick-group-icon-blank" />
                      )}
                      <small>{section.label}</small>
                    </div>

                    {section.rows.map(({ attack, skill }) => {
                      const value = nicknameOf(attack.id);
                      return (
                        <label className={value ? "nick-row on" : "nick-row"} key={attack.id}>
                          <span className="nick-name">
                            <b>{attack.name}</b>
                            <em>{skill}</em>
                          </span>
                          <input
                            type="text"
                            // 적은 것이 없으면 규칙으로 지은 별명이 대신 쓰인다 — 그것을 비쳐 둔다.
                            placeholder={autoOf(attack.id) ?? "별명 없음"}
                            value={value}
                            onChange={(event) =>
                              setAttackNickname(character.id, attack.id, event.target.value)
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>
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
