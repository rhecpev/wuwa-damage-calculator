/**
 * 설정 저장.
 *
 * 내 컴퓨터에서 열면 **data/userdata.json**에, 배포본에서 열면 **그 브라우저**에 담는다.
 * 파일 담당은 개발/미리보기 서버에 붙은 미들웨어다(scripts/user-data-plugin.mjs).
 * 파일 쪽은 저장할 때마다 data/backups/에 스냅숏도 남는다.
 *
 * ── 저장할 곳을 스스로 고른다 ──────────────────────────────
 * 이 앱은 두 자리에서 열린다. 그래서 어디에 담을지도 두 갈래다.
 *
 *   file    개발/미리보기 서버가 붙어 있을 때(내 컴퓨터). data/userdata.json이 원본이다.
 *   browser 배포본을 열었을 때. 그 브라우저의 localStorage가 원본이다.
 *
 * 배포본에서 파일에 쓸 방법은 없다 — 브라우저는 마음대로 디스크를 만지지 못한다.
 * 그렇다고 아무 데도 안 담으면 탭을 닫는 순간 사라져서 쓸 수가 없으므로,
 * 서버가 없으면 브라우저 저장으로 **자동으로 넘어간다.** 사람이 고를 것은 없다.
 *
 * 어느 쪽이든 읽기는 memory에서 즉시 꺼낸다. 읽는 쪽(usePersistedState 등)은 화면을
 * 그리는 도중에 값을 달라고 하므로, 그 자리에서 네트워크를 기다릴 수 없기 때문이다.
 * 화면을 그리기 **전에** hydrate()가 골라낸 원본을 memory에 통째로 부어 넣는다.
 *
 * 저장 형식이 바뀌면 STORAGE_VERSION을 올린다. 버전이 다르면 읽지 않고 버려서
 * 옛 데이터가 새 코드로 흘러들어오는 걸 막는다.
 */
const STORAGE_VERSION = 1;
const PREFIX = "wuwa-calc";

const keyOf = (name: string) => `${PREFIX}:v${STORAGE_VERSION}:${name}`;
const isOurKey = (key: string) => key.startsWith(`${PREFIX}:`);

const STATE_URL = "/api/state";

/** 이 탭이 들고 있는 설정 전체. 화면은 늘 여기서 읽는다. */
const memory = new Map<string, string>();

/** 어디에 담고 있는지. hydrate()가 확인해서 정한다. */
export type StorageMode = "file" | "browser" | "none";
let mode: StorageMode = "none";
/** 파일에 올릴 것이 남았는지. 화면에 「저장 중」을 띄우는 데 쓴다. */
let dirty = false;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function subscribePersist(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 지금 어디에 담고 있는지 — 화면에 상태를 알려줄 때 쓴다. */
export const storageMode = (): StorageMode => mode;
export const isFileBacked = (): boolean => mode === "file";
/** 아직 파일에 못 올린 것이 있는지. 브라우저 저장은 즉시 쓰므로 늘 false다. */
export const persistPending = (): boolean => dirty;

export function loadPersisted<T>(name: string, fallback: T): T {
  const raw = memory.get(keyOf(name));
  if (raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // 깨진 값이면 조용히 기본값으로 되돌린다.
    return fallback;
  }
}

export function savePersisted<T>(name: string, value: T): void {
  try {
    memory.set(keyOf(name), JSON.stringify(value));
  } catch {
    return; // 순환 참조 등 — 저장 실패가 앱을 막지는 않게 한다
  }
  scheduleFileSave();
}

/** 우리 키만 모아 한 덩어리로. 파일에 통째로 넣고 통째로 꺼낸다. */
function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of memory) if (isOurKey(key)) out[key] = value;
  return out;
}

/**
 * 파일에 보내기. 저장이 잦아서(슬라이더를 끌면 계속 불린다) 조금 모았다가 한 번만 보낸다.
 * 창을 닫을 때 남아 있던 것은 pagehide에서 마저 보낸다.
 */
let timer: ReturnType<typeof setTimeout> | null = null;

function scheduleFileSave(): void {
  if (mode === "none") return;
  // 브라우저 저장은 값이 싸다 — 모으지 않고 그때그때 쓴다.
  if (mode === "browser") {
    writeBrowser();
    return;
  }
  dirty = true;
  notify();
  if (timer) clearTimeout(timer);
  timer = setTimeout(flushToFile, 400);
}

/** 브라우저 저장에 지금 내용을 반영한다. 키 하나하나를 그대로 옮긴다. */
function writeBrowser(): void {
  try {
    // 지운 키를 남기지 않도록 우리 키를 한 번 비우고 다시 채운다.
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && isOurKey(key) && !memory.has(key)) stale.push(key);
    }
    for (const key of stale) localStorage.removeItem(key);
    for (const [key, value] of memory) localStorage.setItem(key, value);
  } catch {
    // 용량 초과·시크릿 창 등 — 저장 실패가 앱을 막지는 않게 한다.
  }
}

export function flushToFile(): void {
  if (mode === "browser") {
    writeBrowser();
    return;
  }
  if (mode !== "file") return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  void fetch(STATE_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot()),
    keepalive: true, // 창이 닫히는 중에도 끝까지 보낸다
  })
    .then(() => {
      dirty = false;
      notify();
    })
    .catch(() => {
      // 서버가 끊겼으면 다음 저장 때 다시 시도한다 — dirty를 남겨 둔다.
    });
}

/**
 * 화면을 그리기 전에 한 번 부르는 것.
 *
 * 서버가 있으면 파일을, 없으면 브라우저 저장을 원본으로 잡고 memory에 부어 넣어
 * 아래의 동기 읽기가 그대로 성립하게 만든다.
 * 파일 쪽으로 잡혔을 때 브라우저에 사본이 남아 있으면, 파일로 옮긴 뒤 지운다
 * — 원본이 둘이면 어느 쪽이 최신인지 알 수 없어진다.
 */
export async function hydrate(): Promise<void> {
  const browser = readBrowser();

  let remote: Record<string, string> | null = null;
  try {
    const response = await fetch(STATE_URL);
    if (response.ok) remote = (await response.json()) as Record<string, string>;
  } catch {
    remote = null;
  }

  if (remote) {
    // ── 내 컴퓨터: 파일이 원본이다 ──
    mode = "file";
    const keys = Object.keys(remote).filter(isOurKey);
    if (keys.length === 0) {
      // 파일이 비었다(처음 켠 경우). 이 브라우저에 있던 것을 첫 내용으로 올린다.
      for (const [key, value] of Object.entries(browser)) memory.set(key, value);
      flushToFile();
    } else {
      memory.clear();
      for (const key of keys) memory.set(key, remote[key]);
    }
    // 파일을 쓰는 자리에서는 브라우저 사본을 남기지 않는다 — 원본이 둘이면 헷갈린다.
    clearBrowser();
  } else if (typeof localStorage !== "undefined") {
    // ── 배포본: 브라우저 저장이 원본이다 ──
    mode = "browser";
    for (const [key, value] of Object.entries(browser)) memory.set(key, value);
  } else {
    mode = "none";
  }

  window.addEventListener("pagehide", flushToFile);
}

/** 브라우저 저장에 든 우리 키를 읽어 온다. */
function readBrowser(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof localStorage === "undefined") return out;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !isOurKey(key)) continue;
      const value = localStorage.getItem(key);
      if (value !== null) out[key] = value;
    }
  } catch {
    // 시크릿 창 등에서 접근이 막히면 빈 채로 시작한다.
  }
  return out;
}

function clearBrowser(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && isOurKey(key)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // 접근이 막혔으면 그냥 둔다.
  }
}
