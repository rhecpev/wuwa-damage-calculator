import { Fragment, useMemo, useState, useSyncExternalStore } from "react";
import type { DragEvent, HTMLAttributes } from "react";
import { usePersistedState } from "../../utils/usePersistedState";
import { anomalyStackCap, appliesTo } from "../../calculator/manualBuffs";
import { echoSkillOf } from "../../data/echoAttacks";
import { attackLabel, cardKind } from "../CalculatorPage/components/RotationSection";
import type { CalculationResult } from "../CalculatorPage/hooks/useCalculationResults";
import { PARTY_SLOTS, usePartyConfig } from "../../context/PartyConfigContext";
import type { GearOverride } from "../../context/PartyConfigContext";
import { computeResults } from "../CalculatorPage/hooks/useCalculationResults";
import {
  DamageBreakdownSection,
  buildDamageSnapshot,
} from "../CalculatorPage/components/DamageBreakdownSection";
import {
  echoStoreVersion,
  loadEchoLinks,
  loadMyEchoes,
  mainEchoOf,
  subscribeEchoStore,
} from "../../data/echoStore";
import type { EchoLink, MyEcho } from "../../data/echoStore";
import { loadMyWeapons, ownedStoreVersion, subscribeOwnedStore } from "../../data/ownedStore";
import { fetterGroupByName } from "../../data/echoes";
import { DEFAULT_WEAPON_LEVEL, weaponsById, weaponsFor } from "../../data/weapons";
import type { WeaponEntry } from "../../data/weapons";
import type { CyclePreset, DamageSnapshot } from "../../data/cyclePresets";
import { characters } from "../../data/sampleData";
import { num } from "../../utils/format";
import type {
  CharacterWeaponConfig,
  ManualBuff,
  PartyConfig,
  RotationAttack,
} from "../../types/game";

/**
 * 사이클 대미지 비교 — 안쪽 탭 둘.
 *
 *   사이클 VS 사이클      두 루틴을 나란히 놓고 총합·캐릭터별로 견준다.
 *                         담아 둔 사이클은 기본이 **저장 당시 값**(snapshot)이다 —
 *                         그 뒤에 자료가 바뀌어도 그때 숫자로 견준다. 지금 환경으로 다시 계산할 수도 있다.
 *   에코 · 무기 · 돌파 비교  한 캐릭터의 에코 슬롯 · 무기 · 정련 · 공명체인을 바꿔 끼우면 얼마나 달라지나.
 *
 * 계산은 계산 탭과 같은 함수(computeResults)를 쓰고 환경만 덮어써서 넘기므로,
 * 저장된 장착 상태는 건드리지 않는다 — 여기서 아무리 바꿔 봐도 원래대로 남는다.
 */
export function CycleComparePage() {
  // 탭을 오가도(바깥 탭으로 나갔다 와도) 보던 안쪽 탭이 남도록 저장해 둔다.
  const [tab, setTab] = usePersistedState<"cycles" | "gear">("compare.tab", "cycles");

  return (
    <>
      <div className="compare-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "cycles"}
          className={tab === "cycles" ? "on" : ""}
          onClick={() => setTab("cycles")}
        >
          사이클 VS 사이클
        </button>
        <button
          role="tab"
          aria-selected={tab === "gear"}
          className={tab === "gear" ? "on" : ""}
          onClick={() => setTab("gear")}
        >
          에코 · 무기 · 돌파 비교
        </button>
      </div>
      {tab === "cycles" ? <CycleVsCycle /> : <GearCompare />}
    </>
  );
}

const sign = (n: number) => (n > 0 ? "+" : "");
const deltaText = (before: number, after: number) => {
  const delta = after - before;
  if (delta === 0) return "—";
  const rate = before > 0 ? (after / before - 1) * 100 : 0;
  return `${sign(delta)}${num(Math.round(delta))} (${sign(rate)}${rate.toFixed(2)}%)`;
};

/** 비교표의 차이 칸 — 늘면 초록, 줄면 빨강. 부호를 같이 적어 색만으로 가르지 않는다. */
function DeltaCell({ before, after }: { before: number; after: number }) {
  const delta = after - before;
  if (Math.round(delta) === 0) return <td>—</td>;
  const rate = before > 0 ? (after / before - 1) * 100 : null;
  return (
    <td className={delta > 0 ? "up" : "down"}>
      {sign(delta)}
      {num(Math.round(delta))}
      {rate !== null && (
        <small>
          {sign(rate)}
          {rate.toFixed(2)}%
        </small>
      )}
    </td>
  );
}

/**
 * 두 판을 캐릭터별 · 공격 분류별로 맞댄 표. 사이클 VS 사이클과 에코 · 무기 · 돌파 비교가 같이 쓴다.
 * 캐릭터 줄 아래에 그래프의 도넛 조각(공격 분류)을 같은 이름끼리 맞대어 큰 것부터 붙인다.
 * 한쪽에만 있는 캐릭터 · 분류는 다른 쪽을 0으로 친다.
 */
function CompareTable({
  a,
  b,
  aHead = "A",
  bHead = "B",
}: {
  a: DamageSnapshot;
  b: DamageSnapshot;
  aHead?: string;
  bHead?: string;
}) {
  const ids = [
    ...new Set(
      [...a.members, ...b.members]
        .map((m) => m.characterId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const rows = ids.map((id) => {
    const x = a.members.find((m) => m.characterId === id);
    const y = b.members.find((m) => m.characterId === id);
    const names = [...new Set([...(x?.slices ?? []), ...(y?.slices ?? [])].map((s) => s.name))];
    const cats = names
      .map((name) => {
        const p = x?.slices.find((s) => s.name === name);
        const q = y?.slices.find((s) => s.name === name);
        return { name, color: (p ?? q)!.color, a: p?.value ?? 0, b: q?.value ?? 0 };
      })
      .sort((p, q) => Math.max(q.a, q.b) - Math.max(p.a, p.b));
    return {
      id,
      name: x?.name ?? y?.name ?? id,
      icon: characters.find((c) => c.id === id)?.iconUrl,
      a: x?.value ?? 0,
      b: y?.value ?? 0,
      cats,
    };
  });

  return (
    <table className="compare-table">
      <thead>
        <tr>
          <th />
          <th>{aHead}</th>
          <th>{bHead}</th>
          <th>차이</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Fragment key={row.id}>
            <tr className="compare-char">
              <td>
                <span className="compare-face">
                  {row.icon && <img src={row.icon} alt="" loading="lazy" />}
                  {row.name}
                </span>
              </td>
              <td>{num(row.a)}</td>
              <td>{num(row.b)}</td>
              <DeltaCell before={row.a} after={row.b} />
            </tr>
            {row.cats.map((cat) => (
              <tr key={cat.name} className="compare-cat">
                <td>
                  <i style={{ background: cat.color }} />
                  {cat.name}
                </td>
                <td>{num(cat.a)}</td>
                <td>{num(cat.b)}</td>
                <DeltaCell before={cat.a} after={cat.b} />
              </tr>
            ))}
          </Fragment>
        ))}
        <tr className="compare-total">
          <td>총합</td>
          <td>{num(a.total)}</td>
          <td>{num(b.total)}</td>
          <DeltaCell before={a.total} after={b.total} />
        </tr>
      </tbody>
    </table>
  );
}

