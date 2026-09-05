import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { hydrate } from "./utils/persist";
import "./styles.css";

/**
 * 저장된 설정을 메모리에 올린 **뒤에** App을 불러온다.
 *
 * 스토어 중에는 모듈이 뜨는 그 자리에서 저장값을 읽는 것이 있다
 * (보유 캐릭터 · 보유 무기 · 버프 수정분 셋). 그런데 `import App from "./App"`처럼
 * 정적 import로 적으면 이 파일의 첫 줄이 돌기도 전에 App 아래 모듈이 전부 평가된다 —
 * hydrate()를 제일 먼저 불러도 그 스토어들은 이미 빈 값을 읽어 간 뒤다.
 * 그래서 App은 hydrate가 끝난 다음 동적 import로 불러온다.
 *
 * 이 순서가 깨지면 보유 목록이 빈 채로 뜨고, 그 상태에서 한 번이라도 손대면
 * 빈 목록이 저장되어 원래 값을 덮어쓴다. 화면만 비어 보이는 게 아니라 자료가 지워진다.
 */
hydrate()
  .catch(() => {
    // 저장할 곳을 못 찾아도 화면은 띄운다 — 위쪽 띠가 「저장 안 됨」을 알린다.
  })
  .then(() => import("./App"))
  .then(({ default: App }) => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
