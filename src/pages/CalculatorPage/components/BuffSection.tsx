import { useState } from "react";
import { PARTY_SLOTS, usePartyConfig } from "../../../context/PartyConfigContext";
import { characters } from "../../../data/sampleData";
import {
  DAMAGE_TYPE_OPTIONS,
  ELEMENT_OPTIONS,
  SCOPE_OPTIONS,
  TARGET_OPTIONS,
  UPTIME_OPTIONS,
} from "../../../calculator/manualBuffs";
import type {
  BuffDamageType,
  BuffModifier,
  BuffScope,
  BuffTarget,
  BuffUptime,
  Element,
  ManualBuff,
} from "../../../types/game";

/**
 * 버프 수기 입력 — 프로토타입.
 * 적용 대상 / 피해종류 / 수치 / 스택 / 증가·상승 을 받는다.
 * 필드는 앞으로 추가·변경될 수 있어, 선택지 정의는 전부 calculator/manualBuffs.ts에 모아두고
 * 입력 폼과 목록이 그걸 같이 쓴다.
 */

const MODIFIERS: { value: BuffModifier; label: string; hint: string }[] = [
  { value: "increase", label: "증가", hint: "계수 + 수치 (합연산)" },
  { value: "amplify", label: "상승", hint: "계수 × (1 + 수치) (곱연산)" },
];

/** 저항 속성 조건을 받는 타깃 — 저항 무시와 저항 감소 둘 다 적 저항에서 빼는 자리다. */
const isResTarget = (target: BuffTarget) => target === "resPen" || target === "resReduction";

const emptyDraft = {
  label: "",
  target: "motionValue" as BuffTarget,
  damageType: "All" as BuffDamageType,
  /** target이 저항 무시·저항 감소일 때만 쓰는 속성 조건. 빈 문자열이면 속성을 가리지 않는다. */
  element: "" as Element | "",
  /** 화면에서는 %로 입력받고 저장할 때 소수로 바꾼다. */
  percent: "",
  stacks: "1",
  modifier: "increase" as BuffModifier,
  /** 상시인지 조건부인지. 분류·표시용이고 계산에는 들어가지 않는다. */
  uptime: "passive" as BuffUptime,
  /** 파티 전원인지 본인만인지. self면 그 캐릭터의 공격에만 붙는다. */
  scope: "party" as BuffScope,
  /**
   * scope가 「개인」일 때 이 버프를 들고 있는 캐릭터.
   * 비워 두면 누구의 것도 아니게 되어 결국 파티 전원에게 걸린다(manualBuffs.ts의 appliesTo).
   * 그래서 개인을 고르면 파티에서 한 명을 반드시 짚게 한다.
   */
  ownerId: "",
};

