import { ELEMENT_NAMES, elementIcon } from "../data/elements";
import type { Element } from "../types/game";

/** 게임 속성 표기 순서. */
const ELEMENTS: Element[] = ["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"];

/**
 * 속성 아이콘으로 캐릭터 목록을 거르는 단추 줄. 매트릭스 파티 플래너 · 파티 관리 탭이 같이 쓴다.
 * 고른 속성을 다시 누르면 풀린다(전체).
 */
export function ElementFilter({
  value,
  onChange,
}: {
  value: Element | null;
  onChange: (element: Element | null) => void;
}) {
  return (
    <div className="element-filter" role="radiogroup" aria-label="속성으로 거르기">
      <button
        role="radio"
        aria-checked={value === null}
        className={value === null ? "on" : undefined}
        onClick={() => onChange(null)}
      >
        전체
      </button>
      {ELEMENTS.map((element) => {
        const icon = elementIcon(element);
        const on = value === element;
        return (
          <button
            key={element}
            role="radio"
            aria-checked={on}
            aria-label={ELEMENT_NAMES[element]}
            title={ELEMENT_NAMES[element]}
            className={on ? "on" : undefined}
            onClick={() => onChange(on ? null : element)}
          >
            {icon ? <img src={icon} alt="" /> : ELEMENT_NAMES[element]}
          </button>
        );
      })}
    </div>
  );
}
