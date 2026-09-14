import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { characters } from "../../data/sampleData";
import { useAppState } from "../../context/AppStateContext";
import { CharacterRoster } from "../CharactersPage/components/CharacterRoster";
import {
  attackNickname,
  attackNicknamesVersion,
  clearCharacterNicknames,
  nicknameCountOf,
  setAttackNickname,
  subscribeAttackNicknames,
} from "../../data/attackNicknames";
import type { Attack, SkillCategory } from "../../types/game";

/**
 * 별명 — 공격을 평소 부르는 이름으로 적어 두는 화면.
 *
 * 인게임 명칭은 자료 그대로라 「공명 스킬 2단」처럼 읽힌다. 루틴을 짤 때는 그것보다
 * 평소 쓰는 말이 빠르므로, 공격마다 별명을 적어 두고 계산 탭의 「공격 추가」에서
 * 토글로 갈아 볼 수 있게 한다(data/attackNicknames.ts).
 *
 * 적은 것만 저장된다 — 비워 두면 그 공격은 늘 인게임 명칭으로 보인다.
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

  return (
    <div className="nick-workspace">
      <div className="nick-content">
        <section className="panel nick-intro">
          <div>
            <small>NICKNAMES</small>
            <h2>별명</h2>
            <p>
              공격마다 평소 부르는 이름을 적어 둡니다. <b>데미지 계산</b> 탭의 공격 추가에서{" "}
              <b>인게임 명칭 / 별명</b> 토글로 갈아 볼 수 있습니다.
            </p>
            <p className="nick-note">
              비워 두면 그 공격은 늘 인게임 명칭으로 보입니다. 적어 둔 것만 저장됩니다.
            </p>
          </div>

          {character && (
            <div className="nick-tally">
              <span>
                <b>{named}</b>
                <em>적어 둠</em>
              </span>
              <span>
                <b>{total}</b>
                <em>공격</em>
              </span>
            </div>
          )}
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
                            placeholder="별명 없음"
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
