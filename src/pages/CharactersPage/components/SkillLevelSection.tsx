import { characters } from "../../../data/sampleData";
import { usePartyConfig } from "../../../context/PartyConfigContext";
import {
  inherentSkillsOf,
  isInherentOn,
  isNodeOn,
  nodesOf,
  type CharacterNode,
} from "../../../data/characterNodes";
import type { Skill, SkillCategory } from "../../../types/game";
import { pct } from "../../../utils/format";

interface SkillLevelSectionProps {
  characterId: string;
}

const SKILL_LEVEL_MIN = 1;
const SKILL_LEVEL_MAX = 10;
/** 일괄 지정 버튼에 쓰는 자주 쓰이는 레벨. */
const LEVEL_PRESETS = [1, 6, 8, 10];

/**
 * 게임 스킬 트리의 세로줄 다섯 개. 왼쪽부터 이 순서로 선다.
 * 가운데(공명 회로) 줄만 스탯 노드 대신 고유 스킬이 위에 얹힌다.
 */
const BRANCHES: { category: SkillCategory; label: string }[] = [
  { category: "Basic", label: "기본 공격" },
  { category: "Skill", label: "공명 스킬" },
  { category: "Circuit", label: "공명 회로" },
  { category: "Liberation", label: "공명 해방" },
  { category: "Variation", label: "변주 스킬" },
];

/** 줄에 서지 않고 아래 가운데에 따로 놓이는 둘. */
const FOOTERS: { category: SkillCategory; label: string }[] = [
  { category: "Intro", label: "반주 스킬" },
  { category: "Sync", label: "조화도 파괴" },
];

/** 그 스킬의 모든 공격 배율을 해당 레벨로 합산한다. 레벨을 올린 체감을 바로 보여주려는 값. */
function totalRate(skill: Skill, level: number): number {
  return skill.attacks.reduce(
    (sum, attack) =>
      sum + attack.hits.reduce((acc, levels) => acc + (levels[level - 1] ?? levels.at(-1) ?? 0), 0),
    0,
  );
}

/** 노드 한 줄을 "공격력 +1.8%" 처럼 짧게. 설명 원문은 title 속성으로 남긴다. */
function nodeSummary(node: CharacterNode): string {
  const entries = Object.entries(node.stats);
  if (entries.length === 0) return node.title;
  return entries.map(([, value]) => `+${pct(value as number, 1)}`).join(" ");
}

/**
 * 스킬 트리. 게임 화면과 같은 배치로 그린다.
 *   세로줄 다섯 개 — 아래에 스킬(마름모), 위에 스탯 노드(원) 두 개
 *   아래 가운데 — 반주 스킬 · 조화도 파괴
 *
 * 스킬 마름모를 누르면 레벨(1~10)을 고르고, 스탯 노드를 누르면 껐다 켠다.
 * 노드는 처음엔 전부 켜져 있다.
 */
