import { useMemo, useState, useSyncExternalStore } from "react";
import { characters } from "../../data/sampleData";
import {
  characterBuffKey,
  clearCharacterBuffOverride,
  getCharacterBuffOverrides,
  replaceCharacterBuffOverrides,
  resetCharacterBuffOverrides,
  setCharacterBuffOverride,
  subscribeCharacterBuffOverrides,
} from "../../data/characterBuffOverrides";
import type { BuffScope, BuffUptime, CharacterBuffTemplate } from "../../types/game";
import { DAMAGE_TYPE_LABEL, ELEMENT_LABEL, TARGET_LABEL, defaultsOf } from "../../utils/buffLabels";
import { useReviewStatus } from "../../utils/useReviewStatus";
import { ReviewActions, ReviewTransfer } from "../../components";

/**
 * 캐릭터 버프 확인 탭 — 전 캐릭터의 고유효과 · 공명체인을 계산용 버프로 옮긴 결과를 한 자리에서 훑는다.
 *
 * 예전에는 캐릭터 관리 아래에 고른 캐릭터 것만 붙어 있었다. 다 모아 보고 한 번에 정리하려고
 * 탭으로 뺐다. 규칙은 무기 버프 확인 탭과 같다 —
 *   「상시/발동」과 「본인/파티」는 여기서 바로 고치고 계산에 곧바로 쓰인다
 *   (characterBuffOverrides → deriveCharacterBuffs).
 *   나머지(타깃 · 수치 · 조건)는 읽기 전용 — 소스(src/data/characters/*.ts)를 고쳐야 한다.
 *
 * 확인 단위는 버프 한 줄이다 — 한 캐릭터가 고유효과 · 체인 · 모드별 버프를 여러 줄 들고 있어서다.
 * 확인이 끝나면 「수정분 JSON 복사」로 고친 것만 뽑아 소스에 옮겨 적고 커밋한다.
 * 개발 서버에서만 탭이 보인다.
 */

/** 공격 id -> 공격 이름. 버프가 어느 공격에만 걸리는지 이름으로 보여준다. */
function attackNames(characterId: string): Map<string, string> {
  const character = characters.find((c) => c.id === characterId);
  const map = new Map<string, string>();
  for (const skill of character?.skills ?? []) {
    for (const attack of skill.attacks) map.set(attack.id, attack.name);
  }
  return map;
}

/** 수치 한 줄. 스택형이면 최대 스택까지 곱한 값도, 스탯 비례면 기준 스탯 이름도 같이 적는다. */
function formatValue(template: CharacterBuffTemplate): string {
  const scale = template.scaleFrom ? ` × ${template.scaleFrom}` : "";
  // 조화도 파괴 증폭은 퍼센트가 아닌 수치(pt)다.
  if (template.target === "syncAmplify") {
    const max = template.maxValue !== undefined ? ` · 최대 ${template.maxValue}pt` : "";
    return `${template.value}pt${scale}${max}`;
  }
  const one =
    template.target === "motionValue" && template.modifier === "amplify"
      ? `×${(1 + template.value).toFixed(2)}`
      : `${+(template.value * 100).toFixed(2)}%${scale}`;

  const max = template.maxStacks ?? 1;
  if (max <= 1) return one;
  return `${one} / 스택 · 최대 ${+(template.value * max * 100).toFixed(2)}%${scale}`;
}

/** 이 버프가 언제 열리는지 — 체인 단계 · 공명 모드 · 고유 스킬. */
function gateOf(template: CharacterBuffTemplate): string[] {
  const out: string[] = [];
  if (template.resonanceChain !== undefined) out.push(`${template.resonanceChain}체인`);
  if (template.resonanceMode !== undefined) out.push(`${template.resonanceMode} 모드`);
  if (template.inherentSkillId !== undefined) out.push("고유 스킬");
  return out;
}

