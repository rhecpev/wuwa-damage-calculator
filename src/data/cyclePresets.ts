import type { Enemy, ManualBuff, ResonanceMode, RotationAttack } from "../types/game";

/**
 * 사이클 — 다 짜 놓은 공격 루틴 한 벌.
 *
 * 파티 프리셋(PartyPreset)이 「누가 앉았는가」를 담는다면, 이쪽은 **「어떻게 돌리는가」**를 담는다.
 * 담기는 것은 넷이다.
 *   members      누가 어떤 무기·체인·모드·에코로 섰는지 (환경)
 *   manualBuffs  손으로 넣은 버프 (그대로 옮겨야 켜둔 체크가 살아난다)
 *   rotation     공격 순서와 사이클, 그리고 공격마다 켜둔 버프
 *   enemy        어느 콘텐츠를 기준으로 짠 것인지
 *
 * ── 왜 환경까지 담는가 ──────────────────────────────────────
 * 공격마다 켜둔 버프는 id로 적힌다. 그런데 그 id에는 만들어진 자리가 박혀 있다 —
 * `character:jinhsi:12`(고유·체인), `weapon:...`, `echoset:...`, `echoability:...`.
 * 남의 사이클을 받아 열면 내 체인이 1돌인데 상대는 3돌이라 그 id가 아예 없을 수 있다.
 * 그러면 켜둔 체크가 조용히 사라져 「같은 루틴인데 딜이 다른」 상태가 된다.
 *
 * 그래서 담을 때 환경을 함께 적어 두고, 불러올 때 지금 환경과 견줘 **어긋난 것을 먼저 알린다.**
 * 사람이 보고 「그건 빼고 넣기」를 고르면 그 버프만 걸러서 앉힌다.
 */

/** 사이클을 담을 때의 캐릭터 한 명. 불러올 때 지금 환경과 견주는 기준이 된다. */
export interface CycleMember {
  slot: "mainDps" | "subDps" | "support";
  characterId: string;
  characterName: string;
  weaponId: string;
  weaponRefine: number;
  resonanceChain: number;
  resonanceMode?: ResonanceMode;
  /** 낀 에코 도감 id. 화음 세트와 메인 어빌리티가 여기서 나온다. */
  echoIds: string[];
}

export interface CyclePreset {
  id: string;
  name: string;
  /** 담은 시각(ISO). 목록을 최신순으로 세우고 추출물에도 같이 적는다. */
  savedAt: string;
  /** 만든 사람이 남기는 한 줄. 추출·불러오기로 오갈 때 같이 따라다닌다. */
  note?: string;
  members: CycleMember[];
  manualBuffs: ManualBuff[];
  rotation: RotationAttack[];
  enemy: Enemy;
}

/** 추출물 겉포장. 형식이 바뀌면 version을 올려 옛 파일을 걸러낸다. */
export interface CycleExport {
  kind: "wuwa-cycle";
  version: 1;
  preset: CyclePreset;
}

const EXPORT_KIND = "wuwa-cycle";
const EXPORT_VERSION = 1;

/** 공유용 글자로 바꾼다. 사람이 읽을 수 있게 들여쓰기를 넣는다. */
export function encodeCycle(preset: CyclePreset): string {
  const payload: CycleExport = { kind: EXPORT_KIND, version: EXPORT_VERSION, preset };
  return JSON.stringify(payload, null, 2);
}

/**
 * 받은 글자를 사이클로 되돌린다. 형식이 아니면 이유를 담아 돌려준다
 * — 붙여넣기가 잘못되는 일이 흔해서, 던지는 대신 말로 알려 주는 편이 낫다.
 */
export function decodeCycle(text: string): { preset: CyclePreset } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    return { error: "JSON으로 읽히지 않습니다. 추출한 내용을 통째로 붙여넣었는지 확인해 주세요." };
  }
  const data = raw as Partial<CycleExport>;
  if (data?.kind !== EXPORT_KIND) return { error: "사이클 추출물이 아닙니다." };
  if (data.version !== EXPORT_VERSION) {
    return { error: `모르는 형식입니다(version ${String(data.version)}).` };
  }
  const preset = data.preset;
  if (!preset || !Array.isArray(preset.rotation) || !Array.isArray(preset.members)) {
    return { error: "내용이 깨져 있습니다." };
  }
  // 받은 것은 남의 id다. 내 목록에서 겹치지 않도록 새로 붙인다.
  return { preset: { ...preset, id: crypto.randomUUID() } };
}

/** 지금 환경과 담긴 환경이 어디서 갈리는지. 불러오기 전에 사람에게 보여 준다. */
export interface CycleDiff {
  characterId: string;
  characterName: string;
  /** 무엇이 다른지 사람 말로. 「공명체인 3 → 1」처럼 적는다. */
  changes: string[];
  /** 이 캐릭터 때문에 살아남지 못하는 버프 체크 수. */
  orphanCount: number;
}

/**
 * 파일 이름. 공백과 파일 이름에 못 쓰는 글자만 걸러내고 한글은 그대로 둔다
 * — 이름이 곧 내용이라 알아볼 수 있어야 한다.
 */
export function cycleFileName(preset: CyclePreset): string {
  const safe = preset.name.replace(/[\\/:*?"<>|]/g, "").trim() || "cycle";
  const day = preset.savedAt.slice(0, 10);
  return `${safe}_${day}.wuwa-cycle.json`;
}

/** 추출물을 파일로 내려받는다. 브라우저에는 「파일 저장」이 따로 없어 링크를 만들어 누른다. */
export function downloadCycle(preset: CyclePreset): void {
  const blob = new Blob([encodeCycle(preset)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = cycleFileName(preset);
  link.click();
  // 링크를 누른 뒤에도 잠깐 살아 있어야 해서 다음 차례에 치운다.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
