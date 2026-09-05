import { useMemo, useState } from "react";
import { characters } from "../../data/sampleData";
import { characterTextOf } from "../../data/characterTexts";
import { ELEMENT_NAMES } from "../../data/elements";
import { CATEGORY_BONUS_KEY } from "../../calculator/damage";
import { useReviewStatus } from "../../utils/useReviewStatus";
import type { Attack, AttackType, Character, ResonanceMode, Skill } from "../../types/game";

/**
 * 캐릭터 공격타입 확인 탭 — 공격 하나하나가 **어느 피해로 판정되는지** 훑어보는 자리.
 *
 * 여기서 보는 것은 두 가지다.
 *   type              그 공격이 무엇인가(일반 공격 · 공명 스킬 …)
 *   damageBonusType   피해 보너스를 어느 칸에서 받는가
 * 둘은 자주 갈린다. 치사의 전기톱 공격 열 개가 전부 공명 해방 판정을 받는 것처럼,
 * 게임이 「이 공격은 저쪽 칸을 본다」고 못 박아 둔 것이 있어서다.
 * 갈린 자리는 반드시 원문에 근거가 있어야 하므로 눈에 띄게 표시한다.
 *
 * 옮겨 적을 때 제일 자주 나는 사고가 이 둘을 뒤바꾸는 것이고, 그러면 피해 보너스가
 * 통째로 엉뚱한 칸에서 붙는다. 계산은 멀쩡히 돌아가므로 숫자만 봐서는 못 잡는다.
 */

const TYPE_NAMES: Record<AttackType, string> = {
  Basic: "일반 공격",
  Heavy: "강공격",
  Aerial: "공중 공격",
  DodgeCounter: "회피 반격",
  Skill: "공명 스킬",
  Liberation: "공명 해방",
  Intro: "반주 스킬",
  Outro: "변주 스킬",
  Echo: "에코",
  Ultimate: "필살기",
  Variation: "변주 스킬",
  Chain: "연계 공격",
};

const SCALING_NAMES = { ATK: "공격력", HP: "HP", DEF: "방어력" } as const;

const MODE_NAMES: Record<ResonanceMode, string> = {
  Discord: "조화 파동",
  Flame: "불꽃",
  Cluster: "조화 밀집",
  Frost: "서리",
  Echo: "에코",
};

/**
 * 이 공격이 **모드마다 어느 판정을 받는지**.
 *
 * 루실라처럼 공명 모드가 둘인 캐릭터는 같은 공격이 모드에 따라 다른 칸에서
 * 피해 보너스를 받는다 — 「생생한 기억」이 서리에서는 일반 공격, 에코에서는
 * 에코 어빌리티 판정이다. Attack은 판정을 하나만 들 수 있어서 데이터에는
 * 기본 모드 쪽을 담고, 나머지 모드는 switchesDamageBonusType 버프로 갈아 끼운다
 * (calculator/manualBuffs.ts의 applyDamageTypeSwitch).
 *
 * 여기서는 그 버프를 되짚어 모드별 판정을 다시 세운다. 모드가 없는 캐릭터는
 * 한 칸만 돌려주므로 부르는 쪽은 갈래를 따로 나눌 필요가 없다.
 */
function bonusByMode(
  character: Character,
  attack: Attack,
): { mode?: ResonanceMode; category: AttackType }[] {
  const base = attack.damageBonusType ?? attack.type;
  const modes = character.resonanceModes;
  if (!modes || modes.length < 2) return [{ category: base }];
  return modes.map((mode) => {
    const swap = (character.passiveBuffs ?? []).find(
      (b) =>
        b.switchesDamageBonusType !== undefined &&
        b.resonanceMode === mode &&
        (b.attackIds?.includes(attack.id) || b.attackId === attack.id),
    );
    return { mode, category: swap?.switchesDamageBonusType ?? base };
  });
}

