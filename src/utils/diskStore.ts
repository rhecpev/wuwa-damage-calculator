/**
 * 이 컴퓨터의 **진짜 파일**에 설정을 두기 위한 밑바탕.
 *
 * 배포본은 브라우저 저장(localStorage)밖에 못 쓰는데, 그건 브라우저 데이터를 지우거나
 * 브라우저를 갈아타면 같이 사라진다. 같은 컴퓨터에서 접속했는데 아무것도 없는 상태가 된다.
 *
 * 그래서 브라우저에게 「이 파일에 써도 된다」는 허락을 한 번 받아 두고, 그 뒤로는 그 파일을
 * 원본으로 삼는다(File System Access API). 파일은 하드에 그대로 있으므로
 *   · 브라우저 데이터를 지워도          파일은 남는다
 *   · 브라우저를 지웠다 다시 깔아도     파일은 남는다
 *   · 다른 브라우저로 열어도            같은 파일을 고르면 그대로 이어진다
 *
 * ── 허락은 어디에 남는가 ─────────────────────────────────────
 * 고른 파일을 가리키는 손잡이(FileSystemFileHandle)는 글자로 바꿀 수 없어서 localStorage에
 * 담지 못한다. 대신 IndexedDB에 통째로 담는다(구조적 복제가 되는 값이라 가능하다).
 * 브라우저 데이터를 지우면 이 손잡이도 같이 사라지지만, **파일은 남아 있으므로**
 * 「저장해 둔 파일 열기」로 한 번 다시 고르면 그대로 돌아온다.
 *
 * ── 되는 브라우저 ────────────────────────────────────────────
 * 크롬 계열(크롬 · 엣지 · 웨일) 데스크톱에서 된다. 파이어폭스 · 사파리 · 모바일은 아직
 * 이 API가 없어서, 그쪽에서는 지금까지처럼 브라우저 저장으로 남는다(supportsDisk()로 가른다).
 */

/** 파일 하나를 가리키는 손잡이. 표준 타입이 아직 lib.dom에 없어 필요한 만큼만 적는다. */
export interface DiskFileHandle {
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  queryPermission(options: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission(options: { mode: "read" | "readwrite" }): Promise<PermissionState>;
}

interface PickerType {
  description?: string;
  accept: Record<string, string[]>;
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: PickerType[];
    }) => Promise<DiskFileHandle>;
    showOpenFilePicker?: (options?: {
      types?: PickerType[];
      multiple?: boolean;
    }) => Promise<DiskFileHandle[]>;
  }
}

const FILE_TYPES: PickerType[] = [
  { description: "명조 계산기 저장 파일", accept: { "application/json": [".json"] } },
];

/** 처음 만들 때 권하는 이름. 개발 서버가 쓰는 data/userdata.json과 같은 형식이라 서로 옮겨 쓸 수 있다. */
export const SUGGESTED_NAME = "wuwa-calc-userdata.json";

export const supportsDisk = (): boolean =>
  typeof window !== "undefined" && typeof window.showSaveFilePicker === "function";

// ── 손잡이 보관 (IndexedDB) ──────────────────────────────────

const DB_NAME = "wuwa-calc";
const DB_VERSION = 1;
const STORE = "handles";
const HANDLE_KEY = "userdata";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** IndexedDB 한 칸을 읽고 쓴다. 실패는 「없음」으로 본다 — 저장은 부가 기능이지 앱을 막을 일이 아니다. */
function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  return openDb()
    .then(
      (db) =>
        new Promise<T | undefined>((resolve) => {
          const request = run(db.transaction(STORE, mode).objectStore(STORE));
          request.onsuccess = () => resolve(request.result as T);
          request.onerror = () => resolve(undefined);
        }),
    )
    .catch(() => undefined);
}

export const readSavedHandle = (): Promise<DiskFileHandle | undefined> =>
  withStore<DiskFileHandle>("readonly", (store) => store.get(HANDLE_KEY));

export const rememberHandle = (handle: DiskFileHandle): Promise<unknown> =>
  withStore("readwrite", (store) => store.put(handle, HANDLE_KEY));

export const forgetHandle = (): Promise<unknown> =>
  withStore("readwrite", (store) => store.delete(HANDLE_KEY));

// ── 파일 고르기 · 읽기 · 쓰기 ────────────────────────────────

/** 새 파일을 만든다. 어디에 둘지는 사람이 고른다(내려받기 폴더든 클라우드 동기화 폴더든). */
export async function pickNewFile(): Promise<DiskFileHandle | null> {
  if (!window.showSaveFilePicker) return null;
  try {
    return await window.showSaveFilePicker({ suggestedName: SUGGESTED_NAME, types: FILE_TYPES });
  } catch {
    return null; // 사람이 창을 닫았다 — 아무 일도 없었던 것으로 둔다
  }
}

/** 전에 만들어 둔 파일을 고른다. 브라우저를 갈아탔거나 데이터를 지운 뒤 되찾는 길이다. */
export async function pickExistingFile(): Promise<DiskFileHandle | null> {
  if (!window.showOpenFilePicker) return null;
  try {
    const [handle] = await window.showOpenFilePicker({ types: FILE_TYPES, multiple: false });
    return handle ?? null;
  } catch {
    return null;
  }
}

/**
 * 이 손잡이를 지금 써도 되는지.
 * ask가 false면 묻지 않고 확인만 한다 — 화면을 그리기 전에는 사람이 누른 것이 없어서
 * 브라우저가 물어보는 창을 띄워 주지 않기 때문이다. 버튼을 눌러 들어온 자리에서만 ask를 켠다.
 */
export async function ensurePermission(handle: DiskFileHandle, ask: boolean): Promise<boolean> {
  try {
    if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
    if (!ask) return false;
    return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
}

/** 파일 내용을 통째로 꺼낸다. 비었거나 깨졌으면 빈 것으로 본다. */
export async function readFile(handle: DiskFileHandle): Promise<Record<string, string>> {
  try {
    const text = await (await handle.getFile()).text();
    if (!text.trim()) return {};
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

/** 파일에 통째로 쓴다. 성공 여부를 돌려준다 — 실패하면 화면이 「연결이 끊겼다」로 돌아가야 한다. */
export async function writeFile(handle: DiskFileHandle, data: Record<string, string>): Promise<boolean> {
  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}
