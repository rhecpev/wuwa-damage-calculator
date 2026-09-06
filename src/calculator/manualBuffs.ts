import { ANOMALIES, type AnomalyKind } from "../data/anomalies";
import type {
  Attack,
  BuffDamageType,
  BuffScope,
  BuffTarget,
  BuffUptime,
  BuffScaleStat,
  Element,
  ManualBuff,
} from "../types/game";
import type { StatContribution, Stats } from "../types/stats";
import { emptyStats } from "../types/stats";

/**
 * 수기 입력 버프를 Stats에 얹는 프로토타입 계층.
 *
 * 버프는 공격 단위로 판정한다(matches). 조건을 통과한 뒤에야 Stats에 얹히므로
 * "공명 해방일 때만 방어력 무시" 같은 조건부 효과가 다른 공격으로 새지 않는다.
 */

/** 피해 종류 선택지 — 입력 폼과 목록이 같은 정의를 쓴다. */
export const DAMAGE_TYPE_OPTIONS: { value: BuffDamageType; label: string }[] = [
  { value: "All", label: "전체" },
  { value: "Basic", label: "일반 공격" },
  { value: "Heavy", label: "강공격" },
  { value: "Skill", label: "공명 스킬" },
  { value: "Liberation", label: "공명 해방" },
  { value: "Intro", label: "반주 스킬" },
  { value: "Outro", label: "변주 스킬" },
  { value: "Aerial", label: "공중 공격" },
  { value: "DodgeCounter", label: "회피 반격" },
  { value: "Chain", label: "협동 · 공명 회로" },
  { value: "Echo", label: "에코" },
  { value: "Glacio", label: "속성 · 응결" },
  { value: "Fusion", label: "속성 · 용융" },
  { value: "Electro", label: "속성 · 전도" },
  { value: "Aero", label: "속성 · 기류" },
  { value: "Spectro", label: "속성 · 회절" },
  { value: "Havoc", label: "속성 · 인멸" },
  { value: "AeroErosion", label: "이상 · 풍식 효과" },
  { value: "SpectroFrazzle", label: "이상 · 광학 효과" },
  { value: "ElectroFlare", label: "이상 · 전자 효과" },
  { value: "FrostChafe", label: "이상 · 서리 효과" },
  { value: "FusionBurst", label: "이상 · 불꽃 효과" },
  { value: "HavocBane", label: "이상 · 암흑 효과" },
];