/**
 * 계수를 읽을 스킬 레벨. **10레벨(만렙) 기준**이다.
 *
 * hits는 레벨 1~10을 그대로 담은 배열이라 그냥 [0]을 보면 1레벨 값이 나온다.
 * 눈으로 대조할 때 쓰는 값은 실제로 쓰는 만렙 쪽이라 여기서 맞춰 둔다.
 * 에코 어빌리티처럼 레벨이 없는 공격은 배열이 한 칸뿐이라 그 값이 그대로 나온다.
 */
const LEVEL_INDEX = 9;
const hitAt = (levels: number[]): number => levels[LEVEL_INDEX] ?? levels.at(-1) ?? 0;

/** 계수 합계. 이 공격이 한 번에 뽑아내는 총 배율(10레벨). */
const totalMotionValue = (attack: Attack): number =>
  attack.hits.reduce((sum, levels) => sum + hitAt(levels), 0);

/** 계수를 「268.20%」 · 「38.40% × 3」처럼 같은 값끼리 묶어 적는다. */
function formatHits(attack: Attack): string {
  const values = attack.hits.map(hitAt);
  const runs: { value: number; count: number }[] = [];
  for (const value of values) {
    const last = runs[runs.length - 1];
    if (last && last.value === value) last.count += 1;
    else runs.push({ value, count: 1 });
  }
  return runs
    .map((run) => `${+(run.value * 100).toFixed(2)}%${run.count > 1 ? ` × ${run.count}` : ""}`)
    .join(" + ");
}

/**
 * 확인 표시가 붙는 칸들.
 *
 * 표시 단위가 **줄이 아니라 칸**이다 — 대조할 때 「속성은 맞는데 보너스 칸이 수상하다」처럼
 * 항목마다 따로 판정하게 되고, 줄 단위로 묶으면 어디까지 봤는지 다시 알 수 없어진다.
 */
const FIELD_LABELS = {
  type: "공격 분류",
  bonus: "보는 보너스 칸",
  element: "속성",
  scaling: "기준 스탯",
  hitCount: "타수",
} as const;
const FIELDS = Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[];
type Field = (typeof FIELDS)[number];

/**
 * 칸 하나의 표시 열쇠. 공격 id는 캐릭터 안에서 유일하므로 셋을 붙이면 충분하다.
 */
const cellKey = (characterId: string, attackId: string, field: Field) =>
  `${characterId}:${attackId}:${field}`;

/** 스킬 트리의 줄에 서는 다섯. 이것들은 피해 자료가 비어 있으면 안 된다. */
const BRANCH_CATEGORIES = new Set(["Basic", "Skill", "Liberation", "Variation", "Circuit"]);

interface SkillRow {
  key: string;
  character: Character;
  skill: Skill;
  /** 게임이 붙인 종류 이름(원문 쪽). 없으면 우리 category를 쓴다. */
  typeName: string;
  /** 판정이 갈리는 공격 수 — damageBonusType이 type과 다른 것. */
  switched: number;
  /** 줄에 서는 스킬인데 공격 자료가 하나도 없는가. */
  empty: boolean;
}

function buildRows(character: Character): SkillRow[] {
  const texts = characterTextOf(character.id);
  return character.skills.map((skill) => {
    const typeName =
      texts?.skills.find((s) => s.id === skill.id)?.type ??
      (skill.category ? (TYPE_NAMES[skill.category as AttackType] ?? skill.category) : "");
    return {
      key: `${character.id}:${skill.id}`,
      character,
      skill,
      typeName,
      switched: skill.attacks.filter((a) => a.damageBonusType && a.damageBonusType !== a.type)
        .length,
      empty:
        skill.attacks.length === 0 &&
        !!skill.category &&
        BRANCH_CATEGORIES.has(skill.category),
    };
  });
}

type Filter = "all" | "switched" | "empty" | "attacks";
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "attacks", label: "공격이 있는 것" },
  { id: "switched", label: "판정이 갈리는 것" },
  { id: "empty", label: "피해 자료 없음" },
];

