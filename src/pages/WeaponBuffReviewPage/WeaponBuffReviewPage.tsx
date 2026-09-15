import { useMemo, useState, useSyncExternalStore } from "react";
import { weapons, type WeaponEntry } from "../../data/weapons";
import {
  clearWeaponBuffOverride,
  getWeaponBuffOverrides,
  replaceWeaponBuffOverrides,
  resetWeaponBuffOverrides,
  setWeaponBuffOverride,
  subscribeWeaponBuffOverrides,
  weaponBuffKey,
} from "../../data/weaponBuffOverrides";
import type { WeaponBuffTemplate } from "../../data/weaponBuffs";
import type { BuffScope, BuffUptime } from "../../types/game";
import { DAMAGE_TYPE_LABEL, ELEMENT_LABEL, TARGET_LABEL, defaultsOf } from "../../utils/buffLabels";
import { useReviewStatus } from "../../utils/useReviewStatus";
import { ReviewActions, ReviewTransfer } from "../../components";

/**
 * 무기 버프 확인 탭 — 무기 스킬 설명문과, 그걸 계산용 버프로 옮긴 결과를 무기마다 나란히 놓고 대조하는 자리.
 *
 * 캐릭터 관리의 「버프 정리」와 같은 규칙이다.
 *   「상시/발동」과 「본인/파티」는 여기서 바로 고치고, 고친 값은 저장되어 계산에 그대로 쓰인다
 *   (weaponBuffOverrides → deriveWeaponBuffs).
 *   나머지(타깃 · 수치 · 조건)는 읽기 전용 — 소스(src/data/weaponBuffs.ts)를 고쳐야 하는 부분이다.
 *
 * 확인이 끝나면 「수정분 JSON 복사」로 고친 것만 뽑아 소스에 옮겨 적고 커밋한다.
 * 개발 서버에서만 탭이 보인다.
 */

const TYPE_LABEL: Record<string, string> = {
  Broadblade: "대검",
  Sword: "직검",
  Pistols: "권총",
  Gauntlets: "권갑",
  Rectifier: "증폭기",
};
const TYPES = ["Broadblade", "Sword", "Pistols", "Gauntlets", "Rectifier"] as const;

/** 옮긴 버프가 있는지로 거르는 라디오. */
const BUFF_FILTERS = [
  { id: "all", label: "전체" },
  { id: "has", label: "옮긴 무기" },
  { id: "none", label: "비어 있는 무기" },
] as const;
type BuffFilter = (typeof BUFF_FILTERS)[number]["id"];

/** 정련 1~5 값을 한 줄로. 다섯 값이 같으면 하나만. 동작 배율 상승은 배수로 적는다. */
function formatValues(template: WeaponBuffTemplate): string {
  const amplify = template.target === "motionValue" && template.modifier === "amplify";
  const one = (v: number) => (amplify ? `×${(1 + v).toFixed(2)}` : `${+(v * 100).toFixed(2)}%`);
  const values = template.values;
  const body = values.every((v) => v === values[0]) ? one(values[0]) : values.map(one).join(" / ");
  const max = template.maxStacks ?? 1;
  return max > 1 ? `${body} × 최대 ${max}스택` : body;
}

/** 설명문의 {0} {1} 자리를 정련 1~5 수치(「8%/10%/…」)로 채운다. */
function fillDesc(weapon: WeaponEntry): string {
  return weapon.passiveDesc.replace(/\{(\d+)\}/g, (all, i) => {
    const params = weapon.passiveParams[Number(i)];
    if (!params) return all;
    return params.every((p) => p === params[0]) ? params[0] : params.join("/");
  });
}

