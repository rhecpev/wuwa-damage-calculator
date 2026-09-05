/**
 * 그림끼리 견주기 위한 「서명」.
 *
 * 디스코드 프로필 카드에는 **에코 이름도 화음 이름도 글자로 없다** — 그림뿐이다.
 * 그래서 글자를 읽는 대신 그림을 도감 아이콘과 견준다.
 * OpenCV 같은 것은 필요 없다. 카드가 게임이 찍어내는 고정 판이라 그림이 어느 사각형에
 * 그려지는지 이미 재 놨고(utils/ocr.ts의 자리표), 남는 일은 「잘라낸 그림이 도감의
 * 어느 것과 가장 닮았나」뿐이라서다.
 *
 * 자리가 이미 맞아 있으므로 **경계 상자를 다시 잡지 않는다.** 잡으면 오히려 틀린다 —
 * 카드에서 그림이 슬롯 가장자리까지 꽉 차 잘린 것처럼 보이는 데가 있어서, 보이는
 * 부분만으로 상자를 잡으면 도감 원본과 크기가 어긋난다. 실제 사진으로 견줘 본
 * 결과도 고정 사각형 쪽이 다섯 장 모두 맞았고 경계 상자 쪽은 셋뿐이었다.
 *
 * 이 파일은 **브라우저와 빌드 스크립트가 같이 쓴다**
 * (scripts/build-icon-signatures.mjs가 node의 타입 스트리핑으로 그대로 불러 쓴다).
 * 그래서 canvas·DOM에 기대지 않고 ImageData 모양의 자료만 받는다 —
 * 양쪽이 **글자 하나까지 같은 계산**을 해야 거리 비교가 뜻을 가진다.
 */

/** ImageData와 같은 모양. 브라우저는 ImageData를, 빌드 스크립트는 raw 덤프를 넘긴다. */
export interface Pixels {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

/** 격자 크기. 에코는 옆에 놓인 비슷한 짐승과 갈려야 해서 제일 촘촘하다. */
export const ECHO_GRID = { w: 16, h: 16 };
/** 화음 아이콘은 카드에서 49픽셀밖에 안 된다. 더 잘게 나눠 봐야 잡음만 는다. */
export const FETTER_GRID = { w: 12, h: 12 };
/** 캐릭터 반신 그림은 세로로 길다. */
export const CHARACTER_GRID = { w: 16, h: 17 };

/**
 * 카드가 캐릭터 반신 그림의 **위 몇 할까지 보여 주는지**.
 * 아래쪽은 공명 체인 별과 에코 카드가 덮어서 그림이 그대로 보이지 않는다.
 */
export const CHARACTER_TOP = 0.78;

export interface Grid {
  w: number;
  h: number;
}

/**
 * 에코·화음 아이콘 한 장의 서명 — 칸마다 RGB 한 벌.
 *
 * **평균 밝기로 나눈다.** 이것이 없으면 못 맞춘다 — 카드는 같은 그림을 도감보다
 * 훨씬 밝고 진하게 그려서, 색을 날것으로 견주면 「밝기가 비슷한 남」이 이겨 버린다.
 * 나눈 값(보통 1 언저리)에 64를 곱해 바이트로 담는다.
 */
export function artSignature(px: Pixels, grid: Grid): Uint8Array | null {
  const raw = new Float64Array(grid.w * grid.h * 3);
  let sum = 0;
  for (let gy = 0; gy < grid.h; gy += 1) {
    for (let gx = 0; gx < grid.w; gx += 1) {
      const sx = Math.floor(((gx + 0.5) * px.width) / grid.w);
      const sy = Math.floor(((gy + 0.5) * px.height) / grid.h);
      const i = (sy * px.width + sx) * 4;
      const o = (gy * grid.w + gx) * 3;
      raw[o] = px.data[i];
      raw[o + 1] = px.data[i + 1];
      raw[o + 2] = px.data[i + 2];
      sum += px.data[i] + px.data[i + 1] + px.data[i + 2];
    }
  }
  const mean = sum / raw.length;
  if (mean < 1) return null;
  const out = new Uint8Array(raw.length);
  for (let k = 0; k < raw.length; k += 1) out[k] = Math.min(255, Math.round((raw[k] / mean) * 64));
  return out;
}

/**
 * 캐릭터 반신 그림의 서명 — 칸마다 **RGB와 「그림이 덮은 비율」**을 같이 담는다.
 *
 * 아이콘과 달리 밝기 정규화가 아니라 덮은 비율을 쓴다. 아이콘은 그림이 네모를 거의
 * 채우지만 반신 그림은 절반이 빈 배경이고, 도감은 그 자리가 비어 있는데 카드는 짙은
 * 보라를 깔아 두기 때문이다. 그래서 **그림이 실제로 있는 칸끼리만** 견주려고 표시를 남긴다.
 * 반투명한 가장자리와 아주 어두운 곳(검은 머리)은 뺀다 — 카드에서는 배경과 구분되지 않는다.
 */
export function portraitSignature(px: Pixels, grid: Grid): Uint8Array {
  const out = new Uint8Array(grid.w * grid.h * 4);
  for (let gy = 0; gy < grid.h; gy += 1) {
    for (let gx = 0; gx < grid.w; gx += 1) {
      const x0 = Math.floor((gx * px.width) / grid.w);
      const x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * px.width) / grid.w));
      const y0 = Math.floor((gy * px.height) / grid.h);
      const y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * px.height) / grid.h));
      let r = 0;
      let g = 0;
      let b = 0;
      let on = 0;
      let all = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const i = (y * px.width + x) * 4;
          all += 1;
          if (px.data[i + 3] < 200) continue;
          if (px.data[i] + px.data[i + 1] + px.data[i + 2] < 60) continue;
          r += px.data[i];
          g += px.data[i + 1];
          b += px.data[i + 2];
          on += 1;
        }
      }
      const o = (gy * grid.w + gx) * 4;
      if (on > 0) {
        out[o] = Math.round(r / on);
        out[o + 1] = Math.round(g / on);
        out[o + 2] = Math.round(b / on);
      }
      out[o + 3] = all > 0 ? Math.round((on / all) * 255) : 0;
    }
  }
  return out;
}

