import { useMemo, useState } from "react";
import { usePartyConfig } from "../../context/PartyConfigContext";
import { computeResults } from "../CalculatorPage/hooks/useCalculationResults";
import { num } from "../../utils/format";
import type { BuffTarget, ManualBuff, PartyConfig } from "../../types/game";

/**
 * 사이클 대미지 비교.
 *
 * 담아 둔 사이클 하나를 **지금 환경**(무기 · 공명체인 · 에코 · 스킬 레벨)으로 다시 돌려
 * 총 피해를 낸 뒤, 「이 조건이 바뀌면 얼마나 오르나」를 나란히 보여준다.
 *
 * 조건은 전부 **늘 걸리는 버프 한 줄**로 만들어 얹는다(uptime:"passive", scope:"party",
 * 소유자 없음 → 파티 전원). 에코를 갈아 끼우는 것도 결국 스탯이 바뀌는 일이라,
 * 바뀌는 스탯을 그대로 넣으면 그 교체의 값어치가 나온다.
 *
 * 계산은 계산 탭과 같은 함수(computeResults)를 쓴다. 훅이 아니라 함수라서
 * 한 화면에서 조건 수만큼 돌릴 수 있다.
 */

/** 조건 한 줄을 늘 걸리는 버프로 만든다. */
function scenarioBuff(id: string, label: string, target: BuffTarget, value: number): ManualBuff {
  return {
    id: `cycle-compare:${id}`,
    label,
    target,
    damageType: "All",
    value,
    stacks: 1,
    modifier: "increase",
    enabled: true,
    uptime: "passive",
    scope: "party",
    // 공격력·HP·방어력 %는 전투 중에 얹히는 자리로 둔다 — 스탯창(panel)에 넣으면 버림이 한 번 더 낀다.
    ...(target === "atkPercent" || target === "hpPercent" || target === "defPercent"
      ? { statGroup: "buff" as const }
      : {}),
  };
}

/** 미리 담아 둔 조건. 「스탯 한 줄이 이만큼 붙으면」을 그대로 옮긴 것이다. */
const PRESETS: Array<{ id: string; label: string; target: BuffTarget; value: number }> = [
  { id: "atk10", label: "공격력 +10%", target: "atkPercent", value: 0.1 },
  { id: "atkflat", label: "공격력 +100 (깡)", target: "atkFlat", value: 100 },
  { id: "crit", label: "크리티컬 확률 +10%p", target: "critRate", value: 0.1 },
  { id: "critdmg", label: "크리티컬 피해 +20%p", target: "critDamage", value: 0.2 },
  { id: "bonus", label: "피해 보너스 +10%p", target: "damageBonus", value: 0.1 },
  { id: "boost", label: "피해 부스트 +10%p", target: "boost", value: 0.1 },
  { id: "defign", label: "방어력 무시 +10%p", target: "defIgnore", value: 0.1 },
  { id: "respen", label: "저항 무시 +10%p", target: "resPen", value: 0.1 },
  { id: "taken", label: "받는 피해 +10%p", target: "damageTaken", value: 0.1 },
];

/** 직접 넣기에서 고를 수 있는 자리. percent=true면 입력값을 100으로 나눠 비율로 쓴다. */
const TARGETS: Array<{ value: BuffTarget; label: string; percent: boolean }> = [
  { value: "critDamage", label: "크리티컬 피해 %p", percent: true },
  { value: "critRate", label: "크리티컬 확률 %p", percent: true },
  { value: "atkPercent", label: "공격력 %", percent: true },
  { value: "atkFlat", label: "공격력 (깡)", percent: false },
  { value: "damageBonus", label: "피해 보너스 %p", percent: true },
  { value: "boost", label: "피해 부스트 %p", percent: true },
  { value: "defIgnore", label: "방어력 무시 %p", percent: true },
  { value: "resPen", label: "저항 무시 %p", percent: true },
  { value: "damageTaken", label: "받는 피해 %p", percent: true },
];

