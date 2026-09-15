import { useRef } from "react";
import type { BuffOverrideMap } from "../data/buffOverrides";

/**
 * 버프 확인 탭의 「체크 상태 내보내기 / 불러오기」.
 *
 * 내보내는 파일에는 고친 값(overrides)과 완료 · 나중에 표시가 함께 담긴다.
 * 다른 브라우저 · 기기로 옮기거나, 고친 목록을 그대로 넘겨 소스에 반영할 때 쓴다.
 * 사람이 읽기 좋게 고친 줄 설명(edits)도 곁들이지만 불러올 때는 쓰지 않는다.
 * 불러오면 지금 상태를 파일 내용으로 통째로 바꾼다.
 */
export interface ReviewSnapshot {
  kind: string;
  exportedAt: string;
  overrides: BuffOverrideMap;
  checked: string[];
  deferred: string[];
  edits?: unknown[];
}

interface Props {
  /** 파일 종류 — 무기 파일을 캐릭터 탭에 불러오는 실수를 막는다. */
  kind: string;
  overrides: BuffOverrideMap;
  checked: string[];
  deferred: string[];
  edits: unknown[];
  onImport(snapshot: ReviewSnapshot): void;
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

export function ReviewTransfer({ kind, overrides, checked, deferred, edits, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportFile = () => {
    const snapshot: ReviewSnapshot = {
      kind,
      exportedAt: new Date().toISOString(),
      overrides,
      checked,
      deferred,
      edits,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}-review-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Partial<ReviewSnapshot>;
      if (data.kind !== kind) {
        alert(`이 탭(${kind})의 파일이 아닙니다: ${data.kind ?? "알 수 없음"}`);
        return;
      }
      if (
        typeof data.overrides !== "object" ||
        data.overrides === null ||
        !isStringArray(data.checked) ||
        !isStringArray(data.deferred)
      ) {
        alert("파일 형식이 올바르지 않습니다.");
        return;
      }
      const message =
        `고친 줄 ${Object.keys(data.overrides).length} · 완료 ${data.checked.length} · ` +
        `나중에 ${data.deferred.length}\n지금 상태를 이 파일 내용으로 바꿉니다.`;
      if (confirm(message)) onImport(data as ReviewSnapshot);
    } catch {
      alert("JSON 파일을 읽지 못했습니다.");
    }
  };

  return (
    <>
      <button className="data-check" onClick={exportFile}>
        체크 상태 내보내기
      </button>
      <button className="data-check" onClick={() => fileRef.current?.click()}>
        불러오기
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importFile(file);
        }}
      />
    </>
  );
}
