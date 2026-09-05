import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { userDataPlugin } from "./scripts/user-data-plugin.mjs";

export default defineConfig({
  // userDataPlugin: 설정을 data/userdata.json에 저장한다.
  //   브라우저를 지워도 남도록 진짜 저장은 파일에 하고 localStorage는 사본으로 쓴다.
  plugins: [react(), userDataPlugin()],
});