export function BuffSection() {
  const { manualBuffs, addManualBuff, updateManualBuff, removeManualBuff, config } =
    usePartyConfig();
  const [draft, setDraft] = useState(emptyDraft);

  // 지금 파티에 앉은 캐릭터들. 「개인」 버프는 이 중 한 명에게 매단다.
  const partyMembers = PARTY_SLOTS.map((slot) =>
    characters.find((c) => c.id === config[slot].characterId),
  ).filter((c): c is (typeof characters)[number] => c !== undefined);
  const memberName = (id?: string) => characters.find((c) => c.id === id)?.name;

  const percent = Number(draft.percent);
  const stacks = Number(draft.stacks);
  // 개인 버프는 주인을 정해야 한다 — 주인이 없으면 파티 전원에게 걸려 「개인」이 무색해진다.
  const ownerNeeded = draft.scope === "self" && draft.ownerId === "";
  const valid =
    draft.percent !== "" && !Number.isNaN(percent) && stacks >= 1 && !ownerNeeded;

  const submit = () => {
    if (!valid) return;
    addManualBuff({
      label: draft.label.trim(),
      target: draft.target,
      damageType: draft.damageType,
      ...(isResTarget(draft.target) && draft.element ? { element: draft.element } : {}),
      value: percent / 100,
      stacks: Math.round(stacks),
      modifier: draft.modifier,
      enabled: true,
      uptime: draft.uptime,
      scope: draft.scope,
      ...(draft.scope === "self" && draft.ownerId ? { ownerId: draft.ownerId } : {}),
    });
    // 연달아 넣기 편하도록 수치·이름만 비우고 선택 조건은 남겨둔다.
    setDraft({ ...draft, label: "", percent: "", stacks: "1" });
  };

  const labelOf = (type: BuffDamageType) =>
    DAMAGE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
  const targetLabelOf = (target: BuffTarget) =>
    TARGET_OPTIONS.find((option) => option.value === target)?.label ?? target;
  const elementLabelOf = (element: Element) =>
    ELEMENT_OPTIONS.find((option) => option.value === element)?.label ?? element;
  // 값이 없는 예전 버프는 기존 동작(상시 · 파티 전원)으로 본다.
  const uptimeLabelOf = (uptime: BuffUptime = "passive") =>
    UPTIME_OPTIONS.find((option) => option.value === uptime)?.label ?? uptime;
  const scopeLabelOf = (scope: BuffScope = "party") =>
    SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? scope;

  // 증가/상승 구분은 스킬 배율에서만 갈린다.
  const modifierMatters = draft.target === "motionValue";

  return (
    <section className="panel">
      <div className="row">
        <div>
          <h2>버프 직접 입력</h2>
        </div>
        <span style={{ color: "#949dae", fontSize: 12 }}>
          프로토타입 — 필드는 바뀔 수 있습니다
        </span>
      </div>


      <div className="buff-form">
        <label>
          <small>이름 (선택)</small>
          <input
            type="text"
            placeholder="메모"
            value={draft.label}
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          />
        </label>

        <label>
          <small>적용 대상</small>
          <select
            value={draft.target}
            onChange={(event) =>
              setDraft({ ...draft, target: event.target.value as BuffTarget })
            }
          >
            {TARGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <small>피해 종류</small>
          <select
            value={draft.damageType}
            onChange={(event) =>
              setDraft({ ...draft, damageType: event.target.value as BuffDamageType })
            }
          >
            {DAMAGE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <small>수치 (%)</small>
          <input
            type="number"
            step="0.1"
            placeholder="12"
            value={draft.percent}
            onChange={(event) => setDraft({ ...draft, percent: event.target.value })}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
        </label>

        <label>
          <small>스택</small>
          <input
            type="number"
            min={1}
            value={draft.stacks}
            onChange={(event) => setDraft({ ...draft, stacks: event.target.value })}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
        </label>

        {isResTarget(draft.target) && (
          <label>
            <small>저항 속성</small>
            <select
              value={draft.element}
              onChange={(event) =>
                setDraft({ ...draft, element: event.target.value as Element | "" })
              }
            >
              <option value="">속성 무관</option>
              {ELEMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          <small>적용 방식</small>
          <select
            value={draft.modifier}
            disabled={!modifierMatters}
            title={modifierMatters ? undefined : "스킬 배율일 때만 구분됩니다"}
            onChange={(event) =>
              setDraft({ ...draft, modifier: event.target.value as BuffModifier })
            }
          >
            {MODIFIERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </option>
            ))}
          </select>
        </label>

        <label>
          <small>지속</small>
          <select
            value={draft.uptime}
            onChange={(event) =>
              setDraft({ ...draft, uptime: event.target.value as BuffUptime })
            }
          >
            {UPTIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </option>
            ))}
          </select>
        </label>

        <label>
          <small>범위</small>
          <select
            value={draft.scope}
            onChange={(event) => {
              const scope = event.target.value as BuffScope;
              // 파티로 되돌리면 주인은 지운다 — 남겨 두면 다음에 개인으로 바꿀 때 헷갈린다.
              setDraft({ ...draft, scope, ownerId: scope === "self" ? draft.ownerId : "" });
            }}
          >
            {SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </option>
            ))}
          </select>
        </label>

        {/* 개인 버프일 때만 주인을 고른다. 파티가 비어 있으면 고를 것이 없다고 알린다. */}
        {draft.scope === "self" && (
          <label>
            <small>누구의 버프</small>
            <select
              value={draft.ownerId}
              onChange={(event) => setDraft({ ...draft, ownerId: event.target.value })}
              disabled={partyMembers.length === 0}
            >
              <option value="">
                {partyMembers.length === 0 ? "파티가 비어 있습니다" : "고르세요"}
              </option>
              {partyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <button className="buff-add" onClick={submit} disabled={!valid}>
          추가
        </button>
      </div>

      {manualBuffs.length === 0 ? (
        <p style={{ color: "#9ea7b7", margin: "14px 0 0" }}>
          입력된 버프가 없습니다. 위에서 하나 추가해보세요.
        </p>
      ) : (
        <table className="buff-table">
          <thead>
            <tr>
              <th />
              <th>이름</th>
              <th>적용 대상</th>
              <th>피해 종류</th>
              <th>수치</th>
              <th>스택</th>
              <th>지속</th>
              <th>범위</th>
              <th>적용 방식</th>
              <th>합계</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {manualBuffs.map((buff: ManualBuff) => (
              <tr key={buff.id} className={buff.enabled ? "" : "off"}>
                <td>
                  <input
                    type="checkbox"
                    checked={buff.enabled}
                    onChange={() => updateManualBuff(buff.id, { enabled: !buff.enabled })}
                  />
                </td>
                <td>{buff.label || <span style={{ color: "#8d97ac" }}>—</span>}</td>
                <td>
                  {targetLabelOf(buff.target)}
                  {buff.element && (
                    <span style={{ color: "#9aa3b3" }}> · {elementLabelOf(buff.element)}</span>
                  )}
                </td>
                <td>{labelOf(buff.damageType)}</td>
                <td>{uptimeLabelOf(buff.uptime)}</td>
                <td>
                  {scopeLabelOf(buff.scope)}
                  {buff.scope === "self" &&
                    (buff.ownerId ? (
                      <span style={{ color: "#9aa3b3" }}>
                        {" "}
                        · {memberName(buff.ownerId) ?? "파티에 없음"}
                      </span>
                    ) : (
                      <span style={{ color: "#e0a94d" }}> · 주인 없음</span>
                    ))}
                </td>
                <td>{(buff.value * 100).toFixed(1)}%</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    className="buff-stack"
                    value={buff.stacks}
                    onChange={(event) =>
                      updateManualBuff(buff.id, {
                        stacks: Math.max(1, Math.round(Number(event.target.value) || 1)),
                      })
                    }
                  />
                </td>
                <td>
                  {buff.target === "motionValue" ? (
                    buff.modifier === "increase" ? "증가" : "상승"
                  ) : (
                    <span style={{ color: "#8d97ac" }}>가산</span>
                  )}
                </td>
                <td>{(buff.value * buff.stacks * 100).toFixed(1)}%</td>
                <td>
                  <button className="buff-remove" onClick={() => removeManualBuff(buff.id)}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
