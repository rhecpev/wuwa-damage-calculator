import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CalculationResult } from "../hooks/useCalculationResults";
import type { AttackType, DamageElement } from "../../../types/game";
import type { StatContribution, Stats } from "../../../types/stats";
import {
  CATEGORY_BONUS_KEY,
  CATEGORY_BOOST_KEY,
  ELEMENT_BONUS_KEY,
  ELEMENT_BOOST_KEY,
} from "../../../calculator/damage";
import { dec, num, pct } from "../../../utils/format";
import { STAT_NAMES } from "../../../utils/statNames";
import { formulaJson } from "./formulaJson";

interface DamageFormulaModalProps {
  result: CalculationResult;
  onClose: () => void;
}

const ELEMENT_NAMES: Record<DamageElement, string> = {
  Glacio: "응결",
  Fusion: "용융",
  Electro: "전도",
  Aero: "기류",
  Spectro: "회절",
  Havoc: "인멸",
  Physical: "물리",
};

/** 피해증가·부스트가 어느 분류로 잡혔는지 보여줄 때 쓰는 이름. */
const CATEGORY_NAMES: Record<AttackType, string> = {
  Basic: "일반 공격",
  Heavy: "강공격",
  Aerial: "공중 공격",
  DodgeCounter: "회피 반격",
  Skill: "공명 스킬",
  Liberation: "공명 해방",
  Intro: "반주 스킬",
  Outro: "변주 스킬",
  Echo: "에코",
  Ultimate: "궁극기",
  Variation: "변주",
  Chain: "협동",
};

/** 배율은 소수 4자리까지 — 1.0000 이면 그 단계가 아무 일도 안 했다는 뜻. */
const mult = (v: number) => v.toFixed(4);

/** 이 창이 보고 있는 계산의 출처 내역. Row가 어디서든 꺼내 쓸 수 있게 문맥으로 넘긴다. */
const ContributionContext = createContext<StatContribution[]>([]);


/** 깡수치는 그대로, 나머지는 퍼센트로 적는다. */
const FLAT_KEYS = new Set<keyof Stats>(["hp", "atk", "def"]);
const statValue = (key: keyof Stats, value: number) =>
  FLAT_KEYS.has(key) ? dec(value) : pct(value);

/**
 * 이 창이 보고 있는 계산을 JSON 한 덩이로 복사한다.
 *
 * 클립보드가 막힌 자리(권한을 꺼 둔 브라우저 등)에서는 글상자를 펼쳐 직접 고르게 한다
 * — 복사가 조용히 실패하면 "눌렀는데 아무 일도 없다"가 되기 때문이다.
 */
function CopyJson({ result }: { result: CalculationResult }) {
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  const [text, setText] = useState("");

  const copy = async () => {
    const json = formulaJson(result);
    setText(json);
    try {
      await navigator.clipboard.writeText(json);
      setState("done");
      window.setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("manual");
    }
  };

  return (
    <>
      <button
        className={state === "done" ? "formula-json-copy done" : "formula-json-copy"}
        onClick={copy}
        title="이 한 대의 계산 내역을 JSON으로 복사합니다"
      >
        {state === "done" ? "복사됨" : "JSON 복사"}
      </button>

      {state === "manual" && (
        <div className="formula-json-box">
          <small>클립보드가 막혀 있습니다 — 아래 내용을 직접 복사하세요.</small>
          <textarea readOnly value={text} onFocus={(event) => event.currentTarget.select()} />
        </div>
      )}
    </>
  );
}

/**
 * 표 한 줄 — 이름 / 어떻게 나온 값인지 / 결과.
 *
 * keys를 주면 그 줄을 누를 수 있게 된다. 누르면 그 스탯 칸에 값을 얹은 출처가
 * 바로 아래에 펼쳐진다 — "이 수치가 어디서 왔는지"를 그 자리에서 확인하려는 것이다.
 */
