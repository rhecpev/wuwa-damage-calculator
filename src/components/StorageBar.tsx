import { useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  connectNewDisk,
  diskAvailable,
  diskFileName,
  diskNeedsPermission,
  disconnectDisk,
  flushToFile,
  openExistingDisk,
  persistFailed,
  persistPending,
  reconnectDisk,
  storageMode,
  subscribePersist,
} from "../utils/persist";
import { Dialog } from "./Feedback";

/**
 * 첫 접속 때 「파일로 저장할지」 묻는 창을 다시 띄우지 않을지.
 * 「나중에 하기」를 누르면 브라우저 저장소의 laterSaveFile 칸에 "y"를 넣는다.
 * 설정 저장(persist)의 키 규칙(wuwa-calc:…) 밖에 두어, 저장본을 갈아 끼우거나 파일을 열어도 지워지지 않는다.
 */
const LATER_KEY = "laterSaveFile";
const readLater = (): boolean => {
  try {
    return localStorage.getItem(LATER_KEY) === "y";
  } catch {
    return false;
  }
};
const writeLater = () => {
  try {
    localStorage.setItem(LATER_KEY, "y");
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 닫힌다.
  }
};

/** 저장 단추 아이콘 — 탭 아이콘과 같은 굵기의 선 아이콘. */
const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const SAVE_ICON = icon(
  <>
    <path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
    <path d="M8 3v5h7V3M8 21v-7h8v7" />
  </>,
);
const OPEN_ICON = icon(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H7.5a2 2 0 0 0-1.9 1.4L3 19zM3 19l2.6-7.6A2 2 0 0 1 7.5 10H22l-2.8 8.1A2 2 0 0 1 17.3 19z" />);
const LINK_ICON = icon(
  <>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </>,
);
const UNLINK_ICON = icon(
  <>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-3-8.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 3 8.5" />
    <path d="M4 4l16 16" />
  </>,
);

/**
 * 위 막대 오른쪽 끝의 저장 상태.
 *
 * 점 하나로 저장이 되고 있는지만 알린다 — 파란 점은 저장 중, 빨간 점은 저장이 안 되거나
 * 마지막 저장이 실패한 것. 어디에 담기는지 같은 자세한 말은 점에 마우스를 올리면 나온다.
 * 점 오른쪽에 파일로 저장하기 · 저장해 둔 파일 열기 단추를 아이콘으로 둔다.
 *
 * 자리에 따라 담기는 곳이 달라서(개발 서버면 파일, 배포본이면 브라우저나 고른 파일)
 * 단추가 하는 일도 달라진다. 브라우저 저장은 데이터를 지우면 사라지므로 파일로 옮기는 단추를 늘 내민다.
 */
export function StorageBar() {
  const mode = useSyncExternalStore(subscribePersist, storageMode);
  const pending = useSyncExternalStore(subscribePersist, persistPending);
  const failed = useSyncExternalStore(subscribePersist, persistFailed);
  const fileName = useSyncExternalStore(subscribePersist, diskFileName);
  const needsPermission = useSyncExternalStore(subscribePersist, diskNeedsPermission);
  const [busy, setBusy] = useState(false);
  // 첫 접속 안내 — 「나중에 하기」를 누른 적이 없을 때만. 바깥을 눌러 닫으면 이번 화면에서만 닫힌다.
  const [askClosed, setAskClosed] = useState(readLater);

  /**
   * 파일을 고르는 동안 단추를 잠근다. 파일에서 읽어 온 내용으로 갈아치우는 경우
   * (열기 · 다시 연결) 이미 그려진 화면은 옛 값을 들고 있으므로 새로 고쳐야 한다.
   */
  const run = (task: () => Promise<boolean>, reloadOnSuccess: boolean) => async () => {
    setBusy(true);
    try {
      if ((await task()) && reloadOnSuccess) location.reload();
    } finally {
      setBusy(false);
    }
  };

  /**
   * 파일 저장을 권하는 자리 — 배포본에서 아직 브라우저에만 담고 있고, 파일을 고를 수 있는 브라우저일 때.
   * 전에 골라 둔 파일이 있으면(needsPermission) 새로 만들 게 아니라 다시 연결하면 되므로 묻지 않는다.
   */
  const askSave = !askClosed && mode === "browser" && diskAvailable() && !needsPermission;

  const ok = mode !== "none" && !failed;
  const state = pending ? "쓰는 중…" : "최신 상태";
  const detail =
    mode === "file"
      ? `이 컴퓨터에 저장 중 — data/userdata.json · ${state}. 저장할 때마다 data/backups/에 스냅숏이 남습니다.`
      : mode === "disk"
        ? `이 컴퓨터의 파일에 저장 중 — 「${fileName}」 · ${state}. 브라우저 데이터를 지워도 이 파일을 다시 고르면 이어집니다.`
        : mode === "browser"
          ? `이 브라우저에 저장 중 — 브라우저 데이터를 지우거나 다른 브라우저로 열면 사라집니다.${
              needsPermission ? " 전에 골라 둔 파일이 있습니다 — 다시 연결하면 그쪽을 씁니다." : ""
            }`
          : "저장 안 됨 — 시크릿 창이거나 브라우저가 저장을 막고 있습니다. 탭을 닫으면 사라집니다.";

  return (
    <div className="storage-status">
      {askSave && (
        <Dialog
          title="설정을 파일로 저장할까요?"
          lines={[
            "지금은 이 브라우저에만 저장되고 있습니다. 브라우저 데이터를 지우거나 다른 브라우저로 열면 캐릭터 · 무기 · 에코 · 사이클이 모두 사라집니다.",
            "이 컴퓨터에 파일 하나를 만들어 두면 바꾼 내용이 그 파일에 바로바로 저장되고, 나중에 그 파일을 다시 고르면 그대로 이어집니다.",
            "나중에 하려면 오른쪽 위 저장 아이콘을 누르세요.",
          ]}
          buttons={[
            {
              label: "저장하기",
              primary: true,
              onClick: async () => {
                setBusy(true);
                try {
                  if (await connectNewDisk()) setAskClosed(true);
                } finally {
                  setBusy(false);
                }
              },
            },
            {
              label: "나중에 하기",
              onClick: () => {
                writeLater();
                setAskClosed(true);
              },
            },
          ]}
          onDismiss={() => setAskClosed(true)}
        />
      )}

      <span
        className={ok ? "storage-dot on" : "storage-dot off"}
        role="status"
        aria-label={ok ? "저장 중" : "저장 안 됨"}
        title={failed ? `마지막 저장이 실패했습니다. ${detail}` : detail}
      />

      {/* 파일로 저장 — 개발 서버 · 고른 파일이면 지금 바로 쓰고, 브라우저 저장이면 새 파일을 만들어 옮긴다. */}
      {mode === "file" || mode === "disk" ? (
        <button className="storage-icon" title="지금 저장" aria-label="지금 저장" onClick={() => flushToFile()}>
          {SAVE_ICON}
        </button>
      ) : (
        diskAvailable() && (
          <button
            className="storage-icon"
            title="이 컴퓨터 파일에 저장하기"
            aria-label="이 컴퓨터 파일에 저장하기"
            disabled={busy}
            onClick={run(connectNewDisk, false)}
          >
            {SAVE_ICON}
          </button>
        )
      )}

      {diskAvailable() && mode !== "file" && (
        <button
          className="storage-icon"
          title={mode === "disk" ? "다른 파일 열기" : "저장해 둔 파일 열기"}
          aria-label="저장해 둔 파일 열기"
          disabled={busy}
          onClick={run(openExistingDisk, true)}
        >
          {OPEN_ICON}
        </button>
      )}

      {mode === "browser" && needsPermission && (
        <button
          className="storage-icon"
          title="전에 골라 둔 파일 다시 연결"
          aria-label="파일 다시 연결"
          disabled={busy}
          onClick={run(reconnectDisk, true)}
        >
          {LINK_ICON}
        </button>
      )}

      {mode === "disk" && (
        <button
          className="storage-icon"
          title="파일 연결 끊기 — 파일은 그대로 두고 이 브라우저 저장으로 돌아갑니다"
          aria-label="파일 연결 끊기"
          disabled={busy}
          onClick={run(async () => {
            await disconnectDisk();
            return false;
          }, false)}
        >
          {UNLINK_ICON}
        </button>
      )}
    </div>
  );
}
