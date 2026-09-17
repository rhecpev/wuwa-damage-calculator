import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { characters } from "../../data/sampleData";
import { useAppState } from "../../context/AppStateContext";
import { CharacterRoster } from "../CharactersPage/components/CharacterRoster";
import {
  attackNickname,
  attackNicknameKey,
  attackNicknamesVersion,
  autoNickname,
  clearCharacterNicknames,
  mergeAttackNicknames,
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
 *
 * 별명 줄마다도 「나중에」 · 「완료」를 단다. 줄 표시와 적어 둔 별명은 파일로 내보내고
 * 다시 불러올 수 있다 — 파일을 건네 함께 보며 고치기 위해서다(형식은 NicknameExport).
 */

/** 내보내기 파일 한 줄. 사람이 읽고 고칠 수 있게 이름까지 함께 싣는다. */
type NicknameExportRow = {
  /** `캐릭터id:공격id` — 불러올 때는 이것과 nickname · status만 본다. */
  key: string;
  character: string;
  section: string;
  skill: string;
  attack: string;
  /** 적어 둔 별명. 비었으면 auto가 쓰인다. */
  nickname: string;
  auto: string | null;
  status: "done" | "later" | null;
};

type NicknameExport = {
  kind: "wuwa-nicknames";
  version: 1;
  exportedAt: string;
  rows: NicknameExportRow[];
};

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

/** 한 캐릭터의 공격을 구역 순서대로 모은다. 구역 아이콘은 그 구역에 처음 나온 스킬 것을 쓴다. */
function sectionsOf(character: (typeof characters)[number] | null) {
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

  const sections = useMemo(() => sectionsOf(character), [character]);

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
  // 별명 줄 하나하나의 「나중에」 · 「완료」. 키는 별명 표와 같은 `캐릭터id:공격id`.
  const rowReview = useReviewStatus("nickname-rows");
  const rowKeys = character
    ? sections.flatMap((section) =>
        section.rows.map((row) => attackNicknameKey(character.id, row.attack.id)),
      )
    : [];
  const rowDone = rowKeys.filter((key) => rowReview.checkedSet.has(key)).length;
  const rowLater = rowKeys.filter((key) => rowReview.deferredSet.has(key)).length;

  const fileInput = useRef<HTMLInputElement>(null);
  const [importNote, setImportNote] = useState("");

  /** 모든 캐릭터의 별명 줄을 파일 하나로 내려받는다. */
  const exportFile = () => {
    const rows: NicknameExportRow[] = characters.flatMap((c) =>
      sectionsOf(c).flatMap((section) =>
        section.rows.map(({ attack, skill }) => {
          const key = attackNicknameKey(c.id, attack.id);
          return {
            key,
            character: c.name,
            section: section.label,
            skill,
            attack: attack.name,
            nickname: attackNickname(c.id, attack.id) ?? "",
            auto: autoNickname(c.id, attack.id) ?? null,
            status: rowReview.checkedSet.has(key)
              ? "done"
              : rowReview.deferredSet.has(key)
                ? "later"
                : null,
          };
        }),
      ),
    );
    const data: NicknameExport = {
      kind: "wuwa-nicknames",
      version: 1,
      exportedAt: new Date().toISOString(),
      rows,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `nicknames-${data.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * 내보낸 파일을 되돌려 넣는다. 파일에 실린 줄만 바꾸고 나머지는 그대로 둔다 —
   * 줄 표시(status)와 별명(nickname) 둘 다 파일 것을 따른다.
   */
  const importFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Partial<NicknameExport>;
      if (data.kind !== "wuwa-nicknames" || !Array.isArray(data.rows)) {
        throw new Error("별명 내보내기 파일이 아닙니다");
      }
      const keys = new Set(data.rows.map((row) => row.key));
      const checked = rowReview.checked.filter((key) => !keys.has(key));
      const deferred = rowReview.deferred.filter((key) => !keys.has(key));
      const names: Record<string, string> = {};
      for (const row of data.rows) {
        if (row.status === "done") checked.push(row.key);
        else if (row.status === "later") deferred.push(row.key);
        if (typeof row.nickname === "string") names[row.key] = row.nickname;
      }
      rowReview.replaceAll({ checked, deferred });
      mergeAttackNicknames(names);
      setImportNote(`${data.rows.length}줄을 불러왔습니다`);
    } catch (error) {
      setImportNote(
        `불러오지 못했습니다 — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

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
              <b>공중공격</b>, 낙하 공격 <b>낙공</b>, 반주 · 변주 스킬 <b>반주 · 변주</b>에 단수를 붙여
              「일반 공격 1단 피해」는 <b>평1</b>이 됩니다(그 밖에 강공격 <b>강공</b>, 회피 반격{" "}
              <b>회피반격</b>, 협동 공격 <b>협공</b>). 한 캐릭터 안에서 겹치면 뒤에 -2 · -3이 붙으니 그것만 손보면 됩니다.
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
                <span>
                  <b className={rowDone ? "data-done-count" : undefined}>{rowDone}</b>
                  <em>줄 완료</em>
                </span>
                <span>
                  <b className={rowLater ? "data-later-count" : undefined}>{rowLater}</b>
                  <em>줄 나중에</em>
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

          {/* 줄 표시와 별명을 파일로 주고받는다 — 전 캐릭터를 한 파일에 담는다. */}
          <div className="nick-io">
            <button onClick={exportFile}>내보내기</button>
            <button onClick={() => fileInput.current?.click()}>불러오기</button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
                event.target.value = "";
              }}
            />
            {importNote && <small>{importNote}</small>}
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
                      const key = attackNicknameKey(character.id, attack.id);
                      const done = rowReview.checkedSet.has(key);
                      const later = rowReview.deferredSet.has(key);
                      const classes = ["nick-row", value && "on", done && "done", later && "later"]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <div className={classes} key={attack.id}>
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
                          <span className="nick-review">
                            <ReviewActions
                              compact
                              checked={done}
                              deferred={later}
                              onToggleChecked={() => rowReview.toggleChecked(key)}
                              onToggleDeferred={() => rowReview.toggleDeferred(key)}
                            />
                          </span>
                        </div>
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
        checkedIds={review.checkedSet}
        deferredIds={review.deferredSet}
      />
    </div>
  );
}