/**
 * 사이클 한 벌을 돌리는 도구. 담아 둔 사이클이면 **그때 앉았던 파티**로 돌린다
 * — 지금 파티로 돌리면 다른 팀의 사이클은 캐릭터가 통째로 비어 버린다.
 */
function useCycleRunner() {
  const {
    config,
    allBuffs,
    buffsWith,
    characterWeapons,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
  } = usePartyConfig();

  /** 파티 세 자리의 캐릭터 id. 빈 자리는 "". */
  const partyOf = (preset: CyclePreset | null): string[] =>
    PARTY_SLOTS.map((slot) =>
      preset
        ? (preset.members.find((m) => m.slot === slot)?.characterId ?? "")
        : config[slot].characterId,
    );

  /** 이 환경의 버프 목록. 지금 루틴을 그대로 돌릴 때는 계산 탭과 같은 allBuffs를 쓴다. */
  const buffsOf = (preset: CyclePreset | null, override: GearOverride = {}): ManualBuff[] => {
    const plain = !override.weapons && !override.chains && !override.echoLinks;
    const base =
      !preset && plain ? allBuffs : buffsWith(partyOf(preset).filter(Boolean), override);
    // 담아 둔 사이클의 손 버프 중 지금 목록에 없는 것만 보탠다.
    return preset
      ? [...base, ...preset.manualBuffs.filter((b) => !base.some((a) => a.id === b.id))]
      : base;
  };

  const run = (
    preset: CyclePreset | null,
    override: GearOverride = {},
    rotation?: RotationAttack[],
  ) => {
    const partyIds = partyOf(preset);
    const cfg: PartyConfig = {
      ...config,
      ...Object.fromEntries(
        PARTY_SLOTS.map((slot, i) => [slot, { ...config[slot], characterId: partyIds[i] }]),
      ),
      rotation: rotation ?? preset?.rotation ?? config.rotation,
      enemy: preset?.enemy ?? config.enemy,
    };
    const buffs = buffsOf(preset, override);
    const results = computeResults(
      cfg,
      override.weapons ?? characterWeapons,
      buffs,
      override.chains ?? characterChains,
      characterSkillLevels,
      characterLevels,
      characterNodes,
      override.echoLinks,
    );
    return { results, partyIds, buffs, snapshot: buildDamageSnapshot(results, partyIds) };
  };

  return { run, buffsOf, partyOf };
}

// ── 사이클 VS 사이클 ─────────────────────────────────────────────

function CycleVsCycle() {
  const {
    cyclePresets,
    config,
    allBuffs,
    characterWeapons,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
  } = usePartyConfig();
  const { run } = useCycleRunner();

  // 탭을 오가도 고른 것이 남도록 저장해 둔다. 지워진 사이클 id는 「지금 루틴」으로 떨어진다.
  /** "" 이면 지금 계산 중인 루틴. */
  const [aId, setAId] = usePersistedState("compare.vs.a", "");
  const [bId, setBId] = usePersistedState("compare.vs.b", cyclePresets[0]?.id ?? "");
  /** 담아 둔 사이클을 저장 당시 값으로 볼지, 지금 환경으로 다시 계산할지. */
  const [mode, setMode] = usePersistedState<"saved" | "now">("compare.vs.mode", "saved");

  const view = useMemo(() => {
    const sideOf = (id: string): { name: string; note: string; snapshot: DamageSnapshot } => {
      const preset = cyclePresets.find((p) => p.id === id) ?? null;
      if (preset && mode === "saved" && preset.snapshot) {
        return {
          name: preset.name,
          note: `저장 당시 · ${new Date(preset.savedAt).toLocaleDateString("ko-KR")}`,
          snapshot: preset.snapshot,
        };
      }
      return {
        name: preset ? preset.name : "지금 계산 중인 루틴",
        note: !preset
          ? "계산 탭 그대로"
          : mode === "saved"
            ? "저장 당시 값이 없어 지금 환경으로 계산"
            : "지금 환경으로 다시 계산",
        snapshot: run(preset).snapshot,
      };
    };
    return { a: sideOf(aId), b: sideOf(bId) };
    // run은 아래 값들로만 결과가 달라진다.
  }, [
    aId,
    bId,
    mode,
    cyclePresets,
    config,
    allBuffs,
    characterWeapons,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
  ]);

  const options = (
    <>
      <option value="">지금 계산 중인 루틴</option>
      {cyclePresets.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.snapshot ? "" : " (저장 당시 값 없음)"}
        </option>
      ))}
    </>
  );

  return (
    <>
      <section className="panel">
        <div className="row">
          <div>
            <h2>사이클 VS 사이클</h2>
          </div>
        </div>

        <p className="enemy-hint">
          {mode === "saved"
            ? "담아 둔 사이클은 저장할 때 박아 둔 피해로 견줍니다 — 그 뒤에 계수 · 버프 · 장비가 바뀌어도 그때 숫자 그대로입니다."
            : "담아 둔 사이클도 지금 무기 · 체인 · 에코로 다시 계산합니다 — 같은 장비에서 루틴만 견줄 때 씁니다."}
          {cyclePresets.length === 0 &&
            " 담아 둔 사이클이 없습니다. 계산 탭에서 「사이클 저장」을 누르면 여기서 고를 수 있습니다."}
        </p>

      </section>

      {/* A 그래프 · 가운데 캐릭터 비교표 · B 그래프. 좁은 화면에서는 이 순서로 위아래로 쌓인다. */}
      <div className="compare-vs">
        {/* 사이클 고르는 칸은 그 그래프 바로 위에 붙인다 — 어느 쪽을 바꾸는지 눈으로 바로 잇도록. */}
        <div className="compare-side">
          <label className="compare-pick compare-pick-a">
            <em>A</em>
            <select value={aId} onChange={(event) => setAId(event.target.value)}>
              {options}
            </select>
          </label>
          <DamageBreakdownSection
            stacked
            snapshot={view.a.snapshot}
            title={`A · ${view.a.name}`}
            note={`${view.a.note} · 총 ${num(view.a.snapshot.total)}`}
          />
        </div>

        <div className="compare-side compare-mid-col">
          {/* 가운데 머리 — 양옆 선택 칸과 높이가 같아 표의 윗선이 그래프와 맞는다. */}
          <label className="compare-pick">
            <em>담아 둔 사이클</em>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as "saved" | "now")}
            >
              <option value="saved">저장 당시 값</option>
              <option value="now">지금 환경으로 다시 계산</option>
            </select>
          </label>
        <section className="panel compare-mid">
          <h2>A → B</h2>
          <span className="enemy-hint">캐릭터마다 A(전) · B(후)와 차이, 그 아래는 공격 분류별입니다.</span>
          <CompareTable a={view.a.snapshot} b={view.b.snapshot} />
        </section>
        </div>

        <div className="compare-side">
          <label className="compare-pick compare-pick-b">
            <em>B</em>
            <select value={bId} onChange={(event) => setBId(event.target.value)}>
              {options}
            </select>
          </label>
          <DamageBreakdownSection
            stacked
            snapshot={view.b.snapshot}
            title={`B · ${view.b.name}`}
            note={`${view.b.note} · 총 ${num(view.b.snapshot.total)}`}
          />
        </div>
      </div>
    </>
  );
}

// ── 에코 · 무기 · 돌파 비교 ──────────────────────────────────────