export function CycleComparePage() {
  const {
    config,
    characterWeapons,
    allBuffs,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
    cyclePresets,
  } = usePartyConfig();

  const [baseId, setBaseId] = useState("");
  const [customTarget, setCustomTarget] = useState<BuffTarget>("critDamage");
  const [customAmount, setCustomAmount] = useState("21");

  const preset = cyclePresets.find((p) => p.id === baseId) ?? cyclePresets[0] ?? null;
  const customMeta = TARGETS.find((t) => t.value === customTarget) ?? TARGETS[0];

  const view = useMemo(() => {
    if (!preset) return null;

    // 저장할 때 손으로 넣은 버프는 지금 목록에 없을 수 있다 — 없는 것만 보태 준다.
    // 캐릭터·무기·에코에서 나오는 버프는 지금 환경 것을 그대로 쓴다.
    const merged: ManualBuff[] = [
      ...allBuffs,
      ...preset.manualBuffs.filter((b) => !allBuffs.some((a) => a.id === b.id)),
    ];

    const totalWith = (
      extra: ManualBuff | null,
      rotation = preset.rotation,
      enemy = preset.enemy,
    ) => {
      const cfg: PartyConfig = { ...config, rotation, enemy };
      const results = computeResults(
        cfg,
        characterWeapons,
        extra ? [...merged, extra] : merged,
        characterChains,
        characterSkillLevels,
        characterLevels,
        characterNodes,
      );
      return results.reduce((sum, r) => sum + r.damage.expectedDamage, 0);
    };

    const base = totalWith(null);
    const rate = (total: number) => (base > 0 ? (total / base - 1) * 100 : 0);

    const rows = PRESETS.map((p) => {
      const total = totalWith(scenarioBuff(p.id, p.label, p.target, p.value));
      return { ...p, total, delta: total - base, rate: rate(total) };
    });

    const amount = Number(customAmount);
    const value = Number.isFinite(amount) ? (customMeta.percent ? amount / 100 : amount) : 0;
    const customTotal = value
      ? totalWith(scenarioBuff("custom", "직접 넣기", customTarget, value))
      : base;

    // 담아 둔 다른 사이클도 같은 환경에서 돌려 나란히 세운다.
    const others = cyclePresets.map((p) => ({
      id: p.id,
      name: p.name,
      hits: p.rotation.length,
      total: totalWith(null, p.rotation, p.enemy),
    }));

    return {
      base,
      rows,
      custom: { total: customTotal, delta: customTotal - base, rate: rate(customTotal) },
      others,
    };
  }, [
    preset,
    config,
    characterWeapons,
    allBuffs,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
    cyclePresets,
    customTarget,
    customAmount,
    customMeta,
  ]);

  if (!preset) {
    return (
      <section className="panel">
        <h2>사이클 대미지 비교</h2>
        <p className="enemy-hint">
          담아 둔 사이클이 없습니다. 「데미지 계산」 탭에서 루틴을 짠 뒤 사이클로 담으면 여기서
          조건별 증가량을 볼 수 있습니다.
        </p>
      </section>
    );
  }

  const sign = (n: number) => (n > 0 ? "+" : "");

  return (
    <>
      <section className="panel">
        <div className="row">
          <div>
            <h2>사이클 대미지 비교</h2>
          </div>
          <div className="rotation-tools">
            <select value={preset.id} onChange={(event) => setBaseId(event.target.value)}>
              {cyclePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.rotation.length}대
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="enemy-hint">
          담아 둔 루틴과 적 설정을 <b>지금 환경</b>(무기 · 공명체인 · 에코 · 스킬 레벨)으로 다시
          돌린 값입니다. 저장할 때와 환경이 다르면 그만큼 숫자도 달라집니다.
        </p>

        <div className="stat-bonus">
          <div>
            <span>기준 사이클 총 기대 피해</span>
            <b>{view ? num(view.base) : "—"}</b>
          </div>
          <div>
            <span>담긴 공격</span>
            <b>{preset.rotation.length}대</b>
          </div>
          <div>
            <span>적</span>
            <b>Lv.{preset.enemy.level}</b>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>조건이 바뀌면 얼마나 오르나</h2>
        <p className="enemy-hint">
          에코를 갈아 끼우면 결국 스탯이 바뀝니다. 바뀌는 스탯을 그대로 넣어 보면 그 교체의
          값어치가 나옵니다 — 크리티컬 피해 21% 부옵션 한 줄이 더 붙는다면 맨 아래 칸에
          「크리티컬 피해」 21을 넣으면 됩니다.
        </p>

        <table className="buff-table">
          <thead>
            <tr>
              <th>조건</th>
              <th>사이클 총 피해</th>
              <th>증가량</th>
              <th>증가율</th>
            </tr>
          </thead>
          <tbody>
            {view?.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.label}</td>
                <td>{num(row.total)}</td>
                <td className="chain-value">
                  {sign(row.delta)}
                  {num(Math.round(row.delta))}
                </td>
                <td className="chain-value">
                  {sign(row.rate)}
                  {row.rate.toFixed(2)}%
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <span className="compare-custom">
                  <select
                    value={customTarget}
                    onChange={(event) => setCustomTarget(event.target.value as BuffTarget)}
                  >
                    {TARGETS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="buff-stack"
                    type="number"
                    step="any"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                  />
                </span>
              </td>
              <td>{view ? num(view.custom.total) : "—"}</td>
              <td className="chain-value">
                {view ? `${sign(view.custom.delta)}${num(Math.round(view.custom.delta))}` : "—"}
              </td>
              <td className="chain-value">
                {view ? `${sign(view.custom.rate)}${view.custom.rate.toFixed(2)}%` : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>담아 둔 사이클끼리</h2>
        <p className="enemy-hint">모두 같은 환경에서 돌린 값이고, 기준 사이클과의 차이를 적었습니다.</p>
        <table className="buff-table">
          <thead>
            <tr>
              <th>사이클</th>
              <th>공격 수</th>
              <th>총 피해</th>
              <th>기준 대비</th>
            </tr>
          </thead>
          <tbody>
            {view?.others.map((row) => {
              const diff = row.total - view.base;
              return (
                <tr key={row.id} className={row.id === preset.id ? "" : "off"}>
                  <td>{row.name}</td>
                  <td>{row.hits}대</td>
                  <td>{num(row.total)}</td>
                  <td className="chain-value">
                    {row.id === preset.id
                      ? "기준"
                      : `${sign(diff)}${num(Math.round(diff))} (${sign(diff)}${(
                          view.base > 0 ? (row.total / view.base - 1) * 100 : 0
                        ).toFixed(2)}%)`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
