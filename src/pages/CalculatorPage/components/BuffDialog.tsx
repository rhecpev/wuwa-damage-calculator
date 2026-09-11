import { useEffect, useState } from "react";
import type { CalculationResult } from "../hooks/useCalculationResults";
import { PARTY_SLOTS, usePartyConfig } from "../../../context/PartyConfigContext";
import {
  anomalyStackCap,
  appliesTo,
  buffAmount,
  DAMAGE_TYPE_OPTIONS,
  TARGET_OPTIONS,
} from "../../../calculator/manualBuffs";
import type { ManualBuff } from "../../../types/game";
import { characters } from "../../../data/sampleData";
import { num } from "../../../utils/format";
import { CopyJson } from "./CopyJson";

/**
 * scaleFrom 버프가 어느 스탯에서 수치를 가져오는지 — 목록에 그대로 적는다.
 * BuffScaleStat 전부를 적어 둔다. 빠진 것이 있으면 「undefined × 0.1%」로 새어 나온다
 * (「내려앉은 깃털의 노래」 5세트가 공명 효율 비례라 그렇게 보였다).
 */
const SCALE_LABEL: Record<string, string> = {
  ATK: "공격력",
  HP: "HP",
  DEF: "방어력",
  EnergyRegen: "공명 효율",
  DiscordEfficiency: "부조화 효율",
  SyncAmplify: "조화도 파괴 증폭",
  CritRate: "크리티컬",
};

/** 버프 한 줄을 "적용 대상 · 피해 종류 · 방식"으로 요약한다. */
function describe(buff: ManualBuff): string {
  const target = TARGET_OPTIONS.find((o) => o.value === buff.target)?.label ?? buff.target;
  const damage = DAMAGE_TYPE_OPTIONS.find((o) => o.value === buff.damageType)?.label ?? buff.damageType;
  const how =
    buff.target === "motionValue" ? (buff.modifier === "increase" ? "증가" : "상승") : "가산";
  return `${target} · ${damage} · ${how}`;
}

/** 탭 id — 캐릭터 id와 겹치지 않게 밑줄을 붙인다. */
const ALL_TAB = "__all";
const SHARED_TAB = "__shared";

interface BuffDialogProps {
  selected: CalculationResult;
  onClose: () => void;
}

/**
 * 공격 루틴에서 카드를 누르면 옆에 뜨는 버프 창.
 * 화면을 덮지 않도록 오른쪽에 붙는 패널로 그린다 — 루틴을 보면서 버프를 켜고 끌 수 있다.
 */
