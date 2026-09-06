import { useState, useSyncExternalStore } from "react";
import { characters } from "../../../data/sampleData";
import { PARTY_SLOTS, usePartyConfig } from "../../../context/PartyConfigContext";
import { echoStoreVersion, mainEchoOf, subscribeEchoStore } from "../../../data/echoStore";
import { echoAbilityOf } from "../../../data/echoAttacks";
import { ANOMALIES, anomalyAttackId } from "../../../data/anomalies";
import { anomaliesOf } from "../../../data/characterAnomalies";
import { DISCORD_ATTACK_ID, DISCORD_BASE, DISCORD_DEFAULT_RATE } from "../../../data/discord";
import type { Attack, SkillCategory } from "../../../types/game";

interface AttackPaletteSectionProps {
  onAddAttack: (attackId: string, characterId: string) => void;
}

/** 공격을 묶어서 보여줄 구역과 순서. */
const SECTIONS: { category: SkillCategory; label: string }[] = [
  { category: "Basic", label: "일반 공격" },
  { category: "Skill", label: "공명 스킬" },
  { category: "Circuit", label: "공명 회로" },
  { category: "Liberation", label: "공명 해방" },
  { category: "Variation", label: "변주 스킬" },
  { category: "Intro", label: "반주 스킬" },
  { category: "Sync", label: "조화도 파괴" },
];

/** category가 없는 옛 데이터는 공격 타입으로 구역을 추정한다. */
function fallbackCategory(attack: Attack): SkillCategory {
  switch (attack.type) {
    case "Basic":
    case "Heavy":
    case "Aerial":
    case "DodgeCounter":
      return "Basic";
    case "Liberation":
    case "Ultimate":
      return "Liberation";
    case "Variation":
    case "Outro":
      return "Variation";
    case "Intro":
      return "Intro";
    case "Chain":
      return "Circuit";
    default:
      return "Skill";
  }
}