/** 아이콘 서명 두 개가 얼마나 다른가. 작을수록 닮았다. */
export function artDistance(a: Uint8Array, b: Uint8Array): number {
  let sum = 0;
  for (let k = 0; k < a.length; k += 1) sum += Math.abs(a[k] - b[k]);
  return sum / a.length;
}

/**
 * 캐릭터 서명 거리. **도감 쪽이 「여기 그림이 있다」고 한 칸만** 견준다 —
 * 카드 쪽 배경은 도감에 아예 없는 색이라 넣어 봐야 잡음이다.
 */
export function portraitDistance(card: Uint8Array, candidate: Uint8Array): number {
  let sum = 0;
  let n = 0;
  for (let c = 0; c < candidate.length; c += 4) {
    if (candidate[c + 3] < 110) continue;
    sum +=
      Math.abs(card[c] - candidate[c]) +
      Math.abs(card[c + 1] - candidate[c + 1]) +
      Math.abs(card[c + 2] - candidate[c + 2]);
    n += 1;
  }
  // 그림이 몇 칸 없는 후보는 우연히 가까워 보이기 쉬워서 아예 후보로 치지 않는다.
  return n < 8 ? Infinity : sum / n;
}

export const encodeSignature = (sig: Uint8Array): string => {
  let s = "";
  for (const v of sig) s += String.fromCharCode(v);
  return btoa(s);
};

export const decodeSignature = (text: string): Uint8Array =>
  Uint8Array.from(atob(text), (ch) => ch.charCodeAt(0));

export interface MatchResult<T> {
  best: T;
  distance: number;
  /** 2등과의 거리 차이. 작으면 「비슷한 게 둘 있다」는 뜻이라 사람이 봐야 한다. */
  margin: number;
}

/** 후보 중 가장 닮은 하나를 고른다. 견줄 것이 없으면 undefined. */
export function pickClosest<T>(
  candidates: T[],
  distanceOf: (candidate: T) => number,
): MatchResult<T> | undefined {
  let best: T | undefined;
  let bestD = Infinity;
  let secondD = Infinity;
  for (const candidate of candidates) {
    const d = distanceOf(candidate);
    if (d < bestD) {
      secondD = bestD;
      bestD = d;
      best = candidate;
    } else if (d < secondD) {
      secondD = d;
    }
  }
  if (best === undefined || !Number.isFinite(bestD)) return undefined;
  return { best, distance: bestD, margin: Number.isFinite(secondD) ? secondD - bestD : Infinity };
}
