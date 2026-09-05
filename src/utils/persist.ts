import {
  ensurePermission,
  forgetHandle,
  pickExistingFile,
  pickNewFile,
  readFile,
  readSavedHandle,
  rememberHandle,
  supportsDisk,
  writeFile,
  type DiskFileHandle,
} from "./diskStore";

/**
 * 설정 저장.
 *
 * ── 담을 곳을 스스로 고른다 ──────────────────────────────────
 * 이 앱은 여러 자리에서 열린다. 그래서 어디에 담을지도 갈래가 넷이다.
 *   file    개발/미리보기 서버가 붙어 있을 때(내 컴퓨터). data/userdata.json이 원본.
 *   disk    배포본인데 사람이 이 컴퓨터의 파일을 한 번 골라 둔 경우. 그 파일이 원본.
 *   browser 배포본이고 고른 파일이 없을 때. 그 브라우저의 localStorage가 원본.
 *   none    저장할 곳을 아예 못 찾았을 때(시크릿 창 등).
 *
 * 사람이 고를 것은 disk 하나뿐이고, 나머지는 알아서 정해진다.
 *
 * ── 왜 disk가 필요한가 ───────────────────────────────────────
 * 배포본이 쓸 수 있는 건 원래 브라우저 저장뿐인데, 그건 브라우저 데이터를 지우거나
 * 브라우저를 갈아타면 같이 사라진다. 같은 컴퓨터에서 접속했는데 아무것도 없는 상태가 된다.
 * 그래서 하드의 파일 하나에 허락을 받아 두고 그쪽을 원본으로 삼는다(utils/diskStore.ts).
 *
 * disk일 때도 브라우저 사본을 **지우지 않고 같이 남긴다.** 파일 쪽 허락은 언제든 끊길 수 있고
 * (브라우저 데이터를 지우면 손잡이가 사라진다), 그때 기댈 곳이 있어야 하기 때문이다.
 * 둘이 어긋나면 언제나 파일이 이긴다 — 다른 브라우저에서 고친 것이 파일에 들어 있다.
 * 반대로 개발 서버(file)일 때는 브라우저 사본을 지운다. 그 자리에선 원본이 하나여야 헷갈리지 않는다.
 *
 * 어느 쪽이든 읽기는 memory에서 즉시 꺼낸다. 읽는 쪽(usePersistedState 등)은 화면을
 * 그리는 도중에 값을 달라고 하므로, 그 자리에서 네트워크나 파일을 기다릴 수 없기 때문이다.
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
export type StorageMode = "file" | "disk" | "browser" | "none";
let mode: StorageMode = "none";
/** 아직 원본에 못 올린 것이 있는지. 화면에 「저장 중」을 띄우는 데 쓴다. */
let dirty = false;
/**
 * hydrate()가 끝났는지. 그 전에 읽으면 저장값이 아니라 기본값이 돌아간다 —
 * 그렇게 읽힌 값을 그대로 되저장하면 원래 자료를 덮어쓰므로, 개발 중에 바로 알아채게 한다.
 */
let hydrated = false;

/** 고른 파일. disk일 때만 들어 있다. */
let handle: DiskFileHandle | null = null;
/**
 * 파일을 골라 둔 적은 있는데 지금은 쓸 수 없는 상태.
 * 브라우저를 다시 켠 뒤에는 사람이 한 번 눌러 줘야 허락이 되살아나므로,
 * 화면에 「다시 연결」 버튼을 띄우려고 따로 들고 있는다.
 */
let needsPermission = false;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function subscribePersist(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 지금 어디에 담고 있는지 — 화면에 상태를 알려줄 때 쓴다. */
export const storageMode = (): StorageMode => mode;
export const isFileBacked = (): boolean => mode === "file" || mode === "disk";
/** 아직 원본에 못 올린 것이 있는지. */
export const persistPending = (): boolean => dirty;

/** 이 브라우저가 하드의 파일에 쓸 수 있는지(크롬 계열 데스크톱). */
export const diskAvailable = (): boolean => supportsDisk();
/** 고른 파일 이름. 없으면 null. */
export const diskFileName = (): string | null => handle?.name ?? null;
/** 파일을 골라 둔 적은 있지만 지금은 허락이 필요한 상태인지. */
export const diskNeedsPermission = (): boolean => needsPermission;

export function loadPersisted<T>(name: string, fallback: T): T {
  if (!hydrated && import.meta.env.DEV) {
    // 모듈이 뜨는 자리에서 읽는 스토어가 새로 생겼다는 뜻이다(main.tsx의 설명 참고).
    console.warn(
      `[persist] hydrate() 전에 "${name}"을 읽었습니다 — 저장값 대신 기본값이 돌아갑니다.`,
    );
  }
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
  scheduleSave();
}

/** 우리 키만 모아 한 덩어리로. 원본에 통째로 넣고 통째로 꺼낸다. */
function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of memory) if (isOurKey(key)) out[key] = value;
  return out;
}

/** 받은 한 덩어리를 memory에 앉힌다. 우리 키만 골라 담고, 담을 것이 있었는지 알려준다. */
function fill(data: Record<string, string>): number {
  const keys = Object.keys(data).filter(isOurKey);
  if (keys.length === 0) return 0;
  memory.clear();
  for (const key of keys) memory.set(key, data[key]);
  return keys.length;
}

/**
 * 원본에 올리기. 저장이 잦아서(슬라이더를 끌면 계속 불린다) 조금 모았다가 한 번만 보낸다.
 * 창을 닫을 때 남아 있던 것은 pagehide에서 마저 보낸다.
 */
