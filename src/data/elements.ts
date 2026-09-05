import echoData from "./echo.json";
import type { DamageElement } from "../types/game";

/**
 * 속성 이름과 아이콘.
 *
 * 아이콘은 캐릭터 데이터에 없고 에코 도감(echo.json)의 Element 항목에 들어 있다.
 * 6속성 + 물리가 전부 나오므로 거기서 한 벌만 추려 쓴다.
 */

export const ELEMENT_NAMES: Record<DamageElement, string> = {
  Glacio: "응결",
  Fusion: "용융",
  Electro: "전도",
  Aero: "기류",
  Spectro: "회절",
  Havoc: "인멸",
  Physical: "물리",
};

/** 화면 강조에 쓰는 속성 색. 아이콘이 없을 때의 대체 표시에도 쓴다. */
export const ELEMENT_COLORS: Record<DamageElement, string> = {
  Glacio: "#6ad6f0",
  Fusion: "#ff9a4d",
  Electro: "#c07df0",
  Aero: "#35e0a1",
  Spectro: "#f5e56b",
  Havoc: "#f0577f",
  Physical: "#c8cede",
};

/** 한국어 속성 이름 -> 아이콘 URL. 도감을 한 번 훑어 이름당 하나만 남긴다. */
const iconByName = new Map<string, string>();
for (const echo of (echoData as { Echo: any[] }).Echo ?? []) {
  const element = echo?.Element;
  if (element?.Name && element.Icon && !iconByName.has(element.Name)) {
    iconByName.set(element.Name, element.Icon);
  }
}

/** 이 속성의 아이콘. 도감에 없으면 undefined. */
export const elementIcon = (element: DamageElement): string | undefined =>
  iconByName.get(ELEMENT_NAMES[element]);