/** 캐릭터 한 명에게 바꿔 끼운 것. 비어 있는 칸은 지금 장비 그대로다. */
interface GearChange {
  chain?: number;
  weapon?: CharacterWeaponConfig;
  /** 슬롯 번호(0~4) → 바꿔 낄 보유 에코 pk. */
  echoes?: Record<number, number>;
}

/** 이 탭에서 만진 것 전부. 탭을 오가거나 새로 고쳐도 남도록 통째로 저장한다. */
interface GearState {
  baseId: string;
  gear: Record<string, GearChange>;
  /** 바꾼 뒤 루틴 — 추가된 버프를 켠 것 · 끼워 넣은 공격이 여기 담긴다. null이면 기준 루틴 그대로. */
  rotation: RotationAttack[] | null;
  /** 위 루틴을 만들 때의 기준 루틴 모양. 기준이 달라졌으면 옛 편집은 버린다. */
  baseKey: string;
  /** 적용 공격 설정을 마친 추가 버프 id. */
  doneBuffs: string[];
  /** 사이클에 끼워 넣기를 마친 추가 공격(`캐릭터id|공격id`). */
  doneAttacks: string[];
}

const EMPTY_GEAR: GearState = {
  baseId: "",
  gear: {},
  rotation: null,
  baseKey: "",
  doneBuffs: [],
  doneAttacks: [],
};

/** 설정 창 — 추가된 버프의 적용 공격 고르기, 또는 추가된 공격을 루틴에 끼워 넣기. */
type GearDialog =
  | { kind: "buff"; buffId: string }
  | { kind: "attack"; characterId: string; attackId: string };

/** 무기 변경 창의 한 칸 — 보유한 자루(정련·레벨이 저마다 다르다) 또는 도감의 무기. */
interface WeaponChoice {
  key: string;
  weapon: WeaponEntry;
  refine: number;
  level: number;
}

const CHAIN_LEVELS = [0, 1, 2, 3, 4, 5, 6];
const SLOTS = [0, 1, 2, 3, 4];
/** 바꾼 기록에서 「그 자리를 비웠다」를 뜻하는 값. 보유 에코 pk는 1부터라 겹치지 않는다. */
const EMPTY_SLOT = -1;

/** 그 에코에 골라 둔 화음 세트. 아이콘은 에코에 딸린 것을 먼저, 없으면 도감에서 찾는다. */
function setOf(echo: MyEcho): { name: string; icon?: string } | null {
  const name = (echo.options as { selectedFetter?: string } | undefined)?.selectedFetter;
  if (!name) return null;
  return {
    name,
    icon:
      echo.fetterGroups?.find((g) => g.name === name)?.icon ??
      fetterGroupByName(name)?.icon ??
      undefined,
  };
}

/** 옵션 한 줄. 라벨 끝의 「(%)」는 떼고 값 뒤에 %를 붙인다 — 「공격력 33%」. */
function optionText(type?: string, value?: string | number): string {
  if (!type) return "";
  const percent = type.endsWith("(%)");
  return `${type.replace("(%)", "")} ${value ?? ""}${percent ? "%" : ""}`;
}

interface EchoOptions {
  mainOption?: { type?: string; value?: string | number };
  mainSubOption?: { type?: string; value?: string | number };
  /** 부옵션 종류 다섯 줄. 값은 같은 자리의 subSelects에 있다. */
  mainSelects?: string[];
  subSelects?: (string | number)[];
}

/** 주옵션 한 줄 — 카드의 에코 줄에 쓴다. */
function mainOptionText(echo: MyEcho): string {
  const o = echo.options as EchoOptions | undefined;
  return optionText(o?.mainOption?.type, o?.mainOption?.value);
}

/** 에코 교체 창에 쓰는 자세한 옵션 — 주옵션 · 메인 서브옵션 · 부옵션 다섯 줄. */
function echoDetail(echo: MyEcho) {
  const o = echo.options as EchoOptions | undefined;
  return {
    main: optionText(o?.mainOption?.type, o?.mainOption?.value),
    mainSub: optionText(o?.mainSubOption?.type, o?.mainSubOption?.value),
    subs: (o?.mainSelects ?? [])
      .map((type, i) => optionText(type, o?.subSelects?.[i]))
      .filter(Boolean),
  };
}

interface RoutineCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  kind: string;
  icon?: string;
  value?: number;
}

/** 루틴 카드 한 장 — 계산 탭 루틴 카드와 같은 모양(분류 색 · 얼굴 · 이름 · 기대 피해). */
function RoutineCard({ label, kind, icon, value, className = "", ...rest }: RoutineCardProps) {
  return (
    <div className={`card kind-${kind} ${className}`} {...rest}>
      <span className="card-head">
        {icon && <img className="card-face" src={icon} alt="" loading="lazy" draggable={false} />}
        <span className="card-title">{label}</span>
      </span>
      <span className="card-exp">{value === undefined ? "—" : num(value)}</span>
    </div>
  );
}

/**
 * 바꾼 뒤 루틴의 공격 한 대에 걸 수 있는 버프 목록 — 켜고 끄기와 스택.
 * 계산 탭 버프 창과 같은 규칙이다. 상시는 기본으로 걸려 있고 끄면 이 공격에서만 빠진다.
 * 추가된 버프(focusId)는 맨 위에 올리고 테두리로 짚어 준다.
 */
