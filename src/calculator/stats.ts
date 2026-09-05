import type { Buff, Character, Echo, Weapon } from "../types/game";
import type { FinalStats, StatContribution, Stats } from "../types/stats";
import { emptyStats } from "../types/stats";

function add(t: Stats, s: Partial<Stats>) {
  for (const k of Object.keys(t) as (keyof Stats)[]) if (s[k] !== undefined) t[k] += s[k]!;
}

/** 0이 아닌 칸만 남긴다 — 출처 내역에 "0 얹음" 줄이 끼지 않게. */
function nonZero(s: Partial<Stats>): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const k of Object.keys(s) as (keyof Stats)[]) if (s[k]) out[k] = s[k];
  return out;
}

/** 패널 자리의 퍼센트를 버프 자리로 옮긴 사본. 공명체인처럼 전투 중에 붙는 값에 쓴다. */
export function asBuffPercent(s: Partial<Stats>): Partial<Stats> {
  const out = { ...s };
  const moves = [
    ["atkPercent", "atkPercentBuff"],
    ["hpPercent", "hpPercentBuff"],
    ["defPercent", "defPercentBuff"],
  ] as const;
  for (const [from, to] of moves) {
    if (out[from]) {
      out[to] = (out[to] ?? 0) + out[from]!;
      delete out[from];
    }
  }
  return out;
}

/**
 * 공격력·HP·방어력은 게임과 같은 두 단계로 구한다.
 *
 *   기초   = ⌊캐릭터 기초⌋ + ⌊무기 공격력⌋
 *   스탯창 = ⌊기초 × (1 + Σ패널%)⌋            ← 여기서 한 번 버린다
 *   최종   = ⌊스탯창 + 기초 × Σ버프% + Σ깡수치⌋
 *
 * 퍼센트는 어디서 왔느냐로 두 묶음이 갈린다.
 *   패널% = 스킬 트리 · 무기 부옵션 · 무기 효과 · 에코 옵션  (스탯창에 찍히는 값)
 *   버프% = 공명체인 · 파티 버프 · 에코 세트 효과            (전투 중에 얹히는 값)
 * 깡수치(atkPlus 등)는 어느 쪽 퍼센트도 타지 않고 맨 끝에 더한다.
 *
 * 실측 9건으로 확인한 규칙이다. 예) 단근 Lv.90 · 무기 공격력 587.5
 *   기초 ⌊262.5⌋+⌊587.5⌋=849, 패널 30%(트리 12+무기효과 18), 버프 50%(1체인 30+6체인 20)
 *   → ⌊849×1.30⌋=1103, +849×0.50=424.5 → 1527.5 → 1527 (게임 표시와 일치)
 * 두 묶음을 한 Σ로 합치면 ⌊849×1.80⌋=1528이 되어 1이 어긋난다 — 스탯창 단계의 버림이 빠져서다.
 *
 * 기초 스탯은 출처별로 정수까지만 들고 간다. 게임도 캐릭터 기초값과 무기 공격력을
 * 각각 버린 뒤 더한다 — 단근 Lv90(262.5) + 천년의 회류 Lv90(587.5)이 262+587=849로 잡혀야
 * 위 계산이 맞는다. 합쳐서 850으로 두면 어긋난다.
 *
 * extra: 공격 단위로 계산되는 증분(수기/무기/캐릭터 버프). atkPercent 같은 값이
 *   퍼센트 합산에 반영되려면 반드시 아래 곱연산 이전에 합산돼야 한다.
 * extraSources: 그 증분이 어느 버프에서 나왔는지 한 줄씩 적어둔 것. 계산에는 쓰이지 않고
 *   상세보기에서 "이 수치가 어디서 왔는지"를 펼쳐 보이는 데만 쓴다(extra와 합이 같아야 한다).
 */
export function calculateFinalStats(
  c: Character,
  w: Weapon,
  e: Echo[],
  b: Buff[],
  resonanceChain = 0,
  extra?: Partial<Stats>,
  extraSources: StatContribution[] = [],
): FinalStats {
  const r = { ...emptyStats() };
  const contributions: StatContribution[] = [];

  /** 합산과 내역 기록을 같이 한다 — 한쪽만 빠뜨려 화면과 계산이 어긋나지 않게. */
  const take = (source: string, stats: Partial<Stats> | undefined) => {
    if (!stats) return;
    add(r, stats);
    const kept = nonZero(stats);
    if (Object.keys(kept).length) contributions.push({ source, stats: kept });
  };

  add(r, c.baseStats);
  contributions.push({ source: `${c.name} · 기초 스탯`, stats: nonZero(c.baseStats) });

  const baseHp = Math.floor(r.hp);
  const baseAtk = Math.floor(r.atk) + Math.floor(w.baseAtk);
  const baseDef = Math.floor(r.def);
  // 여기서부터 r.atk/hp/def에 쌓이는 값은 전부 깡수치(atkPlus/hpPlus/defPlus)다.
  r.hp = 0;
  r.atk = 0;
  r.def = 0;

  if (w.baseAtk)
    contributions.push({ source: `무기 · ${w.name} 공격력`, stats: { atk: Math.floor(w.baseAtk) } });
  // 무기 부옵션과 에코 옵션은 스탯창에 그대로 찍히는 값이라 패널 묶음이다.
  take(w.name ? `무기 · ${w.name} 부옵션` : "무기 부옵션", w.stats);
  e.forEach((x) => take(`에코 · ${x.name}`, x.stats));
  b.forEach((x) => take(x.source ? `${x.source} · ${x.name}` : x.name, x.stats));
  // 공명체인은 전투 중에 붙는 값이라 버프 묶음으로 옮겨 담는다.
  (c.chainEffects ?? []).forEach((x) => {
    if (x.chain <= resonanceChain && x.stats)
      take(`${x.chain}체인 · ${x.name}`, asBuffPercent(x.stats));
  });
  if (extra) add(r, extra);
  for (const item of extraSources) {
    const kept = nonZero(item.stats);
    if (Object.keys(kept).length) contributions.push({ source: item.source, stats: kept });
  }

  /** 두 단계 계산을 세 스탯에 똑같이 적용한다. */
  const resolve = (base: number, percent: number, buffPercent: number, plus: number) => {
    const panel = Math.floor(base * (1 + percent));
    const buffAmount = base * buffPercent;
    return { percent, buffPercent, panel, buffAmount, plus, raw: panel + buffAmount + plus };
  };

  const atk = resolve(baseAtk, r.atkPercent, r.atkPercentBuff, r.atk);
  const hp = resolve(baseHp, r.hpPercent, r.hpPercentBuff, r.hp);
  const def = resolve(baseDef, r.defPercent, r.defPercentBuff, r.def);

  const sources = {
    atk: { base: Math.floor(c.baseStats.atk), weapon: Math.floor(w.baseAtk), ...atk },
    hp: { base: baseHp, weapon: 0, ...hp },
    def: { base: baseDef, weapon: 0, ...def },
  };
  r.atk = Math.floor(atk.raw);
  r.hp = Math.floor(hp.raw);
  r.def = Math.floor(def.raw);
  return { ...r, sources, contributions };
}