/** 버프가 계산의 어느 자리에 붙는지 — 입력 폼과 목록이 같은 정의를 쓴다. */
export const TARGET_OPTIONS: { value: BuffTarget; label: string; hint: string }[] = [
  { value: "motionValue", label: "스킬 배율", hint: "증가/상승 구분이 적용됨" },
  { value: "damageBonus", label: "피해 보너스", hint: "속성·분류 피해증가와 전부 합산되는 1+Σ 그룹" },
  { value: "boost", label: "부스트", hint: "피해증가와 별개인 독립 곱연산 그룹" },
  { value: "critRate", label: "크리티컬 확률", hint: "치명타 확률에 가산" },
  { value: "critDamage", label: "크리티컬 피해", hint: "기본 100%를 뺀 보너스분에 가산" },
  { value: "damageTaken", label: "받는 피해", hint: "적이 받는 피해를 늘리는 독립 배율" },
  {
    value: "totalDamage",
    label: "최종 피해",
    hint: "피해증가·부스트와 또 다른 독립 곱연산. 원문에 「최종 피해」라고 적힌 것만",
  },
  {
    value: "energyRegen",
    label: "공명 효율",
    hint: "해방 회전율에만 영향 — 스탯창에는 보이지만 피해식에는 들어가지 않는다",
  },
  {
    value: "anomalyBoost",
    label: "이상 효과 부스트",
    hint: "이상 효과 피해에만 곱해지는 독립 배율 — 분류에 이상 효과를 골라야 한다",
  },
  {
    value: "anomalyAmplify",
    label: "이상 효과 배율 상승",
    hint: "이상 효과의 기초값 자체를 키운다 — 데니아의 「폭발 배율 200% 상승」이 이 자리다",
  },
  {
    value: "anomalyCritRate",
    label: "이상 효과 크리티컬 확률",
    hint: "이상 피해에는 원래 크리티컬이 없다. 「크리티컬을 발생시킬 수 있다」는 효과에만 쓴다",
  },
  {
    value: "anomalyCritDamage",
    label: "이상 효과 크리티컬 피해",
    hint: "100%를 넘는 부분만 적는다(275% 고정 → 1.75). 확률과 함께 있어야 의미가 있다",
  },
  {
    value: "syncAmplify",
    label: "조화도 파괴 증폭",
    hint: "조화도 파괴 피해에만 영향 — 이 수치에 비례하는 버프(역광 속 눈부신 서약)의 재료가 된다",
  },
  {
    value: "discordEfficiency",
    label: "부조화 효율",
    hint: "부조화 누적에만 영향 — 이 수치에 비례하는 버프(빛을 쫓는 별의 고리)의 재료가 된다",
  },
  { value: "atkFlat", label: "공격력 (깡수치)", hint: "%가 아니라 그대로 더해지는 공격력" },
  { value: "atkPercent", label: "공격력 %", hint: "기초 공격력에 곱해지기 전 합산" },
  { value: "hpPercent", label: "HP %", hint: "기초 HP에 곱해지기 전 합산" },
  { value: "defPercent", label: "방어력 %", hint: "기초 방어력에 곱해지기 전 합산" },
  { value: "defIgnore", label: "방어력 무시", hint: "적 방어력 × (1 - 수치)" },
  {
    value: "defReduction",
    label: "방어력 감소",
    hint: "적에게 거는 디버프. 방어력 무시와 곱연산된다 — 「암흑 효과」가 이 자리다",
  },
  { value: "resPen", label: "속성 저항 무시", hint: "저항 - 수치" },
  {
    value: "resReduction",
    label: "속성 저항 감소",
    hint: "적에게 거는 디버프. 저항 무시와 합산한 뒤 저항에서 한 번에 뺀다",
  },
];

/** 상시인지 조건부인지. 지금은 분류·표시용이고 계산에는 들어가지 않는다. */
export const UPTIME_OPTIONS: { value: BuffUptime; label: string; hint: string }[] = [
  { value: "passive", label: "패시브", hint: "조건 없이 늘 걸린다" },
  { value: "active", label: "액티브", hint: "발동 조건이 있을 때만 걸린다" },
];

/** 누구에게 걸리는지. self면 그 캐릭터의 공격에만 붙는다. */
export const SCOPE_OPTIONS: { value: BuffScope; label: string; hint: string }[] = [
  { value: "self", label: "개인", hint: "이 버프를 들고 있는 캐릭터에게만" },
  { value: "party", label: "파티", hint: "파티 전원에게 걸린다" },
];

/** 저항 무시·저항 감소에서 어느 속성 저항인지 고를 때 쓰는 목록. */
export const ELEMENT_OPTIONS: { value: Element; label: string }[] = [
  { value: "Glacio", label: "응결" },
  { value: "Fusion", label: "용융" },
  { value: "Electro", label: "전도" },
  { value: "Aero", label: "기류" },
  { value: "Spectro", label: "회절" },
  { value: "Havoc", label: "인멸" },
];

const ELEMENTS = new Set(["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"]);

/** damageType에 적힌 것이 이상 효과인지. 이상 효과 피해에만 걸리는 버프를 가려낸다. */
const ANOMALY_TYPES = new Set<string>(Object.keys(ANOMALIES));

/** 이상 효과별 부스트가 담기는 Stats 칸. */
const ANOMALY_BOOST_KEY: Record<AnomalyKind, keyof Stats> = {
  AeroErosion: "aeroErosionBoost",
  SpectroFrazzle: "spectroFrazzleBoost",
  ElectroFlare: "electroFlareBoost",
  FrostChafe: "frostChafeBoost",
  FusionBurst: "fusionBurstBoost",
  HavocBane: "havocBaneBoost",
};