export function WeaponBuffReviewPage() {
  const overrides = useSyncExternalStore(subscribeWeaponBuffOverrides, getWeaponBuffOverrides);
  // 확인 단위는 무기 하나 — 설명문 한 덩어리를 옮긴 줄 전부와 한 번에 대조하기 때문이다.
  const review = useReviewStatus("weapon-buff");
  const { checkedSet, deferredSet } = review;
  const [showChecked, setShowChecked] = useState(false);
  const [showDeferred, setShowDeferred] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("");
  const [rarity, setRarity] = useState<number>(0);
  const [buffFilter, setBuffFilter] = useState<BuffFilter>("has");
  const [copied, setCopied] = useState(false);

  const sorted = useMemo(
    () =>
      [...weapons].sort(
        (a, b) =>
          b.rarity - a.rarity ||
          TYPES.indexOf(a.weaponType as (typeof TYPES)[number]) -
            TYPES.indexOf(b.weaponType as (typeof TYPES)[number]) ||
          a.name.localeCompare(b.name, "ko"),
      ),
    [],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((w) => {
      if (type && w.weaponType !== type) return false;
      if (rarity && w.rarity !== rarity) return false;
      if (buffFilter === "has" && w.passiveBuffs.length === 0) return false;
      if (buffFilter === "none" && w.passiveBuffs.length > 0) return false;
      if (!showChecked && checkedSet.has(w.id)) return false;
      if (!showDeferred && deferredSet.has(w.id)) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.passiveName.toLowerCase().includes(q) ||
        w.passiveDesc.toLowerCase().includes(q) ||
        w.passiveBuffs.some(
          (b) => b.label.toLowerCase().includes(q) || (b.condition ?? "").toLowerCase().includes(q),
        )
      );
    });
  }, [sorted, query, type, rarity, buffFilter, showChecked, checkedSet, showDeferred, deferredSet]);

  const withBuffs = weapons.filter((w) => w.passiveBuffs.length > 0);
  const lineCount = withBuffs.reduce((sum, w) => sum + w.passiveBuffs.length, 0);
  const editedKeys = Object.keys(overrides);
  const doneCount = weapons.filter((w) => checkedSet.has(w.id)).length;
  const laterCount = weapons.filter((w) => deferredSet.has(w.id)).length;

  /** 고친 줄만 무기 이름 · 효과 이름과 함께 뽑는다 — 소스에 옮겨 적을 때 찾기 쉽게. */
  const edits = () =>
    editedKeys.map((key) => {
      const [weaponId, index] = key.split(":");
      const weapon = weapons.find((w) => w.id === weaponId);
      const template = weapon?.passiveBuffs[Number(index)];
      return {
        key,
        weapon: weapon?.name ?? weaponId,
        index: Number(index),
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
          <small>WEAPON BUFF REVIEW</small>
          <h1>무기 버프 확인</h1>
          <p>
            무기 스킬 설명문과 계산용으로 옮긴 버프를 나란히 놓고 대조합니다. 「상시/발동」과
            「본인/파티」는 여기서 바로 고칠 수 있고 계산에 곧바로 쓰입니다. 다 보고 나면 「수정분
            JSON 복사」로 뽑아 소스에 옮겨 적으면 됩니다.
          </p>
        </div>
      </header>

      <div className="data-summary">
        <div>
          <small>옮긴 무기</small>
          <b>
            {withBuffs.length} / {weapons.length}
          </b>
        </div>
        <div>
          <small>버프 줄 수</small>
          <b>{lineCount}</b>
        </div>
        <div>
          <small>내가 고친 줄</small>
          <b className={editedKeys.length ? "data-edited-count" : undefined}>{editedKeys.length}</b>
        </div>
        <div>
          <small>확인 완료</small>
          <b className={doneCount ? "data-done-count" : undefined}>{doneCount}</b>
        </div>
        <div>
          <small>나중에 처리</small>
          <b className={laterCount ? "data-later-count" : undefined}>{laterCount}</b>
        </div>
      </div>

      <div className="data-filters">
        <input
          className="weapon-search data-search"
          placeholder="무기 · 스킬 · 효과 · 조건으로 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <span className="chips">
          <button className={type === "" ? "chip chip-active" : "chip"} onClick={() => setType("")}>
            전체 종류
          </button>
          {TYPES.map((t) => (
            <button
              key={t}
              className={type === t ? "chip chip-active" : "chip"}
              onClick={() => setType(t)}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </span>

        <span className="chips">
          {[0, 5, 4, 3].map((r) => (
            <button
              key={r}
              className={rarity === r ? "chip chip-active" : "chip"}
              onClick={() => setRarity(r)}
            >
              {r ? `★${r}` : "전체 등급"}
            </button>
          ))}
        </span>

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
          완료한 무기도 보기
        </label>

        <label className="data-toggle">
          <input
            type="checkbox"
            checked={showDeferred}
            onChange={(e) => setShowDeferred(e.target.checked)}
          />
          나중에 처리한 무기도 보기
        </label>

        <ReviewTransfer
          kind="weapon-buff"
          overrides={overrides}
          checked={review.checked}
          deferred={review.deferred}
          edits={edits()}
          onImport={(s) => {
            replaceWeaponBuffOverrides(s.overrides);
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
                if (confirm("무기 버프의 상시/발동 · 본인/파티 수정분을 전부 원래대로 되돌립니다."))
                  resetWeaponBuffOverrides();
              }}
            >
              전부 되돌리기
            </button>
          </>
        )}
      </div>

      {rows.length === 0 && (
        <p className="data-empty">
          이 조건에서 남은 무기가 없습니다. 필터를 바꾸거나 위 토글을 켜 보세요.
        </p>
      )}

      {rows.map((weapon) => {
        const checked = checkedSet.has(weapon.id);
        const deferred = deferredSet.has(weapon.id);
        const edited = weapon.passiveBuffs.some(
          (_, i) => overrides[weaponBuffKey(weapon.id, i)] !== undefined,
        );

        return (
          <article
            key={weapon.id}
            className={checked ? "panel data-weapon is-checked" : "panel data-weapon"}
          >
            <div className="data-weapon-head">
              <img className="data-weapon-icon" src={weapon.icon} alt="" loading="lazy" />
              <div className="data-weapon-name">
                <h2>
                  {weapon.name}
                  {edited && <span className="data-edited">고침</span>}
                  {checked && <span className="data-checked-tag">확인 완료</span>}
                </h2>
                <span>
                  {TYPE_LABEL[weapon.weaponType] ?? weapon.weaponType} ·{" "}
                  <span className="weapon-stars">{"★".repeat(weapon.rarity)}</span> · #{weapon.id}
                </span>
              </div>
              {edited && (
                <button className="data-reset" onClick={() => clearWeaponBuffOverride(weapon.id)}>
                  이 무기 되돌리기
                </button>
              )}
              <ReviewActions
                checked={checked}
                deferred={deferred}
                onToggleChecked={() => review.toggleChecked(weapon.id)}
                onToggleDeferred={() => review.toggleDeferred(weapon.id)}
              />
            </div>

            <p className="data-weapon-desc">
              <b>{weapon.passiveName}</b> — {fillDesc(weapon)}
            </p>

            {weapon.passiveBuffs.length === 0 ? (
              <p className="data-none">계산에 옮긴 버프가 없습니다.</p>
            ) : (
              <table className="buff-table data-table">
                <thead>
                  <tr>
                    <th>효과</th>
                    <th>붙는 자리</th>
                    <th>분류</th>
                    <th>수치 (정련 1~5)</th>
                    <th>상시 / 발동</th>
                    <th>본인 / 파티</th>
                    <th>조건</th>
                  </tr>
                </thead>
                <tbody>
                  {weapon.passiveBuffs.map((template, index) => {
                    const key = weaponBuffKey(weapon.id, index);
                    // 무기 버프의 scope 기본값은 본인이다(deriveWeaponBuffs와 같은 규칙).
                    const defaults = defaultsOf(template, "self");
                    const override = overrides[key];
                    const uptime = override?.uptime ?? defaults.uptime;
                    const scope = override?.scope ?? defaults.scope;

                    return (
                      <tr key={key}>
                        <td className="data-cell-label">
                          {template.label}
                          {template.exclusiveGroup && (
                            <em className="data-stacks">배타: {template.exclusiveGroup}</em>
                          )}
                          {template.statGroup === "buff" && (
                            <em className="data-stacks">전투 버프 묶음</em>
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
                        <td className="data-cell-value">{formatValues(template)}</td>
                        <td>
                          <select
                            className={
                              override?.uptime ? "data-select data-select-edited" : "data-select"
                            }
                            value={uptime}
                            onChange={(e) =>
                              setWeaponBuffOverride(
                                weapon.id,
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
                              setWeaponBuffOverride(
                                weapon.id,
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
