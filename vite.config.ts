import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { userDataPlugin } from "./scripts/user-data-plugin.mjs";

/**
 * 지금 보고 있는 페이지가 **어느 커밋으로 만들어진 것인지** 화면에 찍기 위한 값.
 *
 * 배포본은 브라우저 캐시 때문에 옛 화면이 그대로 떠 있는 일이 흔하다. 그때
 * 화면 아래 해시를 보면 "고친 게 올라간 판인지"를 바로 알 수 있다.
 *
 * Vercel은 빌드할 때 VERCEL_GIT_COMMIT_SHA를 넣어 준다(빌드 환경에만 있는 값이라
 * VITE_ 접두사가 없어 클라이언트로 자동 노출되지 않는다 — 그래서 define으로 박는다).
 * 그 변수가 없으면 내 컴퓨터에서 도는 것이니 git에서 직접 꺼낸다.
 * git도 없으면(압축본만 풀어 놓은 경우 등) "unknown"으로 둔다 — 화면이 죽는 것보다 낫다.
 *
 * define은 빌드 시점에 문자열로 굳으므로 런타임 비용이 없다.
 */
function buildVersion(): string {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromVercel) return fromVercel.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

/** 빌드한 시각. Vercel 빌드 머신은 UTC라 한국 시간으로 바꿔 둔다. "2026-09-06 02:15" 꼴. */
const buildTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  dateStyle: "short",
  timeStyle: "short",
}).format(new Date());

export default defineConfig({
  // userDataPlugin: 설정을 data/userdata.json에 저장한다.
  //   브라우저를 지워도 남도록 진짜 저장은 파일에 하고 localStorage는 사본으로 쓴다.
  plugins: [react(), userDataPlugin()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion()),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
});
