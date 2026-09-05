import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { hydrate } from "./utils/persist";
import "./styles.css";

/**
 * 화면을 그리기 전에 구글 드라이브에서 설정을 먼저 받아 온다.
 *
 * 스토어들이 모듈이 뜨는 시점에 저장값을 **동기로** 읽기 때문에, 그 전에 내용이 메모리에
 * 들어와 있어야 한다. 그래서 App을 import 시점이 아니라 hydrate 뒤에 그린다.
 * 로그인하지 않았으면 hydrate가 조용히 넘어가고, 화면 위 띠가 「저장 안 됨」을 알린다.
 */
hydrate().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
