import { useMemo, useState, useSyncExternalStore } from "react";
import { characters } from "../../../data/sampleData";
import {
  characterBuffKey,
  clearCharacterBuffOverride,
  getCharacterBuffOverrides,
  setCharacterBuffOverride,
  subscribeCharacterBuffOverrides,
} from "../../../data/characterBuffOverrides";
import type { BuffScope, BuffUptime, CharacterBuffTemplate } from "../../../types/game";
import {
  DAMAGE_TYPE_LABEL,
  ELEMENT_LABEL,
  TARGET_LABEL,
  defaultsOf,
} from "../../../utils/buffLabels";
import { useReviewStatus } from "../../../utils/useReviewStatus";
import { ReviewActions } from "../../../components";

/**
 * 버프 정리 탭 — 캐릭터 고유효과·공명체인을 계산용 버프로 옮긴 결과를 한 줄씩 훑어보는 자리.
 *
 * 데이터 확인 탭(무기)과 같은 구성이다. 다른 점은 훑는 단위뿐으로,
 * 무기는 카드 하나가 무기 하나지만 여기서는 버프 한 줄이 확인 단위다
 * — 한 캐릭터가 고유효과·체인·모드별 버프를 여러 줄 들고 있기 때문이다.
 *
 * 「상시/발동」과 「본인/파티」는 여기서 바로 고칠 수 있고, 고친 값은 브라우저에 저장되어
 * 피해 계산에 그대로 쓰인다(characterBuffOverrides → deriveCharacterBuffs).
 * 나머지 항목(타깃·수치·조건)은 읽기 전용이다 — 그건 소스를 고쳐야 하는 부분이다.
 *
 * 「체크 완료」와 「나중에」를 누른 줄은 목록에서 감춘다. 감춘 목록도 브라우저에 남고,
 * 위쪽 토글을 켜면 다시 보인다.
 */

/** 공격 id -> 공격 이름. 버프가 어느 공격에만 걸리는지 이름으로 보여주려고 미리 만든다. */
function attackNames(characterId: string): Map<string, string> {
  const character = characters.find((c) => c.id === characterId);
  const map = new Map<string, string>();
  for (const skill of character?.skills ?? []) {
    for (const attack of skill.attacks) map.set(attack.id, attack.name);
  }
  return map;
}

/**
 * 수치 한 줄. 스택형이면 「한 스택당 수치 × 스택」이라 최대 스택까지 곱한 값도 같이 보여준다.
 * 스탯에서 값을 뽑는 버프(scaleFrom)는 곱해질 스탯 이름을 함께 적는다.
 */
function formatValue(template: CharacterBuffTemplate): string {
  const scale = template.scaleFrom ? ` × ${template.scaleFrom}` : "";
  const one =
    template.target === "motionValue" && template.modifier === "amplify"
      ? `×${(1 + template.value).toFixed(2)}`
      : `${+(template.value * 100).toFixed(2)}%${scale}`;

  const max = template.maxStacks ?? 1;
  if (max <= 1) return one;
  return `${one} / 스택 · 최대 ${+(template.value * max * 100).toFixed(2)}%${scale}`;
}

/** 이 버프가 언제 열리는지 — 체인 단계 · 공명 모드 · 고유 스킬. 없으면 조건 없음. */
function gateOf(template: CharacterBuffTemplate): string[] {
  const out: string[] = [];
  if (template.resonanceChain !== undefined) out.push(`${template.resonanceChain}체인`);
  if (template.resonanceMode !== undefined) out.push(`${template.resonanceMode} 모드`);
  if (template.inherentSkillId !== undefined) out.push("고유 스킬");
  return out;
}

export function CharacterBuffReviewSection({ characterId }: { characterId: string }) {
  const overrides = useSyncExternalStore(
    subscribeCharacterBuffOverrides,
    getCharacterBuffOverrides,
  );
  const review = useReviewStatus("character-buff");
  const { checkedSet, deferredSet } = review;
  const [showChecked, setShowChecked] = useState(false);
  const [showDeferred, setShowDeferred] = useState(false);
  const [query, setQuery] = useState("");

  const character = characters.find((c) => c.id === characterId);
  const buffs = useMemo(() => character?.passiveBuffs ?? [], [character]);
  const names = useMemo(() => attackNames(characterId), [characterId]);

  // 이 캐릭터에서 지금 화면에 남는 줄. 원래 순번(index)이 저장 키라 함께 들고 다닌다.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return buffs
      .map((template, index) => ({ template, index, key: characterBuffKey(characterId, index) }))
      .filter((r) => (showChecked ? true : !checkedSet.has(r.key)))
      .filter((r) => (showDeferred ? true : !deferredSet.has(r.key)))
      .filter((r) =>
        q
          ? r.template.label.toLowerCase().includes(q) ||
            (r.template.condition ?? "").toLowerCase().includes(q)
          : true,
      );
  }, [buffs, characterId, query, showChecked, checkedSet, showDeferred, deferredSet]);

  if (!character) return null;

  // 진행 상황은 이 캐릭터의 줄만 센다 — 저장소는 전 캐릭터가 함께 쓰기 때문이다.
  const keys = buffs.map((_, index) => characterBuffKey(characterId, index));
  const doneCount = keys.filter((k) => checkedSet.has(k)).length;
  const laterCount = keys.filter((k) => deferredSet.has(k)).length;
  const editedCount = keys.filter((k) => overrides[k] !== undefined).length;

  return (
    <section className="panel data-page">
      <header>
        <div>
          <h1>버프 정리 · {character.name}</h1>
          <p>
            고유효과와 공명체인을 계산용 버프로 옮긴 결과입니다. 「상시/발동」과 「본인/파티」는
            여기서 바로 고칠 수 있고, 고친 값은 저장되어 피해 계산에 그대로 쓰입니다. 확인한 줄은
            체크해서 목록에서 감춥니다.
          </p>
        </div>
      </header>

      <div className="data-summary">
        <div>
          <small>버프 줄 수</small>
          <b>{buffs.length}</b>
        </div>
        <div>
          <small>내가 고친 줄</small>
          <b className={editedCount ? "data-edited-count" : undefined}>{editedCount}</b>
        </div>
        <div>
          <small>확인 완료</small>
          <b className={doneCount ? "data-done-count" : undefined}>
            {doneCount} / {buffs.length}
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
          placeholder="효과 · 조건으로 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

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

        {editedCount > 0 && (
          <button
            className="data-reset"
            onClick={() => {
              if (confirm(`${character.name}의 상시/발동 · 본인/파티를 전부 원래대로 되돌립니다.`))
                clearCharacterBuffOverride(characterId);
            }}
          >
            이 캐릭터 되돌리기
          </button>
        )}
      </div>

      {buffs.length === 0 && (
        <p className="data-none">계산에 옮긴 버프가 없습니다 — 이 캐릭터는 아직 비어 있습니다.</p>
      )}

      {buffs.length > 0 && rows.length === 0 && (
        <p className="data-empty">
          이 조건에서 남은 줄이 없습니다. 위쪽 토글을 켜면 완료·나중에 표시한 줄을 다시 볼 수
          있습니다.
        </p>
      )}

      {rows.length > 0 && (
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
              const onlyAttacks = template.attackIds ?? (template.attackId ? [template.attackId] : []);

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
                          characterId,
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
                      className={override?.scope ? "data-select data-select-edited" : "data-select"}
                      value={scope}
                      onChange={(e) =>
                        setCharacterBuffOverride(
                          characterId,
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
    </section>
  );
}
