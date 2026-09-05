/**
 * 숫자 표기를 한 군데로 모은 것.
 *
 * toLocaleString()을 로케일 없이 부르면 보는 사람의 브라우저 설정을 따라가서
 * 천 단위 구분이 마침표가 되거나(de-DE) 아예 다른 자릿수로 끊기는 곳이 있다.
 * 이 앱은 한국어 화면이라 로케일을 ko-KR로 못 박고 항상 1,000 형태로 찍는다.
 */
const LOCALE = "ko-KR";

/** 피해량·스탯처럼 정수로 보여줄 값. 소수점은 버린다(게임 스탯창과 같은 규칙). */
export const flat = (value: number) => Math.floor(value).toLocaleString(LOCALE);

/** 반올림해서 정수로. 합계처럼 버리면 어색한 값에 쓴다. */
export const num = (value: number) => Math.round(value).toLocaleString(LOCALE);

/** 올림 전 원본처럼 소수가 의미 있는 값. 소수 둘째 자리까지. */
export const dec = (value: number) =>
  value.toLocaleString(LOCALE, { maximumFractionDigits: 2 });

/** 0.3645 -> "36.45%" */
export const pct = (value: number, digits = 2) => `${(value * 100).toFixed(digits)}%`;
