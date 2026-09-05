/**
 * 숫자를 **끌어서** 고르는 칸.
 *
 * 레벨처럼 범위가 뻔한 값은 위아래 화살표를 눌러 90까지 올리는 것이 고역이다.
 * 이 앱의 다른 화면(캐릭터 레벨 · 무기 레벨)도 이미 끌어서 고르게 되어 있어서,
 * 프로필 입력 화면만 화살표로 남아 있으면 손에 익은 것과 어긋난다.
 *
 * 값은 옆에 숫자로 같이 보여 준다 — 끌기만으로는 지금이 87인지 88인지 알 수 없다.
 */
export function LevelSlider({
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** 숫자 뒤에 붙는 짧은 말. 「/10」처럼 전체를 알려 줄 때 쓴다. */
  suffix?: string;
}) {
  return (
    <span className="level-slider">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <b>
        {value}
        {suffix && <i>{suffix}</i>}
      </b>
    </span>
  );
}