export function SkillLevelSection({ characterId }: SkillLevelSectionProps) {
  const {
    characterSkillLevels,
    setSkillLevel,
    setAllSkillLevels,
    characterNodes,
    toggleCharacterNode,
    setAllCharacterNodes,
    characterInherents,
    toggleCharacterInherent,
  } = usePartyConfig();
  const character = characters.find((c) => c.id === characterId);
  if (!character) return null;

  const levels = characterSkillLevels[characterId] ?? {};
  /**
   * 저장된 레벨. 저장된 값이 숫자가 아니면(옛 자료가 깨졌거나 하면) 없는 것으로 보고
   * 기본값으로 돌린다 — 그냥 넘기면 조절 칸이 빈 채로 그려져 레벨이 사라진 것처럼 보인다.
   */
  const levelOf = (skill: Skill) => {
    const saved = levels[skill.id];
    if (Number.isFinite(saved)) return saved;
    return skill.attacks[0]?.skillLevel ?? SKILL_LEVEL_MAX;
  };

  const skillOf = (category: SkillCategory) =>
    character.skills.find((s) => s.category === category);

  // 공명 회로 줄 위에는 스탯 노드 대신 고유 스킬이 얹힌다(게임과 같은 배치).
  const inherents = inherentSkillsOf(character);
  const inherentsOn = characterInherents[characterId];

  const nodes = nodesOf(characterId);
  const enabled = characterNodes[characterId];
  const nodesFor = (category: SkillCategory, row: "lower" | "upper") =>
    nodes.filter((n) => n.branch === category && n.row === row);

  /** 일괄 지정이 건드릴 스킬 — 줄에 선 다섯이다. 피해 자료 유무와 상관없다. */
  const levelledIds = BRANCHES.map(({ category }) => skillOf(category)?.id).filter(
    (id): id is string => !!id,
  );
  const onCount =
    nodes.filter((n) => isNodeOn(n.id, enabled)).length +
    inherents.filter((s) => isInherentOn(s.id, inherentsOn)).length;
  const totalCount = nodes.length + inherents.length;

  /** 슬라이더·숫자 입력에서 온 값을 걸러 넘긴다. 빈 칸이면 아무것도 하지 않는다. */
  function applyLevel(skillId: string, raw: string) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    setSkillLevel(characterId, skillId, value);
  }

  /**
   * 스킬 하나를 마름모 → Lv 표기 → 레벨 조절 → 이름 순으로.
   * 레벨 조절은 접어두지 않고 항상 펼쳐 둔다.
   * 배율 합계는 자리를 많이 먹어서 마름모 툴팁으로 뺐다.
   *
   * **레벨 칸은 「줄에 선 다섯」에는 언제나 그린다** — 피해 자료가 없다고 빼면 안 된다.
   * 파수인·수수의 공명 해방, 설지·알토의 공명 회로처럼 피해가 없는 스킬이 있는데,
   * 그것들도 게임에서는 똑같이 올리는 스킬이고 가져오기가 레벨을 채워 넣는다.
   * 빼 두면 그 레벨을 볼 수도 고칠 수도 없다.
   * 반주 스킬·조화도 파괴(아래 가운데 둘)만 레벨 개념이 없다.
   */
  function renderSkill(skill: Skill | undefined, label: string, levelled = true) {
    if (!skill) return <span className="tree-skill tree-missing">{label}</span>;

    const level = levelled ? levelOf(skill) : null;
    const tip =
      level === null
        ? skill.name
        : `${skill.name} — 배율 합계 ${pct(totalRate(skill, level), 1)} · 공격 ${skill.attacks.length}개`;

    return (
      <div className="tree-skill">
        <span className="tree-diamond" title={tip}>
          <span className="tree-diamond-inner">
            {skill.icon ? <img src={skill.icon} alt="" loading="lazy" /> : <em>{label[0]}</em>}
          </span>
        </span>

        {level !== null && (
          <>
            <span className="tree-level">
              Lv.<b>{level}</b>/10
            </span>
            <span className="tree-picker">
              <input
                type="range"
                min={SKILL_LEVEL_MIN}
                max={SKILL_LEVEL_MAX}
                value={level}
                onChange={(event) => applyLevel(skill.id, event.target.value)}
              />
              <input
                type="number"
                className="tree-picker-number"
                min={SKILL_LEVEL_MIN}
                max={SKILL_LEVEL_MAX}
                value={level}
                onChange={(event) => applyLevel(skill.id, event.target.value)}
              />
            </span>
          </>
        )}

        <span className="tree-label">{label}</span>
      </div>
    );
  }

  /** 고유 스킬 하나. 스탯 노드와 같은 원형 판이고, 눌러서 켜고 끈다. */
  function renderInherent(skill: Skill) {
    const on = isInherentOn(skill.id, inherentsOn);

    return (
      <button
        key={skill.id}
        className={on ? "tree-inherent on" : "tree-inherent"}
        onClick={() => toggleCharacterInherent(characterId, skill.id)}
        title={skill.name}
      >
        <span className="tree-plate">
          {skill.icon ? <img src={skill.icon} alt="" loading="lazy" /> : <em>·</em>}
        </span>
        <span className="tree-inherent-name">{skill.name}</span>
      </button>
    );
  }

  /** 스탯 노드(원) 하나. 누르면 켜고 꺼진다. */
  function renderNode(node: CharacterNode) {
    const on = isNodeOn(node.id, enabled);

    return (
      <button
        key={node.id}
        className={on ? "tree-node on" : "tree-node"}
        onClick={() => toggleCharacterNode(characterId, node.id)}
        title={node.description}
      >
        <span className="tree-plate">
          {node.icon ? <img src={node.icon} alt="" loading="lazy" /> : <em>+</em>}
        </span>
        <span className="tree-node-value">{nodeSummary(node)}</span>
      </button>
    );
  }

  return (
    <section className="panel">
      <div className="row">
        <div>
          <small>SKILL TREE</small>
          <h2>{character.name} - 스킬 노드</h2>
        </div>
        <div className="tree-actions">
          <span className="skill-level-all">
            스킬 레벨
            {LEVEL_PRESETS.map((n) => (
              <button key={n} onClick={() => setAllSkillLevels(characterId, levelledIds, n)}>
                {n}
              </button>
            ))}
          </span>
          <span className="skill-level-all">
            노드 {onCount}/{totalCount}
            <button onClick={() => setAllCharacterNodes(characterId, true)}>전부</button>
            <button onClick={() => setAllCharacterNodes(characterId, false)}>해제</button>
          </span>
        </div>
      </div>

      <div className="tree">
        {BRANCHES.map(({ category, label }) => (
          <div className="tree-branch" key={category}>
            {/* 위에서 아래로 — 윗줄 노드, 아랫줄 노드, 스킬. 사이를 세로선이 잇는다. */}
            <div className="tree-stack">
              {category === "Circuit"
                ? inherents.map(renderInherent)
                : [...nodesFor(category, "upper"), ...nodesFor(category, "lower")].map(renderNode)}
            </div>
            {renderSkill(skillOf(category), label)}
          </div>
        ))}
      </div>

      <div className="tree-footer">
        {FOOTERS.map(({ category, label }) => (
          <div className="tree-branch" key={category}>
            {renderSkill(skillOf(category), label, false)}
          </div>
        ))}
      </div>

      {nodes.length === 0 && (
        <p className="tree-note">이 캐릭터의 스탯 노드 데이터가 없습니다.</p>
      )}
    </section>
  );
}
