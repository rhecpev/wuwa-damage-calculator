import { useState } from "react";
import { characters } from "../../../data/sampleData";
import { CHAIN_MAX, chainNodesOf } from "../../../data/characterChains";
import { usePartyConfig } from "../../../context/PartyConfigContext";
import { MODE_LABEL } from "../../../data/modeVariants";

interface CharacterBuffSectionProps {
  characterId: string;
}

/**
 * 공명체인 단계와 공명 모드를 정하는 자리. 단계를 누르면 그 설명이 옆에 뜬다.
 */
export function CharacterBuffSection({ characterId }: CharacterBuffSectionProps) {
  const { characterChains, setCharacterChain, characterModes, setCharacterMode } =
    usePartyConfig();
  // 오른쪽에 설명을 띄울 체인. 처음에는 1단계를 보여준다.
  const [pickedChain, setPickedChain] = useState(1);

  const character = characters.find((c) => c.id === characterId);
  if (!character) return null;

  const chain = characterChains[characterId] ?? 0;
  const mode = characterModes[characterId] ?? character.resonanceModes?.[0];
  const nodes = chainNodesOf(characterId);
  const picked = nodes.find((n) => n.chain === pickedChain) ?? nodes[0];

  return (
    <section className="panel">
      <div className="row">
        <div>
          <h2>공명체인</h2>
        </div>
      </div>

      {/* 1단계부터 6단계까지 가로로 나란히. 노드를 누르면 그 단계까지 보유한 것으로 잡히고,
          이미 켜진 노드를 다시 누르면 한 칸 내려간다. */}
      <div className="chain-grid">
        <div className="chain-rail">
          {nodes.map((node) => {
            const owned = node.chain <= chain;

            return (
              <button
                key={node.chain}
                className={[
                  "chain-node",
                  owned ? "owned" : "",
                  node.chain === pickedChain ? "picked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setPickedChain(node.chain);
                  setCharacterChain(characterId, owned ? node.chain - 1 : node.chain);
                }}
                title={node.name}
              >
                <span className="chain-star">
                  {node.icon ? <img src={node.icon} alt="" loading="lazy" /> : <em>{node.chain}</em>}
                </span>
                <span className="chain-node-no">{node.chain}</span>
              </button>
            );
          })}
          {nodes.length === 0 && <p className="chain-empty">체인 데이터가 없습니다.</p>}
        </div>

        <div className="chain-detail">
          <div className="chain-detail-head">
            <small>{chain}/{CHAIN_MAX} 보유</small>
            {character.resonanceModes && character.resonanceModes.length > 1 && (
              <span className="chain-picker">
                공명 모드
                {character.resonanceModes.map((m) => (
                  <button
                    key={m}
                    className={m === mode ? "on" : ""}
                    onClick={() => setCharacterMode(characterId, m)}
                  >
                    {MODE_LABEL[m] ?? m}
                  </button>
                ))}
              </span>
            )}
          </div>

          {picked ? (
            <>
              <h3 className={picked.chain <= chain ? "chain-title owned" : "chain-title"}>
                <span>{picked.chain}단계</span> {picked.name}
              </h3>
              <p className="chain-desc">{picked.description}</p>
              <span className={picked.chain <= chain ? "chain-state on" : "chain-state"}>
                {picked.chain <= chain ? "보유 중" : "미보유"}
              </span>
            </>
          ) : (
            <p className="chain-desc">표시할 체인이 없습니다.</p>
          )}
        </div>
      </div>

    </section>
  );
}
