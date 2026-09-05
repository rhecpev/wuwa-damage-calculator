import { useMemo, useState } from "react";
import { characters } from "../../data/sampleData";
import {
  buffSentences,
  characterTextOf,
  looksLikeBuffText,
  type ChainText,
  type SkillText,
} from "../../data/characterTexts";
import { ReviewActions, ReviewTags } from "../../components";
import { useReviewStatus } from "../../utils/useReviewStatus";
import { DAMAGE_TYPE_LABEL, TARGET_LABEL } from "../../utils/buffLabels";
import type { Character, CharacterBuffTemplate } from "../../types/game";

/**
 * 캐릭터 버프 확인 탭 — 스킬 **원문**과 우리가 옮겨 적은 **버프**를 나란히 놓는 자리.
 * 에코 데미지 확인 탭과 같은 구성·같은 조작이다.
 *
 * 만든 이유는 실제로 빠진 것이 많아서다. 캐릭터 버프 494개를 세어 보니
 * 공명체인 327 · 고유 스킬 89 · 그 밖 78이었다. 일반 공격 · 공명 스킬 · 공명 회로 ·
 * 공명 해방 · 반주 · 변주 · 조화도 파괴에서 온 것이 78개뿐이라는 뜻인데,
 * 원문을 보면 그보다 훨씬 많다. 어느 스킬에서 무엇을 빠뜨렸는지 눈으로 보라고 만든 화면이다.
 *
 * **버프를 스킬에 붙이는 방법은 둘이다.**
 *   inherentSkillId  고유 스킬 버프는 이 값으로 확실히 이어진다.
 *   이름             나머지는 버프 이름 앞머리(「화경 · …」의 「화경」)가 스킬 이름이나
 *                    원문에 굵게 적힌 이름과 같은지로 잇는다. 확실한 방법은 아니라서
 *                    못 이은 것은 「어느 스킬인지 모름」으로 따로 모아 둔다.
 */

/** 공명체인 버프는 스킬이 아니라 단계에 붙는다. 스킬 카드에서는 빼둔다. */
const isChainBuff = (buff: CharacterBuffTemplate) => buff.resonanceChain !== undefined;

/** 버프 이름 앞머리. 「화경 · 공명 해방 피해 부스트」 → 「화경」 */
const headOf = (label: string) => label.split("·")[0].trim();

/** 원문에서 굵게 적힌 이름들(「」로 감싸 둔 것). 버프 이름과 맞춰 보는 데 쓴다. */
function boldNames(text: string): string[] {
  return [...text.matchAll(/「+([^「」]+)」+/g)].map((m) => m[1].trim());
}

interface SkillCard {
  key: string;
  character: Character;
  skill: SkillText;
  buffs: { buff: CharacterBuffTemplate; index: number }[];
  /** 원문에 수치 버프가 적혀 있는데 옮겨 적은 것이 하나도 없는가. */
  missing: boolean;
  /** 버프가 적힌 것으로 보이는 문장들. 없으면 빈 배열. */
  sentences: string[];
}

interface ChainCard {
  key: string;
  character: Character;
  chain: ChainText;
  buffs: { buff: CharacterBuffTemplate; index: number }[];
  missing: boolean;
  sentences: string[];
}

/** 캐릭터 한 명의 버프를 스킬·공명체인 카드로 나눈다. */
function buildCards(character: Character) {
  const text = characterTextOf(character.id);
  const all = (character.passiveBuffs ?? []).map((buff, index) => ({ buff, index }));
  const skillBuffs = all.filter((b) => !isChainBuff(b.buff));
  const used = new Set<number>();

  const skills: SkillCard[] = (text?.skills ?? []).map((skill) => {
    const names = [skill.name, ...boldNames(skill.text)].map((n) => n.replace(/\s+/g, ""));
    const mine = skillBuffs.filter(({ buff }) => {
      if (buff.inherentSkillId) return buff.inherentSkillId === skill.id;
      const head = headOf(buff.label).replace(/\s+/g, "");
      return head.length > 1 && names.some((n) => n === head || n.includes(head));
    });
    for (const m of mine) used.add(m.index);
    const sentences = buffSentences(skill.text);
    return {
      key: `${character.id}:${skill.id}`,
      character,
      skill,
      buffs: mine,
      missing: mine.length === 0 && looksLikeBuffText(skill.text),
      sentences,
    };
  });

  const chainBuffs = all.filter((b) => isChainBuff(b.buff));
  const chain: ChainCard[] = (text?.chain ?? []).map((step) => {
    const mine = chainBuffs.filter(({ buff }) => buff.resonanceChain === step.step);
    return {
      key: `${character.id}:chain${step.step}`,
      character,
      chain: step,
      buffs: mine,
      missing: mine.length === 0 && looksLikeBuffText(step.text),
      sentences: buffSentences(step.text),
    };
  });

  /** 이름으로 어느 스킬에도 못 이은 버프. 잘못 적혔거나 이름이 달라진 것이다. */
  const orphans = skillBuffs.filter(({ index }) => !used.has(index));
  return { skills, chain, orphans };
}

