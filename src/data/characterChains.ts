import characterChainsData from "./characterChains.json";

/**
 * 공명체인 6단계의 이름 · 설명 · 아이콘. 표시 전용이다.
 * scripts/build-character-chains.mjs 가 원본 덤프에서 뽑는다.
 *
 * 계산에 들어가는 수치는 여기 설명문을 파싱하는 게 아니라,
 * 사람이 해석해서 캐릭터 파일의 passiveBuffs(resonanceChain 조건)에 적어둔 것을 쓴다.
 */
export interface ChainNode {
  /** 몇 번째 체인인지 1~6. */
  chain: number;
  name: string;
  description: string;
  icon: string | null;
}

const byCharacter = characterChainsData as Record<string, ChainNode[] | undefined>;

export const CHAIN_MAX = 6;

/** 이 캐릭터의 체인 6단계. 데이터가 없으면 빈 배열. */
export const chainNodesOf = (characterId: string): ChainNode[] => byCharacter[characterId] ?? [];
