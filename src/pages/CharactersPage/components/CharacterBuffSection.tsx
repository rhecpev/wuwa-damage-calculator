import { useState } from "react";
import { characters } from "../../../data/sampleData";
import { CHAIN_MAX, chainNodesOf } from "../../../data/characterChains";
import { usePartyConfig } from "../../../context/PartyConfigContext";
import { DAMAGE_TYPE_OPTIONS, TARGET_OPTIONS } from "../../../calculator/manualBuffs";
import type { CharacterBuffTemplate, ResonanceMode } from "../../../types/game";

interface CharacterBuffSectionProps {
  characterId: string;
}

const MODE_LABEL: Record<ResonanceMode, string> = {
  Discord: "조화 파동",
  Flame: "불꽃",
  Cluster: "조화 밀집",
  Frost: "서리",
  Echo: "에코",
};

/** 공격 id -> 공격 이름. 버프가 어느 공격에 걸리는지 이름으로 보여주려고 미리 만든다. */
function attackNames(characterId: string): Map<string, string> {
  const character = characters.find((c) => c.id === characterId);
  const map = new Map<string, string>();
  for (const skill of character?.skills ?? []) {
    for (const attack of skill.attacks) map.set(attack.id, attack.name);
  }
  return map;
}

/**
 * 공명체인 단계와 공명 모드를 정하고, 그 조건에서 어떤 버프가 걸리는지 바로 확인하는 자리.
 * 조건에 맞지 않는 버프도 흐리게 함께 보여줘서 몇 체인부터 열리는지 알 수 있게 한다.
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
  const buffs = character.passiveBuffs ?? [];
  const names = attackNames(characterId);
  const nodes = chainNodesOf(characterId);
  const picked = nodes.find((n) => n.chain === pickedChain) ?? nodes[0];

  const targetLabel = (b: CharacterBuffTemplate) =>
    TARGET_OPTIONS.find((o) => o.value === b.target)?.label ?? b.target;
  const damageLabel = (b: CharacterBuffTemplate) =>
    DAMAGE_TYPE_OPTIONS.find((o) => o.value === b.damageType)?.label ?? b.damageType;

  /** 지금 설정에서 이 버프가 실제로 걸리는지. */
  const isActive = (b: CharacterBuffTemplate) =>
    (b.resonanceChain === undefined || chain >= b.resonanceChain) &&
    (b.resonanceMode === undefined || mode === b.resonanceMode);

  const activeCount = buffs.filter(isActive).length;

  return (
    <section className="panel">
      <div className="row">
        <div>
          <small>RESONANCE CHAIN</small>
          <h2>{character.name} - 공명체인 · 고유 버프</h2>
        </div>
        <span style={{ color: "#9aa3b3", fontSize: 12 }}>
          {buffs.length === 0
            ? "등록된 버프 없음"
            : `${buffs.length}개 중 ${activeCount}개 적용 중`}
        </span>
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

      {buffs.length === 0 ? (
        <p style={{ color: "#9ea7b7", margin: 0 }}>
          이 캐릭터에는 아직 옮겨 적은 공명체인 버프가 없습니다.
        </p>
      ) : (
        <table className="chain-table">
          <thead>
            <tr>
              <th>체인</th>
              <th>버프</th>
              <th>적용 대상</th>
              <th>방식</th>
              <th>걸리는 공격</th>
              <th>수치</th>
              <th>조건</th>
            </tr>
          </thead>
          <tbody>
            {buffs.map((buff, index) => {
              const active = isActive(buff);
              const stacks = buff.stacks ?? 1;
              const how =
                buff.target === "motionValue"
                  ? buff.modifier === "amplify"
                    ? "상승 (곱)"
                    : "증가 (합)"
                  : "가산";

              return (
                <tr key={index} className={active ? "" : "off"}>
                  <td className="chain-no">{buff.resonanceChain ?? "—"}</td>
                  <td>
                    {buff.label}
                    {buff.resonanceMode && (
                      <span className="chain-mode">{MODE_LABEL[buff.resonanceMode]}</span>
                    )}
                  </td>
                  <td>{targetLabel(buff)}</td>
                  <td>{how}</td>
                  <td>
                    {buff.attackId
                      ? (names.get(buff.attackId) ?? buff.attackId)
                      : damageLabel(buff)}
                  </td>
                  <td className="chain-value">
                    {(buff.value * 100).toFixed(0)}%
                    {stacks > 1 && (
                      <em>
                        ×{stacks} = {(buff.value * stacks * 100).toFixed(0)}%
                      </em>
                    )}
                  </td>
                  <td className="chain-cond">{buff.condition ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
