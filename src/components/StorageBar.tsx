import { useSyncExternalStore } from "react";
import { flushToFile, persistPending, storageMode, subscribePersist } from "../utils/persist";

/**
 * 화면 맨 위의 저장소 띠.
 *
 * 설정이 **어디에 저장되고 있는지**를 늘 보이게 한다.
 * 자리에 따라 담기는 곳이 달라서(내 컴퓨터면 파일, 배포본이면 브라우저),
 * 무엇을 믿고 써도 되는지 사람이 알아야 한다. 특히 브라우저 저장은
 * 「브라우저 데이터를 지우면 사라진다」는 한계가 있어 그걸 숨기면 안 된다.
 */
export function StorageBar() {
  const mode = useSyncExternalStore(subscribePersist, storageMode);
  const pending = useSyncExternalStore(subscribePersist, persistPending);

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

  if (mode === "browser") {
    return (
      <div className="storage-bar on">
        <b>이 브라우저에 저장 중</b>
        <span>
          바꾼 내용은 바로 저장되어 다음에 열 때 그대로 이어집니다. 다만 이 브라우저에만
          남으므로, 다른 기기·다른 브라우저에는 따라가지 않고 브라우저 데이터를 지우면
          사라집니다.
        </span>
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
