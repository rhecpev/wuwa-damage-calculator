import rentalData from "./rentalBuilds.json";
import { baseCharacterId } from "./modeVariants";
import { characters } from "./sampleData";
import type { CharacterWeaponConfig } from "../types/game";

/**
 * 매트릭스 **대여 빌드** — 보유하지 않은 캐릭터를 정해진 세팅으로 빌려 쓰는 그 빌드다.
 *
 * 데이터는 게임 설정 테이블에서 뽑아 두었다(scripts/build-rental-builds.mjs).
 * 전원 레벨 90 · 스킬 8레벨이고, 무기와 에코 다섯 개가 캐릭터마다 정해져 있다.
 *
 * 목록에 **따로 서지 않는다.** 캐릭터는 한 명 그대로고, 「내 것 / 대여」만 갈아 끼운다
 * (rentalStore). 대여로 두면 무기 · 에코 · 레벨 · 스킬 레벨이 이 빌드로 바뀌고,
 * 계산도 그 값으로 돈다.
 *
 * **공명체인만은 내가 가진 단계를 쓴다.** 게임에서 빌려 쓰더라도 체인은 내 것을 따라가기
 * 때문이다. 아래 chain 칸은 덤프 표에 적힌 값(늘 0)을 옮겨 둔 것일 뿐이고, 계산에 들어가는
 * 체인은 캐릭터 관리 탭에서 정한 값이다(PartyConfigContext의 characterChains).
 *
 * 모드로 갈린 캐릭터는 게임에서 한 명이라 **원래 id로** 찾는다.
 */

export interface RentalEchoOption {
  type: string;
  value: string;
}

export interface RentalEcho {
  /** 도감 id(echo.json의 Id). */
  id: string;
  name: string;
  iconUrl: string | null;
  cost: number;
  level: number;
  fetterGroups: { name: string; icon: string }[];
  options: {
    mainOption: RentalEchoOption | null;
    mainSubOption: RentalEchoOption | null;
    mainSelects: string[];
    subSelects: string[];
    selectedFetter: string | null;
  };
}

export interface RentalBuild {
  roleId: number;
  templateId: number;
  level: number;
  /**
   * 덤프 표에 적힌 공명체인(늘 0). **이 값 대신 내가 가진 체인 단계로 계산한다** —
   * 빌려 써도 체인은 내 것을 따라가기 때문이다. 표를 그대로 옮겨 두려고 남긴 칸이다.
   */
  chain: number;
  skillLevel: number;
  weapon: { weaponId: string; name: string; level: number; refine: number } | null;
  echoes: RentalEcho[];
}

const BUILDS = rentalData.builds as unknown as Record<string, RentalBuild>;

/** 이 캐릭터의 대여 빌드. 없는 캐릭터(덤프에 아직 안 들어온 신캐)면 undefined. */
export const rentalBuildOf = (characterId: string): RentalBuild | undefined =>
  BUILDS[baseCharacterId(characterId)];

export const hasRentalBuild = (characterId: string): boolean =>
  rentalBuildOf(characterId) !== undefined;

/** 대여 빌드가 있는 캐릭터 수. 「몇 명까지 대여로 볼 수 있는지」를 적을 때 쓴다. */
export const rentalBuildCount = (): number => Object.keys(BUILDS).length;

/** 대여 무기를 캐릭터 무기 설정 모양으로. 무기 관리 탭의 자루(pk)와는 상관없다. */
export function rentalWeaponOf(characterId: string): CharacterWeaponConfig | undefined {
  const weapon = rentalBuildOf(characterId)?.weapon;
  return weapon
    ? { weaponId: weapon.weaponId, refine: weapon.refine, level: weapon.level }
    : undefined;
}

/**
 * 대여 에코를 **보유 에코(MyEcho)와 같은 모양으로** 돌려준다.
 *
 * 일련번호(pk)는 음수로 뗀다 — 보유 에코와 섞이지 않게 하려고다. 순서가 곧 슬롯 순서라
 * 첫 번째가 메인 에코이고, 에코 어빌리티도 그것 하나만 걸린다(echoStore 참고).
 */
export function rentalEchoesOf(characterId: string): {
  pk: number;
  id: string;
  name: string;
  iconUrl?: string;
  fetterGroups?: { name: string; icon: string }[];
  options?: unknown;
}[] {
  const build = rentalBuildOf(characterId);
  if (!build) return [];
  return build.echoes.map((echo, index) => ({
    pk: -(build.roleId * 10 + index + 1),
    id: echo.id,
    name: echo.name,
    iconUrl: echo.iconUrl ?? undefined,
    fetterGroups: echo.fetterGroups,
    options: echo.options,
  }));
}

/** 대여 빌드의 스킬 레벨 — 모든 스킬이 같은 레벨이다. */
export function rentalSkillLevelsOf(characterId: string): Record<string, number> {
  const build = rentalBuildOf(characterId);
  const character = characters.find((c) => c.id === characterId);
  if (!build || !character) return {};
  const out: Record<string, number> = {};
  for (const skill of character.skills) out[skill.id] = build.skillLevel;
  return out;
}