/** 옮긴 버프가 있는지로 거르는 라디오. */
const BUFF_FILTERS = [
  { id: "all", label: "전체" },
  { id: "has", label: "옮긴 캐릭터" },
  { id: "none", label: "비어 있는 캐릭터" },
] as const;
type BuffFilter = (typeof BUFF_FILTERS)[number]["id"];

export function CharacterBuffReviewPage() {
  const overrides = useSyncExternalStore(
    subscribeCharacterBuffOverrides,
    getCharacterBuffOverrides,
  );
  // 저장 이름은 캐릭터 관리 아래에 있던 때와 같다 — 이미 표시해 둔 줄이 그대로 이어진다.
  const review = useReviewStatus("character-buff");
  const { checkedSet, deferredSet } = review;
  const [showChecked, setShowChecked] = useState(false);
  const [showDeferred, setShowDeferred] = useState(false);
  const [query, setQuery] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [buffFilter, setBuffFilter] = useState<BuffFilter>("has");
  const [editedOnly, setEditedOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  const sorted = useMemo(
    () => [...characters].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [],
  );

  // 캐릭터마다 지금 화면에 남는 줄. 원래 순번(index)이 저장 키라 함께 들고 다닌다.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted
      .filter((c) => (characterId ? c.id === characterId : true))
      .filter((c) => {
        const count = c.passiveBuffs?.length ?? 0;
        if (buffFilter === "has") return count > 0;
        if (buffFilter === "none") return count === 0;
        return true;
      })
      .map((c) => {
        const nameHit = q !== "" && c.name.toLowerCase().includes(q);
        const rows = (c.passiveBuffs ?? [])
          .map((template, index) => ({
            template,
            index,
            key: characterBuffKey(c.id, index),
          }))
          .filter((r) => (showChecked ? true : !checkedSet.has(r.key)))
          .filter((r) => (showDeferred ? true : !deferredSet.has(r.key)))
          .filter((r) => (editedOnly ? overrides[r.key] !== undefined : true))
          .filter((r) =>
            !q || nameHit
              ? true
              : r.template.label.toLowerCase().includes(q) ||
                (r.template.condition ?? "").toLowerCase().includes(q),
          );
        return { character: c, rows };
      })
      .filter((g) => g.rows.length > 0 || (buffFilter === "none" && !editedOnly));
  }, [
    sorted,
    query,
    characterId,
    buffFilter,
    showChecked,
    checkedSet,
    showDeferred,
    deferredSet,
    editedOnly,
    overrides,
  ]);

  const allKeys = characters.flatMap((c) =>
    (c.passiveBuffs ?? []).map((_, index) => characterBuffKey(c.id, index)),
  );
  const withBuffs = characters.filter((c) => (c.passiveBuffs?.length ?? 0) > 0).length;
  const editedKeys = Object.keys(overrides);
  const doneCount = allKeys.filter((k) => checkedSet.has(k)).length;
  const laterCount = allKeys.filter((k) => deferredSet.has(k)).length;

  /** 고친 줄만 캐릭터 이름 · 효과 이름과 함께 뽑는다 — 소스에 옮겨 적을 때 찾기 쉽게. */
  const edits = () =>
    editedKeys.map((key) => {
      const cut = key.lastIndexOf(":");
      const id = key.slice(0, cut);
      const index = Number(key.slice(cut + 1));
      const character = characters.find((c) => c.id === id);
      const template = character?.passiveBuffs?.[index];
      return {
        key,
        character: character?.name ?? id,
        index,
        label: template?.label ?? null,
        before: template ? defaultsOf(template, "self") : null,
        after: overrides[key],
      };
    });
  const exportJson = () => JSON.stringify(edits(), null, 2);

  return (
    <section className="panel data-page">
      <header>
        <div>
          <small>CHARACTER BUFF REVIEW</small>
          <h1>캐릭터 버프 확인</h1>
          <p>
            전 캐릭터의 고유효과와 공명체인을 계산용 버프로 옮긴 결과입니다. 「상시/발동」과
            「본인/파티」는 여기서 바로 고칠 수 있고 계산에 곧바로 쓰입니다. 확인한 줄은 체크해서
            감추고, 다 보고 나면 「수정분 JSON 복사」로 뽑아 소스에 옮겨 적으면 됩니다.
          </p>
        </div>
      </header>

      <div className="data-summary">
        <div>
          <small>옮긴 캐릭터</small>
          <b>
            {withBuffs} / {characters.length}
          </b>
        </div>
        <div>
          <small>버프 줄 수</small>
          <b>{allKeys.length}</b>
        </div>
        <div>
          <small>내가 고친 줄</small>
          <b className={editedKeys.length ? "data-edited-count" : undefined}>{editedKeys.length}</b>
        </div>
        <div>
          <small>확인 완료</small>
          <b className={doneCount ? "data-done-count" : undefined}>
            {doneCount} / {allKeys.length}
          </b>
        </div>
        <div>
          <small>나중에 처리</small>
          <b className={laterCount ? "data-later-count" : undefined}>{laterCount}</b>
        </div>
      </div>

      <div className="data-filters">
        <input
          className="weapon-search data-search"
          placeholder="캐릭터 · 효과 · 조건으로 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          className="data-select"
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
        >
          <option value="">전체 캐릭터</option>
          {sorted.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.passiveBuffs?.length ?? 0})
            </option>
          ))}
        </select>

        <span className="chips">
          {BUFF_FILTERS.map((f) => (
            <button
              key={f.id}
              className={buffFilter === f.id ? "chip chip-active" : "chip"}
              onClick={() => setBuffFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </span>
      </div>

      <div className="data-filters">
        <label className="data-toggle">
          <input
            type="checkbox"
            checked={showChecked}
            onChange={(e) => setShowChecked(e.target.checked)}
          />
          완료한 줄도 보기
        </label>

        <label className="data-toggle">
          <input
            type="checkbox"
            checked={showDeferred}
            onChange={(e) => setShowDeferred(e.target.checked)}
          />
          나중에 처리한 줄도 보기
        </label>

        <label className="data-toggle">
          <input
            type="checkbox"
            checked={editedOnly}
            onChange={(e) => setEditedOnly(e.target.checked)}
          />
          고친 줄만
        </label>

        <ReviewTransfer
          kind="character-buff"
          overrides={overrides}
          checked={review.checked}
          deferred={review.deferred}
          edits={edits()}
          onImport={(s) => {
            replaceCharacterBuffOverrides(s.overrides);
            review.replaceAll(s);
          }}
        />

        {editedKeys.length > 0 && (
          <>
            <button
              className="data-check"
              onClick={() => {
                void navigator.clipboard.writeText(exportJson()).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? "복사됨" : "수정분 JSON 복사"}
            </button>
            <button
              className="data-reset"
              onClick={() => {
                if (
                  confirm("캐릭터 버프의 상시/발동 · 본인/파티 수정분을 전부 원래대로 되돌립니다.")
                )
                  resetCharacterBuffOverrides();
              }}
            >
              전부 되돌리기
            </button>
          </>
        )}
      </div>

      {groups.length === 0 && (
        <p className="data-empty">
          이 조건에서 남은 줄이 없습니다. 필터를 바꾸거나 위 토글을 켜 보세요.
        </p>
      )}

      {groups.map(({ character, rows }) => {
        const names = attackNames(character.id);
        const keys = (character.passiveBuffs ?? []).map((_, i) =>
          characterBuffKey(character.id, i),
        );
        const edited = keys.some((k) => overrides[k] !== undefined);
        const done = keys.filter((k) => checkedSet.has(k)).length;

        return (
          <article key={character.id} className="panel data-weapon">
            <div className="data-weapon-head">
              {character.iconUrl && (
                <img className="data-weapon-icon" src={character.iconUrl} alt="" loading="lazy" />
              )}
              <div className="data-weapon-name">
                <h2>
                  {character.name}
                  {edited && <span className="data-edited">고침</span>}
                  {keys.length > 0 && done === keys.length && (
                    <span className="data-checked-tag">확인 완료</span>
                  )}
                </h2>
                <span>
                  버프 {keys.length}줄 · 확인 {done}
                </span>
              </div>
              {edited && (
                <button
                  className="data-reset"
                  onClick={() => {
                    if (
                      confirm(
                        `${character.name}의 상시/발동 · 본인/파티를 전부 원래대로 되돌립니다.`,
                      )
                    )
                      clearCharacterBuffOverride(character.id);
                  }}
                >
                  이 캐릭터 되돌리기
                </button>
              )}
              {rows.length > 0 && (
                <button
                  className="data-check"
                  onClick={() =>
                    review.checkMany(
                      rows.map((r) => r.key),
                      true,
                    )
                  }
                >
                  보이는 줄 전부 완료
                </button>
              )}
            </div>

            {keys.length === 0 ? (
              <p className="data-none">계산에 옮긴 버프가 없습니다.</p>
            ) : (
              <table className="buff-table data-table">
                <thead>
                  <tr>
                    <th>효과</th>
                    <th>붙는 자리</th>
                    <th>분류</th>
                    <th>수치</th>
                    <th>열리는 조건</th>
                    <th>상시 / 발동</th>
                    <th>본인 / 파티</th>
                    <th>조건</th>
                    <th>확인</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ template, index, key }) => {
                    // 캐릭터 버프의 scope 기본값은 본인이다(deriveCharacterBuffs와 같은 규칙).
                    const defaults = defaultsOf(template, "self");
                    const override = overrides[key];
                    const uptime = override?.uptime ?? defaults.uptime;
                    const scope = override?.scope ?? defaults.scope;
                    const gate = gateOf(template);
                    const checked = checkedSet.has(key);
                    const deferred = deferredSet.has(key);
                    const onlyAttacks =
                      template.attackIds ?? (template.attackId ? [template.attackId] : []);

                    return (
                      <tr
                        key={key}
                        className={
                          (checked ? "is-checked " : "") + (deferred ? "is-later" : "") || undefined
                        }
                      >
                        <td className="data-cell-label">
                          {template.label}
                          {onlyAttacks.length > 0 && (
                            <em className="data-stacks">
                              {onlyAttacks.map((id) => names.get(id) ?? id).join(" · ")}만
                            </em>
                          )}
                          {template.exclusiveGroup && (
                            <em className="data-stacks">배타: {template.exclusiveGroup}</em>
                          )}
                        </td>
                        <td>{TARGET_LABEL[template.target]}</td>
                        <td>
                          {DAMAGE_TYPE_LABEL[template.damageType] ?? template.damageType}
                          {template.element && (
                            <em className="data-stacks">
                              {ELEMENT_LABEL[template.element] ?? template.element}
                            </em>
                          )}
                        </td>
                        <td className="data-cell-value">{formatValue(template)}</td>
                        <td>{gate.length ? gate.join(" · ") : "—"}</td>
                        <td>
                          <select
                            className={
                              override?.uptime ? "data-select data-select-edited" : "data-select"
                            }
                            value={uptime}
                            onChange={(e) =>
                              setCharacterBuffOverride(
                                character.id,
                                index,
                                { uptime: e.target.value as BuffUptime },
                                defaults,
                              )
                            }
                          >
                            <option value="passive">상시</option>
                            <option value="active">발동</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className={
                              override?.scope ? "data-select data-select-edited" : "data-select"
                            }
                            value={scope}
                            onChange={(e) =>
                              setCharacterBuffOverride(
                                character.id,
                                index,
                                { scope: e.target.value as BuffScope },
                                defaults,
                              )
                            }
                          >
                            <option value="self">본인</option>
                            <option value="party">파티</option>
                          </select>
                        </td>
                        <td className="data-cell-cond">{template.condition ?? "—"}</td>
                        <td className="data-cell-review">
                          <ReviewActions
                            compact
                            checked={checked}
                            deferred={deferred}
                            onToggleChecked={() => review.toggleChecked(key)}
                            onToggleDeferred={() => review.toggleDeferred(key)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </article>
        );
      })}
    </section>
  );
}