export function CharacterAttackPage() {
  const [filter, setFilter] = useState<Filter>("attacks");
  const [query, setQuery] = useState("");
  const review = useReviewStatus("character-attack-review");
  const { checked, deferred, checkedSet, deferredSet } = review;
  const [showChecked, setShowChecked] = useState(false);
  const [showDeferred, setShowDeferred] = useState(false);

  const built = useMemo(() => characters.flatMap(buildRows), []);

  const totals = useMemo(() => {
    const attacks = built.reduce((n, r) => n + r.skill.attacks.length, 0);
    return {
      characters: characters.length,
      skills: built.length,
      attacks,
      switched: built.filter((r) => r.switched > 0).length,
      empty: built.filter((r) => r.empty).length,
    };
  }, [built]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return built
      .filter((r) =>
        filter === "switched"
          ? r.switched > 0
          : filter === "empty"
            ? r.empty
            : filter === "attacks"
              ? r.skill.attacks.length > 0
              : true,
      )
      .filter((r) =>
        q
          ? r.character.name.toLowerCase().includes(q) || r.skill.name.toLowerCase().includes(q)
          : true,
      )
      // 여섯 칸을 다 확인한 줄만 감춘다. 다 감춰진 스킬은 카드째 빠진다.
      .map((r) => ({
        ...r,
        attacks: r.skill.attacks
          .filter((a) =>
            showChecked
              ? true
              : !FIELDS.every((f) => checkedSet.has(cellKey(r.character.id, a.id, f))),
          )
          .filter((a) => (showDeferred ? true : !deferredSet.has(`${r.character.id}:${a.id}`))),
      }))
      .filter((r) => r.attacks.length > 0 || r.skill.attacks.length === 0)
      .sort(
        (a, b) =>
          a.character.name.localeCompare(b.character.name, "ko") ||
          a.skill.id.localeCompare(b.skill.id),
      );
  }, [built, filter, query, showChecked, checkedSet, showDeferred, deferredSet]);

  return (
    <div className="data-page char-attack-page">
      <header>
        <div>
          <h1>캐릭터 공격타입 확인</h1>
          <p>
            공격마다 <b>무엇인가(공격 분류)</b>와 <b>어느 피해 보너스 칸을 보는가</b>를 나란히
            놓았습니다. 둘은 자주 갈립니다 — 치사의 전기톱 공격들이 전부 공명 해방 칸을 보는
            것처럼요. 갈린 자리는 「판정 갈림」으로 표시했으니 원문에 근거가 있는지 확인해
            주세요. 뒤바꿔 적어도 계산은 멀쩡히 돌아가서 숫자만 봐서는 못 잡습니다.
          </p>
          <p>
            계수는 <b>스킬 10레벨 기준</b>입니다. 확인 표시는 <b>칸마다</b> 따로 남습니다 —
            공격 분류 · 보너스 칸 · 속성 · 기준 스탯 · 타수 다섯 가지를 각각 체크하고,
            다섯 개가 다 차면 그 줄이 목록에서 감춰집니다. <b>항목 이름 옆의 ✓</b>를 누르면
            그 항목을 이 스킬에서 한 번에, <b>줄 끝의 ✓</b>를 누르면 그 줄을 통째로 표시합니다.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="data-summary">
          <div>
            <small>캐릭터</small>
            <b>{totals.characters}</b>
          </div>
          <div>
            <small>스킬</small>
            <b>{totals.skills}</b>
          </div>
          <div>
            <small>공격</small>
            <b>{totals.attacks}</b>
          </div>
          <div>
            <small>판정이 갈리는 스킬</small>
            <b className={totals.switched ? "data-edited-count" : undefined}>{totals.switched}</b>
          </div>
          <div>
            <small>피해 자료 없음</small>
            <b className={totals.empty ? "data-later-count" : undefined}>{totals.empty}</b>
          </div>
          <div>
            <small>확인한 칸</small>
            <b className={checked.length ? "data-done-count" : undefined}>
              {checked.length} / {totals.attacks * FIELDS.length}
            </b>
          </div>
        </div>

        <div className="data-filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={filter === f.id ? "on" : ""}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <input
            className="panel-search"
            placeholder="캐릭터 · 스킬 이름"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="data-toggle">
            <input
              type="checkbox"
              checked={showChecked}
              onChange={(e) => setShowChecked(e.target.checked)}
            />
            완료도 보기
          </label>
          <label className="data-toggle">
            <input
              type="checkbox"
              checked={showDeferred}
              onChange={(e) => setShowDeferred(e.target.checked)}
            />
            나중에도 보기
          </label>
        </div>
      </section>

      {list.length === 0 && <p className="data-empty">조건에 맞는 항목이 없습니다.</p>}

      {list.map((row) => (
        <section
          className={"panel char-attack-card" + (row.empty ? " is-missing" : "")}
          key={row.key}
        >
          <div className="char-attack-head">
            {row.character.iconUrl && <img src={row.character.iconUrl} alt="" />}
            <div className="char-attack-name">
              <h2>
                {row.character.name}
                <span className="char-attack-kind">{row.typeName}</span>
                {row.switched > 0 && <span className="char-attack-switch">판정 갈림</span>}
                {row.character.resonanceModes && row.character.resonanceModes.length > 1 && (
                  <span className="char-attack-mode">
                    {row.character.resonanceModes.map((m) => MODE_NAMES[m] ?? m).join(" / ")} 모드
                  </span>
                )}
                {row.empty && <span className="char-buff-warn">피해 자료 없음</span>}
              </h2>
              <span>
                {row.skill.name} · 스킬 {row.skill.id} · 공격 {row.skill.attacks.length}개
                {row.attacks.length !== row.skill.attacks.length &&
                  ` (표시한 ${row.skill.attacks.length - row.attacks.length}줄 숨김)`}
              </span>
            </div>
          </div>

          {row.skill.attacks.length === 0 ? (
            <p className="char-buff-none">
              이 스킬에는 옮겨 적은 공격이 없습니다.
              {row.empty && " 스킬 트리의 줄에 서는 스킬이라 원래는 있어야 합니다."}
            </p>
          ) : (
            <table className="buff-table data-table">
              <thead>
                <tr>
                  <th>공격</th>
                  {/* 항목 이름 옆에 전체선택 — 이 스킬의 보이는 줄 전부를 한 번에 표시한다. */}
                  {FIELDS.map((field) => {
                    const keys = row.attacks.map((a) => cellKey(row.character.id, a.id, field));
                    const allOn = keys.length > 0 && keys.every((k) => checkedSet.has(k));
                    return (
                      <th key={field}>
                        <span className="cell-wrap">
                          <span className="cell-value">{FIELD_LABELS[field]}</span>
                          <button
                            className={allOn ? "cell-check on" : "cell-check"}
                            title={
                              allOn
                                ? `${FIELD_LABELS[field]} 확인을 이 스킬에서 전부 해제합니다`
                                : `${FIELD_LABELS[field]}를 이 스킬에서 전부 확인 표시합니다`
                            }
                            onClick={() => review.checkMany(keys, !allOn)}
                          >
                            ✓
                          </button>
                        </span>
                      </th>
                    );
                  })}
                  <th>계수 (10레벨)</th>
                  <th>합계</th>
                  <th>확인 · 나중에</th>
                </tr>
              </thead>
              <tbody>
                {row.attacks.map((attack) => {
                  const category = attack.damageBonusType ?? attack.type;
                  const switched = !!attack.damageBonusType && attack.damageBonusType !== attack.type;
                  // 모드마다 판정이 갈리면 「일반 공격 / 에코」처럼 둘 다 적는다.
                  // 모드가 있어도 판정이 같으면 굳이 나누지 않는다.
                  const byMode = bonusByMode(row.character, attack);
                  const splitByMode = new Set(byMode.map((m) => m.category)).size > 1;
                  const shownBonus = splitByMode ? byMode : [{ category }];
                  const rowKey = `${row.character.id}:${attack.id}`;
                  const isDeferred = deferredSet.has(rowKey);
                  const done = FIELDS.filter((f) =>
                    checkedSet.has(cellKey(row.character.id, attack.id, f)),
                  ).length;
                  // 칸 하나 — 값 옆에 조그만 확인 단추를 세운다.
                  const cell = (field: Field, content: React.ReactNode, className?: string) => {
                    const key = cellKey(row.character.id, attack.id, field);
                    const on = checkedSet.has(key);
                    return (
                      <td className={(className ?? "") + (on ? " is-ok" : "")}>
                        <span className="cell-wrap">
                          <span className="cell-value">{content}</span>
                          <button
                            className={on ? "cell-check on" : "cell-check"}
                            title={on ? "이 칸 확인을 해제합니다" : "이 칸을 확인했다고 표시합니다"}
                            onClick={() => review.toggleChecked(key)}
                          >
                            ✓
                          </button>
                        </span>
                      </td>
                    );
                  };
                  return (
                    <tr
                      key={attack.id}
                      className={
                        (switched ? "is-switched" : "") +
                        (done === FIELDS.length ? " is-checked" : "") +
                        (isDeferred ? " is-later" : "")
                      }
                    >
                      <td className="data-cell-label">
                        {attack.name}
                        {attack.resonanceMode && (
                          <em className="data-stacks">
                            {MODE_NAMES[attack.resonanceMode]} 모드 전용
                          </em>
                        )}
                      </td>
                      {cell("type", TYPE_NAMES[attack.type] ?? attack.type)}
                      {cell(
                        "bonus",
                        <>
                          {shownBonus.map((m, i) => (
                            <span key={m.mode ?? "single"}>
                              {i > 0 && " / "}
                              {TYPE_NAMES[m.category] ?? m.category}
                            </span>
                          ))}
                          {splitByMode && (
                            <em className="data-stacks">
                              {byMode.map((m) => MODE_NAMES[m.mode!] ?? m.mode).join(" / ")} 모드 순
                            </em>
                          )}
                          {!splitByMode && switched && <em className="data-stacks">분류와 다름</em>}
                          {shownBonus.some((m) => !CATEGORY_BONUS_KEY[m.category]) && (
                            <em className="data-stacks">보너스 칸 없음</em>
                          )}
                        </>,
                      )}
                      {cell("element", ELEMENT_NAMES[attack.element])}
                      {cell("scaling", SCALING_NAMES[attack.scalingStat])}
                      {cell("hitCount", `${attack.hits.length}타`)}
                      {/* 계수와 합계는 표에서 그대로 옮긴 숫자라 따로 체크하지 않는다. */}
                      <td className="data-cell-value">{formatHits(attack)}</td>
                      <td className="data-cell-value">
                        {+(totalMotionValue(attack) * 100).toFixed(2)}%
                      </td>
                      <td className="char-attack-review">
                        {/* 줄 하나를 통째로 — 다섯 칸을 한 번에 켜고 끈다. */}
                        <button
                          className={done === FIELDS.length ? "cell-check on" : "cell-check"}
                          title={
                            done === FIELDS.length
                              ? "이 줄의 확인을 전부 해제합니다"
                              : "이 줄을 전부 확인 표시합니다"
                          }
                          onClick={() =>
                            review.checkMany(
                              FIELDS.map((f) => cellKey(row.character.id, attack.id, f)),
                              done !== FIELDS.length,
                            )
                          }
                        >
                          ✓
                        </button>
                        <b className={done === FIELDS.length ? "all-done" : ""}>
                          {done}/{FIELDS.length}
                        </b>
                        <button
                          className={isDeferred ? "data-later on" : "data-later"}
                          title={isDeferred ? "나중에 처리를 해제합니다" : "이 줄을 나중에 다시 봅니다"}
                          onClick={() => review.toggleDeferred(rowKey)}
                        >
                          {isDeferred ? "해제" : "⏱"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}