/**
 * 이상 효과 피해식에서만 쓰이는 타깃들. 일반 공격에는 절대 걸리지 않고,
 * 반대로 이상 효과 항목에는 이 타깃(과 저항 · 방어 감소)만 걸린다.
 */
const ANOMALY_ONLY_TARGETS = new Set<BuffTarget>([
  "anomalyBoost",
  "anomalyAmplify",
  "anomalyCritRate",
  "anomalyCritDamage",
]);

/** 속성 조건(element)을 보는 타깃 — 저항 무시와 저항 감소 둘 다 적 저항에서 빼는 자리다. */
const RES_TARGETS = new Set<BuffTarget>(["resPen", "resReduction"]);

/**
 * 이상 효과 피해식(calculator/anomaly.ts)이 실제로 읽는 칸들.
 * 이상 전용 타깃 말고도 적에게 거는 디버프와 최종 피해가 그대로 들어간다 —
 *   방어력 감소   이상 피해는 방어무시를 안 보고 이 값만 본다(암흑 효과가 여기)
 *   저항 무시·감소 이상 피해의 속성 저항에서 같이 뺀다
 *   최종 피해     독립 곱연산이라 이상 피해에도 곱해진다
 * 방어무시(defIgnore)는 일부러 뺐다 — 이상 피해식에 안 들어간다.
 */
const ANOMALY_USABLE_TARGETS = new Set<BuffTarget>([
  ...ANOMALY_ONLY_TARGETS,
  "defReduction",
  "resPen",
  "resReduction",
  "totalDamage",
]);

/**
 * 이 버프가 해당 공격에 걸리는지 — 피해 종류(그리고 저항 무시라면 속성)까지 본다.
 * 로테이션에서 버프를 켜뒀더라도 공격 분류가 맞지 않으면 계산에 들어가지 않는다.
 * 화면에서도 같은 판정을 써야 해서 export 한다.
 */
export function appliesTo(buff: ManualBuff, attack: Attack, characterId?: string): boolean {
  // 본인은 빼는 파티 버프. 본인 몫이 따로 적힌 효과라 여기서 걸러야 두 번 걸리지 않는다.
  // 이 함수는 화면 목록에도 쓰여서, 걸러진 버프는 그 캐릭터의 버프 목록에 뜨지도 않는다.
  if (buff.excludeOwner && buff.ownerId && characterId && buff.ownerId === characterId) return false;

  // 이상 효과 피해와 일반 공격은 피해식이 통째로 다르다 — 버프가 서로 넘어가면 안 된다.
  //   이상 효과 항목에는 그 효과(또는 "All")를 적은 이상 부스트 버프만 걸린다.
  //   일반 공격에는 이상 효과를 적은 버프가 절대 걸리지 않는다.
  if (attack.anomaly) {
    if (!ANOMALY_USABLE_TARGETS.has(buff.target)) return false;
    // 이상 전용 타깃만 「어느 효과인지」를 따진다. 방어·저항 디버프는 적에게 걸린 상태라
    // 효과를 가리지 않는다 — 암흑으로 깎인 방어력은 서리 피해에도 그대로 적용된다.
    if (ANOMALY_ONLY_TARGETS.has(buff.target)) {
      if (buff.damageType !== "All" && buff.damageType !== attack.anomaly) return false;
    } else if (ANOMALY_TYPES.has(buff.damageType)) {
      return false;
    }
    // 저항 무시·감소는 그 이상 효과가 입히는 피해의 속성에만 의미가 있다.
    if (RES_TARGETS.has(buff.target) && buff.element && buff.element !== attack.element) {
      return false;
    }
    return !(buff.scope === "self" && buff.ownerId && characterId && buff.ownerId !== characterId);
  }
  if (ANOMALY_ONLY_TARGETS.has(buff.target) || ANOMALY_TYPES.has(buff.damageType)) return false;

  // 개인 버프는 들고 있는 캐릭터의 공격에만 붙는다.
  // scope나 ownerId가 없는 예전 버프는 전원 적용(기존 동작)으로 둔다.
  if (buff.scope === "self" && buff.ownerId && characterId && buff.ownerId !== characterId) {
    return false;
  }
  // 특정 공격만 지목한 버프는 그 공격에만 걸린다. 여럿이면 attackIds가 우선.
  if (buff.attackIds?.length) {
    if (!buff.attackIds.includes(attack.id)) return false;
  } else if (buff.attackId && buff.attackId !== attack.id) return false;
  const elementOk =
    !RES_TARGETS.has(buff.target) || !buff.element || buff.element === attack.element;
  if (buff.damageType === "All") return elementOk;
  if (ELEMENTS.has(buff.damageType)) return buff.damageType === attack.element && elementOk;
  // 공격 분류는 실제 피해 판정 기준(damageBonusType)을 우선한다.
  if (buff.damageType !== (attack.damageBonusType ?? attack.type)) return false;
  // 저항 무시·저항 감소는 때리는 공격의 속성에만 의미가 있다.
  if (RES_TARGETS.has(buff.target) && buff.element && buff.element !== attack.element)
    return false;
  return true;
}

