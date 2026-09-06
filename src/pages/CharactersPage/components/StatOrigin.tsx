import type { FinalStats, StatSource, Stats } from "../../../types/stats";
import { dec, num, pct } from "../../../utils/format";
import { STAT_NAMES } from "../../../utils/statNames";

/** 깡수치 그대로 적는 칸. 나머지는 퍼센트로 적는다. */
const FLAT_KEYS = new Set<keyof Stats>(["hp", "atk", "def"]);

/**
 * 이 칸 하나를 설명하려면 같이 봐야 하는 칸들.
 * 공격력은 깡공 · 스탯창% · 버프%가 서로 다른 자리에서 더해져 한 숫자가 된다.
 */
const RELATED: Partial<Record<keyof Stats, (keyof Stats)[]>> = {
  hp: ["hp", "hpPercent", "hpPercentBuff"],
  atk: ["atk", "atkPercent", "atkPercentBuff"],
  def: ["def", "defPercent", "defPercentBuff"],
};

const amount = (key: keyof Stats, value: number) =>
  FLAT_KEYS.has(key) ? dec(value) : pct(value);

/** 조립 과정 한 줄 — 이름 / 어떻게 나온 값인지 / 결과. */
function Step({ label, expr, value }: { label: string; expr: string; value: string }) {
  return (
    <li>
      <span>{label}</span>
      <em>{expr}</em>
      <b>{value}</b>
    </li>
  );
}

interface StatOriginProps {
  /** 누른 칸. */
  statKey: keyof Stats;
  /** 그 칸의 이름(HP · 공격력 …). */
  label: string;
  /** 화면에 찍힌 값 그대로 — 표기 방식까지 맞춘 문자열. */
  display: string;
  /** 크리티컬 피해 · 공명 효율처럼 기본 100%를 얹어 보여주는 칸인지. */
  withBase: boolean;
  stats: FinalStats;
  onClose: () => void;
}

/**
 * 누른 스탯 한 칸이 어디서 어떤 값으로 나왔는지 펼쳐 보인다.
 *
 * 공격력 · HP · 방어력은 두 단계로 조립되는 값이라(calculator/stats.ts 참고)
 * 그 순서를 그대로 적고, 나머지 칸은 얹은 출처만 줄줄이 적는다.
 */
export function StatOrigin({
  statKey,
  label,
  display,
  withBase,
  stats,
  onClose,
}: StatOriginProps) {
  const keys = RELATED[statKey] ?? [statKey];

  // 이 칸에 실제로 값을 얹은 출처만 남긴다.
  const rows = stats.contributions
    .map((item) => ({
      source: item.source,
      parts: keys
        .filter((key) => item.stats[key])
        .map((key) => `${STAT_NAMES[key] ?? key} ${amount(key, item.stats[key]!)}`),
    }))
    .filter((item) => item.parts.length > 0);

  const src: StatSource | undefined =
    statKey === "hp" || statKey === "atk" || statKey === "def"
      ? stats.sources[statKey]
      : undefined;
  const base = src ? src.base + src.weapon : 0;
  // 스탯창 퍼센트는 캐릭터 쪽과 에코 쪽이 갈려서 각각 버림된다.
  const charPercent = src ? src.percent - src.echoPercent : 0;

  return (
    <div className="stat-origin">
      <div className="stat-origin-head">
        <b>
          {label} <span>{display}</span>
        </b>
        <button type="button" onClick={onClose} title="접기">
          ×
        </button>
      </div>

      {src && (
        <ol className="stat-origin-steps">
          <Step
            label="기초"
            expr={
              src.weapon
                ? `캐릭터 ${dec(src.base)} + 무기 ${dec(src.weapon)} — 각각 버린 뒤 더한다`
                : "캐릭터 기초값 — 소수점 버린 뒤"
            }
            value={num(base)}
          />
          <Step
            label="캐릭터 쪽 %"
            expr={`⌊${num(base)} × (1 + ${pct(charPercent)})⌋ — 스킬 트리 · 무기 · 장착 효과`}
            value={num(Math.floor(base * (1 + charPercent)))}
          />
          {src.echoPercent - src.echoSubPercent !== 0 && (
            <Step
              label="에코 메인 %"
              expr={`⌊${num(base)} × ${pct(src.echoPercent - src.echoSubPercent)}⌋ — 에코의 메인 옵션 몫`}
              value={num(Math.floor(base * (src.echoPercent - src.echoSubPercent)))}
            />
          )}
          {src.echoSubPercent !== 0 && (
            <Step
              label="에코 부옵션 %"
              expr={`⌊${num(base)} × ${pct(src.echoSubPercent)}⌋ — 메인 옵션과 갈라서 따로 버린다`}
              value={num(Math.floor(base * src.echoSubPercent))}
            />
          )}
          <Step
            label="스탯창 값"
            expr="게임 속성 창에 찍히는 값 — 여기까지가 버림이 끝난 정수다"
            value={num(src.panel)}
          />
          {src.buffPercent !== 0 && (
            <Step
              label="버프 %"
              expr={`${num(base)} × ${pct(src.buffPercent)} — 공명체인 · 파티 버프, 버리지 않는다`}
              value={dec(src.buffAmount)}
            />
          )}
          {src.plus !== 0 && (
            <Step
              label="깡수치"
              expr="퍼센트를 타지 않고 맨 끝에 더한다 — 에코 옵션의 깡공 · 깡HP"
              value={dec(src.plus)}
            />
          )}
          <Step
            label="최종"
            expr={`⌊${dec(src.raw)}⌋ — 소수점을 버린 정수`}
            value={num(Math.floor(src.raw))}
          />
        </ol>
      )}

      {rows.length === 0 ? (
        <em className="stat-origin-empty">
          이 값을 올린 출처가 없습니다 — 기본값 그대로입니다.
        </em>
      ) : (
        <ul className="stat-origin-list">
          {rows.map((item, index) => (
            <li key={`${item.source}-${index}`}>
              <b>{item.source}</b>
              <span>{item.parts.join(" · ")}</span>
            </li>
          ))}
        </ul>
      )}

      {withBase && (
        <em className="stat-origin-empty">
          화면에 뜨는 값은 기본 100%에 위 합계를 얹은 것입니다.
        </em>
      )}
    </div>
  );
}