export function AttackPaletteSection({ onAddAttack }: AttackPaletteSectionProps) {
  const { config } = usePartyConfig();
  const [activeSlot, setActiveSlot] = useState(0);
  // 에코를 갈아끼우면 쓸 수 있는 에코 어빌리티도 바뀐다. 저장소가 localStorage 한 벌이라
  // 저장될 때마다 올라가는 번호를 구독해 두고 다시 그린다.
  useSyncExternalStore(subscribeEchoStore, echoStoreVersion);

  // 파티 슬롯 3개를 그대로 탭으로 만든다.
  // 비어 있으면 "N번 캐릭터", 편성돼 있으면 그 캐릭터 이름을 탭 이름으로 쓴다.
  const tabs = PARTY_SLOTS.map((slot, index) => {
    const character = characters.find((c) => c.id === config[slot].characterId) ?? null;

    return {
      slot,
      character,
      label: character ? character.name : `${index + 1}번 캐릭터`,
    };
  });

  const active = tabs[activeSlot];

  // 스킬의 category 기준으로 공격을 구역별로 모은다.
  // 구역 제목 옆에 띄울 아이콘은 그 구역에 처음 등장한 스킬의 아이콘을 쓴다.
  const grouped = new Map<SkillCategory, { attacks: Attack[]; icon?: string }>();
  for (const skill of active.character?.skills ?? []) {
    for (const attack of skill.attacks) {
      const category = skill.category ?? fallbackCategory(attack);
      const bucket = grouped.get(category);
      if (bucket) {
        bucket.attacks.push(attack);
        if (!bucket.icon) bucket.icon = skill.icon;
      } else {
        grouped.set(category, { attacks: [attack], icon: skill.icon });
      }
    }
  }

  const sections = SECTIONS.map((section) => ({
    ...section,
    attacks: grouped.get(section.category)?.attacks ?? [],
    icon: grouped.get(section.category)?.icon,
  })).filter((section) => section.attacks.length > 0);

  // 에코 어빌리티는 캐릭터 스킬이 아니라 「메인 슬롯(첫 번째 자리)에 낀 에코」에서 나온다.
  // 2~5번 자리 에코는 어빌리티를 쓸 수 없으므로 팔레트에도 뜨지 않는다.
  const mainEcho = active.character ? mainEchoOf(active.character.id) : undefined;
  const ability =
    mainEcho && active.character
      ? echoAbilityOf(mainEcho.id, active.character.id)
      : undefined;

  // 이상 효과는 공격이 아니라 적에게 쌓이는 상태라 스킬 목록에 없다.
  // 이 캐릭터가 붙일 수 있는 효과만 따로 버튼으로 세운다(characterAnomalies 표).
  // 피해가 없는 효과(암흑)는 담을 것이 없다 — 지금 몇 스택 붙어 있는지로만 쓰이므로
  // 공격 목록이 아니라 버프 창에서 켠다(data/anomalyBuffs.ts).
  const anomalies = (active.character ? anomaliesOf(active.character.id) : []).filter(
    (kind) => ANOMALIES[kind].type !== "debuff",
  );

  return (
    <section className="panel">
      <h2>공격 추가</h2>

      {/* 왼쪽에 파티 세 자리를 아이콘과 이름으로 세우고, 오른쪽에 그 캐릭터의 공격을 편다. */}
      <div className="palette-layout">
        <nav className="palette-side">
          {tabs.map((tab, index) => (
            <button
              key={tab.slot}
              className={index === activeSlot ? "palette-side-item on" : "palette-side-item"}
              onClick={() => setActiveSlot(index)}
            >
              {tab.character?.iconUrl ? (
                <img src={tab.character.iconUrl} alt="" loading="lazy" />
              ) : (
                <span className="palette-side-blank">{index + 1}</span>
              )}
              <span>
                <b>{tab.label}</b>
                <em>{tab.character ? `${index + 1}번 캐릭터` : "비어 있음"}</em>
              </span>
            </button>
          ))}
        </nav>

        <div className="palette-main">
      {!active.character ? (
        <p style={{ color: "#9ea7b7" }}>
          {activeSlot + 1}번 자리가 비어 있습니다. 캐릭터 선택에서 편성하세요.
        </p>
      ) : sections.length === 0 && !ability ? (
        <p style={{ color: "#9ea7b7" }}>
          {active.character.name}의 공격 데이터가 아직 등록되지 않았습니다.
        </p>
      ) : (
        <div className="palette-groups">
          {sections.map((section) => (
            <div className="palette-group" key={section.category}>
              <div className="palette-group-head">
                {section.icon ? (
                  <img src={section.icon} alt="" loading="lazy" />
                ) : (
                  <span className="palette-group-icon-blank" />
                )}
                <small>{section.label}</small>
              </div>
              <div className="palette">
                {section.attacks.map((attack) => (
                  <button
                    key={attack.id}
                    onClick={() => onAddAttack(attack.id, active.character!.id)}
                  >
                    {attack.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* 메인 에코의 어빌리티. 캐릭터 스킬과 나오는 곳이 달라 구역을 따로 세운다. */}
          {ability && ability.attacks.length > 0 && (
            <div className="palette-group">
              <div className="palette-group-head">
                {mainEcho?.iconUrl ? (
                  <img src={mainEcho.iconUrl} alt="" loading="lazy" />
                ) : (
                  <span className="palette-group-icon-blank" />
                )}
                <small>
                  에코 · {ability.name}
                  {ability.cooldown !== null && ` (쿨타임 ${ability.cooldown}초)`}
                </small>
              </div>
              <div className="palette">
                {ability.attacks.map((attack) => (
                  <button
                    key={attack.id}
                    onClick={() => onAddAttack(attack.id, active.character!.id)}
                    title={ability.text || undefined}
                  >
                    {attack.name}
                  </button>
                ))}
              </div>
              {ability.note && <p className="palette-note">고쳐 적음 — {ability.note}</p>}
              {ability.review.map((why) => (
                <p className="palette-note warn" key={why}>
                  검수 필요 — {why}
                </p>
              ))}
            </div>
          )}

          {/* 이상 효과 — 스택은 담은 뒤 루틴 카드에서 정한다. */}
          {anomalies.length > 0 && (
            <div className="palette-group">
              <div className="palette-group-head">
                <span className="palette-group-icon-blank" />
                <small>이상 효과</small>
              </div>
              <div className="palette">
                {anomalies.map((kind) => {
                  const def = ANOMALIES[kind];
                  return (
                    <button
                      key={kind}
                      onClick={() => onAddAttack(anomalyAttackId(kind), active.character!.id)}
                      title={`${def.formula} · 최대 ${def.maxStacks}스택`}
                    >
                      {def.name} 효과
                    </button>
                  );
                })}
              </div>
              <p className="palette-note">
                담은 뒤 루틴 카드에서 스택과 발생 횟수를 정합니다. 공격력·스킬 계수와 무관하게
                레벨별 기준값으로 계산됩니다.
              </p>
            </div>
          )}

          {/* 조화도 파괴 — 이상 효과와 마찬가지로 공격력을 타지 않는 별도 피해식이다.
              캐릭터를 가리지 않으므로(누구나 조화도 파괴 스킬을 갖는다) 늘 띄운다. */}
          <div className="palette-group">
            <div className="palette-group-head">
              <span className="palette-group-icon-blank" />
              <small>조화도 파괴</small>
            </div>
            <div className="palette">
              <button
                onClick={() => onAddAttack(DISCORD_ATTACK_ID, active.character!.id)}
                title={`고정 기초값 ${DISCORD_BASE} × 배율 ${DISCORD_DEFAULT_RATE * 100}% · 물리 피해`}
              >
                조화도 파괴
              </button>
            </div>
            <p className="palette-note">
              공격력·크리티컬·피해 보너스·부스트가 <b>전혀 걸리지 않습니다</b>. 고정 기초값{" "}
              {DISCORD_BASE}에서 출발하는 물리 피해이고, 조화도 파괴 증폭은 여기에만 걸립니다.
              담은 뒤 루틴 카드에서 배율과 횟수를 정합니다.
            </p>
          </div>
        </div>
      )}
        </div>
      </div>
    </section>
  );
}
