/**
 * 도감 그림의 「서명」을 미리 뽑아 src/data/iconSignatures.json으로 저장한다.
 *
 * 디스코드 프로필 카드에는 에코 이름도 화음 이름도 글자로 없어서 그림으로 알아내야
 * 하는데(utils/iconSignature.ts 설명 참고), 도감 그림 388장을 브라우저가 그때마다
 * 내려받으면 20MB가 넘는다. 그래서 서명만 미리 뽑아 둔다 — 결과는 400KB쯤이고
 * 실행할 때는 카드에서 잘라 낸 일곱 장만 계산하면 된다.
 *
 * 준비 (한 번만):
 *   1. 도감 그림 내려받기 — node scripts/fetch-catalog-art.mjs
 *   2. webp를 raw로 풀기  — powershell -File scripts/dump-catalog.ps1   (WIC이 webp를 읽는다)
 *   3. 이 스크립트         — node scripts/build-icon-signatures.mjs
 *
 * 서명 계산은 브라우저와 **똑같은 코드**를 쓴다(src/utils/iconSignature.ts).
 * node가 .ts를 그대로 불러 준다(24부터 기본). 계산이 한 줄이라도 갈리면
 * 거리 비교가 통째로 무의미해지므로 절대 베껴 쓰지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import {
  CHARACTER_GRID,
  ECHO_GRID,
  FETTER_GRID,
  artSignature,
  encodeSignature,
  portraitSignature,
} from "../src/utils/iconSignature.ts";

const RAW = "tmp/raw";
const OUT = "src/data/iconSignatures.json";

/** dump-raw.ps1은 윈도 기본 순서인 BGRA로 쓴다. ImageData는 RGBA라서 뒤집어 준다. */
function readPixels(file, width, height) {
  const buf = fs.readFileSync(file);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = buf[i + 2];
    data[i + 1] = buf[i + 1];
    data[i + 2] = buf[i];
    data[i + 3] = buf[i + 3];
  }
  return { data, width, height };
}

const listRaw = (dir) =>
  fs.existsSync(path.join(RAW, dir))
    ? fs.readdirSync(path.join(RAW, dir)).filter((f) => f.endsWith(".raw"))
    : [];

const build = (dir, w, h, grid, sign) => {
  const out = {};
  for (const f of listRaw(dir)) {
    const sig = sign(readPixels(path.join(RAW, dir, f), w, h), grid);
    if (sig) out[f.replace(".raw", "")] = encodeSignature(sig);
  }
  return out;
};

const echo = build("echo", 64, 64, ECHO_GRID, artSignature);
const fetter = build("fetter", 64, 64, FETTER_GRID, artSignature);
const character = build("char", 174, 187, CHARACTER_GRID, portraitSignature);

fs.writeFileSync(OUT, JSON.stringify({ echo, fetter, character }));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(
  `${OUT}: echo ${Object.keys(echo).length} · fetter ${Object.keys(fetter).length} · character ${Object.keys(character).length}  (${kb}KB)`,
);
