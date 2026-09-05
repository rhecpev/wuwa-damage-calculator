import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 저장된 설정을 **디스크 파일에 두는** Vite 플러그인.
 *
 * 브라우저 localStorage만 쓰면 시크릿 창 · 브라우저 데이터 삭제 · 브라우저 재설치 한 번에
 * 그동안 등록한 에코 · 무기 · 캐릭터 설정이 통째로 사라진다. 그래서 진짜 저장은 파일에 하고,
 * localStorage는 그 사본(캐시)으로만 쓴다.
 *
 *   data/userdata.json          지금 상태
 *   data/backups/userdata-*.json 저장할 때마다 남기는 스냅숏(최근 것만 남기고 정리)
 *
 * 개발 서버(vite)와 미리보기 서버(vite preview) 양쪽에 같은 두 엔드포인트를 붙인다.
 *   GET  /api/state  파일 내용을 그대로 돌려준다. 없으면 {}
 *   PUT  /api/state  받은 것을 통째로 파일에 쓴다
 *
 * 서버 없이 정적으로 열었을 때(빌드 결과만 띄운 경우)는 두 요청이 실패하는데,
 * 그때는 화면이 조용히 localStorage만 쓰도록 되어 있다(src/utils/persist.ts).
 */

/** 남겨둘 백업 개수. 넘으면 오래된 것부터 지운다. */
const KEEP_BACKUPS = 20;

export function userDataPlugin() {
  let dir = "";
  let file = "";
  let backupDir = "";

  const ensure = () => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  };

  const read = () => {
    if (!existsSync(file)) return "{}";
    try {
      return readFileSync(file, "utf-8") || "{}";
    } catch {
      return "{}";
    }
  };

  /**
   * 새로 쓰기 전에 지금 파일을 백업으로 넘긴다.
   * 잘못된 값이 한 번 덮어써도 직전 상태로 되돌릴 수 있게 하려는 것이다.
   */
  const backup = () => {
    if (!existsSync(file)) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    try {
      writeFileSync(resolve(backupDir, `userdata-${stamp}.json`), readFileSync(file));
    } catch {
      return; // 백업 실패가 저장을 막지는 않게 한다
    }

    const olds = readdirSync(backupDir)
      .filter((name) => name.startsWith("userdata-"))
      .sort();
    for (const name of olds.slice(0, Math.max(0, olds.length - KEEP_BACKUPS))) {
      try {
        rmSync(resolve(backupDir, name));
      } catch {
        // 지우기 실패는 무시
      }
    }
  };

  /** 임시 파일에 먼저 쓰고 옮긴다 — 쓰는 도중에 죽어도 파일이 반쯤 남지 않는다. */
  const write = (body) => {
    ensure();
    backup();
    const temp = `${file}.tmp`;
    writeFileSync(temp, body, "utf-8");
    renameSync(temp, file);
  };

  const middleware = (req, res, next) => {
    if (!req.url || !req.url.startsWith("/api/state")) return next();

    if (req.method === "GET") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(read());
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          JSON.parse(body); // 깨진 값이면 파일을 건드리지 않는다
          write(body);
          res.statusCode = 204;
          res.end();
        } catch {
          res.statusCode = 400;
          res.end('{"error":"invalid json"}');
        }
      });
      return;
    }

    next();
  };

  return {
    name: "wuwa-user-data",
    configResolved(config) {
      dir = resolve(config.root, "data");
      file = resolve(dir, "userdata.json");
      backupDir = resolve(dir, "backups");
    },
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
