import {
  ENEMY_LEVEL_MAX,
  ENEMY_LEVEL_MIN,
  resPresetOf,
  usePartyConfig,
} from "../../../context/PartyConfigContext";
import type { Element } from "../../../types/game";
import { ELEMENT_COLORS, ELEMENT_NAMES, elementIcon } from "../../../data/elements";
import { num } from "../../../utils/format";

/** 속성 라디오에 쓸 목록. 게임 내 속성 순서를 따른다. */
const ELEMENTS: Element[] = ["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"];

/** 자주 쓰는 적 레벨. 눌러서 바로 맞춘다. */
const LEVEL_PRESETS = [90, 100, 110, 120];
/** 눌러서 올리고 내리는 폭. */
const LEVEL_STEPS = [-10, -5, 5, 10];

export function EnemySection() {
  const { config, setEnemyLevel, setEnemyElement } = usePartyConfig();
  const { enemy } = config;
  // 적 레벨이 정해진 콘텐츠(종말 매트릭스)면 레벨 칸을 잠근다.
  const presetInfo = resPresetOf(enemy.resPreset ?? "field");
  const locked = presetInfo.fixedLevel !== undefined;

  return (
    <section className="panel">
      <h2>몬스터 설정</h2>

      <div className="enemy-grid">
        <div className="enemy-field">
          <small>속성</small>
          <div className="enemy-elements">
            {ELEMENTS.map((element) => {
              const active = enemy.element === element;
              const color = ELEMENT_COLORS[element];
              const icon = elementIcon(element);

              return (
                <label
                  key={element}
                  className={active ? "enemy-element on" : "enemy-element"}
                  style={active ? { borderColor: color, color } : undefined}
                >
                  <input
                    type="radio"
                    name="enemy-element"
                    value={element}
                    checked={active}
                    onChange={() => setEnemyElement(element)}
                  />
                  {icon ? (
                    <img className="enemy-icon" src={icon} alt="" loading="lazy" />
                  ) : (
                    // 도감에 아이콘이 없으면 예전처럼 색 점으로 대신한다.
                    <span className="enemy-dot" style={{ background: color }} />
                  )}
                  {ELEMENT_NAMES[element]}
                </label>
              );
            })}
          </div>
          <span className="enemy-hint">
            선택한 속성과 같은 속성으로 때리면 속성 저항 {Math.round(enemy.sameElementRes * 100)}%,
            그 외에는 {Math.round(enemy.baseRes * 100)}%가 적용됩니다.
          </span>

        </div>

        <div className="enemy-field">
          <small>레벨</small>
          <div className="enemy-level">
            <input
              type="range"
              min={ENEMY_LEVEL_MIN}
              max={ENEMY_LEVEL_MAX}
              value={enemy.level}
              disabled={locked}
              onChange={(event) => setEnemyLevel(Number(event.target.value))}
            />
            <input
              type="number"
              className="enemy-level-number"
              min={ENEMY_LEVEL_MIN}
              max={ENEMY_LEVEL_MAX}
              value={enemy.level}
              disabled={locked}
              onChange={(event) => setEnemyLevel(Number(event.target.value))}
            />
          </div>

          {/* 막대를 끌지 않고도 자주 쓰는 레벨로 바로 가고, 옆 단추로 잘게 옮긴다.
              setEnemyLevel이 1~200으로 잘라 주므로 여기서 따로 막지 않는다. */}
          <div className="enemy-level-keys">
            {LEVEL_PRESETS.map((level) => (
              <button
                key={level}
                className={enemy.level === level ? "on" : ""}
                disabled={locked}
                onClick={() => setEnemyLevel(level)}
                title={`적 레벨 ${level}`}
              >
                {level}
              </button>
            ))}
            <span className="enemy-level-sep" />
            {LEVEL_STEPS.map((step) => (
              <button
                key={step}
                className="enemy-level-step"
                disabled={locked}
                onClick={() => setEnemyLevel(enemy.level + step)}
                title={`적 레벨 ${step > 0 ? `${step} 올리기` : `${-step} 내리기`}`}
              >
                {step > 0 ? `+${step}` : step}
              </button>
            ))}
          </div>
          <span className="enemy-hint">
            방어력 {num(792 + 8 * enemy.level)} (= 8 × 레벨 + 792)
            {locked && ` · ${presetInfo.label} 레벨 ${presetInfo.fixedLevel} 고정`}
          </span>
        </div>
      </div>
    </section>
  );
}