/**
 * scaleFrom 기준값을 「게임 설명이 1당이라고 말하는 단위」로 꺼낸다.
 *
 *   ATK/HP/DEF        스탯창 정수를 100으로 나눈 값.
 *                     「방어력 20%를 기반으로」 → 방어력 2000 × 0.2 = 400% = 4.0이 되도록.
 *   EnergyRegen       게임 표시값(퍼센트포인트). 스탯은 100%를 뺀 보너스분만 담으므로 1을 더한다
 *                     — 공명 효율 130%면 130이 나온다.
 *   DiscordEfficiency 표시값(퍼센트포인트). 기본 100%가 깔려 있어 보너스 0.25 → 125
 *   SyncAmplify       표시값(pt = 퍼센트포인트). 0.2 → 20
 *   CritRate          표시값(퍼센트포인트). 1.3 → 130
 *
 * 「N%를 초과한 만큼」이라고 적힌 효과는 scaleOffset에 그 N을 적는다 — buffAmount에서 뺀다.
 */
const SCALE_SOURCES: Record<BuffScaleStat, (s: Stats) => number> = {
  ATK: (s) => Math.floor(s.atk) / 100,
  HP: (s) => Math.floor(s.hp) / 100,
  DEF: (s) => Math.floor(s.def) / 100,
  EnergyRegen: (s) => (1 + s.energyRegen) * 100,
  // 부조화 수치 누적 효율은 공명 효율과 같은 꼴이다 — 누구나 기본 100%를 깔고 있고
  // Stats에는 그 위에 얹힌 보너스분만 담는다. 「1%당」이라고 적힌 효과는 표시값(=100+보너스)을 본다.
  DiscordEfficiency: (s) => (1 + s.discordEfficiency) * 100,
  SyncAmplify: (s) => s.syncAmplify * 100,
  CritRate: (s) => s.critRate * 100,
};

/**
 * scaleFrom 기준별로 값이 정해지는 시점.
 *
 *   "panel"  공격력·HP·방어력에 기대지 않는다 → 스탯 확정 전에 값이 나온다.
 *            그래서 공격력% 같은 「곱연산 전에 합산돼야 하는 자리」에도 쓸 수 있다.
 *   "scaled" 최종 스탯이 있어야 값이 나온다 → 스탯이 확정된 뒤에만 얹을 수 있다.
 *
 * scaleFrom이 없는 버프는 "base"다(둘 중 어느 쪽도 아니고 처음부터 값이 정해져 있다).
 */
const SCALE_PHASE: Record<BuffScaleStat, "panel" | "scaled"> = {
  ATK: "scaled",
  HP: "scaled",
  DEF: "scaled",
  EnergyRegen: "panel",
  DiscordEfficiency: "panel",
  SyncAmplify: "panel",
  // 크리티컬 확률은 최종 스탯에서 나온다. 결과는 크리티컬 피해로 가므로 순환은 생기지 않는다.
  CritRate: "scaled",
};