type Filter = "all" | "missing" | "has" | "orphan";
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "missing", label: "빠뜨린 것 같음" },
  { id: "has", label: "옮겨 적음" },
  { id: "orphan", label: "어느 스킬인지 모름" },
];

/** 버프 한 줄을 사람 말로. 수치는 퍼센트로, 스택·조건은 뒤에 붙인다. */
function buffLine(buff: CharacterBuffTemplate): string {
  const target = TARGET_LABEL[buff.target] ?? buff.target;
  const value =
    buff.target === "atkFlat"
      ? `+${buff.value}`
      : `${buff.value >= 0 ? "+" : ""}${+(buff.value * 100).toFixed(2)}%`;
  const parts = [target, value];
  if (buff.damageType && buff.damageType !== "All")
    parts.push(DAMAGE_TYPE_LABEL[buff.damageType] ?? String(buff.damageType));
  if (buff.maxStacks) parts.push(`최대 ${buff.maxStacks}스택`);
  if (buff.scaleFrom) parts.push(`${buff.scaleFrom} 비례`);
  return parts.join(" · ");
}

export function CharacterBuffPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const review = useReviewStatus("character-buff-review");
  const { checked, deferred, checkedSet, deferredSet } = review;
  const [showChecked, setShowChecked] = useState(false);
  const [showDeferred, setShowDeferred] = useState(false);

  const built = useMemo(
    () => characters.map((c) => ({ character: c, ...buildCards(c) })),
    [],
  );

  const totals = useMemo(() => {
    let skills = 0;
    let missing = 0;
    let buffs = 0;
    let orphans = 0;
    for (const b of built) {
      skills += b.skills.length + b.chain.length;
      missing += b.skills.filter((s) => s.missing).length + b.chain.filter((c) => c.missing).length;
      buffs += (b.character.passiveBuffs ?? []).length;
      orphans += b.orphans.length;
    }
    return { skills, missing, buffs, orphans, characters: built.length };
  }, [built]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return built
      .filter((b) => (q ? b.character.name.toLowerCase().includes(q) : true))
      .map((b) => ({
        ...b,
        skills: b.skills
          .filter((s) =>
            filter === "missing"
              ? s.missing
              : filter === "has"
                ? s.buffs.length > 0
                : filter === "orphan"
                  ? false
                  : true,
          )
          .filter((s) => (showChecked ? true : !checkedSet.has(s.key)))
          .filter((s) => (showDeferred ? true : !deferredSet.has(s.key))),
        chain: b.chain
          .filter((c) =>
            filter === "missing"
              ? c.missing
              : filter === "has"
                ? c.buffs.length > 0
                : filter === "orphan"
                  ? false
                  : true,
          )
          .filter((c) => (showChecked ? true : !checkedSet.has(c.key)))
          .filter((c) => (showDeferred ? true : !deferredSet.has(c.key))),
        orphans: filter === "all" || filter === "orphan" ? b.orphans : [],
      }))
      .filter((b) => b.skills.length + b.chain.length + b.orphans.length > 0)
      .sort((a, b) => a.character.name.localeCompare(b.character.name, "ko"));
  }, [built, filter, query, showChecked, checkedSet, showDeferred, deferredSet]);

  return (
    <div className="data-page char-buff-page">
      <header>
        <div>
          <h1>캐릭터 버프 확인</h1>
          <p>
            스킬 원문과, 그 원문에서 옮겨 적은 버프를 나란히 놓았습니다. 옮기는 일은 사람이 손으로
            하는 것이라 반드시 빠뜨린 것이 생깁니다 — <b>원문에 수치 버프가 적혀 있는데 옮긴
            것이 하나도 없는 스킬</b>은 「빠뜨린 것 같음」으로 표시했습니다.
          </p>
          <p>
            버프를 더하려면 그 캐릭터의 <code>src/data/characters/*.ts</code>에서{" "}
            <code>passiveBuffs</code>에 한 줄 넣으면 됩니다. 고유 스킬에서 온 것은{" "}
            <code>inherentSkillId</code>를, 공명체인에서 온 것은 <code>resonanceChain</code>을 같이
            적어 주세요 — 그래야 이 화면이 어느 스킬 것인지 알아봅니다.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="data-summary">
          <div>
            <small>캐릭터</small>
            <b>{totals.characters}</b>
          </div>
          <div>
            <small>스킬 · 체인 단계</small>
            <b>{totals.skills}</b>
          </div>
          <div>
            <small>옮겨 적은 버프</small>
            <b>{totals.buffs}</b>
          </div>
          <div>
            <small>빠뜨린 것 같음</small>
            <b className={totals.missing ? "data-later-count" : undefined}>{totals.missing}</b>
          </div>
          <div>
            <small>어느 스킬인지 모름</small>
            <b className={totals.orphans ? "data-edited-count" : undefined}>{totals.orphans}</b>
          </div>
          <div>
            <small>확인 완료</small>
            <b className={checked.length ? "data-done-count" : undefined}>
              {checked.length} / {totals.skills}
            </b>
          </div>
        </div>

        <div className="data-filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={filter === f.id ? "on" : ""}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <input
            className="panel-search"
            placeholder="캐릭터 이름"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="data-toggle">
            <input
              type="checkbox"
              checked={showChecked}
              onChange={(e) => setShowChecked(e.target.checked)}
            />
            완료도 보기
          </label>
          <label className="data-toggle">
            <input
              type="checkbox"
              checked={showDeferred}
              onChange={(e) => setShowDeferred(e.target.checked)}
            />
            나중에도 보기
          </label>
        </div>
      </section>

      {list.length === 0 && <p className="data-empty">조건에 맞는 항목이 없습니다.</p>}

      {list.map((entry) => (
        <section className="panel char-buff-group" key={entry.character.id}>
          <div className="char-buff-head">
            {entry.character.iconUrl && <img src={entry.character.iconUrl} alt="" />}
            <h2>{entry.character.name}</h2>
            <span>
              버프 {(entry.character.passiveBuffs ?? []).length}개 · 빠뜨린 것 같음{" "}
              {entry.skills.filter((s) => s.missing).length +
                entry.chain.filter((c) => c.missing).length}
              개
            </span>
          </div>

          {entry.skills.map((card) => (
            <SourceCard
              key={card.key}
              id={card.key}
              kind={card.skill.type}
              name={card.skill.name}
              note={`스킬 ${card.skill.id}`}
              text={card.skill.text}
              sentences={card.sentences}
              buffs={card.buffs}
              missing={card.missing}
              checked={checkedSet.has(card.key)}
              deferred={deferredSet.has(card.key)}
              onToggleChecked={() => review.toggleChecked(card.key)}
              onToggleDeferred={() => review.toggleDeferred(card.key)}
            />
          ))}

          {entry.chain.map((card) => (
            <SourceCard
              key={card.key}
              id={card.key}
              kind={`공명체인 ${card.chain.step}`}
              name={card.chain.name}
              note=""
              text={card.chain.text}
              sentences={card.sentences}
              buffs={card.buffs}
              missing={card.missing}
              checked={checkedSet.has(card.key)}
              deferred={deferredSet.has(card.key)}
              onToggleChecked={() => review.toggleChecked(card.key)}
              onToggleDeferred={() => review.toggleDeferred(card.key)}
            />
          ))}

          {entry.orphans.length > 0 && (
            <div className="char-buff-orphans">
              <small>어느 스킬에서 왔는지 이름으로 잇지 못한 버프</small>
              {entry.orphans.map(({ buff, index }) => (
                <p key={index}>
                  <b>{buff.label}</b>
                  <em>{buffLine(buff)}</em>
                </p>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function SourceCard({
  kind,
  name,
  note,
  text,
  sentences,
  buffs,
  missing,
  checked,
  deferred,
  onToggleChecked,
  onToggleDeferred,
}: {
  id: string;
  kind: string;
  name: string;
  note: string;
  text: string;
  sentences: string[];
  buffs: { buff: CharacterBuffTemplate; index: number }[];
  missing: boolean;
  checked: boolean;
  deferred: boolean;
  onToggleChecked: () => void;
  onToggleDeferred: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={
        "char-buff-card" +
        (missing ? " is-missing" : "") +
        (checked ? " is-checked" : "") +
        (deferred ? " is-later" : "")
      }
    >
      <div className="char-buff-card-head">
        <span className="char-buff-kind">{kind}</span>
        <b>{name || "(이름 없음)"}</b>
        {note && <em>{note}</em>}
        {missing && <span className="char-buff-warn">빠뜨린 것 같음</span>}
        <ReviewTags checked={checked} deferred={deferred} />
        <ReviewActions
          checked={checked}
          deferred={deferred}
          onToggleChecked={onToggleChecked}
          onToggleDeferred={onToggleDeferred}
          compact
        />
      </div>

      {buffs.length > 0 ? (
        <ul className="char-buff-list">
          {buffs.map(({ buff, index }) => (
            <li key={index}>
              <b>{buff.label}</b>
              <em>{buffLine(buff)}</em>
              {buff.condition && <span>{buff.condition}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="char-buff-none">옮겨 적은 버프가 없습니다.</p>
      )}

      {/* 원문 전체는 길어서 접어 둔다. 버프가 적힌 문장만 먼저 짚어 준다. */}
      {sentences.length > 0 && (
        <div className="char-buff-quotes">
          <small>원문에서 버프로 보이는 문장</small>
          {sentences.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      <button className="char-buff-more" onClick={() => setOpen((v) => !v)}>
        {open ? "원문 접기" : "원문 전체 보기"}
      </button>
      {open && <pre className="char-buff-text">{text}</pre>}
    </div>
  );
}
