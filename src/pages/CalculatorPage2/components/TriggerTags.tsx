import type { CalculationResult } from "../hooks/useCalculationResults";
import { triggersFor } from "../../../data/attackTriggers";
import { ANOMALIES } from "../../../data/anomalies";

/**
 * 공격이 **피해 말고 따로 일으키는 일**(트리거)을 작은 딱지로 늘어놓는다.
 * 버프 창 머리의 공격 이름 옆에 붙는다 — 무엇을 붙이고(부여) 무엇을 태우는지(소모) 이름과 함께 읽힌다
 * (data/attackTriggers.ts). 트리거가 없는 공격이면 아무것도 그리지 않는다.
 */
export function TriggerTags({ result }: { result: CalculationResult }) {
  const list = triggersFor(result.item.characterId, result.attack.id);
  if (list.length === 0) return null;

  return (
    <span className="c2-trigs">
      {list.map((t, at) => {
        const name = t.anomaly
          ? `${ANOMALIES[t.anomaly].name} 효과`
          : t.shield
            ? "실드 획득"
            : (t.status ?? t.debuff ?? t.resource ?? "");
        return (
          <i
            key={at}
            className={t.action === "add" ? "c2-trig add" : "c2-trig use"}
            title={[t.condition, t.source].filter(Boolean).join(" — ")}
          >
            <em>{t.action === "add" ? "부여" : "소모"}</em>
            {name}
            {t.amount !== undefined && <small>{t.amount}</small>}
          </i>
        );
      })}
    </span>
  );
}