/** 이 버프가 어느 단계에서 계산되는지. */
export const buffPhase = (buff: ManualBuff): BuffPhase =>
  buff.scaleFrom ? SCALE_PHASE[buff.scaleFrom] : "base";

export type BuffPhase = "base" | "panel" | "scaled";

/**
 * 비례분을 **누구의 스탯**에서 뽑을지.
 *
 * 파티 버프는 준 사람의 스탯을 본다 — 수수의 「꽃향기의 편지」가 「수수 자신의 공명 효율이
 * 200%를 초과할 경우」라고 적힌 것처럼, 게임 설명이 가리키는 것은 늘 버프를 건 캐릭터다.
 * 맞는 사람의 공명 효율로 재면 수수의 편지가 딜러의 공명 효율을 따라가 버린다.
 *
 * ownerPanels는 캐릭터별 스탯창 값이다(useCalculationResults가 파티 전원 몫을 미리 만든다).
 * 없거나 못 찾으면 예전대로 때리는 캐릭터의 스탯을 쓴다 — 수기 버프는 주인이 없다.
 */
function scaleStats(
  buff: ManualBuff,
  stats?: Stats,
  ownerPanels?: Record<string, Stats>,
): Stats | undefined {
  if (buff.scope === "party" && buff.ownerId && ownerPanels?.[buff.ownerId]) {
    return ownerPanels[buff.ownerId];
  }
  return stats;
}

/**
 * 이 버프가 이번 공격에서 실제로 얼마만큼 걸리는지.
 *
 * 보통은 value × stacks 그대로다. scaleFrom이 붙은 버프만 그때의 스탯에서 값을 뽑는다.
 *   적용치(%) = 스탯 × value × stacks  →  소수 비율로는 그 값을 100으로 나눈 것
 *   예) 연무 3체인: 방어력 2000 × 0.2 = 400%  →  4.0
 * 스탯은 게임 스탯창처럼 소수점을 버린 정수로 본다(피해 계산의 attr와 같은 규칙).
 *
 * stats를 넘기지 않으면 scaleFrom 버프는 0으로 본다 — 최종 스탯이 아직 없는 단계에서
 * 부르는 자리(calculateFinalStats로 들어가는 증분)가 그렇다.
 * 화면에서도 같은 값을 써야 해서 export 한다.
 */
export function buffAmount(
  buff: ManualBuff,
  stacks: number,
  stats?: Stats,
  ownerPanels?: Record<string, Stats>,
): number {
  if (!buff.scaleFrom) return buff.value * stacks;
  const from = scaleStats(buff, stats, ownerPanels);
  if (!from) return 0;

  // 「공명 효율 100%를 초과한 1%당」처럼 문턱이 적힌 효과는 넘긴 만큼만 센다.
  // 문턱에 못 미치면 0 — 음수가 되어 버프가 마이너스로 걸리는 일이 없게 한다.
  const source = SCALE_SOURCES[buff.scaleFrom](from);
  const over = buff.scaleOffset === undefined ? source : Math.max(0, source - buff.scaleOffset);
  const raw = over * buff.value * stacks;
  // 「최대 25%까지」 같은 상한. 적어두지 않았으면 상한 없음.
  return buff.maxValue === undefined ? raw : Math.min(raw, buff.maxValue);
}