export function BuffDialog({ selected, onClose }: BuffDialogProps) {
  const { toggleBuff, setBuffStacks, allBuffs, config } = usePartyConfig();
  // 고른 탭 — 카드를 바꿔도 남겨 둔다. 한 캐릭터의 버프를 여러 카드에 걸쳐 보는 일이 잦아서다.
  const [tab, setTab] = useState(ALL_TAB);

  // 이 공격에 걸릴 수 있는 것만 남긴다. 분류·속성·개인 범위가 맞지 않는 버프는
  // 켜도 계산에 안 들어가므로 목록에 띄우지 않는다.
  // 상시 버프는 조건 없이 걸려 있어 손댈 일이 적다 — 조건부를 위로 두고 상시는 아래로 민다.
  const usable = allBuffs
    .filter((buff: ManualBuff) => appliesTo(buff, selected.attack, selected.character.id))
    .sort((a, b) => Number(a.uptime === "passive") - Number(b.uptime === "passive"));

  const isOn = (buff: ManualBuff) =>
    buff.uptime === "passive"
      ? !(selected.item.disabledBuffIds?.includes(buff.id) ?? false)
      : selected.item.enabledBuffIds.includes(buff.id);

  // 캐릭터별 탭 — 파티 자리 순서대로, 주인 없는 버프는 「공용」으로 맨 뒤에 모은다.
  const partyOrder = PARTY_SLOTS.map((slot) => config[slot].characterId);
  const rank = (id: string) => {
    if (id === "") return Infinity;
    const at = partyOrder.indexOf(id);
    return at === -1 ? partyOrder.length : at;
  };
  const ownerIds = [...new Set(usable.map((buff) => buff.ownerId ?? ""))].sort(
    (a, b) => rank(a) - rank(b),
  );
  const tabs = [
    { id: ALL_TAB, label: "전체", icon: undefined as string | undefined, list: usable },
    ...ownerIds.map((id) => {
      const owner = id ? characters.find((c) => c.id === id) : undefined;
      return {
        id: id || SHARED_TAB,
        label: id ? (owner?.name ?? "파티에 없음") : "공용",
        icon: owner?.iconUrl,
        list: usable.filter((buff) => (buff.ownerId ?? "") === id),
      };
    }),
  ];
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="buff-dialog">
      <div className="buff-dialog-head">
        <div>
          <small>이 공격에 적용할 버프</small>
          <b>{selected.attack.name}</b>
          <em>
            {selected.character.name} · 켜둔 것 {selected.item.enabledBuffIds.length}개
          </em>
        </div>
        {/* 계산이 어긋나 보일 때 통째로 퍼서 보여주는 자리 — 버프 한 줄씩 수치까지 담긴다. */}
        <span className="buff-dialog-tools">
          <CopyJson result={selected} allBuffs={usable} label="계산 JSON" />
          <button onClick={onClose}>×</button>
        </span>
      </div>

    <div className="buff-dialog-split">
    {/* 왼쪽 — 캐릭터 탭은 위에 붙여 두고 버프 목록만 스크롤한다. */}
    <div className="buff-dialog-main">
      {usable.length > 0 && (
        <div className="buff-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === current.id}
              className={t.id === current.id ? "on" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.icon && <img src={t.icon} alt="" loading="lazy" />}
              {t.label}
              <em>
                {t.list.filter(isOn).length}/{t.list.length}
              </em>
            </button>
          ))}
        </div>
      )}
    <div className="buff-dialog-body">
      {usable.length === 0 ? (
        <p style={{ color: "#9ea7b7", margin: 0 }}>
          {allBuffs.length === 0
            ? "버프 목록이 비어 있습니다. 위 「버프 직접 입력」에서 추가하거나 장착 무기 버프를 담아보세요."
            : "이 공격에 걸릴 수 있는 버프가 없습니다."}
        </p>
      ) : (
        <div className="buffs">
          {current.list.map((buff: ManualBuff) => {
            // 상시 버프는 조건이 없어 기본으로 걸린다. 다만 「이게 얼마나 보태는지」를 보려고
            // 잠깐 빼 보는 일이 잦아 끌 수 있게 열어 뒀다 — 끈 것은 그 공격에만 남는다.
            const always = buff.uptime === "passive";
            const off = selected.item.disabledBuffIds?.includes(buff.id) ?? false;
            const checked = isOn(buff);
            // 스택형이면 이 공격에서 정한 스택을, 없으면 버프의 기본값을 쓴다.
            // 이상 효과 스택을 그대로 쓰는 버프(암흑 효과의 방어력 감소 등)는 상한이 고정이 아니다
            // — 치사의 반주처럼 상한을 올려주는 버프가 켜져 있으면 같이 올라간다.
            const cap = buff.anomalyStacks
              ? anomalyStackCap(
                  buff.anomalyStacks,
                  allBuffs,
                  selected.item.enabledBuffIds,
                  selected.item.disabledBuffIds,
                )
              : null;
            const max = cap ? cap.max : (buff.maxStacks ?? 1);
            const stacks = selected.item.buffStacks?.[buff.id] ?? buff.stacks;
            // scaleFrom 버프는 그때의 스탯에서 수치가 나온다 — 계산에 쓴 최종 스탯을 그대로 넘긴다.
            // 파티 버프는 준 사람의 스탯을 보므로 파티 전원의 스탯창도 함께 넘긴다.
            const amount = buffAmount(buff, stacks, selected.stats, selected.ownerPanels);
            const owner = buff.ownerId
              ? characters.find((c) => c.id === buff.ownerId)
              : undefined;

            return (
              <label key={buff.id} className={checked ? "on" : ""}>
                <input
                  type="checkbox"
                  checked={checked}
                  title={always ? "상시 버프 — 끄면 이 공격에서만 빠집니다" : undefined}
                  onChange={() => toggleBuff(selected.item.id, buff.id)}
                />
                {/* 무기 버프는 무기 그림, 그 외는 들고 있는 캐릭터 아이콘. */}
                {buff.iconUrl ? (
                  <i className="buff-owner weapon" title={buff.label}>
                    <img src={buff.iconUrl} alt="" loading="lazy" />
                  </i>
                ) : (
                  owner && (
                    <i className="buff-owner" title={`${owner.name}의 버프`}>
                      {owner.iconUrl ? (
                        <img src={owner.iconUrl} alt="" loading="lazy" />
                      ) : (
                        owner.name[0]
                      )}
                    </i>
                  )
                )}
                <span>
                  <b>
                    {buff.label || describe(buff)}{" "}
                    <em className="buff-amount">
                      {/* 스탯은 안 건드리고 이상 스택 상한만 올리는 버프는 퍼센트가 의미 없다. */}
                      {buff.raisesAnomalyStacks && !buff.value
                        ? `이상 스택 상한 +${buff.raisesAnomalyStacks}`
                        : `${(amount * 100).toFixed(1)}%`}
                      {buff.scaleFrom
                        ? ` (${SCALE_LABEL[buff.scaleFrom] ?? buff.scaleFrom} × ${(
                            buff.value * 100
                          ).toFixed(1)}%)`
                        : stacks > 1 &&
                          buff.value > 0 &&
                          ` (${(buff.value * 100).toFixed(1)}% × ${stacks})`}
                    </em>
                    {buff.switchesDamageBonusType && (
                      <em className="buff-cap" title="켜면 이 공격의 피해 판정이 바뀝니다">
                        {DAMAGE_TYPE_OPTIONS.find(
                          (o) => o.value === buff.switchesDamageBonusType,
                        )?.label ?? buff.switchesDamageBonusType}{" "}
                        판정으로 전환
                      </em>
                    )}
                    {cap && cap.bonus > 0 && (
                      <em className="buff-cap" title={cap.from.join(" · ")}>
                        {cap.from.join(" · ")} 적용됨 · 상한 {cap.max}
                      </em>
                    )}
                    {max > 1 && (
                      <em
                        className="buff-stacks"
                        // 라벨 안이라 그냥 두면 클릭이 체크박스로 새어 나간다.
                        onClick={(event) => event.preventDefault()}
                      >
                        스택
                        <select
                          value={stacks}
                          onChange={(event) =>
                            setBuffStacks(selected.item.id, buff.id, Number(event.target.value))
                          }
                        >
                          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        / {max}
                      </em>
                    )}
                  </b>
                  <small>
                    {describe(buff)}
                    {always && (off ? " · 상시(이 공격에서 끔)" : " · 상시")}
                    {buff.exclusiveGroup && " · 같은 묶음에서 하나만"}
                    {!buff.enabled && " · 목록에서 꺼둠"}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
      )}
      </div>
    </div>

      {/* 오른쪽 —이 공격의 히트별 값. 계산식 창의 「4 · 히트별」에서 일반·치명타만 뽑았다.
          버프를 켜고 끄면서 어느 타가 얼마나 움직이는지 그 자리에서 보려는 것이다. */}
      <div className="buff-dialog-hits">
        <small>히트별</small>
        <table>
          <thead>
            <tr>
              <th>타</th>
              <th>일반</th>
              <th>치명타</th>
            </tr>
          </thead>
          <tbody>
            {selected.damage.hits.map((hit, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{num(hit.normalDamage)}</td>
                <td>{num(hit.criticalDamage)}</td>
              </tr>
            ))}
            <tr className="buff-hits-sum">
              <td>합</td>
              <td>{num(selected.damage.normalDamage)}</td>
              <td>{num(selected.damage.criticalDamage)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </aside>
  );
}