function ScenarioBuffs({
  item,
  result,
  buffs,
  focusId,
  onToggle,
  onStacks,
}: {
  item: RotationAttack;
  result: CalculationResult;
  buffs: ManualBuff[];
  focusId?: string;
  onToggle: (buff: ManualBuff) => void;
  onStacks: (buffId: string, stacks: number) => void;
}) {
  const usable = buffs
    .filter((b) => appliesTo(b, result.attack, result.character.id))
    .sort(
      (x, y) =>
        Number(y.id === focusId) - Number(x.id === focusId) ||
        Number(x.uptime === "passive") - Number(y.uptime === "passive"),
    );
  if (usable.length === 0) {
    return <p className="enemy-hint">이 공격에 걸릴 수 있는 버프가 없습니다.</p>;
  }

  return (
    <div className="buffs gear-buffs">
      {usable.map((buff) => {
        const always = buff.uptime === "passive";
        const off = item.disabledBuffIds?.includes(buff.id) ?? false;
        const checked = always ? !off : item.enabledBuffIds.includes(buff.id);
        const max = buff.anomalyStacks
          ? anomalyStackCap(buff.anomalyStacks, buffs, item.enabledBuffIds, item.disabledBuffIds)
              .max
          : (buff.maxStacks ?? 1);
        const stacks = item.buffStacks?.[buff.id] ?? buff.stacks;
        return (
          <label
            key={buff.id}
            className={[checked ? "on" : "", buff.id === focusId ? "focus" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <input type="checkbox" checked={checked} onChange={() => onToggle(buff)} />
            <span>
              <b>
                {buff.label}{" "}
                {max > 1 && (
                  <em
                    className="buff-stacks"
                    // 라벨 안이라 그냥 두면 클릭이 체크박스로 새어 나간다.
                    onClick={(event) => event.preventDefault()}
                  >
                    스택
                    <select
                      value={stacks}
                      onChange={(event) => onStacks(buff.id, Number(event.target.value))}
                    >
                      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    / {max}
                  </em>
                )}
              </b>
              <small>
                {always ? (off ? "상시(이 공격에서 끔)" : "상시") : "발동"}
                {buff.id === focusId && " · 추가된 버프"}
              </small>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function GearCompare() {
  const {
    config,
    allBuffs,
    characterWeapons,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
    cyclePresets,
  } = usePartyConfig();
  const { run, partyOf } = useCycleRunner();

  // 에코 · 보유 무기 저장소는 React 상태가 아니라 localStorage 한 벌이다 — 바뀌면 다시 읽는다.
  const echoVersion = useSyncExternalStore(subscribeEchoStore, echoStoreVersion);
  const ownedVersion = useSyncExternalStore(subscribeOwnedStore, ownedStoreVersion);
  const links = useMemo(() => loadEchoLinks(), [echoVersion]);
  const ownedEchoes = useMemo(() => loadMyEchoes(), [echoVersion]);
  const myWeapons = useMemo(() => loadMyWeapons(), [ownedVersion]);

  // 탭을 오가도, 새로 고쳐도 남도록 저장해 둔다.
  const [state, setState] = usePersistedState<GearState>("compare.gear", EMPTY_GEAR);
  /** 무기 변경 창을 연 캐릭터. */
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  /** 무기 변경 창에서 도감 전체를 볼지. 기본은 무기 관리 탭에 담아 둔(보유한) 것만. */
  const [allWeapons, setAllWeapons] = useState(false);
  /** 에코 교체 창을 연 자리. */
  const [echoPick, setEchoPick] = useState<{ characterId: string; slot: number } | null>(null);
  const [echoQuery, setEchoQuery] = useState("");
  /** 설정 창과, 그 안에서 고른 루틴 카드. */
  const [dialog, setDialog] = useState<GearDialog | null>(null);
  const [focusItem, setFocusItem] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const preset = cyclePresets.find((p) => p.id === state.baseId) ?? null;
  const baseRotation = preset?.rotation ?? config.rotation;
  const sourceName = preset ? preset.name : "지금 계산 중인 루틴";
  const partyIds = partyOf(preset);
  // 기준 루틴의 모양(자리 · 공격). 이게 바뀌었으면 저장해 둔 바꾼 뒤 루틴은 옛것이라 버린다.
  const baseKey = `${state.baseId}#${baseRotation.map((r) => `${r.id}:${r.attackId}`).join("|")}`;
  const edited = state.rotation && state.baseKey === baseKey ? state.rotation : null;
  const afterRotation = edited ?? baseRotation;
  const isInserted = (itemId: string) => !baseRotation.some((b) => b.id === itemId);

  const updateRotation = (fn: (rot: RotationAttack[]) => RotationAttack[]) =>
    setState((s) => ({
      ...s,
      baseKey,
      rotation: fn(s.rotation && s.baseKey === baseKey ? s.rotation : baseRotation),
    }));

  // ── 캐릭터별로 바꿔 끼운 것 ──
  const curWeaponOf = (id: string) => characterWeapons[id];
  const curChainOf = (id: string) => characterChains[id] ?? 0;
  const weaponOf = (id: string) => state.gear[id]?.weapon ?? curWeaponOf(id);
  const chainOf = (id: string) => state.gear[id]?.chain ?? curChainOf(id);
  const sameWeapon = (x?: CharacterWeaponConfig, y?: CharacterWeaponConfig) =>
    (x?.weaponId ?? "") === (y?.weaponId ?? "") &&
    (x?.refine ?? 1) === (y?.refine ?? 1) &&
    (x?.level ?? DEFAULT_WEAPON_LEVEL) === (y?.level ?? DEFAULT_WEAPON_LEVEL);
  const weaponChanged = (id: string) =>
    !!state.gear[id]?.weapon && !sameWeapon(state.gear[id].weapon, curWeaponOf(id));
  const chainChanged = (id: string) =>
    state.gear[id]?.chain !== undefined && state.gear[id].chain !== curChainOf(id);

  /** 지금 낀 에코 pk 다섯 자리. 연결 순서가 곧 슬롯 순서다(첫 자리가 메인). */
  const wornOf = (id: string) => {
    const pks = links.filter((l) => l.characterId === id).map((l) => l.echoId);
    return SLOTS.map((slot) => pks[slot] as number | undefined);
  };
  const echoPkAfter = (id: string, slot: number) => {
    const picked = state.gear[id]?.echoes?.[slot];
    return picked === EMPTY_SLOT ? undefined : (picked ?? wornOf(id)[slot]);
  };
  const echoByPk = (pk?: number) =>
    pk === undefined ? undefined : ownedEchoes.find((e) => e.pk === pk);
  const echoChanged = (id: string) => Object.keys(state.gear[id]?.echoes ?? {}).length > 0;

  const setChange = (id: string, patch: GearChange) =>
    setState((s) => ({ ...s, gear: { ...s.gear, [id]: { ...s.gear[id], ...patch } } }));
  /**
   * 그 자리에 에코를 앉힌다. 같은 캐릭터의 다른 자리에 이미 있는 에코면 두 자리를 맞바꾼다
   * (3번 자리에서 1번에 낀 에코를 고르면 1번과 3번이 서로 바뀐다). pk가 undefined면 비운다.
   * 원래 낀 것과 같아진 자리는 바꾼 기록을 지운다.
   */
  const setEcho = (id: string, slot: number, pk: number | undefined) =>
    setState((s) => {
      const worn = wornOf(id);
      const echoes = { ...(s.gear[id]?.echoes ?? {}) };
      const cur = (sl: number) => {
        const picked = echoes[sl];
        return picked === EMPTY_SLOT ? undefined : (picked ?? worn[sl]);
      };
      const put = (sl: number, value: number | undefined) => {
        if (value === worn[sl]) delete echoes[sl];
        else echoes[sl] = value ?? EMPTY_SLOT;
      };
      const from = pk === undefined ? undefined : SLOTS.find((sl) => sl !== slot && cur(sl) === pk);
      const prev = cur(slot);
      put(slot, pk);
      if (from !== undefined) put(from, prev);
      return { ...s, gear: { ...s.gear, [id]: { ...s.gear[id], echoes } } };
    });
  const resetChar = (id: string) =>
    setState((s) => {
      const gear = { ...s.gear };
      delete gear[id];
      return { ...s, gear };
    });

  const view = useMemo(() => {
    if (baseRotation.length === 0) return null;

    const ids = partyIds.filter(Boolean);
    const weaponIds = ids.filter(weaponChanged);
    const chainIds = ids.filter(chainChanged);
    const echoIds = ids.filter(echoChanged);
    // 에코를 바꾼 캐릭터는 다섯 자리를 슬롯 순서대로 다시 잇는다(첫 자리가 메인이라 순서가 중요하다).
    const afterLinks: EchoLink[] | undefined = echoIds.length
      ? [
          ...links.filter((l) => !echoIds.includes(l.characterId)),
          ...echoIds.flatMap((id) =>
            SLOTS.map((slot) => echoPkAfter(id, slot))
              .filter((pk): pk is number => pk !== undefined)
              .map((pk) => ({ characterId: id, echoId: pk })),
          ),
        ]
      : undefined;

    const override: GearOverride = {
      ...(weaponIds.length
        ? {
            weapons: {
              ...characterWeapons,
              ...Object.fromEntries(weaponIds.map((id) => [id, state.gear[id].weapon!])),
            },
          }
        : {}),
      ...(chainIds.length
        ? {
            chains: {
              ...characterChains,
              ...Object.fromEntries(chainIds.map((id) => [id, state.gear[id].chain!])),
            },
          }
        : {}),
      ...(afterLinks ? { echoLinks: afterLinks } : {}),
    };

    const before = run(preset);
    const after = run(preset, override, afterRotation);
    const changed = weaponIds.length + chainIds.length + echoIds.length > 0 || edited !== null;

    // 새로 생긴 버프 — 바꾼 무기 · 새로 열린 체인 · 바뀐 화음 · 어빌리티에서 나온 것.
    // 사라진 버프는 목록에서 저절로 빠지고, 루틴에 남은 그 체크는 아무것도 가리키지 않게 된다.
    const beforeIds = new Set(before.buffs.map((b) => b.id));
    const fresh = after.buffs.filter((b) => !beforeIds.has(b.id));

    // 새로 생긴 공격 — 메인 에코가 바뀌면 그 에코의 어빌리티 공격이 생긴다.
    // 옛 메인 에코의 공격은 계산에서 저절로 빠진다(computeResults가 못 찾으면 건너뛴다).
    const freshAttacks = ids.flatMap((id) => {
      const was = mainEchoOf(id, links, ownedEchoes);
      const now = mainEchoOf(id, afterLinks ?? links, ownedEchoes);
      if (!now || now.id === was?.id) return [];
      const skill = echoSkillOf(now.id, now.iconUrl, id);
      return (skill?.attacks ?? []).map((attack) => ({ characterId: id, attack }));
    });

    return {
      before: before.snapshot,
      after: after.snapshot,
      changed,
      fresh,
      freshAttacks,
      afterBuffs: after.buffs,
      resultsById: new Map(after.results.map((r) => [r.item.id, r])),
    };
  }, [
    state,
    preset,
    baseRotation,
    links,
    ownedEchoes,
    config,
    allBuffs,
    characterWeapons,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
  ]);

  // ── 바꾼 뒤 루틴 편집 — 버프 켜기 · 스택 · 공격 끼워 넣기 ──
  const toggleIn = (itemId: string, buff: ManualBuff) =>
    updateRotation((rot) =>
      rot.map((it) => {
        if (it.id !== itemId) return it;
        if (buff.uptime === "passive") {
          const off = new Set(it.disabledBuffIds ?? []);
          if (off.has(buff.id)) off.delete(buff.id);
          else off.add(buff.id);
          return { ...it, disabledBuffIds: [...off] };
        }
        const on = it.enabledBuffIds.includes(buff.id);
        let enabled = on
          ? it.enabledBuffIds.filter((x) => x !== buff.id)
          : [...it.enabledBuffIds, buff.id];
        // 같은 묶음(「HP 60% 이상/미만」 따위)은 하나만 켜진다.
        if (!on && buff.exclusiveGroup) {
          const same = new Set(
            (view?.afterBuffs ?? [])
              .filter((b) => b.exclusiveGroup === buff.exclusiveGroup && b.id !== buff.id)
              .map((b) => b.id),
          );
          enabled = enabled.filter((x) => !same.has(x));
        }
        return { ...it, enabledBuffIds: enabled };
      }),
    );
  const setStacksIn = (itemId: string, buffId: string, stacks: number) =>
    updateRotation((rot) =>
      rot.map((it) =>
        it.id === itemId ? { ...it, buffStacks: { ...it.buffStacks, [buffId]: stacks } } : it,
      ),
    );

  const insertedFor = (characterId: string, attackId: string) =>
    afterRotation.find(
      (it) => it.characterId === characterId && it.attackId === attackId && isInserted(it.id),
    );

  /** 추가된 공격을 그 카드 앞에(없으면 맨 뒤에) 끼운다. 이미 끼웠으면 그 자리로 옮긴다. */
  const insertAttack = (beforeItemId: string | null) => {
    if (dialog?.kind !== "attack") return;
    const { characterId, attackId } = dialog;
    const existing = insertedFor(characterId, attackId);
    const newId = existing?.id ?? crypto.randomUUID();
    updateRotation((rot) => {
      const next = rot.filter((it) => it.id !== newId);
      const found = beforeItemId ? next.findIndex((it) => it.id === beforeItemId) : -1;
      const at = found < 0 ? next.length : found;
      // 끼운 자리의 사이클을 따라간다 — 맨 뒤면 마지막 카드의 사이클.
      const neighbor = next[at] ?? next[next.length - 1];
      const item: RotationAttack = existing
        ? { ...existing, cycle: neighbor?.cycle ?? 1 }
        : { id: newId, attackId, characterId, cycle: neighbor?.cycle ?? 1, enabledBuffIds: [] };
      next.splice(at, 0, item);
      return next;
    });
    setFocusItem(newId);
  };

  const closeDialog = () => {
    setDialog(null);
    setFocusItem(null);
    setDragOver(null);
  };
  const markBuffDone = (buffId: string) =>
    setState((s) => ({ ...s, doneBuffs: [...new Set([...s.doneBuffs, buffId])] }));
  const markAttackDone = (key: string) =>
    setState((s) => ({ ...s, doneAttacks: [...new Set([...s.doneAttacks, key])] }));

  // ── 무기 변경 창 ──
  const picking = pickingFor ? characters.find((c) => c.id === pickingFor) : undefined;
  const pickingType = picking ? weaponsFor(picking.weaponType) : [];
  const choices: WeaponChoice[] = !picking
    ? []
    : allWeapons
      ? pickingType.map((w) => ({
          key: `all-${w.id}`,
          weapon: w,
          refine: 1,
          level: DEFAULT_WEAPON_LEVEL,
        }))
      : myWeapons
          .flatMap((m) => {
            const w = weaponsById.get(m.weaponId);
            return w && w.weaponType === picking.weaponType
              ? [{ key: `pk-${m.pk}`, weapon: w, refine: m.refine, level: m.level }]
              : [];
          })
          .sort(
            (x, y) =>
              y.weapon.rarity - x.weapon.rarity || x.weapon.name.localeCompare(y.weapon.name),
          );

  // ── 에코 교체 창 ──
  // 바꾼 뒤 기준으로 누가 어느 에코를 끼고 있는지. 한 에코는 한 자리에만 낄 수 있어서,
  // 남(파티 밖 캐릭터 포함)이 낀 에코는 고를 수 없고, 같은 캐릭터의 다른 자리 것은 자리를 맞바꾼다.
  const echoOwner = new Map<number, string>();
  for (const l of links) if (!partyIds.includes(l.characterId)) echoOwner.set(l.echoId, l.characterId);
  for (const id of partyIds.filter(Boolean)) {
    for (const slot of SLOTS) {
      const pk = echoPkAfter(id, slot);
      if (pk !== undefined) echoOwner.set(pk, id);
    }
  }
  const needle = echoQuery.trim().toLowerCase();
  // 이 캐릭터가 낀 것 → 아무도 안 낀 것 → 남이 낀 것(고를 수 없음) 순서.
  const echoRank = (pk: number) => {
    const holder = echoOwner.get(pk);
    if (holder === echoPick?.characterId) return 0;
    return holder ? 2 : 1;
  };
  const echoChoices = ownedEchoes
    .filter((e) => {
      if (!needle) return true;
      return (
        e.name.toLowerCase().includes(needle) ||
        (setOf(e)?.name.toLowerCase().includes(needle) ?? false)
      );
    })
    .sort((x, y) => echoRank(x.pk) - echoRank(y.pk));

  // ── 설정 창 ──
  const dialogBuff =
    dialog?.kind === "buff" ? view?.afterBuffs.find((b) => b.id === dialog.buffId) : undefined;
  const dialogAttack =
    dialog?.kind === "attack"
      ? view?.freshAttacks.find(
          (a) => a.characterId === dialog.characterId && a.attack.id === dialog.attackId,
        )
      : undefined;
  const dialogInserted =
    dialog?.kind === "attack" ? insertedFor(dialog.characterId, dialog.attackId) : undefined;
  const focusRotationItem = focusItem ? afterRotation.find((it) => it.id === focusItem) : undefined;
  const focusResult = focusItem ? view?.resultsById.get(focusItem) : undefined;
  const cycles = [...new Set(afterRotation.map((it) => it.cycle ?? 1))];

  /** 끌어다 놓기 받는 쪽 — 공격 끼워 넣기 창에서만 쓴다. */
  const dropProps = (key: string, target: string | null) => ({
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (dragOver !== key) setDragOver(key);
    },
    onDragLeave: () => setDragOver((cur) => (cur === key ? null : cur)),
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(null);
      insertAttack(target);
    },
  });

  return (
    <>
      {/* ── 위: 파티 세 자리를 가로로 삼등분. 캐릭터마다 돌파 · 무기 · 에코를 카드 안에서 바꾼다. ── */}
      <section className="panel">
        <div className="row">
          <div>
            <h2>에코 · 무기 · 돌파 비교</h2>
          </div>
          <div className="compare-picks">
            <label>
              <em>기준</em>
              <select
                value={state.baseId}
                onChange={(event) => setState({ ...EMPTY_GEAR, baseId: event.target.value })}
              >
                <option value="">지금 계산 중인 루틴</option>
                {cyclePresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {view?.changed && (
              <button
                className="pen"
                title="바꾼 장비 · 버프 설정 · 끼워 넣은 공격을 전부 되돌린다"
                onClick={() => setState({ ...EMPTY_GEAR, baseId: state.baseId })}
              >
                전체 되돌리기
              </button>
            )}
          </div>
        </div>

        {baseRotation.length === 0 && (
          <p className="enemy-hint">
            담긴 공격이 없습니다. 「데미지 계산」 탭에서 루틴을 짜거나, 위에서 담아 둔 사이클을
            고르세요.
          </p>
        )}

        <div className="gear-party">
          {partyIds.map((id, index) => {
            const character = characters.find((c) => c.id === id);
            if (!character) {
              return (
                <div key={index} className="gear-member empty">
                  <div className="gear-head">
                    <span className="gear-face-blank">—</span>
                    <b>{index + 1}번 자리 비어 있음</b>
                  </div>
                </div>
              );
            }
            const weapon = weaponOf(id);
            const entry = weapon ? weaponsById.get(weapon.weaponId) : undefined;
            const chain = chainOf(id);
            const changed = weaponChanged(id) || chainChanged(id) || echoChanged(id);
            const addedBuffs = view?.fresh.filter((b) => b.ownerId === id) ?? [];
            const addedAttacks = view?.freshAttacks.filter((a) => a.characterId === id) ?? [];

            return (
              <div key={id} className={changed ? "gear-member changed" : "gear-member"}>
                {/* 위 — 왼쪽 큰 칸에 얼굴 · 이름, 오른쪽에 돌파 드롭다운과 무기. */}
                <div className="gear-top">
                  <div className="gear-head">
                    {character.iconUrl ? (
                      <img src={character.iconUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="gear-face-blank">{character.name[0]}</span>
                    )}
                    <b>{character.name}</b>
                  </div>

                  <div className="gear-top-side">
                    <label
                      className={chainChanged(id) ? "gear-chain-select on" : "gear-chain-select"}
                    >
                      <em>돌파</em>
                      <select
                        value={chain}
                        onChange={(event) => setChange(id, { chain: Number(event.target.value) })}
                      >
                        {CHAIN_LEVELS.map((n) => (
                          <option key={n} value={n}>
                            {n}돌{n === curChainOf(id) ? " (원래)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/* 무기 — 아이콘 · 이름 · 재련, 오른쪽의 변경을 누르면 보유 무기에서 고른다. */}
                    <div
                      className={weaponChanged(id) ? "gear-weapon on" : "gear-weapon"}
                      title={
                        weaponChanged(id)
                          ? `원래 ${weaponsById.get(curWeaponOf(id)?.weaponId ?? "")?.name ?? "무기 없음"}`
                          : undefined
                      }
                    >
                      {entry ? (
                        <img src={entry.icon} alt="" loading="lazy" />
                      ) : (
                        <span className="gear-weapon-blank" />
                      )}
                      <span>
                        <b>{entry?.name ?? "무기 없음"}</b>
                        {weapon && (
                          <small>
                            {weapon.refine}재련 · Lv.{weapon.level ?? DEFAULT_WEAPON_LEVEL}
                          </small>
                        )}
                      </span>
                      <button onClick={() => setPickingFor(id)}>변경</button>
                    </div>
                  </div>
                </div>

                {/* 에코 — 다섯 줄. 아이콘 · 이름 · 주옵션 · 화음 세트. 누르면 보유 에코로 교체. */}
                <div>
                  <ul className="gear-echo-rows">
                    {SLOTS.map((slot) => {
                      const echo = echoByPk(echoPkAfter(id, slot));
                      const set = echo ? setOf(echo) : null;
                      const swapped = state.gear[id]?.echoes?.[slot] !== undefined;
                      return (
                        <li key={slot}>
                          <button
                            className={swapped ? "on" : ""}
                            title={swapped ? "바꾼 자리 — 누르면 다시 고른다" : "눌러서 교체"}
                            onClick={() => {
                              setEchoPick({ characterId: id, slot });
                              setEchoQuery("");
                            }}
                          >
                            {echo?.iconUrl ? (
                              <img className="gear-echo-icon" src={echo.iconUrl} alt="" loading="lazy" />
                            ) : (
                              <span className="gear-echo-blank" />
                            )}
                            <b>{echo?.name ?? (slot === 0 ? "메인 · 빈 슬롯" : "빈 슬롯")}</b>
                            {echo && <small className="gear-echo-main">{mainOptionText(echo)}</small>}
                            {set && (
                              <span className="gear-echo-set">
                                {set.icon && <img src={set.icon} alt="" loading="lazy" />}
                                <small>{set.name}</small>
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* 추가된 버프 — 상시는 그냥 반영, 발동은 어느 공격에 걸지 골라야 끝난다. */}
                {addedBuffs.length > 0 && (
                  <div>
                    <em className="gear-label">추가된 버프 {addedBuffs.length}개</em>
                    <ul className="gear-added">
                      {addedBuffs.map((buff) => {
                        const auto = buff.uptime === "passive";
                        const done = auto || state.doneBuffs.includes(buff.id);
                        return (
                          <li key={buff.id} className={done ? "done" : ""}>
                            <span className="gear-added-mark">{done ? "✓" : "!"}</span>
                            <span className="gear-added-name">
                              <b title={buff.label}>{buff.label}</b>
                              <small>
                                {auto
                                  ? "상시 · 자동 반영"
                                  : done
                                    ? "발동 · 적용 공격 설정 완료"
                                    : "발동 · 적용할 공격을 골라 주세요"}
                              </small>
                            </span>
                            {!auto && (
                              <button
                                onClick={() => {
                                  setDialog({ kind: "buff", buffId: buff.id });
                                  setFocusItem(null);
                                }}
                              >
                                적용 공격 선택
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* 추가된 공격 — 새 메인 에코의 어빌리티. 루틴의 원하는 자리에 끼워 넣어야 끝난다. */}
                {addedAttacks.length > 0 && (
                  <div>
                    <em className="gear-label">추가된 공격 {addedAttacks.length}개</em>
                    <ul className="gear-added">
                      {addedAttacks.map(({ attack }) => {
                        const key = `${id}|${attack.id}`;
                        const done =
                          state.doneAttacks.includes(key) && !!insertedFor(id, attack.id);
                        return (
                          <li key={attack.id} className={done ? "done" : ""}>
                            <span className="gear-added-mark">{done ? "✓" : "!"}</span>
                            <span className="gear-added-name">
                              <b title={attack.name}>{attackLabel(attack.name)}</b>
                              <small>{done ? "사이클에 추가 완료" : "아직 루틴에 없습니다"}</small>
                            </span>
                            <button
                              onClick={() => {
                                setDialog({ kind: "attack", characterId: id, attackId: attack.id });
                                setFocusItem(insertedFor(id, attack.id)?.id ?? null);
                              }}
                            >
                              사이클에 추가
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {changed && (
                  <button className="gear-reset" onClick={() => resetChar(id)}>
                    원래대로
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 아래: 바꾸기 전 그래프 · 가운데 전→후 비교표 · 바꾼 뒤 그래프. ── */}
      {view && (
        <div className="compare-vs">
          <div className="compare-side">
            <DamageBreakdownSection
              stacked
              snapshot={view.before}
              title="바꾸기 전"
              note={`${sourceName} · 지금 장비 그대로 · 총 ${num(view.before.total)}`}
            />
          </div>
          <div className="compare-side compare-mid-col">
            <section className="panel compare-mid">
              <h2>전 → 후</h2>
              <span className="enemy-hint">
                남의 장비를 바꿔도 파티 버프를 타고 내 피해가 움직입니다.
              </span>
              <CompareTable a={view.before} b={view.after} aHead="전" bHead="후" />
            </section>
          </div>
          <div className="compare-side">
            <DamageBreakdownSection
              stacked
              snapshot={view.after}
              title="바꾼 뒤"
              note={
                view.changed
                  ? `총 ${num(view.after.total)} · ${deltaText(view.before.total, view.after.total)}`
                  : "아직 바꾼 것이 없습니다 — 위 카드에서 돌파 · 무기 · 에코를 바꿔 보세요."
              }
            />
          </div>
        </div>
      )}

      {/* ── 설정 창 — 추가된 버프의 적용 공격 / 추가된 공격 끼워 넣기 ── */}
      {dialog && view && (
        <div className="formula-backdrop" onClick={closeDialog} role="presentation">
          <div className="formula-modal gear-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="formula-head">
              <div>
                <small>{dialog.kind === "buff" ? "BUFF" : "ATTACK"}</small>
                <h3>
                  {dialog.kind === "buff"
                    ? `${dialogBuff?.label ?? "버프"} · 적용 공격 선택`
                    : `${dialogAttack ? attackLabel(dialogAttack.attack.name) : "공격"} · 사이클에 추가`}
                </h3>
                <span>
                  {dialog.kind === "buff"
                    ? "밝은 카드가 이 버프가 걸릴 수 있는 공격입니다. 카드를 눌러 오른쪽에서 켜고 스택을 정하세요."
                    : "오른쪽 카드를 왼쪽 루틴의 원하는 카드 위에 끌어다 놓으면 그 앞에 끼워집니다. 끼운 카드를 눌러 버프를 정하세요."}
                </span>
              </div>
              <button className="formula-close" onClick={closeDialog}>
                ×
              </button>
            </div>

            <div className="gear-dialog-body">
              {/* 왼쪽 — 바꾼 뒤 루틴 */}
              <div className="gear-routine-wrap">
                {cycles.map((cycle) => (
                  <div key={cycle} className="gear-cycle">
                    <b>{cycle}사이클</b>
                    <div className="gear-routine">
                      {afterRotation.map((it, index) => {
                        if ((it.cycle ?? 1) !== cycle) return null;
                        const r = view.resultsById.get(it.id);
                        const applicable =
                          dialog.kind === "buff"
                            ? !!r && !!dialogBuff && appliesTo(dialogBuff, r.attack, r.character.id)
                            : !!r;
                        const inserted = isInserted(it.id);
                        return (
                          <RoutineCard
                            key={it.id}
                            label={`${index + 1}. ${r ? attackLabel(r.attack.name) : "빠진 공격"}`}
                            kind={r ? cardKind(r) : "basic"}
                            icon={r?.character.iconUrl}
                            value={r?.damage.expectedDamage}
                            title={r ? `${r.character.name} · ${r.attack.name}` : "지금 환경에 없는 공격 — 계산에서 빠집니다"}
                            className={[
                              applicable ? "" : "dim",
                              focusItem === it.id ? "selected" : "",
                              inserted ? "fresh" : "",
                              dragOver === it.id ? "over" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => applicable && setFocusItem(it.id)}
                            {...(dialog.kind === "attack"
                              ? {
                                  ...dropProps(it.id, it.id),
                                  draggable: inserted,
                                  onDragStart: (event: DragEvent<HTMLDivElement>) =>
                                    event.dataTransfer.setData("text/plain", "attack"),
                                }
                              : {})}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
                {dialog.kind === "attack" && (
                  <div
                    className={dragOver === "__end" ? "gear-drop-end over" : "gear-drop-end"}
                    {...dropProps("__end", null)}
                  >
                    여기에 놓으면 맨 뒤에 붙습니다
                  </div>
                )}
              </div>

              {/* 오른쪽 — 끼울 공격 카드 · 고른 공격의 버프 목록 */}
              <div className="gear-side">
                {dialog.kind === "attack" && dialogAttack && (
                  dialogInserted ? (
                    <div className="gear-side-empty">
                      루틴에 끼웠습니다. 다른 카드 위로 끌어 옮길 수 있습니다.{" "}
                      <button
                        className="preset-quiet"
                        onClick={() => {
                          updateRotation((rot) => rot.filter((it) => it.id !== dialogInserted.id));
                          setFocusItem(null);
                        }}
                      >
                        빼기
                      </button>
                    </div>
                  ) : (
                    <RoutineCard
                      label={attackLabel(dialogAttack.attack.name)}
                      kind="echo"
                      icon={characters.find((c) => c.id === dialogAttack.characterId)?.iconUrl}
                      draggable
                      title="끌어서 왼쪽 루틴에 끼워 넣기"
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", "attack")}
                    />
                  )
                )}

                {focusRotationItem && focusResult ? (
                  <>
                    <small className="formula-section">
                      {attackLabel(focusResult.attack.name)} · {focusResult.character.name}
                    </small>
                    <ScenarioBuffs
                      item={focusRotationItem}
                      result={focusResult}
                      buffs={view.afterBuffs}
                      focusId={dialog.kind === "buff" ? dialog.buffId : undefined}
                      onToggle={(buff) => toggleIn(focusRotationItem.id, buff)}
                      onStacks={(buffId, stacks) => setStacksIn(focusRotationItem.id, buffId, stacks)}
                    />
                  </>
                ) : (
                  <div className="gear-side-empty">
                    {dialog.kind === "buff"
                      ? "왼쪽에서 밝은 카드를 누르면 그 공격의 버프 목록이 여기에 뜹니다."
                      : "끼운 뒤 카드를 누르면 그 공격의 버프 목록이 여기에 뜹니다."}
                  </div>
                )}
              </div>
            </div>

            <div className="gear-dialog-foot">
              <button onClick={closeDialog}>닫기</button>
              {dialog.kind === "buff" ? (
                <button
                  className="primary"
                  onClick={() => {
                    markBuffDone(dialog.buffId);
                    closeDialog();
                  }}
                >
                  설정 완료
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={!dialogInserted}
                  title={dialogInserted ? undefined : "먼저 루틴에 끼워 넣으세요"}
                  onClick={() => {
                    markAttackDone(`${dialog.characterId}|${dialog.attackId}`);
                    closeDialog();
                  }}
                >
                  추가 완료
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 에코 교체 창 ── */}
      {echoPick && (
        <div className="formula-backdrop" onClick={() => setEchoPick(null)} role="presentation">
          <div
            className="formula-modal gear-echo-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="formula-head">
              <div>
                <small>ECHO</small>
                <h3>
                  {characters.find((c) => c.id === echoPick.characterId)?.name} ·{" "}
                  {echoPick.slot + 1}번 자리{echoPick.slot === 0 && " (메인)"} 교체
                </h3>
                <span>
                  보유 에코 중에서 고릅니다. 메인 자리를 바꾸면 에코 어빌리티 공격이 바뀝니다. 실제
                  장착은 그대로입니다.
                </span>
              </div>
              <button className="formula-close" onClick={() => setEchoPick(null)}>
                ×
              </button>
            </div>
            <div className="gear-weapon-tools">
              <input
                className="panel-search"
                placeholder="에코 · 화음 세트 이름으로 찾기"
                value={echoQuery}
                onChange={(event) => setEchoQuery(event.target.value)}
              />
              {state.gear[echoPick.characterId]?.echoes?.[echoPick.slot] !== undefined && (
                <button
                  className="preset-quiet"
                  onClick={() => {
                    // 원래 에코가 다른 자리로 옮겨 가 있으면 그 자리와 맞바꾼다.
                    setEcho(
                      echoPick.characterId,
                      echoPick.slot,
                      wornOf(echoPick.characterId)[echoPick.slot],
                    );
                    setEchoPick(null);
                  }}
                >
                  원래 에코로
                </button>
              )}
            </div>
            {echoChoices.length === 0 ? (
              <p className="enemy-hint">맞는 보유 에코가 없습니다.</p>
            ) : (
              <ul className="gear-echo-detail">
                {echoChoices.map((echo) => {
                  const set = setOf(echo);
                  const detail = echoDetail(echo);
                  const holder = echoOwner.get(echo.pk);
                  const mineSlot = SLOTS.find(
                    (sl) => echoPkAfter(echoPick.characterId, sl) === echo.pk,
                  );
                  const current = mineSlot === echoPick.slot;
                  const mine = mineSlot !== undefined && !current;
                  const taken = holder !== undefined && holder !== echoPick.characterId;
                  const status = current
                    ? "지금 이 자리"
                    : mine
                      ? `${mineSlot + 1}번 자리에 있음 · 누르면 자리 바꾸기`
                      : taken
                        ? `${characters.find((c) => c.id === holder)?.name ?? "다른 캐릭터"} 장착 중`
                        : "";
                  return (
                    <li key={echo.pk}>
                      <button
                        className={[current ? "on" : "", mine ? "mine" : "", taken ? "taken" : ""]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={current || taken}
                        onClick={() => {
                          setEcho(echoPick.characterId, echoPick.slot, echo.pk);
                          setEchoPick(null);
                        }}
                      >
                        <span className="gear-echo-detail-head">
                          {echo.iconUrl ? (
                            <img className="gear-echo-icon" src={echo.iconUrl} alt="" loading="lazy" />
                          ) : (
                            <span className="gear-echo-blank" />
                          )}
                          <b>{echo.name}</b>
                          {set && (
                            <span className="gear-echo-set">
                              {set.icon && <img src={set.icon} alt="" loading="lazy" />}
                              <small>{set.name}</small>
                            </span>
                          )}
                        </span>
                        {status && <em className="gear-echo-status">{status}</em>}
                        <span className="gear-echo-detail-main">
                          <b>{detail.main || "주옵션 없음"}</b>
                          {detail.mainSub && <small>{detail.mainSub}</small>}
                        </span>
                        <span className="gear-echo-subs">
                          {detail.subs.length > 0 ? (
                            detail.subs.map((sub, i) => <span key={i}>{sub}</span>)
                          ) : (
                            <span className="none">부옵션 없음</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── 무기 변경 창 ── */}
      {picking && (
        <div className="formula-backdrop" onClick={() => setPickingFor(null)} role="presentation">
          <div className="formula-modal" onClick={(event) => event.stopPropagation()}>
            <div className="formula-head">
              <div>
                <small>WEAPON</small>
                <h3>{picking.name} · 무기 변경</h3>
                <span>고른 무기로 바꿔 끼웠다고 치고 계산합니다. 실제 장착은 그대로입니다.</span>
              </div>
              <button className="formula-close" onClick={() => setPickingFor(null)}>
                ×
              </button>
            </div>
            <label className="gear-weapon-tools">
              <input
                type="checkbox"
                checked={!allWeapons}
                onChange={() => setAllWeapons((v) => !v)}
              />
              보유한 무기만
            </label>
            {choices.length === 0 ? (
              <p className="enemy-hint">
                무기 관리 탭에 담아 둔 {pickingType[0]?.typeName ?? picking.weaponType} 무기가
                없습니다. 「보유한 무기만」을 끄면 도감 전체에서 고를 수 있습니다.
              </p>
            ) : (
              <ul className="gear-weapon-list">
                {choices.map((choice) => {
                  const cur = weaponOf(picking.id);
                  const on =
                    cur?.weaponId === choice.weapon.id &&
                    (cur?.refine ?? 1) === choice.refine &&
                    (cur?.level ?? DEFAULT_WEAPON_LEVEL) === choice.level;
                  return (
                    <li key={choice.key}>
                      <button
                        className={on ? "on" : ""}
                        onClick={() => {
                          setChange(picking.id, {
                            weapon: {
                              weaponId: choice.weapon.id,
                              refine: choice.refine,
                              level: choice.level,
                            },
                          });
                          setPickingFor(null);
                        }}
                      >
                        <img src={choice.weapon.icon} alt="" loading="lazy" />
                        <span>
                          <b>{choice.weapon.name}</b>
                          <small>
                            {"★".repeat(choice.weapon.rarity)} · {choice.refine}재련 · Lv.
                            {choice.level}
                          </small>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