/**
 * 켜져 있고 이 공격에 걸리는 버프만 골라 Stats 증분을 만든다.
 *
 * 결과를 그대로 더하는 게 아니라 "증분"으로 돌려주는 이유 —
 * atkPercent 같은 값은 기초 스탯에 곱해지기 전에 합산돼야 하므로
 * calculateFinalStats 안쪽(곱연산 직전)에 끼워 넣어야 한다.
 *
 * 스킬 배율(motionValue)에서만 증가/상승이 갈린다.
 *   증가: motionValueIncrease += 수치 × 스택   → 계수에 그대로 더해짐(합연산)
 *   상승: motionValueAmplify  += 수치 × 스택   → 계수에 곱해짐(곱연산)
 * 나머지 자리는 전부 단순 가산이다.
 *
 * scaleFrom: 스탯에서 수치가 나오는 버프는 최종 스탯이 있어야 값이 정해진다.
 *   그래서 두 번에 나눠 부른다 —
 *     1) stats 없이 불러 나온 증분을 calculateFinalStats에 넣고(= scaleFrom 버프는 0)
 *     2) 그렇게 나온 최종 스탯을 stats로 다시 넘겨 scaleFrom 버프만 얹는다.
 *   이 갈래 때문에 ATK/HP/DEF 기준 scaleFrom은 스탯 자체를 올리는 자리(atkPercent 등)에 쓸 수 없다.
 *
 * phase: 어느 단계의 버프를 담을지. buffPhase와 같은 세 값이다.
 *   "base"   scaleFrom이 없는 것 — 값이 처음부터 정해져 있다(기본값)
 *   "panel"  공명 효율 · 조화도 파괴 증폭 · 부조화 효율 기준 — 공격력에 기대지 않으므로
 *            스탯을 한 번 구한 뒤 그 값으로 계산해서 다시 곱연산 앞단에 넣을 수 있다
 *   "scaled" ATK/HP/DEF 기준 — 최종 스탯이 확정된 뒤에만 얹을 수 있다
 * 세 단계를 어떤 순서로 부르는지는 useCalculationResults를 보면 된다.
 */
export function manualBuffDelta(
  attack: Attack,
  buffs: ManualBuff[],
  characterId?: string,
  stats?: Stats,
  phase: BuffPhase = "base",
  ownerPanels?: Record<string, Stats>,
): Stats {
  const result = emptyStats();
  for (const item of buffContributions(attack, buffs, characterId, stats, phase, ownerPanels)) {
    add(result, item.stats);
  }
  return result;
}

function add(target: Stats, patch: Partial<Stats>) {
  for (const k of Object.keys(patch) as (keyof Stats)[]) target[k] += patch[k]!;
}

/**
 * 위와 같은 판정을 하되 합치지 않고 버프 한 줄씩 남긴다.
 * 상세보기에서 "이 수치가 어디서 왔는지"를 펼쳐 보이는 데 쓴다 — 합은 manualBuffDelta와 같다.
 */
export function buffContributions(
  attack: Attack,
  buffs: ManualBuff[],
  characterId?: string,
  stats?: Stats,
  phase: BuffPhase = "base",
  ownerPanels?: Record<string, Stats>,
): StatContribution[] {
  const active = buffs.filter(
    (buff) => buff.enabled && buffPhase(buff) === phase && appliesTo(buff, attack, characterId),
  );

  const out: StatContribution[] = [];
  for (const buff of active) {
    const amount = buffAmount(buff, buff.stacks, stats, ownerPanels);
    if (!amount) continue;
    const patch = statPatch(buff, amount);
    if (patch) out.push({ source: buff.label || describeTarget(buff.target), stats: patch });
  }
  return out;
}

/**
 * 버프가 몇 번 자리에 얼마를 얹는지 — Stats 한 칸짜리 조각으로 돌려준다.
 * JSON 내보내기에서 「이 버프가 어느 칸에 들어갔는지」를 적는 데도 쓴다.
 */
