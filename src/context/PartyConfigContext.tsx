import { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type {
  AttackType,
  CharacterWeaponConfig,
  Element,
  EnemyResPreset,
  ManualBuff,
  PartyConfig,
  ResonanceMode,
  RotationAttack,
} from "../types/game";
import { usePersistedState } from "../utils/usePersistedState";
import type { CycleMember, CyclePreset } from "../data/cyclePresets";
import {
  deriveCharacterBuffs,
  deriveEchoBuffs,
  deriveWeaponBuffs,
} from "../calculator/equippedBuffs";
import { characters } from "../data/sampleData";
import { DEFAULT_WEAPON_LEVEL, WEAPON_LEVEL_MAX, WEAPON_LEVEL_MIN } from "../data/weapons";
import { DEFAULT_CHARACTER_LEVEL, clampCharacterLevel } from "../data/characterStats";
import { inherentSkillsOf, nodesOf } from "../data/characterNodes";
import {
  getWeaponBuffOverrides,
  subscribeWeaponBuffOverrides,
} from "../data/weaponBuffOverrides";
import {
  getCharacterBuffOverrides,
  subscribeCharacterBuffOverrides,
} from "../data/characterBuffOverrides";
import { getEchoBuffOverrides, subscribeEchoBuffOverrides } from "../data/echoBuffOverrides";
import { echoStoreVersion, subscribeEchoStore } from "../data/echoStore";
import { anomalyFromAttackId } from "../data/anomalies";
import { anomalyStateBuffs } from "../data/anomalyBuffs";
import { anomalyStackCap } from "../calculator/manualBuffs";
import { isDiscordAttackId } from "../data/discord";

/**
 * 콘텐츠별 속성 저항 프리셋.
 * 같은 몬스터라도 어느 콘텐츠에서 만나느냐에 따라 저항이 다르게 잡힌다.
 *   baseRes        = 몬스터 속성과 다른 속성으로 때릴 때
 *   sameElementRes = 몬스터 속성과 같은 속성으로 때릴 때
 */
export const ENEMY_RES_PRESETS: {
  id: EnemyResPreset;
  label: string;
  baseRes: number;
  sameElementRes: number;
}[] = [
  { id: "field", label: "필드", baseRes: 0.1, sameElementRes: 0.4 },
  { id: "tower", label: "역경의 탑 · 종말 매트릭스", baseRes: 0.2, sameElementRes: 0.6 },
  { id: "hologram", label: "홀로그램", baseRes: 0.1, sameElementRes: 0.8 },
];

export const resPresetOf = (id: EnemyResPreset) =>
  ENEMY_RES_PRESETS.find((p) => p.id === id) ?? ENEMY_RES_PRESETS[0];

/** 계산 대상 몬스터의 기본값. 저항은 필드 프리셋에서 가져온다. */
const defaultEnemy: PartyConfig["enemy"] = {
  id: "custom",
  name: "몬스터",
  level: 100,
  element: "Havoc",
  resPreset: "field",
  baseRes: ENEMY_RES_PRESETS[0].baseRes,
  sameElementRes: ENEMY_RES_PRESETS[0].sameElementRes,
  damageReduction: 0,
};

const defaultConfig: PartyConfig = {
  id: "default",
  name: "기본",
  // 파티 슬롯은 비어 있는 상태로 시작하고, 캐릭터 선택에서 고른 순서대로 채워진다.
  mainDps: { characterId: "", weaponId: "", echoIds: [] },
  subDps: { characterId: "", weaponId: "", echoIds: [] },
  support: { characterId: "", weaponId: "", echoIds: [] },
  rotation: [],
  enemy: defaultEnemy,
};

export type PartySlot = "mainDps" | "subDps" | "support";

/**
 * 저장해둔 파티 한 벌. 편성·로테이션·몬스터 설정을 통째로 담는다.
 * 불러오면 그때 상태로 그대로 돌아간다.
 */
export interface PartyPreset {
  id: string;
  name: string;
  config: PartyConfig;
}

/** 파티 슬롯 순서 — 1번, 2번, 3번 캐릭터 */
export const PARTY_SLOTS: PartySlot[] = ["mainDps", "subDps", "support"];

/** 몬스터 레벨 입력 범위 */
export const ENEMY_LEVEL_MIN = 1;
export const ENEMY_LEVEL_MAX = 200;

interface PartyConfigContextType {
  config: PartyConfig;
  /** 캐릭터별로 고른 무기. 캐릭터 관리 탭에서 정하고 계산에서 그대로 쓴다. */
  characterWeapons: Record<string, CharacterWeaponConfig>;
  setCharacterWeapon: (characterId: string, weaponId: string) => void;
  setWeaponRefine: (characterId: string, refine: number) => void;
  setWeaponLevel: (characterId: string, level: number) => void;
  /** 캐릭터별 레벨(1~90). 기초 스탯과 방어저항 배율이 이 값을 본다. */
  characterLevels: Record<string, number>;
  setCharacterLevel: (characterId: string, level: number) => void;
  /**
   * 캐릭터별로 켜둔 스킬 트리 노드 id 목록.
   * 값이 없는 캐릭터는 "손댄 적 없음"이라 전부 켠 것으로 본다(nodeStats 참고).
   */
  characterNodes: Record<string, string[]>;
  toggleCharacterNode: (characterId: string, nodeId: string) => void;
  setAllCharacterNodes: (characterId: string, on: boolean) => void;
  /** 캐릭터별로 켜둔 고유 스킬 id 목록. 스탯 노드와 같은 규칙(없으면 전부 켬). */
  characterInherents: Record<string, string[]>;
  toggleCharacterInherent: (characterId: string, skillId: string) => void;
  /** 캐릭터별 공명체인 단계(0~6)와 공명 모드. 캐릭터 관리 탭에서 정한다. */
  characterChains: Record<string, number>;
  setCharacterChain: (characterId: string, chain: number) => void;
  characterModes: Record<string, ResonanceMode>;
  setCharacterMode: (characterId: string, mode: ResonanceMode) => void;
  /** 캐릭터별 · 스킬별 레벨(1~10). characterSkillLevels[캐릭터id][스킬id] */
  characterSkillLevels: Record<string, Record<string, number>>;
  setSkillLevel: (characterId: string, skillId: string, level: number) => void;
  setAllSkillLevels: (characterId: string, skillIds: string[], level: number) => void;
  /** 수기로 입력하는 버프 목록(프로토타입). */
  manualBuffs: ManualBuff[];
  /** 수기 버프 + 장착 무기에서 자동으로 잡히는 버프. 계산과 화면이 모두 이걸 쓴다. */
  allBuffs: ManualBuff[];
  addManualBuff: (buff: Omit<ManualBuff, "id">) => void;
  updateManualBuff: (id: string, patch: Partial<Omit<ManualBuff, "id">>) => void;
  removeManualBuff: (id: string) => void;
  setConfig: (config: PartyConfig) => void;
  addAttack: (attackId: string, characterId: string) => void;
  removeAttack: (id: string) => void;
  /** 같은 공격을 버프 체크·스택까지 그대로 복사해 루틴 맨 뒤에 붙인다. */
  duplicateAttack: (id: string) => void;
  /**
   * 이 공격 **바로 뒤**에 다른 공격을 담는다. 사이클과 버프 체크·스택을 그대로 이어받는다
   * — 콤보를 이어 담을 때 매번 같은 버프를 다시 켜지 않게 하려는 것이다.
   * 이어받은 체크 중 새 공격에 걸리지 않는 것은 계산에서 알아서 빠진다(appliesTo).
   */
  addAttackAfter: (afterId: string, attackId: string, characterId: string) => void;
  /** 공격 루틴을 통째로 비운다. */
  clearRotation: () => void;
  /** 지금 공격을 담으면 들어갈 사이클 번호. 아직 빈 사이클이면 화면이 자리만 그려 준다. */
  openCycle: number;
  /** 맨 뒤에 사이클을 하나 더 연다. 다음에 담는 공격부터 그 사이클에 들어간다. */
  addCycle: () => void;
  /** 그 공격을 다른 사이클로 옮긴다. */
  setAttackCycle: (id: string, cycle: number) => void;
  /**
   * 끌어다 놓아 순서를 바꾼다. 놓인 자리의 사이클을 따라간다 —
   * 사이클 경계를 넘겨 놓으면 그 사이클로 옮겨진 것으로 본다.
   */
  moveAttack: (id: string, beforeId: string | null) => void;
  /** 사이클 하나를 통째로 복사해 맨 뒤에 새 사이클로 붙인다(버프 체크·스택 그대로). */
  duplicateCycle: (cycle: number) => void;
  toggleBuff: (rotationId: string, buffId: string) => void;
  /** 스택형 버프를 이 공격에서 몇 스택으로 볼지 정한다. */
  setBuffStacks: (rotationId: string, buffId: string, stacks: number) => void;
  /**
   * 이 한 대의 피해 판정을 바꿔치기한다. null이면 공격 자료를 그대로 따른다.
   * 「공명 스킬인데 공명 해방 피해로 들어간다」처럼 자료와 실제가 갈릴 때 쓴다.
   */
  setAttackDamageType: (id: string, type: AttackType | null) => void;
  /** 이상 효과 항목의 스택과 발생 횟수. 이상 항목이 아니면 아무 일도 하지 않는다. */
  setAnomalyStacks: (rotationId: string, stacks: number) => void;
  setAnomalyOccurrences: (rotationId: string, occurrences: number) => void;
  /** 조화도 파괴 항목의 배율(16 = 1600%)과 발생 횟수. */
  setDiscordRate: (rotationId: string, rate: number) => void;
  setDiscordOccurrences: (rotationId: string, occurrences: number) => void;
  setMainResonanceChain: (chain: number) => void;
  setMainResonanceMode: (mode: ResonanceMode) => void;
  toggleCharacter: (characterId: string) => void;
  /** 파티 자리 하나를 비운다. 파티 구성에서 아이콘을 누르면 이걸 쓴다. */
  clearSlot: (slot: PartySlot) => void;
  /** 두 자리를 통째로 맞바꾼다. 파티 구성 안에서 끌어다 놓을 때. */
  swapSlots: (a: PartySlot, b: PartySlot) => void;
  /** 캐릭터를 지정한 자리에 앉힌다. 캐릭터 선택에서 자리로 끌어다 놓을 때. */
  assignCharacterToSlot: (slot: PartySlot, characterId: string) => void;
  setEnemyLevel: (level: number) => void;
  setEnemyElement: (element: Element) => void;
  setEnemyResPreset: (preset: EnemyResPreset) => void;
  /** 저장해둔 파티 목록. 편성·로테이션·몬스터 설정을 한 벌로 담는다. */
  /**
   * 파티 관리 탭 전용 편성. 계산용(config)과 따로 논다 —
   * 여기서 자리를 바꿔도 계산 탭의 파티는 그대로다.
   */
  editorConfig: PartyConfig;
  editorToggleCharacter: (characterId: string) => void;
  editorClearSlot: (slot: PartySlot) => void;
  editorSwapSlots: (a: PartySlot, b: PartySlot) => void;
  editorAssignCharacterToSlot: (slot: PartySlot, characterId: string) => void;
  /** 파티 관리에서 짠 편성을 계산 탭으로 보낸다. 로테이션·몬스터 설정은 건드리지 않는다. */
  sendEditorToCalculator: () => void;
  /** 반대로 계산 탭의 편성을 파티 관리로 가져온다. */
  loadCalculatorIntoEditor: () => void;
  partyPresets: PartyPreset[];
  /** 저장할 편성. 파티 관리 탭에서 부르면 editorConfig가 담긴다. */
  savePartyPreset: (name: string, from?: PartyConfig) => void;
  /** 불러오기. to가 "editor"면 파티 관리 쪽에 앉힌다. */
  applyPartyPreset: (id: string, to?: "calc" | "editor") => void;
  renamePartyPreset: (id: string, name: string) => void;
  removePartyPreset: (id: string) => void;

  /** 담아둔 사이클(공격 루틴 한 벌). 사이클 관리 탭이 본다. */
  cyclePresets: CyclePreset[];
  /** 지금 계산 탭의 루틴·버프·환경을 통째로 담는다. 루틴이 비어 있으면 담지 않는다. */
  saveCyclePreset: (name: string, note?: string) => void;
  /** 받은 사이클을 목록에 넣는다(불러오기·추출물 붙여넣기). */
  addCyclePreset: (preset: CyclePreset) => void;
  /**
   * 담긴 사이클을 계산 탭에 앉힌다.
   * dropBuffIds에 담긴 버프 체크는 빼고 앉힌다 — 지금 환경에 없는 버프를 걸러낼 때 쓴다.
   */
  applyCyclePreset: (id: string, dropBuffIds?: string[]) => void;
  renameCyclePreset: (id: string, name: string) => void;
  removeCyclePreset: (id: string) => void;
  /** 지금 환경을 사이클과 같은 모양으로. 담긴 것과 견주려고 화면이 쓴다. */
  currentCycleMembers: () => CycleMember[];
  /**
   * 이 캐릭터들을 파티에 앉혔을 때 **생길** 버프 id 목록.
   *
   * 사이클을 앉히기 전에 「살아남지 못할 체크」를 가릴 때 쓴다. 지금 파티로 따지면
   * 다른 팀의 사이클은 그 팀 버프가 전부 없는 것으로 잡혀, 켜 둔 체크가 통째로 빠진다.
   */
  buffIdsFor: (characterIds: string[]) => Set<string>;
}

const PartyConfigContext = createContext<PartyConfigContextType | undefined>(undefined);

export function PartyConfigProvider({ children }: { children: ReactNode }) {
  // 계산에 쓰는 파티. 데미지 계산 탭이 본다.
  const [config, setConfig] = useState<PartyConfig>(defaultConfig);
  /**
   * 파티 관리 탭에서 짜는 편성. 계산용과 **따로 논다.**
   *
   * 둘을 한 벌로 두면 파티를 짜보는 동안 계산 탭의 편성이 같이 흔들려서,
   * 지금 계산 중인 구성을 잃지 않고는 다른 조합을 만져볼 수가 없다.
   * 그래서 자리 편성만 따로 들고, 옮기고 싶을 때 버튼으로 주고받는다.
   * 이쪽은 짜다 만 것을 잃지 않게 브라우저에 저장한다.
   */
  const [editorConfig, setEditorConfig] = usePersistedState<PartyConfig>(
    "partyEditorConfig",
    defaultConfig,
  );
  // 캐릭터 id -> {무기 id, 정련 단계, 무기 레벨}. 파티 편성과 무관하게 캐릭터마다 하나씩 기억한다.
  // 새로고침해도 남도록 localStorage에 저장된다.
  const [characterWeapons, setCharacterWeapons] = usePersistedState<
    Record<string, CharacterWeaponConfig>
  >("characterWeapons", {});

  // 키에 v2 — target/element 필드가 생기기 전에 저장된 버프는 형태가 달라 버린다.
  const [manualBuffs, setManualBuffs] = usePersistedState<ManualBuff[]>("manualBuffs-v2", []);

  // 공명체인 단계(0~6)와 공명 모드도 캐릭터 단위로 기억한다. 무기와 같은 자리.
  const [characterChains, setCharacterChains] = usePersistedState<Record<string, number>>(
    "characterChains",
    {},
  );
  const [characterModes, setCharacterModes] = usePersistedState<Record<string, ResonanceMode>>(
    "characterModes",
    {},
  );

  const setCharacterChain = (characterId: string, chain: number) => {
    setCharacterChains((current) => ({
      ...current,
      [characterId]: Math.min(Math.max(Math.round(chain), 0), 6),
    }));
  };

  const setCharacterMode = (characterId: string, mode: ResonanceMode) => {
    setCharacterModes((current) => ({ ...current, [characterId]: mode }));
  };

  // 캐릭터 레벨도 같은 자리 — 캐릭터마다 하나씩, 새로고침해도 남는다.
  const [characterLevels, setCharacterLevels] = usePersistedState<Record<string, number>>(
    "characterLevels",
    {},
  );

  const setCharacterLevel = (characterId: string, level: number) => {
    setCharacterLevels((current) => ({
      ...current,
      [characterId]: clampCharacterLevel(level),
    }));
  };

  // 스킬 트리 스탯 노드. 켠 것만 담는다.
  const [characterNodes, setCharacterNodes] = usePersistedState<Record<string, string[]>>(
    "characterNodes",
    {},
  );

  /** 노드 하나를 껐다 켠다. 처음 건드리는 캐릭터는 "전부 켬"에서 출발한다. */
  const toggleCharacterNode = (characterId: string, nodeId: string) => {
    setCharacterNodes((current) => {
      const all = nodesOf(characterId).map((n) => n.id);
      const on = current[characterId] ?? all;
      const next = on.includes(nodeId)
        ? on.filter((id) => id !== nodeId)
        : // 원래 순서를 유지해야 목록이 뒤죽박죽되지 않는다.
          all.filter((id) => on.includes(id) || id === nodeId);
      return { ...current, [characterId]: next };
    });
  };

  /** 이 캐릭터의 노드를 전부 켜거나 전부 끈다. */
  const setAllCharacterNodes = (characterId: string, on: boolean) => {
    setCharacterNodes((current) => ({
      ...current,
      [characterId]: on ? nodesOf(characterId).map((n) => n.id) : [],
    }));
  };

  // 고유 스킬도 같은 방식으로 켜고 끈다.
  const [characterInherents, setCharacterInherents] = usePersistedState<
    Record<string, string[]>
  >("characterInherents", {});

  const toggleCharacterInherent = (characterId: string, skillId: string) => {
    setCharacterInherents((current) => {
      const character = characters.find((c) => c.id === characterId);
      const all = inherentSkillsOf(character).map((s) => s.id);
      const on = current[characterId] ?? all;
      const next = on.includes(skillId)
        ? on.filter((id) => id !== skillId)
        : all.filter((id) => on.includes(id) || id === skillId);
      return { ...current, [characterId]: next };
    });
  };

  // 스킬 레벨도 캐릭터 단위로 기억한다. 비어 있으면 데이터의 Attack.skillLevel(보통 10)을 쓴다.
  const [characterSkillLevels, setCharacterSkillLevels] = usePersistedState<
    Record<string, Record<string, number>>
  >("characterSkillLevels", {});

  const clampLevel = (level: number) => Math.min(Math.max(Math.round(level), 1), 10);

  const setSkillLevel = (characterId: string, skillId: string, level: number) => {
    // 숫자가 아닌 값은 아예 쓰지 않는다. 한 번이라도 들어가면 저장에도 남고,
    // 화면에서는 레벨 칸이 통째로 사라진 것처럼 보인다(값이 없는 input은 안 그려진다).
    if (!Number.isFinite(level)) return;
    setCharacterSkillLevels((current) => ({
      ...current,
      [characterId]: { ...current[characterId], [skillId]: clampLevel(level) },
    }));
  };

  /** 한 캐릭터의 스킬 레벨을 한 번에 맞춘다. */
  const setAllSkillLevels = (characterId: string, skillIds: string[], level: number) => {
    const value = clampLevel(level);
    setCharacterSkillLevels((current) => ({
      ...current,
      [characterId]: Object.fromEntries(skillIds.map((id) => [id, value])),
    }));
  };

  /** 같은 무기를 다시 고르면 해제한다. 무기를 바꾸면 정련은 1단계, 레벨은 90으로 돌아간다. */
  const setCharacterWeapon = (characterId: string, weaponId: string) => {
    setCharacterWeapons((current) => {
      if (current[characterId]?.weaponId === weaponId) {
        const { [characterId]: _removed, ...rest } = current;
        return rest;
      }
      return {
        ...current,
        [characterId]: { weaponId, refine: 1, level: DEFAULT_WEAPON_LEVEL },
      };
    });
  };

  /** 정련 단계 1~5. 무기가 선택돼 있을 때만 의미가 있다. */
  const setWeaponRefine = (characterId: string, refine: number) => {
    setCharacterWeapons((current) => {
      const entry = current[characterId];
      if (!entry) return current;
      return {
        ...current,
        [characterId]: { ...entry, refine: Math.min(Math.max(refine, 1), 5) },
      };
    });
  };

  /** 무기 레벨 1~90. 무기가 선택돼 있을 때만 의미가 있다. */
  const setWeaponLevel = (characterId: string, level: number) => {
    setCharacterWeapons((current) => {
      const entry = current[characterId];
      if (!entry) return current;
      const next = Math.min(Math.max(Math.round(level), WEAPON_LEVEL_MIN), WEAPON_LEVEL_MAX);
      return { ...current, [characterId]: { ...entry, level: next } };
    });
  };

  const addManualBuff = (buff: Omit<ManualBuff, "id">) => {
    setManualBuffs((current) => [...current, { ...buff, id: crypto.randomUUID() }]);
  };

  const updateManualBuff = (id: string, patch: Partial<Omit<ManualBuff, "id">>) => {
    setManualBuffs((current) =>
      current.map((buff) => (buff.id === id ? { ...buff, ...patch } : buff)),
    );
  };

  const removeManualBuff = (id: string) => {
    setManualBuffs((current) => current.filter((buff) => buff.id !== id));
  };

  /**
   * 지금 담을 자리의 사이클 번호. 마지막 공격이 든 사이클을 그대로 쓴다.
   * 「사이클 추가」를 누르면 openCycle이 하나 올라가고, 그 뒤로 담는 공격이 새 사이클에 들어간다.
   */
  const lastCycle = (rotation: RotationAttack[]) =>
    rotation.reduce((max, item) => Math.max(max, item.cycle ?? 1), 1);

  const [openCycle, setOpenCycle] = useState(1);

  const addAttack = (attackId: string, characterId: string) => {
    setConfig((current) => {
      // 사이클을 새로 열어 둔 상태면 그 번호로, 아니면 마지막 공격과 같은 사이클로 담는다.
      const cycle = Math.max(openCycle, lastCycle(current.rotation));
      return {
        ...current,
        rotation: [
          ...current.rotation,
          {
            id: crypto.randomUUID(),
            attackId,
            characterId,
            cycle,
            // 버프는 기본적으로 전부 꺼져 있다. 이 공격에 걸 것만 공격별로 켜면 된다.
            enabledBuffIds: [],
          },
        ],
      };
    });
  };

  /** 사이클을 하나 더 연다. 아직 공격이 없는 빈 사이클은 화면에 자리만 잡는다. */
  const addCycle = () => {
    setOpenCycle((cur) => Math.max(cur, lastCycle(config.rotation)) + 1);
  };

  /** 공격 하나를 다른 사이클로 옮긴다. 순서는 그대로 두고 번호만 바꾼다. */
  const setAttackCycle = (id: string, cycle: number) => {
    setConfig((current) => ({
      ...current,
      rotation: current.rotation.map((item) =>
        item.id === id ? { ...item, cycle: Math.max(1, Math.round(cycle)) } : item,
      ),
    }));
  };

  /**
   * 끌어다 놓기로 순서 바꾸기.
   * beforeId가 가리키는 공격 **앞**에 끼워 넣고, 그 공격의 사이클을 따라간다.
   * beforeId가 null이면 맨 뒤로 보내고 마지막 사이클에 붙는다.
   */
  const moveAttack = (id: string, beforeId: string | null) => {
    if (id === beforeId) return;
    setConfig((current) => {
      const moving = current.rotation.find((item) => item.id === id);
      if (!moving) return current;
      const rest = current.rotation.filter((item) => item.id !== id);
      const at = beforeId ? rest.findIndex((item) => item.id === beforeId) : -1;
      // 놓인 자리의 사이클을 따라간다. 맨 뒤면 마지막 공격과 같은 사이클.
      const cycle = at >= 0 ? (rest[at].cycle ?? 1) : (rest.at(-1)?.cycle ?? 1);
      const next = { ...moving, cycle };
      return {
        ...current,
        rotation: at >= 0 ? [...rest.slice(0, at), next, ...rest.slice(at)] : [...rest, next],
      };
    });
  };

  /**
   * 사이클 통째로 복사 — 그 사이클의 공격을 순서대로 새 사이클에 붙인다.
   * 버프 체크·스택·이상 스택까지 그대로 들고 간다(id만 새로 뗀다).
   */
  const duplicateCycle = (cycle: number) => {
    setConfig((current) => {
      const rows = current.rotation.filter((item) => (item.cycle ?? 1) === cycle);
      if (rows.length === 0) return current;
      const next = lastCycle(current.rotation) + 1;
      setOpenCycle(next);
      return {
        ...current,
        rotation: [
          ...current.rotation,
          ...rows.map((item) => ({
            ...item,
            id: crypto.randomUUID(),
            cycle: next,
            enabledBuffIds: [...item.enabledBuffIds],
            ...(item.disabledBuffIds?.length ? { disabledBuffIds: [...item.disabledBuffIds] } : {}),
            ...(item.buffStacks ? { buffStacks: { ...item.buffStacks } } : {}),
          })),
        ],
      };
    });
  };

  /** 이 한 대의 피해 판정 바꿔치기. null이면 지운다(공격 자료를 그대로 따른다). */
  const setAttackDamageType = (id: string, type: AttackType | null) => {
    setConfig((current) => ({
      ...current,
      rotation: current.rotation.map((item) => {
        if (item.id !== id) return item;
        const { damageBonusType: _drop, ...rest } = item;
        return type ? { ...rest, damageBonusType: type } : rest;
      }),
    }));
  };

  /** 이 공격 바로 뒤에 다른 공격을 담는다. 사이클과 버프 체크를 그대로 이어받는다. */
  const addAttackAfter = (afterId: string, attackId: string, characterId: string) => {
    setConfig((current) => {
      const at = current.rotation.findIndex((item) => item.id === afterId);
      if (at < 0) return current;
      const source = current.rotation[at];
      const next: RotationAttack = {
        id: crypto.randomUUID(),
        attackId,
        characterId,
        cycle: source.cycle,
        enabledBuffIds: [...source.enabledBuffIds],
        ...(source.disabledBuffIds?.length ? { disabledBuffIds: [...source.disabledBuffIds] } : {}),
        ...(source.buffStacks ? { buffStacks: { ...source.buffStacks } } : {}),
      };
      return {
        ...current,
        rotation: [...current.rotation.slice(0, at + 1), next, ...current.rotation.slice(at + 1)],
      };
    });
  };

  /** 복사 — 켜둔 버프와 스택을 그대로 들고 맨 뒤에 하나 더 붙인다. */
  const duplicateAttack = (id: string) => {
    setConfig((current) => {
      const source = current.rotation.find((item) => item.id === id);
      if (!source) return current;

      return {
        ...current,
        rotation: [
          ...current.rotation,
          {
            ...source,
            id: crypto.randomUUID(),
            // 배열·객체는 복사본을 넘겨야 한쪽을 고칠 때 다른 쪽이 따라 바뀌지 않는다.
            enabledBuffIds: [...source.enabledBuffIds],
            ...(source.buffStacks ? { buffStacks: { ...source.buffStacks } } : {}),
          },
        ],
      };
    });
  };

  const clearRotation = () => {
    setConfig((current) => ({ ...current, rotation: [] }));
    setOpenCycle(1);
  };

  const removeAttack = (id: string) => {
    setConfig((current) => ({
      ...current,
      rotation: current.rotation.filter((item) => item.id !== id),
    }));
  };

  /**
   * 이 공격에서 버프를 켰다 껐다 한다. 켠 것만 enabledBuffIds에 남는다.
   * 배타 묶음(exclusiveGroup)에 든 버프를 켜면 같은 묶음의 다른 것은 자동으로 꺼진다
   * — 「HP 60% 이상 / 미만」처럼 동시에 성립할 수 없는 상태를 위한 것이다.
   */
  const toggleBuff = (rotationId: string, buffId: string) => {
    const buff = allBuffs.find((b) => b.id === buffId);
    // 상시 버프는 「켠 목록」이 아니라 「꺼 둔 목록」으로 다룬다 — 기본이 켜짐이라서다.
    if (buff?.uptime === "passive") {
      setConfig((current) => ({
        ...current,
        rotation: current.rotation.map((item) => {
          if (item.id !== rotationId) return item;
          const off = item.disabledBuffIds ?? [];
          return {
            ...item,
            disabledBuffIds: off.includes(buffId)
              ? off.filter((id) => id !== buffId)
              : [...off, buffId],
          };
        }),
      }));
      return;
    }
    const group = buff?.exclusiveGroup;
    const siblings = group
      ? allBuffs.filter((b) => b.exclusiveGroup === group && b.id !== buffId).map((b) => b.id)
      : [];

    setConfig((current) => ({
      ...current,
      rotation: current.rotation.map((item) => {
        if (item.id !== rotationId) return item;

        const on = item.enabledBuffIds.includes(buffId);

        return {
          ...item,
          enabledBuffIds: on
            ? item.enabledBuffIds.filter((id) => id !== buffId)
            : [...item.enabledBuffIds.filter((id) => !siblings.includes(id)), buffId],
        };
      }),
    }));
  };

  /** 스택형 버프의 스택 수. 1 미만이나 최대치 밖은 잘라낸다. */
  const setBuffStacks = (rotationId: string, buffId: string, stacks: number) => {
    const buff = allBuffs.find((b) => b.id === buffId);

    setConfig((current) => ({
      ...current,
      rotation: current.rotation.map((item) => {
        if (item.id !== rotationId) return item;
        // 이상 효과 스택을 그대로 쓰는 버프(암흑 효과)는 상한이 고정이 아니다 —
        // 이 공격에서 켜 둔 상한 증가 버프까지 보고 자른다. 버프 창이 띄우는 목록과 같은 규칙이라
        // 「6까지 고를 수 있는데 3으로 잘리는」 어긋남이 생기지 않는다.
        const max = buff?.anomalyStacks
          ? anomalyStackCap(buff.anomalyStacks, allBuffs, item.enabledBuffIds).max
          : (buff?.maxStacks ?? 1);
        const value = Math.min(Math.max(Math.round(stacks) || 1, 1), max);
        return { ...item, buffStacks: { ...item.buffStacks, [buffId]: value } };
      }),
    }));
  };

  /**
   * 이상 효과 스택. 1 미만은 막고, 위로는 최대 스택을 넘겨 담을 수 있게 열어 둔다
   * — 팀 버프로 최대 스택을 넘기면 폭발형은 초과분마다 피해가 더 붙기 때문이다.
   */
  const setAnomalyStacks = (rotationId: string, stacks: number) => {
    setConfig((current) => ({
      ...current,
      rotation: current.rotation.map((item) => {
        if (item.id !== rotationId) return item;
        const def = anomalyFromAttackId(item.attackId);
        if (!def) return item;
        // 상한은 최대 스택의 두 배까지만 — 그 위는 실수로 눌린 값에 가깝다.
        const value = Math.min(Math.max(Math.round(stacks) || 0, 0), def.maxStacks * 2);
        return { ...item, anomalyStacks: value };
      }),
    }));
  };

  /** 그 상태로 몇 번 터졌는지. 1 미만은 막는다. */
  const setDiscordRate = (rotationId: string, rate: number) => {
    setConfig((current) => ({
      ...current,
      rotation: current.rotation.map((item) => {
        if (item.id !== rotationId || !isDiscordAttackId(item.attackId)) return item;
        // 배율은 화면에서 %로 받는다. 0 미만과 터무니없이 큰 값만 막는다.
        const value = Math.min(Math.max(rate, 0), 200);
        return { ...item, discordRate: value };
      }),
    }));
  };

  const setDiscordOccurrences = (rotationId: string, occurrences: number) => {
    setConfig((current) => ({
      ...current,
      rotation: current.rotation.map((item) => {
        if (item.id !== rotationId || !isDiscordAttackId(item.attackId)) return item;
        return { ...item, discordOccurrences: Math.min(Math.max(Math.round(occurrences) || 1, 1), 99) };
      }),
    }));
  };

  const setAnomalyOccurrences = (rotationId: string, occurrences: number) => {
    setConfig((current) => ({
      ...current,
      rotation: current.rotation.map((item) => {
        if (item.id !== rotationId || !anomalyFromAttackId(item.attackId)) return item;
        return { ...item, anomalyOccurrences: Math.min(Math.max(Math.round(occurrences) || 1, 1), 99) };
      }),
    }));
  };

  // 파티 화면에서 조절하더라도 저장소는 캐릭터 단위 하나로 통일한다.
  const setMainResonanceChain = (chain: number) => {
    if (config.mainDps.characterId) setCharacterChain(config.mainDps.characterId, chain);
  };

  const setMainResonanceMode = (mode: ResonanceMode) => {
    if (config.mainDps.characterId) setCharacterMode(config.mainDps.characterId, mode);
  };

  /** 몬스터 레벨. 슬라이더/입력 어느 쪽이든 1~200으로 잘라서 저장한다. */
  const setEnemyLevel = (level: number) => {
    const clamped = Math.min(Math.max(Math.round(level), ENEMY_LEVEL_MIN), ENEMY_LEVEL_MAX);
    setConfig((current) => ({
      ...current,
      enemy: { ...current.enemy, level: Number.isNaN(clamped) ? current.enemy.level : clamped },
    }));
  };

  const setEnemyElement = (element: Element) => {
    setConfig((current) => ({ ...current, enemy: { ...current.enemy, element } }));
  };

  /** 콘텐츠 프리셋을 고르면 두 저항 수치가 같이 바뀐다. */
  // 저장해둔 파티. 새로고침해도 남는다.
  const [partyPresets, setPartyPresets] = usePersistedState<PartyPreset[]>("partyPresets", []);

  /** 지금 화면의 구성을 이름을 붙여 담아둔다. */
  const savePartyPreset = (name: string, from: PartyConfig = config) => {
    const label = name.trim();
    if (!label) return;
    setPartyPresets((current) => [
      ...current,
      { id: crypto.randomUUID(), name: label, config: from },
    ]);
  };

  /** 담아둔 구성을 그대로 되돌린다. */
  const applyPartyPreset = (id: string, to: "calc" | "editor" = "calc") => {
    const preset = partyPresets.find((p) => p.id === id);
    if (!preset) return;
    if (to === "editor") setEditorConfig(preset.config);
    else setConfig(preset.config);
  };

  const renamePartyPreset = (id: string, name: string) => {
    const label = name.trim();
    if (!label) return;
    setPartyPresets((current) =>
      current.map((p) => (p.id === id ? { ...p, name: label } : p)),
    );
  };

  const removePartyPreset = (id: string) => {
    setPartyPresets((current) => current.filter((p) => p.id !== id));
  };

  // ── 사이클 ────────────────────────────────────────────────
  const [cyclePresets, setCyclePresets] = usePersistedState<CyclePreset[]>("cyclePresets", []);

  /**
   * 지금 계산 탭 환경을 사이클이 담는 모양으로 옮긴다.
   * 무기·체인·모드·에코는 config가 아니라 캐릭터별 저장소에 흩어져 있어 여기서 모은다.
   */
  const currentCycleMembers = (): CycleMember[] => {
    const rows = PARTY_SLOTS.map((slot) => {
      const member = config[slot];
      const character = characters.find((c) => c.id === member.characterId);
      if (!character) return null;
      const weapon = characterWeapons[character.id];
      return {
        slot,
        characterId: character.id,
        characterName: character.name,
        weaponId: weapon?.weaponId ?? member.weaponId ?? "",
        weaponRefine: weapon?.refine ?? 1,
        resonanceChain: characterChains[character.id] ?? 0,
        resonanceMode: characterModes[character.id] ?? character.resonanceModes?.[0],
        echoIds: [...(member.echoIds ?? [])],
      };
    });
    // 빈 자리(캐릭터가 안 앉은 슬롯)는 담지 않는다.
    return rows.filter((m): m is NonNullable<typeof m> => m !== null);
  };

  const saveCyclePreset = (name: string, note?: string) => {
    const label = name.trim();
    if (!label || config.rotation.length === 0) return;
    setCyclePresets((current) => [
      {
        id: crypto.randomUUID(),
        name: label,
        savedAt: new Date().toISOString(),
        ...(note?.trim() ? { note: note.trim() } : {}),
        members: currentCycleMembers(),
        // 손으로 넣은 버프는 통째로 옮긴다 — id가 그대로여야 켜둔 체크가 살아난다.
        manualBuffs: manualBuffs.map((b) => ({ ...b })),
        rotation: config.rotation.map((item) => ({
          ...item,
          enabledBuffIds: [...item.enabledBuffIds],
          ...(item.disabledBuffIds?.length ? { disabledBuffIds: [...item.disabledBuffIds] } : {}),
          ...(item.buffStacks ? { buffStacks: { ...item.buffStacks } } : {}),
        })),
        enemy: { ...config.enemy },
      },
      ...current,
    ]);
  };

  const addCyclePreset = (preset: CyclePreset) => {
    setCyclePresets((current) => [preset, ...current]);
  };

  const applyCyclePreset = (id: string, dropBuffIds: string[] = []) => {
    const preset = cyclePresets.find((p) => p.id === id);
    if (!preset) return;
    const drop = new Set(dropBuffIds);

    // 손 버프를 먼저 앉힌다 — 루틴이 그 id를 가리키므로 순서가 뒤집히면 잠깐 빈 채로 그려진다.
    setManualBuffs(preset.manualBuffs.map((b) => ({ ...b })));

    setConfig((current) => ({
      ...current,
      // 자리에 누가 앉는지는 사이클이 정한다. 무기·체인은 캐릭터 관리 쪽 값이라 건드리지 않는다.
      ...Object.fromEntries(
        PARTY_SLOTS.map((slot) => {
          const member = preset.members.find((m) => m.slot === slot);
          return [
            slot,
            member
              ? { ...current[slot], characterId: member.characterId, echoIds: [...member.echoIds] }
              : { ...current[slot], characterId: "" },
          ];
        }),
      ),
      rotation: preset.rotation.map((item) => ({
        ...item,
        enabledBuffIds: item.enabledBuffIds.filter((buffId) => !drop.has(buffId)),
        ...(item.disabledBuffIds?.length ? { disabledBuffIds: [...item.disabledBuffIds] } : {}),
        ...(item.buffStacks ? { buffStacks: { ...item.buffStacks } } : {}),
      })),
      enemy: { ...preset.enemy },
    }));
  };

  const renameCyclePreset = (id: string, name: string) => {
    const label = name.trim();
    if (!label) return;
    setCyclePresets((current) => current.map((p) => (p.id === id ? { ...p, name: label } : p)));
  };

  const removeCyclePreset = (id: string) => {
    setCyclePresets((current) => current.filter((p) => p.id !== id));
  };

  const setEnemyResPreset = (preset: EnemyResPreset) => {
    const { baseRes, sameElementRes } = resPresetOf(preset);
    setConfig((current) => ({
      ...current,
      enemy: { ...current.enemy, resPreset: preset, baseRes, sameElementRes },
    }));
  };

  /**
   * 자리 편성을 다루는 함수 네 개를 setter 하나에 물려 찍어낸다.
   *
   * 계산용(config)과 파티 관리용(editorConfig)이 같은 조작을 각자의 상태에 해야 해서,
   * 같은 코드를 두 벌 두지 않고 이렇게 만든다.
   */
  const makePartyOps = (set: (updater: (current: PartyConfig) => PartyConfig) => void) => {
    /**
     * 캐릭터를 파티에 넣거나 뺀다. 슬롯 자리는 고정 — 뺀 자리는 그대로 비워두고
     * 뒤 캐릭터를 당겨오지 않는다.
     * - 파티에 없으면 비어 있는 가장 앞 슬롯에 넣는다(3자리가 다 차면 무시).
     * - 이미 있으면 그 슬롯만 비운다.
     */
    const toggleCharacter = (characterId: string) => {
      set((current) => {
        const occupied = PARTY_SLOTS.find((slot) => current[slot].characterId === characterId);

        if (occupied) {
          return {
            ...current,
            [occupied]: { characterId: "", weaponId: "", echoIds: [] },
          };
        }

        const empty = PARTY_SLOTS.find((slot) => current[slot].characterId === "");
        if (!empty) return current;

        return {
          ...current,
          [empty]: { ...current[empty], characterId },
        };
      });
    };

    /** 자리 하나만 비운다. 뒤 캐릭터를 당겨오지 않는다. */
    const clearSlot = (slot: PartySlot) => {
      set((current) => ({
        ...current,
        [slot]: { characterId: "", weaponId: "", echoIds: [] },
      }));
    };

    /** 두 자리의 편성을 통째로 맞바꾼다. */
    const swapSlots = (a: PartySlot, b: PartySlot) => {
      if (a === b) return;
      set((current) => ({ ...current, [a]: current[b], [b]: current[a] }));
    };

    /**
     * 캐릭터를 지정한 자리에 앉힌다.
     * 이미 파티의 다른 자리에 있으면 두 자리를 맞바꾸고,
     * 없으면 그 자리에 앉아 있던 캐릭터를 밀어내고 들어간다.
     */
    const assignCharacterToSlot = (slot: PartySlot, characterId: string) => {
      set((current) => {
        const from = PARTY_SLOTS.find((s) => current[s].characterId === characterId);
        if (from === slot) return current;
        if (from) return { ...current, [slot]: current[from], [from]: current[slot] };
        return { ...current, [slot]: { characterId, weaponId: "", echoIds: [] } };
      });
    };

    return { toggleCharacter, clearSlot, swapSlots, assignCharacterToSlot };
  };

  /**
   * 두 파티 사이에서 **자리 편성 세 칸만** 옮긴다.
   * 로테이션과 몬스터 설정은 받는 쪽 것을 그대로 둔다 — 편성만 바꿔 보려는 것이지
   * 계산 중이던 루틴까지 날리려는 게 아니다.
   */
  const copySlots = (from: PartyConfig, into: PartyConfig): PartyConfig => ({
    ...into,
    mainDps: from.mainDps,
    subDps: from.subDps,
    support: from.support,
  });

  const sendEditorToCalculator = () => setConfig((current) => copySlots(editorConfig, current));
  const loadCalculatorIntoEditor = () => setEditorConfig((current) => copySlots(config, current));

  // 계산 탭이 쓰는 것 — 이름은 예전 그대로 둔다.
  const { toggleCharacter, clearSlot, swapSlots, assignCharacterToSlot } =
    makePartyOps(setConfig);
  // 파티 관리 탭이 쓰는 것. 같은 조작이 editorConfig에만 걸린다.
  const editorOps = makePartyOps(setEditorConfig);

  // 확인 화면(데이터 확인 · 버프 정리)에서 고쳐 둔 상시/발동 · 본인/파티.
  // derive*Buffs가 저장소에서 직접 읽어 가지만, 고친 즉시 목록이 다시 만들어지도록
  // 여기서도 구독해 두고 아래 useMemo의 의존 목록에 넣는다.
  const weaponOverrides = useSyncExternalStore(
    subscribeWeaponBuffOverrides,
    getWeaponBuffOverrides,
  );
  const characterOverrides = useSyncExternalStore(
    subscribeCharacterBuffOverrides,
    getCharacterBuffOverrides,
  );
  const echoOverrides = useSyncExternalStore(subscribeEchoBuffOverrides, getEchoBuffOverrides);
  // 에코를 갈아끼우면 화음 세트 개수와 메인 에코가 달라진다. 저장소는 React 상태가 아니라
  // localStorage 한 벌이라, 저장될 때마다 올라가는 번호를 보고 다시 계산한다.
  const echoVersion = useSyncExternalStore(subscribeEchoStore, echoStoreVersion);

  /**
   * 주어진 캐릭터들이 파티에 앉았을 때 생기는 버프 목록.
   * 무기·체인·모드·에코는 지금 설정을 그대로 본다 — 사이클을 앉혀도 그쪽은 안 건드리기 때문이다.
   */
  const deriveBuffsFor = (characterIds: string[]): ManualBuff[] => {
    const members = characterIds
      .map((id) => {
        const character = characters.find((c) => c.id === id);
        if (!character) return null;
        return {
          character,
          config: {
            characterId: id,
            weaponId: characterWeapons[id]?.weaponId ?? "",
            echoIds: [],
            resonanceChain: characterChains[id] ?? 0,
            resonanceMode: characterModes[id] ?? character.resonanceModes?.[0],
          },
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    return [
      ...deriveCharacterBuffs(members, characterInherents),
      ...deriveWeaponBuffs(
        characterWeapons,
        members.map((m) => m.character.id),
      ),
      ...deriveEchoBuffs(members.map((m) => m.character.id)),
      ...anomalyStateBuffs(),
    ];
  };

  const buffIdsFor = (characterIds: string[]) =>
    new Set(deriveBuffsFor(characterIds).map((b) => b.id));

  // 파티에 앉은 캐릭터의 고유 버프와, 그 캐릭터가 낀 무기의 스킬 버프를 자동으로 합친다.
  // 편성·무기·정련·공명체인·공명 모드를 바꾸면 목록이 바로 따라온다.
  const allBuffs = useMemo(() => {
    const members = PARTY_SLOTS.map((slot) => {
      const memberConfig = config[slot];
      const character = characters.find((c) => c.id === memberConfig.characterId);
      if (!character) return null;
      // 공명체인·공명 모드는 캐릭터 관리 탭에서 정한 값을 쓴다.
      return {
        character,
        config: {
          ...memberConfig,
          resonanceChain: characterChains[character.id] ?? 0,
          resonanceMode: characterModes[character.id] ?? character.resonanceModes?.[0],
        },
      };
    }).filter((m): m is NonNullable<typeof m> => m !== null);

    return [
      ...manualBuffs,
      ...deriveCharacterBuffs(members, characterInherents),
      ...deriveWeaponBuffs(
        characterWeapons,
        members.map((m) => m.character.id),
      ),
      // 장착 에코에서 나오는 것 — 화음 세트는 맞춘 개수만큼, 어빌리티는 메인 슬롯 것만.
      ...deriveEchoBuffs(members.map((m) => m.character.id)),
      // 적에게 붙은 상태(암흑 효과)는 누가 붙였든 하나뿐이라 파티와 무관하게 늘 담는다.
      ...anomalyStateBuffs(),
    ];
  }, [
    manualBuffs,
    characterWeapons,
    characterChains,
    characterModes,
    // 고유 스킬을 켜고 끄면 그 스킬이 주는 버프도 목록에서 바로 빠져야 한다.
    characterInherents,
    weaponOverrides,
    characterOverrides,
    echoOverrides,
    echoVersion,
    config.mainDps,
    config.subDps,
    config.support,
  ]);

  const value: PartyConfigContextType = {
    config,
    characterWeapons,
    setCharacterWeapon,
    setWeaponRefine,
    setWeaponLevel,
    characterLevels,
    setCharacterLevel,
    characterNodes,
    toggleCharacterNode,
    setAllCharacterNodes,
    characterInherents,
    toggleCharacterInherent,
    characterChains,
    setCharacterChain,
    characterModes,
    setCharacterMode,
    characterSkillLevels,
    setSkillLevel,
    setAllSkillLevels,
    manualBuffs,
    allBuffs,
    addManualBuff,
    updateManualBuff,
    removeManualBuff,
    setConfig,
    addAttack,
    openCycle,
    addCycle,
    setAttackCycle,
    moveAttack,
    duplicateCycle,
    setAttackDamageType,
    removeAttack,
    duplicateAttack,
    addAttackAfter,
    clearRotation,
    toggleBuff,
    setBuffStacks,
    setAnomalyStacks,
    setAnomalyOccurrences,
    setDiscordRate,
    setDiscordOccurrences,
    setMainResonanceChain,
    setMainResonanceMode,
    toggleCharacter,
    clearSlot,
    swapSlots,
    assignCharacterToSlot,
    setEnemyLevel,
    setEnemyElement,
    setEnemyResPreset,
    editorConfig,
    editorToggleCharacter: editorOps.toggleCharacter,
    editorClearSlot: editorOps.clearSlot,
    editorSwapSlots: editorOps.swapSlots,
    editorAssignCharacterToSlot: editorOps.assignCharacterToSlot,
    sendEditorToCalculator,
    loadCalculatorIntoEditor,
    partyPresets,
    savePartyPreset,
    applyPartyPreset,
    renamePartyPreset,
    removePartyPreset,
    cyclePresets,
    saveCyclePreset,
    addCyclePreset,
    applyCyclePreset,
    renameCyclePreset,
    removeCyclePreset,
    currentCycleMembers,
    buffIdsFor,
  };

  return <PartyConfigContext.Provider value={value}>{children}</PartyConfigContext.Provider>;
}

export function usePartyConfig() {
  const context = useContext(PartyConfigContext);
  if (!context) {
    throw new Error("usePartyConfig must be used within PartyConfigProvider");
  }
  return context;
}
