import { useState } from "react";
import type { CalculationResult } from "../hooks/useCalculationResults";
import { formulaJson } from "./formulaJson";
import type { ManualBuff } from "../../../types/game";

/**
 * 이 한 대의 계산을 JSON 한 덩이로 복사하는 단추.
 *
 * 계산식 창(DamageFormulaModal)과 버프 창(BuffDialog) 둘 다 같은 것을 쓴다 —
 * 어디서 눌러도 같은 내용이 나와야 붙여넣은 쪽에서 헷갈리지 않는다.
 * allBuffs를 넘기면 「이 공격에 걸릴 수 있는 버프 전부」가 수치까지 함께 담긴다.
 *
 * 클립보드가 막힌 자리(권한을 꺼 둔 브라우저 등)에서는 글상자를 펼쳐 직접 고르게 한다
 * — 복사가 조용히 실패하면 「눌렀는데 아무 일도 없다」가 되기 때문이다.
 */
export function CopyJson({
  result,
  allBuffs,
  label = "JSON 복사",
}: {
  result: CalculationResult;
  allBuffs?: ManualBuff[];
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  const [text, setText] = useState("");

  const copy = async () => {
    const json = formulaJson(result, allBuffs);
    setText(json);
    try {
      await navigator.clipboard.writeText(json);
      setState("done");
      window.setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("manual");
    }
  };

  return (
    <>
      <button
        className={state === "done" ? "formula-json-copy done" : "formula-json-copy"}
        onClick={copy}
        title="이 한 대의 계산 내역과 버프를 JSON으로 복사합니다"
      >
        {state === "done" ? "복사됨" : label}
      </button>

      {state === "manual" && (
        <div className="formula-json-box">
          <small>클립보드가 막혀 있습니다 — 아래 내용을 직접 복사하세요.</small>
          <textarea readOnly value={text} onFocus={(event) => event.currentTarget.select()} />
        </div>
      )}
    </>
  );
}
