import { useState, useSyncExternalStore } from "react";
import {
  connectNewDisk,
  diskAvailable,
  diskFileName,
  diskNeedsPermission,
  disconnectDisk,
  flushToFile,
  openExistingDisk,
  persistPending,
  reconnectDisk,
  storageMode,
  subscribePersist,
} from "../utils/persist";

/**
 * 화면 맨 위의 저장소 띠.
 *
 * 설정이 **어디에 저장되고 있는지**를 늘 보이게 한다.
 * 자리에 따라 담기는 곳이 달라서(개발 서버면 파일, 배포본이면 브라우저나 고른 파일),
 * 무엇을 믿고 써도 되는지 사람이 알아야 한다.
 *
 * 특히 브라우저 저장은 「브라우저 데이터를 지우면 사라진다」는 한계가 있다. 그걸 숨기지 않고,
 * 대신 그 자리에서 바로 하드의 파일로 옮겨 갈 수 있는 버튼을 함께 내민다.
 */
export function StorageBar() {
  const mode = useSyncExternalStore(subscribePersist, storageMode);
  const pending = useSyncExternalStore(subscribePersist, persistPending);
  const fileName = useSyncExternalStore(subscribePersist, diskFileName);
  const needsPermission = useSyncExternalStore(subscribePersist, diskNeedsPermission);
  const [busy, setBusy] = useState(false);

  /**
   * 파일을 고르는 동안 버튼을 잠근다. 파일에서 읽어 온 내용으로 갈아치우는 경우
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

  if (mode === "file") {
    return (
      <div className="storage-bar on">
        <b>이 컴퓨터에 저장 중</b>
        <span>
          data/userdata.json · {pending ? "쓰는 중…" : "최신 상태입니다."} 저장할 때마다
          data/backups/에 스냅숏이 남습니다.
        </span>
        <span className="storage-bar-actions">
          <button onClick={() => flushToFile()}>지금 저장</button>
        </span>
      </div>
    );
  }

  if (mode === "disk") {
    return (
      <div className="storage-bar on">
        <b>이 컴퓨터의 파일에 저장 중</b>
        <span>
          「{fileName}」 · {pending ? "쓰는 중…" : "최신 상태입니다."} 브라우저 데이터를 지우거나
          다른 브라우저로 열어도, 이 파일을 다시 고르면 그대로 이어집니다.
        </span>
        <span className="storage-bar-actions">
          <button onClick={() => flushToFile()}>지금 저장</button>
          <button disabled={busy} onClick={run(openExistingDisk, true)}>
            다른 파일 열기
          </button>
          <button
            disabled={busy}
            onClick={run(async () => {
              await disconnectDisk();
              return false;
            }, false)}
          >
            연결 끊기
          </button>
        </span>
      </div>
    );
  }

  if (mode === "browser") {
    return (
      <div className="storage-bar on">
        <b>이 브라우저에 저장 중</b>
        <span>
          바꾼 내용은 바로 저장되어 다음에 열 때 그대로 이어집니다. 다만{" "}
          <b>브라우저 데이터를 지우거나 다른 브라우저로 열면 사라집니다.</b>
          {diskAvailable()
            ? needsPermission
              ? " 전에 골라 둔 파일이 있습니다 — 다시 연결하면 그쪽을 씁니다."
              : " 이 컴퓨터의 파일에 저장해 두면 그런 일이 없습니다."
            : " 크롬·엣지에서 열면 이 컴퓨터의 파일에 저장할 수 있습니다."}
        </span>
        {diskAvailable() && (
          <span className="storage-bar-actions">
            {needsPermission && (
              <button disabled={busy} onClick={run(reconnectDisk, true)}>
                파일 다시 연결
              </button>
            )}
            <button disabled={busy} onClick={run(connectNewDisk, false)}>
              이 컴퓨터 파일에 저장하기
            </button>
            <button disabled={busy} onClick={run(openExistingDisk, true)}>
              저장해 둔 파일 열기
            </button>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="storage-bar warn">
      <b>저장 안 됨</b>
      <span>
        저장할 곳을 찾지 못했습니다(시크릿 창이거나 브라우저가 저장을 막고 있습니다).
        지금 바꾸는 내용은 <b>탭을 닫으면 사라집니다.</b>
      </span>
    </div>
  );
}
