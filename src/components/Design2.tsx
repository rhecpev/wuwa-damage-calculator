import type { ReactNode } from "react";
import "../pages/CalculatorPage2/calc2.css";
import { useShape } from "../utils/theme";

/**
 * 「대미지 계산 2」에서 만든 꼴을 다른 탭에 입히는 껍데기.
 *
 * 탭의 내용(페이지 컴포넌트)은 원본 그대로 쓰고, 바깥을 .c2로 감싸 calc2.css의 공통 규칙
 * — 각진 모서리, 작은 라벨 꼴의 판 제목, 체크박스, 단추 — 이 걸리게 한다.
 * 페이지를 복사하지 않으므로 「○○ 2」 탭과 원본 탭은 같은 자료를 본다. 꼴만 다르다.
 */
export function Design2({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const { shape } = useShape();
  // 디자인 「둥글게」 — 껍데기 없이 원래 페이지 그대로(이전 디자인).
  if (shape === "round") return <>{children}</>;
  return (
    <div className="c2">
      <header className="c2-title">
        <h1>{title}</h1>
        <em>{sub}</em>
      </header>
      {children}
    </div>
  );
}
