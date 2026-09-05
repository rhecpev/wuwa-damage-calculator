import {
  ENEMY_LEVEL_MAX,
  ENEMY_LEVEL_MIN,
  usePartyConfig,
} from "../../../context/PartyConfigContext";
import type { Element } from "../../../types/game";
import { ELEMENT_COLORS, ELEMENT_NAMES, elementIcon } from "../../../data/elements";
import { num } from "../../../utils/format";

/** 속성 라디오에 쓸 목록. 게임 내 속성 순서를 따른다. */
const ELEMENTS: Element[] = ["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"];

export function EnemySection() {
  const { config, setEnemyLevel, setEnemyElement } = usePartyConfig();
  const { enemy } = config;

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
              onChange={(event) => setEnemyLevel(Number(event.target.value))}
            />
            <input
              type="number"
              className="enemy-level-number"
              min={ENEMY_LEVEL_MIN}
              max={ENEMY_LEVEL_MAX}
              value={enemy.level}
              onChange={(event) => setEnemyLevel(Number(event.target.value))}
            />
          </div>
          <span className="enemy-hint">
            방어력 {num(792 + 8 * enemy.level)} (= 8 × 레벨 + 792)
          </span>
        </div>
      </div>
    </section>
  );
}