export function statPatch(buff: ManualBuff, amount: number): Partial<Stats> | null {
  switch (buff.target) {
    // 스킬 배율에서만 증가/상승이 갈린다.
    //   증가: 계수에 그대로 더해짐(합연산)   상승: 계수에 곱해짐(곱연산)
    case "motionValue":
      return buff.modifier === "increase"
        ? { motionValueIncrease: amount }
        : { motionValueAmplify: amount };

    // 이미 이 공격에 걸린다고 판정된 뒤라, 분류별 필드 대신 allDamageBonus에 더해도
    // 결과가 같다(dmgBonus = 1 + all + 분류 + 속성 이 전부 가산이라서).
    case "damageBonus":
      return { allDamageBonus: amount };

    // 부스트도 같은 이유로 분류별 필드 대신 allBoost에 더한다.
    case "boost":
      return { allBoost: amount };

    case "critRate":
      return { critRate: amount };
    case "critDamage":
      return { critDamage: amount };
    case "totalDamage":
      return { totalDamageBonus: amount };
    case "damageTaken":
      return { damageTakenBonus: amount };

    // 공격력·HP·방어력 %는 어느 묶음에서 왔는지로 자리가 갈린다.
    //   panel = 스탯창에 찍히는 값(무기 부옵션·무기 효과 등) — 먼저 곱하고 버린다
    //   buff  = 전투 중에 얹히는 값(공명체인·파티 버프 등) — 스탯창 값 위에 더한다
    // 따로 적지 않은 버프는 buff로 본다(calculateFinalStats 주석 참고).
    // 깡수치 공격력. 「공격력 20pt 증가」처럼 %가 아닌 것.
    case "atkFlat":
      return { atk: amount };
    case "atkPercent":
      return buff.statGroup === "panel" ? { atkPercent: amount } : { atkPercentBuff: amount };
    case "hpPercent":
      return buff.statGroup === "panel" ? { hpPercent: amount } : { hpPercentBuff: amount };
    case "defPercent":
      return buff.statGroup === "panel" ? { defPercent: amount } : { defPercentBuff: amount };

    case "defIgnore":
      return { defIgnore: amount };
    // 적 방어력 자체를 깎는 디버프. 방어무시와 곱해진다(damage.ts의 defMultiplier 참고).
    // 이상 피해 쪽은 방어무시를 안 보고 이 값만 본다(anomaly.ts).
    case "defReduction":
      return { defReduction: amount };
    // 속성 조건은 appliesTo에서 이미 걸러졌다.
    case "resPen":
      return { resPen: amount };
    case "resReduction":
      return { resReduction: amount };
    // 공명 효율은 피해식에 들어가지 않지만 스탯창에는 찍혀야 한다(critDamage처럼 기본 100%를 뺀 보너스분).
    case "energyRegen":
      return { energyRegen: amount };
    // 조화도 파괴 증폭 · 부조화 효율도 같은 성격이다 — 피해식에는 안 들어가지만
    // 이 수치에 비례해 공격력을 올리는 화음 세트가 있어서 스탯에 제대로 쌓여야 한다.
    case "syncAmplify":
      return { syncAmplify: amount };
    case "discordEfficiency":
      return { discordEfficiency: amount };
    // 이상 효과 부스트 — 어느 효과인지는 damageType에 적혀 있다.
    // "All"이면 효과를 가리지 않는 칸에, 특정 효과면 그 효과 칸에 담는다.
    // 이상 효과의 크리티컬 · 배율 상승. 이상 피해식에서만 쓰인다.
    case "anomalyCritRate":
      return { anomalyCritRate: amount };
    case "anomalyCritDamage":
      return { anomalyCritDamage: amount };
    case "anomalyAmplify":
      return { anomalyAmplify: amount };
    case "anomalyBoost":
      return ANOMALY_TYPES.has(buff.damageType)
        ? { [ANOMALY_BOOST_KEY[buff.damageType as AnomalyKind]]: amount }
        : { anomalyBoost: amount };
    default:
      return null;
  }
}

/** 라벨이 비어 있는 버프의 대체 이름. */
const describeTarget = (target: BuffTarget) =>
  TARGET_OPTIONS.find((o) => o.value === target)?.label ?? target;

