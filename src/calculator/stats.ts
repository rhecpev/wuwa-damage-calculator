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
 *   스탯창 = ⌊기초 × (1 + Σ캐릭터측 패널%)⌋ + ⌊기초 × Σ에코 옵션%⌋   ← 갈라서 각각 버린다
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
 * ── 스탯창 단계의 버림은 두 번이다 ───────────────────────────
 * 위 단근 예는 에코 옵션이 없어서 한 번 버리는 것과 구별되지 않았다. 에코를 낀 경우가 갈랐다.
 *   치사 Lv.90 · 쿠모키리 Lv.90(정련 1) · 에코 5개
 *   기초 ⌊437.5⌋+500=937, 캐릭터측 24%(트리 12+무기효과 12), 에코 87.8%,
 *   버프 30%(1체인), 깡 300(4코스트 에코 2개)
 *   → ⌊937×1.24⌋=1161, ⌊937×0.878⌋=822 → 스탯창 1983
 *     +937×0.30=281.1 +300 → 2564.1 → 2564 (게임 표시와 일치)
 * 한 Σ로 합치면 ⌊937×2.118⌋=1984가 되어 2565로 1이 어긋난다.
 * 반대로 출처를 전부 따로 버리면(트리·무기를 갈라 놓으면) 위 단근 예가 1526이 되어 어긋난다.
 * 두 실측을 동시에 맞추는 모양은 「캐릭터측 한 덩어리 + 에코 한 덩어리」뿐이다.
 *
 * 한때 에코 덩어리를 다시 **메인 옵션 몫과 부옵션 몫**으로 갈랐었다 — 현령 공격력 실측
 * 하나(2434)가 그렇게 해야 맞았기 때문이다. 그런데 공격력 실측이 여섯 건으로 늘자
 * 다섯 건(히유키 2381 · 페비 2336 · 젠니 2557 · 루실라 2187 · 벨리나 1612)이 반대로
 * **한 덩이**를 요구했다. 갈라 두면 그 다섯이 전부 1씩 낮게 나온다. 그래서 한 덩이로 되돌리고,
 * 현령 쪽은 부옵션 값 표(calculator/echoStats.ts)로 맞춘다.
 * 실측이 더 모이면 이 묶음 단위를 다시 확인할 것.
 *
 * ── 버림이 걸리는 값 자체도 표시값과 다르다 ──────────────────
 * HP 실측 두 건(치사 Lv.90, 기초 10775)은 위 모양으로도 1~2씩 어긋났다.
 *   HP% 7.9 + 깡 2280 하나  → 게임 +3130 (표시값대로면 3131)
 *   HP% 7.9+10.1 + 깡 2280 셋 → 게임 +8777 (표시값대로면 8779)
 * 원인은 버림 위치가 아니라 **에코 부옵션 퍼센트의 표시값이 반올림된 값**이라는 데 있다.
 * 실제 값은 0.01%p 낮다 — calculator/echoStats.ts의 SUB_PERCENT_ADJUST 설명 참고.
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
  // 에코에서 온 패널%는 따로도 세어 둔다 — 스탯창 단계에서 캐릭터 쪽과 갈라 버림하고,
  // 그 안에서 메인 옵션 몫과 부옵션 몫이 한 번 더 갈린다.
  const echoPercent = { atk: 0, hp: 0, def: 0 };
  const echoSubPercent = { atk: 0, hp: 0, def: 0 };
  e.forEach((x) => {
    take(`에코 · ${x.name}`, x.stats);
    const sub = x.subStats ?? {};
    echoPercent.atk += x.stats.atkPercent ?? 0;
    echoPercent.hp += x.stats.hpPercent ?? 0;
    echoPercent.def += x.stats.defPercent ?? 0;
    echoSubPercent.atk += sub.atkPercent ?? 0;
    echoSubPercent.hp += sub.hpPercent ?? 0;
    echoSubPercent.def += sub.defPercent ?? 0;
  });
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

  /**
   * 두 단계 계산을 세 스탯에 똑같이 적용한다.
   *
   * 스탯창 단계의 버림은 **한 번이 아니라 두 번**이다. 캐릭터 쪽 패널%(스킬 트리 · 무기)와
   * 에코 옵션%를 각각 버린 뒤 더한다. 실측 두 건이 이 모양만 맞춘다 —
   * 위 주석의 단근 예(에코 없음)와 치사 예(에코 87.8%)를 함께 보면 다른 모양은 전부 어긋난다.
   */
  const resolve = (
    base: number,
    percent: number,
    echoPct: number,
    echoSubPct: number,
    buffPercent: number,
    plus: number,
  ) => {
    const charPercent = percent - echoPct;
    const panel = Math.floor(base * (1 + charPercent)) + Math.floor(base * echoPct);
    const buffAmount = base * buffPercent;
    return {
      percent,
      echoPercent: echoPct,
      echoSubPercent: echoSubPct,
      buffPercent,
      panel,
      buffAmount,
      plus,
      raw: panel + buffAmount + plus,
    };
  };

  const atk = resolve(baseAtk, r.atkPercent, echoPercent.atk, echoSubPercent.atk, r.atkPercentBuff, r.atk);
  const hp = resolve(baseHp, r.hpPercent, echoPercent.hp, echoSubPercent.hp, r.hpPercentBuff, r.hp);
  const def = resolve(baseDef, r.defPercent, echoPercent.def, echoSubPercent.def, r.defPercentBuff, r.def);

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
