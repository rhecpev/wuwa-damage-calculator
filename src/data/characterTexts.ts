import textData from "./characterTexts.json";

/**
 * 캐릭터 스킬·공명체인의 **원문**.
 *
 * 게임이 사람에게 보여 주는 문장 그대로다. 우리가 계산에 쓰는 값(공격 계수 · 버프)은
 * 이 문장을 사람이 읽고 옮겨 적은 것이라, 옮기다 빠뜨린 것이 반드시 생긴다.
 * 그래서 확인 탭이 원문과 옮긴 결과를 나란히 놓고 볼 수 있게 원문을 들고 있는다.
 *
 * 파일은 scripts/build-character-texts.mjs가 api/characters/*.json에서 만든다.
 */

export interface SkillText {
  /** 스킬 id. 캐릭터 데이터(Skill.id)와 같은 번호다. */
  id: string;
  /** 「공명 해방」 · 「고유 스킬」처럼 게임이 붙인 종류 이름. */
  type: string;
  name: string;
  text: string;
}

export interface ChainText {
  step: number;
  name: string;
  text: string;
}

export interface CharacterText {
  skills: SkillText[];
  chain: ChainText[];
}

const TEXTS = textData as Record<string, CharacterText>;

export const characterTextOf = (characterId: string): CharacterText | undefined =>
  TEXTS[characterId];

/**
 * 이 문장에 **수치가 붙은 버프가 적혀 있는지**.
 *
 * 「20% 증가」 · 「증가시키고 30%」처럼 백분율과 버프 낱말이 가까이 붙은 자리만 본다.
 * 그냥 「증가」만 찾으면 피해 배율 설명까지 전부 걸려서 쓸모가 없다.
 * 여기서 걸린 스킬에 등록된 버프가 하나도 없으면 「빠뜨린 것 같다」고 알린다.
 */
const BUFF_PHRASE =
  /([0-9]+(?:\.[0-9]+)?%[^.。\n]{0,24}(?:증가|감소|상승|보너스|무시|저항))|((?:증가|감소|상승|보너스|무시|저항)[^.。\n]{0,24}[0-9]+(?:\.[0-9]+)?%)/;

export const looksLikeBuffText = (text: string): boolean => BUFF_PHRASE.test(text);

/** 버프가 적힌 것으로 보이는 문장 조각만 골라 낸다. 확인 화면에서 원문 대신 짚어 준다. */
export function buffSentences(text: string): string[] {
  return text
    .split(/\n|(?<=다\.)\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && BUFF_PHRASE.test(line));
}