let timer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (mode === "none") return;

  // 브라우저 저장은 값이 싸고 **동기**다. disk일 때도 함께 써 둔다 —
  // 파일 쪽 허락이 끊기거나 창이 갑자기 닫혀 파일 쓰기가 못 끝나도 여기 남아 있게 된다.
  if (mode === "browser" || mode === "disk") writeBrowser();
  if (mode === "browser") return;

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

/** 모아 둔 것을 지금 원본에 올린다. 화면의 「지금 저장」도 이걸 부른다. */
export function flushToFile(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  if (mode === "browser") {
    writeBrowser();
    return;
  }

  if (mode === "disk") {
    if (!handle) return;
    void writeFile(handle, snapshot()).then((ok) => {
      if (ok) {
        dirty = false;
      } else {
        // 파일이 지워졌거나 옮겨졌다. 브라우저 사본으로 물러나고 다시 고르라고 알린다.
        mode = "browser";
        needsPermission = true;
      }
      notify();
    });
    return;
  }

  if (mode !== "file") return;
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
 * 개발 서버 → 골라 둔 파일 → 브라우저 순으로 원본을 찾아 memory에 부어 넣어,
 * 아래의 동기 읽기가 그대로 성립하게 만든다.
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
    // ── 내 컴퓨터: 개발 서버가 붙은 파일이 원본 ──
    mode = "file";
    if (fill(remote) === 0) {
      // 파일이 비었다(처음 켠 경우). 이 브라우저에 있던 것을 첫 내용으로 올린다.
      for (const [key, value] of Object.entries(browser)) memory.set(key, value);
      flushToFile();
    }
    // 이 자리에서는 브라우저 사본을 남기지 않는다 — 원본이 둘이면 헷갈린다.
    clearBrowser();
  } else if (typeof localStorage !== "undefined") {
    // ── 배포본 ──
    // 일단 브라우저 사본을 깔아 둔다. 골라 둔 파일이 있으면 그 위를 덮어쓴다.
    for (const [key, value] of Object.entries(browser)) memory.set(key, value);
    mode = "browser";
    await adoptSavedHandle(browser);
  } else {
    mode = "none";
  }

  hydrated = true;
  window.addEventListener("pagehide", flushToFile);
}

/**
 * 전에 골라 둔 파일이 있으면 그쪽을 원본으로 삼는다.
 *
 * 여기서는 허락을 **묻지 않는다.** 화면을 그리기 전이라 사람이 누른 것이 없고,
 * 그런 자리에서 부른 requestPermission은 브라우저가 창을 띄워 주지 않기 때문이다.
 * 확인만 해 보고 안 되면 needsPermission을 세워 화면이 「다시 연결」을 내밀게 한다.
 */
async function adoptSavedHandle(browser: Record<string, string>): Promise<void> {
  if (!supportsDisk()) return;
  const saved = await readSavedHandle();
  if (!saved) return;

  if (!(await ensurePermission(saved, false))) {
    needsPermission = true;
    return;
  }

  handle = saved;
  mode = "disk";
  needsPermission = false;

  const data = await readFile(saved);
  if (fill(data) === 0) {
    // 파일이 비어 있으면 이 브라우저에 있던 것을 첫 내용으로 올린다.
    for (const [key, value] of Object.entries(browser)) memory.set(key, value);
    flushToFile();
  }
  notify();
}

// ── 사람이 누르는 자리 ───────────────────────────────────────

/**
 * 새 파일을 만들어 지금 내용을 옮긴다.
 * 지금 화면에 있는 것이 그대로 파일이 되므로 화면을 다시 그릴 필요가 없다.
 */
export async function connectNewDisk(): Promise<boolean> {
  const picked = await pickNewFile();
  if (!picked) return false;
  if (!(await ensurePermission(picked, true))) return false;

  handle = picked;
  mode = "disk";
  needsPermission = false;
  await rememberHandle(picked);
  const ok = await writeFile(picked, snapshot());
  notify();
  return ok;
}

/**
 * 전에 만들어 둔 파일을 골라 그 내용으로 되돌린다.
 * memory를 통째로 갈아치우는 일이라, 이미 그려진 화면과 어긋나지 않도록 부른 쪽에서 새로 고친다.
 */
export async function openExistingDisk(): Promise<boolean> {
  const picked = await pickExistingFile();
  if (!picked) return false;
  if (!(await ensurePermission(picked, true))) return false;

  handle = picked;
  mode = "disk";
  needsPermission = false;
  await rememberHandle(picked);

  const data = await readFile(picked);
  if (fill(data) === 0) await writeFile(picked, snapshot());
  else writeBrowser(); // 사본도 새 내용으로 맞춰 둔다
  notify();
  return true;
}

/** 골라 둔 파일에 허락만 다시 받는다. 브라우저를 새로 켠 뒤 한 번 눌러 주면 된다. */
export async function reconnectDisk(): Promise<boolean> {
  const saved = await readSavedHandle();
  if (!saved) return false;
  if (!(await ensurePermission(saved, true))) return false;

  handle = saved;
  mode = "disk";
  needsPermission = false;

  const data = await readFile(saved);
  if (fill(data) === 0) await writeFile(saved, snapshot());
  else writeBrowser();
  notify();
  return true;
}

/** 파일 연결을 끊는다. 파일 자체는 그대로 두고 이 브라우저에서만 손을 뗀다. */
export async function disconnectDisk(): Promise<void> {
  await forgetHandle();
  handle = null;
  needsPermission = false;
  mode = typeof localStorage !== "undefined" ? "browser" : "none";
  writeBrowser(); // 브라우저 사본을 지금 내용으로 맞춰 두고 물러난다
  notify();
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