function Row({
  label,
  expr,
  value,
  keys,
}: {
  label: string;
  expr: ReactNode;
  value: string;
  keys?: (keyof Stats | undefined)[];
}) {
  const contributions = useContext(ContributionContext);
  const [open, setOpen] = useState(false);

  const watched = (keys ?? []).filter((k): k is keyof Stats => Boolean(k));
  // 이 줄이 보는 칸에 실제로 값을 얹은 출처만 남긴다.
  const rows = watched.length
    ? contributions
        .map((item) => ({
          source: item.source,
          parts: watched
            .filter((k) => item.stats[k])
            .map((k) => `${STAT_NAMES[k] ?? k} ${statValue(k, item.stats[k]!)}`),
        }))
        .filter((item) => item.parts.length > 0)
    : [];

  const clickable = watched.length > 0;

  return (
    <>
      <tr
        className={clickable ? (open ? "formula-row-open" : "formula-row-click") : undefined}
        onClick={clickable ? () => setOpen((v) => !v) : undefined}
        title={clickable ? "누르면 이 수치가 어디서 왔는지 펼칩니다" : undefined}
      >
        <td className="formula-label">
          {clickable && <span className="formula-caret">{open ? "▾" : "▸"}</span>}
          {label}
        </td>
        <td className="formula-expr">{expr}</td>
        <td className="formula-value">{value}</td>
      </tr>

      {open && (
        <tr className="formula-origin">
          <td colSpan={3}>
            {rows.length === 0 ? (
              <em>이 수치를 올린 출처가 없습니다 — 기본값 그대로입니다.</em>
            ) : (
              <ul>
                {rows.map((item, index) => (
                  <li key={`${item.source}-${index}`}>
                    <b>{item.source}</b>
                    <span>{item.parts.join(" · ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/** ESC로 닫는다. 카드가 여럿이라 마우스를 옮기지 않고 넘기려면 이게 편하다. */
function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

export function DamageFormulaModal({ result, onClose }: DamageFormulaModalProps) {
  // 이상 효과는 계산식이 통째로 달라 창을 따로 그린다.
  if (result.damage.kind === "anomaly") {
    return <AnomalyFormulaModal result={result} damage={result.damage} onClose={onClose} />;
  }
  return <NormalFormulaModal result={result} onClose={onClose} />;
}

function NormalFormulaModal({ result, onClose }: DamageFormulaModalProps) {
  const { attack, character } = result;
  const damage = result.damage as Extract<CalculationResult["damage"], { kind: "normal" }>;
  const d = damage.breakdown;

  useEscapeToClose(onClose);

  const statLabel =
    d.scalingStat === "ATK" ? "공격력" : d.scalingStat === "HP" ? "HP" : "방어력";
  // 이 공격의 피해증가·부스트가 어느 칸을 보는지. 줄을 눌렀을 때 그 칸의 출처만 걸러낸다.
  const bonusKeys = [
    "allDamageBonus" as const,
    CATEGORY_BONUS_KEY[d.category],
    ELEMENT_BONUS_KEY[d.element],
  ];
  const boostKeys = [
    "allBoost" as const,
    CATEGORY_BOOST_KEY[d.category],
    ELEMENT_BOOST_KEY[d.element],
  ];
  const statKey = d.scalingStat === "ATK" ? "atk" : d.scalingStat === "HP" ? "hp" : "def";
  const percentKey = `${statKey}Percent` as keyof Stats;
  const buffPercentKey = `${statKey}PercentBuff` as keyof Stats;

  // 이 공격이 곱하는 스탯이 어떻게 나온 값인지 — 소수점을 버리기 전까지의 재료.
  const src =
    result.stats.sources[
      d.scalingStat === "ATK" ? "atk" : d.scalingStat === "HP" ? "hp" : "def"
    ];
  const elementName = ELEMENT_NAMES[d.element];
  const categoryName = CATEGORY_NAMES[d.category] ?? d.category;

  // 속성저항은 R = 기본저항 - (저항 무시 + 저항 감소) 를 세 구간으로 나눠 계산한다.
  // 무시와 감소는 먼저 합연산으로 더한다. 어느 구간인지 같이 보여준다.
  const r = d.baseRes - d.resPenTotal;
  const resBranch =
    r < 0 ? "R < 0 → 1 − R/2" : r < 0.8 ? "0 ≤ R < 0.8 → 1 − R" : "R ≥ 0.8 → 1 / (1 + 5R)";

  return (
    <ContributionContext.Provider value={result.stats.contributions}>
    <div className="formula-backdrop" onClick={onClose}>
      <div className="formula-modal" onClick={(event) => event.stopPropagation()}>
        <div className="formula-head">
          <div>
            <h3>{attack.name}</h3>
            <span>
              {character.name} · Lv.{d.charLevel} · {elementName} · {categoryName} · 스킬 레벨{" "}
              {d.skillLevel}
            </span>
          </div>
          <div className="formula-actions">
            <CopyJson result={result} />
            <button className="formula-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <p className="formula-top">
          피해 = ⌈ Σ(계수<sub>히트</sub>) × ⌊{statLabel}⌋ × 배율 합계 ⌉ + 고정 피해
          <br />
          <span style={{ color: "#9aa3b3" }}>
            ⌊{statLabel}⌋ = ⌊ ⌊기초 × (1 + 스탯창 %)⌋ + 기초 × 버프 % + 깡수치 ⌋
          </span>
        </p>

        <small className="formula-section">1 · 계수</small>
        <table className="formula-table">
          <tbody>
            <Row
              label="계수 상승"
              expr="Σ motionValueAmplify (곱연산)"
              value={pct(d.motionValueAmplify)}
              keys={["motionValueAmplify"]}
            />
            <Row
              label="계수 증가"
              expr="Σ motionValueIncrease (합연산, 계수와 같은 단위)"
              value={pct(d.motionValueIncrease)}
              keys={["motionValueIncrease"]}
            />
            <Row
              label="최종 계수"
              expr="기본 계수 × (1 + 상승) + 증가"
              value="아래 히트별 표 참고"
            />
          </tbody>
        </table>

        <small className="formula-section">2 · 계수에 곱하는 스탯</small>
        <table className="formula-table">
          <tbody>
            <Row
              label={`기초 ${statLabel}`}
              expr={
                src.weapon
                  ? `캐릭터 ${dec(src.base)} + 무기 ${dec(src.weapon)} (각각 소수점 버린 뒤 더한다)`
                  : "캐릭터 기초값 (소수점 버린 뒤)"
              }
              value={dec(src.base + src.weapon)}
            />
            <Row
              label={`${statLabel} % (스탯창)`}
              expr="스킬 트리 · 무기 부옵션 · 무기 효과 · 에코 옵션 — 스탯창에 찍히는 묶음"
              value={pct(src.percent)}
              keys={[percentKey]}
            />
            <Row
              label="스탯창 값"
              expr={`⌊${dec(src.base + src.weapon)} × (1 + 캐릭터 ${pct(
                src.percent - src.echoPercent,
              )})⌋ + ⌊× 에코 메인 ${pct(
                src.echoPercent - src.echoSubPercent,
              )}⌋ + ⌊× 에코 부옵션 ${pct(src.echoSubPercent)}⌋ — 갈라서 각각 버린다`}
              value={num(src.panel)}
            />
            <Row
              label={`${statLabel} % (버프)`}
              expr="공명체인 · 파티 버프 · 에코 세트 — 스탯창 값이 확정된 뒤 얹힌다"
              value={pct(src.buffPercent)}
              keys={[buffPercentKey]}
            />
            <Row
              label="버프분"
              expr={`(${dec(src.base + src.weapon)}) × ${pct(src.buffPercent)} — 버리지 않고 그대로 더한다`}
              value={dec(src.buffAmount)}
            />
            <Row
              label={`깡${statLabel === "공격력" ? "공" : statLabel}`}
              expr="곱연산이 끝난 뒤에 더한다 — 퍼센트를 타지 않는다"
              value={dec(src.plus)}
              keys={[statKey]}
            />
            <Row
              label="버리기 전"
              expr={`스탯창 ${num(src.panel)} + 버프분 ${dec(src.buffAmount)} + 깡수치 ${dec(
                src.plus,
              )}`}
              value={src.raw.toFixed(4)}
            />
            <Row
              label={`⌊${statLabel}⌋`}
              expr="소수점을 버린 정수 — 게임 스탯창에 찍히는 값"
              value={num(d.attr)}
            />
          </tbody>
        </table>

        <small className="formula-section">3 · 배율</small>
        <table className="formula-table">
          <tbody>
            <Row
              label="피해증가"
              expr={`1 + 전체 ${pct(d.allDamageBonus)} + ${categoryName} ${pct(
                d.categoryDamageBonus,
              )} + ${elementName} ${pct(d.elementDamageBonus)}`}
              value={mult(d.dmgBonus)}
              keys={bonusKeys}
            />
            <Row
              label="부스트"
              expr={`1 + 전체 ${pct(d.allBoost)} + ${categoryName} ${pct(
                d.categoryBoost,
              )} + ${elementName} ${pct(d.elementBoost)}`}
              value={mult(d.boost)}
              keys={boostKeys}
            />
            <Row
              label="속성저항"
              expr={`R = ${pct(d.baseRes)}${d.sameElement ? "(동일 속성)" : ""} − (무시 ${pct(
                d.resPen,
              )} + 감소 ${pct(d.resReduction)}) = ${pct(r)} · ${resBranch}`}
              value={mult(d.resMult)}
              keys={["resPen", "resReduction"]}
            />
            <Row
              label="방어저항"
              expr={`(800 + 8×${d.charLevel}) / (800 + 8×${d.charLevel} + (792 + 8×${d.enemyLevel}) × (1 − 무시 ${pct(
                d.defIgnore,
              )}) × (1 − 감소 ${pct(d.defReduction)}))`}
              value={mult(d.defMult)}
              keys={["defIgnore", "defReduction"]}
            />
            <Row
              label="적 피해감소"
              expr={`1 − ${pct(d.enemyDamageReduction)}`}
              value={mult(d.drMult)}
            />
            <Row
              label="받는피해"
              expr={`1 + 적 ${pct(d.enemyDamageTakenBonus)} + 자신 ${pct(d.selfDamageTakenBonus)}`}
              value={mult(d.dmgTaken)}
              keys={["damageTakenBonus"]}
            />
            <Row
              label="최종피해"
              expr={`1 + ${pct(d.totalDamageBonus)}`}
              value={mult(d.totalDmg)}
              keys={["totalDamageBonus"]}
            />
            <tr className="formula-sum">
              <td className="formula-label">배율 합계</td>
              <td className="formula-expr">위 여덟 배율을 전부 곱한 값</td>
              <td className="formula-value">{mult(d.multiplierChain)}</td>
            </tr>
          </tbody>
        </table>

        <small className="formula-section">4 · 히트별</small>
        <table className="formula-table formula-hits">
          <thead>
            <tr>
              <th>타수</th>
              <th>기본 계수</th>
              <th>최종 계수</th>
              <th>올림 전</th>
              <th>일반</th>
              <th>치명타</th>
            </tr>
          </thead>
          <tbody>
            {damage.hits.map((hit, index) => (
              <tr key={index}>
                <td>{index + 1}타</td>
                <td>{pct(hit.baseMotionValue)}</td>
                <td>{pct(hit.motionValue)}</td>
                <td>{dec(hit.raw)}</td>
                <td>{num(hit.normalDamage)}</td>
                <td>{num(hit.criticalDamage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="formula-note">
          히트별 값 = ⌈ ⌊{statLabel}⌋ × 최종 계수 × 배율 합계 ⌉. 합계는 히트별로 올리지 않고
          올림 전 원본을 다 더한 뒤 한 번만 올리므로, 위 「일반」 칸을 그대로 더한 것과 최대
          (히트 수 − 1) 만큼 차이가 날 수 있다.
        </p>

        <small className="formula-section">5 · 결과</small>
        <table className="formula-table">
          <tbody>
            <Row label="올림 전 합계" expr="Σ 히트별 올림 전 값" value={dec(d.rawTotal)} />
            <Row
              label="고정 피해"
              expr="모든 배율·크리티컬과 무관하게 마지막에 더한다"
              value={num(damage.fixedDamage)}
            />
            <Row
              label="일반"
              expr="⌈ 올림 전 합계 + 고정 피해 ⌉"
              value={num(damage.normalDamage)}
            />
            <Row
              label="치명타"
              expr={`⌈ 올림 전 합계 × (1 + 크리 피해 ${pct(d.critDamage)}) + 고정 피해 ⌉`}
              value={num(damage.criticalDamage)}
            />
            <tr className="formula-sum">
              <td className="formula-label">기대</td>
              <td className="formula-expr">
                ⌈ 일반 × (1 − 크리율 {pct(d.critRate)}) + 치명타 × 크리율 ⌉
              </td>
              <td className="formula-value">{num(damage.expectedDamage)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </ContributionContext.Provider>
  );
}

/**
 * 이상 효과 계산식 창.
 *
 * 일반 공격과 겹치는 항목이 거의 없어서 표를 따로 그린다 —
 * 공격력도 스킬 계수도 크리티컬도 타지 않고, 피해 보너스 그룹도 걸리지 않는다.
 * 방어저항에 방어무시가 빠지는 것도 여기서 눈으로 확인할 수 있게 적어 둔다.
 */
function AnomalyFormulaModal({
  result,
  damage,
  onClose,
}: {
  result: CalculationResult;
  damage: Extract<CalculationResult["damage"], { kind: "anomaly" }>;
  onClose: () => void;
}) {
  const { character } = result;
  const d = damage.breakdown;
  useEscapeToClose(onClose);

  const r = d.baseRes - d.resPenTotal;
  const resBranch =
    r < 0 ? "R < 0 → 1 − R/2" : r < 0.8 ? "0 ≤ R < 0.8 → 1 − R" : "R ≥ 0.8 → 1 / (1 + 5R)";
  const typeLabel =
    d.anomalyType === "tick" ? "틱데미지형" : d.anomalyType === "burst" ? "스택폭발형" : "디버프형";

  return (
    <ContributionContext.Provider value={result.stats.contributions}>
      <div className="formula-backdrop" onClick={onClose}>
        <div className="formula-modal" onClick={(event) => event.stopPropagation()}>
          <div className="formula-head">
            <div>
              <h3>{d.anomalyName} 효과</h3>
              <span>
                {character.name} · Lv.{d.charLevel} · {ELEMENT_NAMES[d.element]} · {typeLabel} ·{" "}
                {d.stacks}스택
              </span>
            </div>
            <div className="formula-actions">
              <CopyJson result={result} />
              <button className="formula-close" onClick={onClose}>
                ×
              </button>
            </div>
          </div>

          <p className="formula-top">
            이상 피해 = ⌈ 기초값 × 발생횟수 × 부스트 × 이상 치명 × 방어저항 × 속성저항 × 최종피해 ⌉
            <br />
            <span style={{ color: "#9aa3b3" }}>
              공격력 · 스킬 계수 · 크리티컬 · 피해 보너스는 이상 피해에 들어가지 않습니다.
            </span>
          </p>

          <small className="formula-section">1 · 기초값</small>
          <table className="formula-table">
            <tbody>
              <Row label="산출식" expr={d.anomalyFormula} value={`${d.stacks}스택`} />
              <Row label="이상 기초값" expr={`${d.anomalyName} 효과 · 90레벨 기준`} value={dec(d.base)} />
              <Row label="발생 횟수" expr="그 상태로 몇 번 터졌는지" value={`${d.occurrences}회`} />
            </tbody>
          </table>

          <small className="formula-section">2 · 배율</small>
          <table className="formula-table">
            <tbody>
              <Row
                label="이상 효과 부스트"
                expr={`1 + 전체 ${pct(d.anomalyBoost)} + ${d.anomalyName} 전용 ${pct(d.kindBoost)}`}
                value={dec(d.boost)}
                keys={["anomalyBoost"]}
              />
              <Row
                label="이상 치명"
                expr="게임에 별도 수치가 확인되지 않아 1.0으로 둔다"
                value={dec(d.critMultiplier)}
              />
              <Row
                label="속성저항"
                expr={`R = ${pct(d.baseRes)} − ${pct(d.resPenTotal)} = ${pct(r)} · ${resBranch}`}
                value={dec(d.resMult)}
                keys={["resPen", "resReduction"]}
              />
              <Row
                label="방어저항"
                expr={`(800+8×${d.charLevel}) / (800+8×${d.charLevel} + (792+8×${d.enemyLevel})×(1−${pct(
                  d.defReduction,
                )}))  ※ 방어무시 미반영`}
                value={dec(d.defMult)}
                keys={["defReduction"]}
              />
              <Row
                label="적 피해 감소"
                expr={`1 − ${pct(d.enemyDamageReduction)}`}
                value={dec(d.drMult)}
              />
              <Row
                label="최종피해"
                expr={`1 + ${pct(d.totalDamageBonus)}`}
                value={dec(d.totalDmg)}
                keys={["totalDamageBonus"]}
              />
              <Row label="배율 합계" expr="위 값을 전부 곱한 것" value={dec(d.multiplierChain)} />
            </tbody>
          </table>

          <small className="formula-section">3 · 결과</small>
          <table className="formula-table">
            <tbody>
              <Row
                label="이상 피해"
                expr={`⌈ ${dec(d.base)} × ${d.occurrences} × ${dec(d.multiplierChain)} ⌉`}
                value={num(damage.expectedDamage)}
              />
            </tbody>
          </table>

          <p className="formula-note">
            이상 피해에는 크리티컬이 없습니다. 방어저항에 <b>방어력 무시가 들어가지 않는</b> 것이
            일반 피해와 가장 크게 다른 점입니다 — 방어력 감소만 반영됩니다.
          </p>
        </div>
      </div>
    </ContributionContext.Provider>
  );
}