/**
 * 이상 효과의 스택 상한.
 *
 * 게임이 정한 상한(ANOMALIES[kind].maxStacks)이 기본이고, **상한을 올려주는 버프**가
 * 켜져 있으면 그만큼 올라간다 — 치사의 반주 「현을 푸는 제0법칙」이 그렇다
 * (「이상 효과」 · 「자기 폭발」 스택 최대치 +3).
 *
 * 올라간 상한은 두 곳에서 쓰인다.
 *   ① 「암흑 효과 · 방어력 감소」처럼 이상 스택을 그대로 쓰는 버프의 스택 선택 상한
 *   ② 이상 효과 피해 자체의 스택 — 폭발형(서리 · 불꽃)은 상한을 넘긴 스택마다 33%씩 더 터진다
 *
 * 올려주는 버프가 특정 효과만 올리는 경우가 있다(카르티시아 2체인 = 풍식만,
 * 양양 · 현령 3체인 = 암흑만). 그건 raisesAnomalyKinds에 적어 두고, 안 적은 것은
 * 「이상 효과」 전부를 올리는 것으로 본다(치사 반주가 그렇다).
 *
 * from: 상한을 올려준 버프의 이름들. 화면에 「○○ 적용됨」으로 그대로 띄운다.
 */
export function anomalyStackCap(
  kind: AnomalyKind,
  buffs: ManualBuff[],
  enabledBuffIds: string[] = [],
  disabledBuffIds: string[] = [],
): { max: number; bonus: number; from: string[] } {
  const base = ANOMALIES[kind].maxStacks;
  const from: string[] = [];
  let bonus = 0;
  for (const buff of buffs) {
    if (!buff.raisesAnomalyStacks) continue;
    // 특정 효과만 올리는 버프는 그 효과에만 센다.
    if (buff.raisesAnomalyKinds && !buff.raisesAnomalyKinds.includes(kind)) continue;
    // 상시 버프는 이 공격에서 꺼 두지 않았으면 걸린다. 나머지는 켜 뒀을 때만 센다.
    if (buff.uptime === "passive") {
      if (disabledBuffIds.includes(buff.id)) continue;
    } else if (!enabledBuffIds.includes(buff.id)) continue;
    // 중첩되지 않는다 — 여럿이 켜져 있어도 가장 크게 올려주는 것 하나만 센다.
    // (목록에서도 배타 묶음으로 하나만 켜지지만, 상시 버프가 섞여도 여기서 다시 막힌다.)
    bonus = Math.max(bonus, buff.raisesAnomalyStacks);
    from.push(buff.label || describeTarget(buff.target));
  }
  return { max: base + bonus, bonus, from };
}

/**
 * 「이번 피해는 공명 해방 피해로 적용된다」처럼 **공격의 피해 판정이 바뀌는** 버프를 얹는다.
 *
 * 판정이 늘 바뀌는 공격은 Attack.damageBonusType에 그냥 적어두면 된다
 * (브렌트 화염 귀멸의 서곡 = Skill인데 Basic 판정, 상리요 만물의 법칙 = Skill인데 Liberation 판정).
 * 그런데 데니아 3체인처럼 **조건이 맞을 때만** 바뀌는 것이 있다 —
 * 「어둠의 핵심」이 최대일 때만 일반 공격 4단 · 흉내낸 거품이 공명 해방 피해가 된다.
 * 그 조건을 사람이 버프칸에서 켜고 끄게 하고, 켜져 있으면 여기서 판정을 갈아 끼운다.
 *
 * 반드시 **다른 버프를 고르기 전에** 불러야 한다. 피해 보너스 버프는 damageBonusType으로
 * 걸리는지 판정하므로(appliesTo), 순서가 뒤집히면 바뀐 분류의 보너스가 붙지 않는다.
 *
 * 어느 공격에 걸지는 버프의 attackId · attackIds로 정한다 — 적지 않으면 그 캐릭터의
 * 모든 공격이 바뀌어 버리므로, 지목이 없는 버프는 무시한다.
 */
export function applyDamageTypeSwitch(attack: Attack, buffs: ManualBuff[]): Attack {
  for (const buff of buffs) {
    if (!buff.switchesDamageBonusType) continue;
    const ids = buff.attackIds?.length ? buff.attackIds : buff.attackId ? [buff.attackId] : [];
    if (!ids.includes(attack.id)) continue;
    return { ...attack, damageBonusType: buff.switchesDamageBonusType };
  }
  return attack;
}
