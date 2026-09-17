import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { characters } from "../../../data/sampleData";
import { PARTY_SLOTS, usePartyConfig } from "../../../context/PartyConfigContext";
import { echoStoreVersion, mainEchoOf, subscribeEchoStore } from "../../../data/echoStore";
import { echoAbilityOf } from "../../../data/echoAttacks";
import { ANOMALIES, anomalyAttackId } from "../../../data/anomalies";
import { anomaliesOf } from "../../../data/characterAnomalies";
import { DISCORD_ATTACK_ID, DISCORD_BASE, DISCORD_DEFAULT_RATE } from "../../../data/discord";
import {
  attackDisplayName,
  attackNameByNickname,
  setAttackNameByNickname,
  attackNicknamesVersion,
  subscribeAttackNicknames,
} from "../../../data/attackNicknames";
import type { Attack, Character, SkillCategory } from "../../../types/game";

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
  // 고유 스킬에서 떨어지는 공격(히유키 「속삭이는 눈」의 추가 냉해 피해 등).
  // 공격이 없는 고유 스킬이 대부분이라 그런 캐릭터에게는 이 구역이 아예 뜨지 않는다.
  { category: "Passive", label: "고유 스킬" },
];

/**
 * 줄의 순서. 세 자리에 같은 열쇠를 가진 구역이 **한 줄에 나란히** 서고,
 * 그 줄의 높이는 제일 긴 칸에 맞춰진다(격자가 알아서 늘려 준다).
 * 스킬 구역 뒤에 캐릭터 스킬이 아닌 것들 — 에코 어빌리티 · 이상 효과 · 조화도 파괴 — 을 붙인다.
 */
const ROW_ORDER: string[] = [
  ...SECTIONS.map((section) => section.category),
  "echo",
  "anomaly",
  "discord",
];

/** 팔레트에 세우는 단추 하나. */
interface PaletteAttack {
  id: string;
  /** 화면에 적을 이름 — 별명 모드면 별명. */
  label: string;
  title: string;
  /** 체인 · 고유 스킬로 생기는 추가 공격인지. 색을 달리한다. */
  extra?: boolean;
}

/** 한 줄을 이루는 구역 하나. key가 같은 것끼리 세 자리에서 줄을 맞춘다. */
interface PaletteGroup {
  key: string;
  label: ReactNode;
  icon?: string;
  attacks: PaletteAttack[];
  /** 형태로 갈린 작은 묶음(연극의 모습 · 환멸의 모습 …). 없으면 attacks를 통째로 세운다. */
  subs?: { form: string; attacks: PaletteAttack[] }[];
  notes?: { text: ReactNode; warn?: boolean }[];
}

/** 스킬표에 없던 추가 공격인지 — 체인으로 생기거나(resonanceChain) 따로 표시한 추가 타격(extra). */
export const isExtraAttack = (attack: Attack) =>
  attack.resonanceChain !== undefined || attack.extra === true;

/**
 * 「일반 공격」 구역 하나에 열여덟 개가 쏟아지는 캐릭터가 있다(데니아 · 에이메스 · 청초).
 * 이름을 보면 **형태**로 갈려 있다 — 「일반 공격 · 연극의 모습 1단 피해」와
 * 「… 환멸의 모습 1단 피해」처럼, 가운데 토막만 다르고 나머지는 같다.
 * 그 토막을 뽑아 작은 묶음으로 세우고, 단추에는 남는 말만 적어 목록을 짧게 만든다.
 *
 *   일반 공격
 *     ├ 연극의 모습   [일반 공격 1단][2단][3단][4단][강공격][공중 공격][회피 반격]
 *     └ 환멸의 모습   [일반 공격 1단][2단] …
 *
 * 규칙은 이름만 본다 — 자료에 형태 칸이 없어서다. 이름은 「A · B · C 피해」 꼴이고
 * 토막마다 「N단」·「차지 N단계」가 붙기도 한다.
 */

/** 형태가 아니라 **동작**을 가리키는 토막. 이건 묶음 이름이 될 수 없다. */
const MOTION_WORDS = new Set([
  "일반 공격",
  "강공격",
  "공중 공격",
  "공중 강공격",
  "공중 낙하 공격",
  "회피 반격",
  "반주 스킬",
  "변주 스킬",
  "공명 스킬",
  "공명 해방",
  "스킬",
]);

/** 이름을 토막으로 가른다. 꼬리의 「피해」와 토막 끝의 「N단 · N단계」는 따로 뗀다. */
function splitName(name: string): { base: string; stage: string }[] {
  return name
    .replace(/\s*피해(\(회당\))?\s*$/, "")
    .split(" · ")
    .map((part) => {
      const at = part.match(/^(.*?)\s*(\d+단계?)$/);
      return at ? { base: at[1], stage: at[2] } : { base: part, stage: "" };
    });
}

/**
 * 구역 안에서 형태로 갈라 묶는다. 둘 이상으로 갈릴 때만 묶고, 아니면 통째로 한 덩이다.
 * 형태는 **동작이 아닌 토막 중 그 구역에 두 번 이상 나오는 것**이고, 여럿이면 잦은 쪽을 쓴다.
 */
function formGroups(attacks: Attack[]): { form: string; attacks: Attack[] }[] | null {
  const count = new Map<string, number>();
  for (const attack of attacks) {
    for (const { base } of splitName(attack.name)) {
      if (!base || MOTION_WORDS.has(base)) continue;
      count.set(base, (count.get(base) ?? 0) + 1);
    }
  }

  const formOf = (attack: Attack): string => {
    let best = "";
    let most = 1; // 두 번 이상 나오는 토막만 형태로 본다.
    for (const { base } of splitName(attack.name)) {
      const n = count.get(base) ?? 0;
      if (n > most) {
        most = n;
        best = base;
      }
    }
    return best;
  };

  const groups = new Map<string, Attack[]>();
  for (const attack of attacks) {
    const form = formOf(attack);
    if (!groups.has(form)) groups.set(form, []);
    groups.get(form)!.push(attack);
  }
  // 갈린 것이 둘 이상이면 묶는다. 하나뿐이어도 그것이 구역을 거의 덮으면(6할) 묶는다 —
  // 청초 「현검」처럼 온 구역이 한 형태일 때도 이름이 그만큼 짧아져 읽기 좋아서다.
  // 「필수의 수단」이 둘뿐인 카를로타처럼 한 귀퉁이만 덮는 것은 묶지 않는다.
  const named = [...groups.keys()].filter(Boolean);
  if (named.length === 0) return null;
  if (named.length === 1 && (groups.get(named[0])?.length ?? 0) < attacks.length * 0.6) return null;

  // 「형태 없음」 덩이는 맨 뒤로 보낸다 — 공중 낙하처럼 어디에도 안 붙는 것들이다.
  return [...groups.entries()]
    .sort((a, b) => (a[0] ? 0 : 1) - (b[0] ? 0 : 1))
    .map(([form, list]) => ({ form, attacks: list }));
}

/**
 * 묶음 이름을 뺀 나머지로 단추 이름을 짧게 만든다 —
 * 「일반 공격 · 연극의 모습 1단 피해」 → 「일반 공격 1단」.
 * 떼어낸 토막에 붙어 있던 단수(「1단」)는 잃지 않고 뒤에 다시 붙인다.
 */
function shortLabel(name: string, form: string): string {
  const parts = splitName(name);
  const dropped = parts.find((part) => part.base === form);
  const text = parts
    .filter((part) => part.base !== form)
    .map((part) => [part.base, part.stage].filter(Boolean).join(" "))
    .join(" · ");
  // 묶음 이름을 떼고 나면 아무것도 안 남는 이름이 있다(「환각빛 1단 피해」) —
  // 그때는 단수만 적는다. 단수도 없으면 묶음 이름을 그대로 쓴다(빈 단추를 만들 수는 없다).
  if (!text) return dropped?.stage || form;
  return [text, dropped?.stage].filter(Boolean).join(" ");
}

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

/** 한 캐릭터가 담을 수 있는 공격을 구역별로 묶는다. 화면이 쓰고, 묶음 규칙을 눈으로 볼 때도 부른다. */
export function paletteOf(character: Character, chain: number, byNickname: boolean): PaletteGroup[] {
  /** 팔레트에 띄울 이름. 별명 모드라도 적어 둔 별명이 없으면 인게임 명칭 그대로다. */
  const nameOf = (attackId: string, inGameName: string) =>
    attackDisplayName(character.id, attackId, inGameName, byNickname);

  // 스킬의 category 기준으로 공격을 구역별로 모은다.
  // 구역 제목 옆에 띄울 아이콘은 그 구역에 처음 등장한 스킬의 아이콘을 쓴다.
  const grouped = new Map<SkillCategory, { attacks: Attack[]; icon?: string }>();
  for (const skill of character.skills ?? []) {
    for (const attack of skill.attacks) {
      // 체인이 모자라 아직 생기지 않는 공격(방랑자 인멸 5체인 추가타 등)은 띄우지 않는다.
      if ((attack.resonanceChain ?? 0) > chain) continue;
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

  /**
   * 공격 하나를 단추로. form을 넘기면(묶음 안이면) 이름을 짧게 만든다 —
   * 묶음 이름과 꼬리의 「피해」를 덜어낸다. 형태가 없는 「그 밖」 묶음은 빈 문자열을 넘긴다.
   */
  const buttonOf = (attack: Attack, form?: string): PaletteAttack => {
    const shown = nameOf(attack.id, attack.name);
    return {
      id: attack.id,
      // 별명을 적어 둔 공격은 그 별명을 그대로 쓴다 — 이미 짧고, 덜어내면 오히려 헷갈린다.
      label: form !== undefined && shown === attack.name ? shortLabel(attack.name, form) : shown,
      extra: isExtraAttack(attack),
      title:
        attack.resonanceChain !== undefined
          ? `${attack.name} — ${attack.resonanceChain}체인 추가 공격`
          : attack.extra
            ? `${attack.name} — 추가 타격`
            : attack.name,
    };
  };

  const groups: PaletteGroup[] = SECTIONS.filter(
    (section) => (grouped.get(section.category)?.attacks.length ?? 0) > 0,
  ).map((section) => {
    const bucket = grouped.get(section.category)!;
    // 공격이 몇 개 안 되면 갈라 봐야 줄만 는다 — 다섯 개부터 형태로 갈라 본다.
    const subs = bucket.attacks.length >= 5 ? formGroups(bucket.attacks) : null;
    return {
      key: section.category,
      label: section.label,
      icon: bucket.icon,
      attacks: bucket.attacks.map((attack) => buttonOf(attack)),
      ...(subs
        ? {
            subs: subs.map(({ form, attacks }) => ({
              form,
              attacks: attacks.map((attack) => buttonOf(attack, form)),
            })),
          }
        : {}),
    };
  });

  // 에코 어빌리티는 캐릭터 스킬이 아니라 「메인 슬롯(첫 번째 자리)에 낀 에코」에서 나온다.
  // 2~5번 자리 에코는 어빌리티를 쓸 수 없으므로 팔레트에도 뜨지 않는다.
  const mainEcho = mainEchoOf(character.id);
  const ability = mainEcho ? echoAbilityOf(mainEcho.id, character.id) : undefined;
  if (ability && ability.attacks.length > 0) {
    groups.push({
      key: "echo",
      label: `에코 · ${ability.name}${ability.cooldown !== null ? ` (쿨타임 ${ability.cooldown}초)` : ""}`,
      icon: mainEcho?.iconUrl,
      attacks: ability.attacks.map((attack) => ({
        id: attack.id,
        label: nameOf(attack.id, attack.name),
        title: ability.text || attack.name,
      })),
      notes: [
        ...(ability.note ? [{ text: `고쳐 적음 — ${ability.note}` }] : []),
        ...ability.review.map((why) => ({ text: `검수 필요 — ${why}`, warn: true })),
      ],
    });
  }

  // 이상 효과는 공격이 아니라 적에게 쌓이는 상태라 스킬 목록에 없다.
  // 이 캐릭터가 붙일 수 있는 효과만 따로 버튼으로 세운다(characterAnomalies 표).
  // 피해가 없는 효과(암흑)는 담을 것이 없다 — 지금 몇 스택 붙어 있는지로만 쓰이므로
  // 공격 목록이 아니라 버프 창에서 켠다(data/anomalyBuffs.ts).
  const anomalies = anomaliesOf(character.id).filter((kind) => ANOMALIES[kind].type !== "debuff");
  if (anomalies.length > 0) {
    groups.push({
      key: "anomaly",
      label: "이상 효과",
      attacks: anomalies.map((kind) => ({
        id: anomalyAttackId(kind),
        label: `${ANOMALIES[kind].name} 효과`,
        title: `${ANOMALIES[kind].formula} · 최대 ${ANOMALIES[kind].maxStacks}스택`,
      })),
      notes: [
        {
          text: "담은 뒤 사이클 카드에서 스택과 발생 횟수를 정합니다. 공격력·스킬 계수와 무관하게 레벨별 기준값으로 계산됩니다.",
        },
      ],
    });
  }

  // 조화도 파괴 — 이상 효과와 마찬가지로 공격력을 타지 않는 별도 피해식이다.
  // 캐릭터를 가리지 않으므로(누구나 조화도 파괴 스킬을 갖는다) 늘 띄운다.
  groups.push({
    key: "discord",
    label: "조화도 파괴",
    attacks: [
      {
        id: DISCORD_ATTACK_ID,
        // 별명으로 보면 F다 — 규칙이 캐릭터 스킬 밖의 이 항목까지 맡는다.
        label: nameOf(DISCORD_ATTACK_ID, "조화도 파괴"),
        title: `고정 기초값 ${DISCORD_BASE} × 배율 ${DISCORD_DEFAULT_RATE * 100}% · 물리 피해`,
      },
    ],
    notes: [
      {
        text: (
          <>
            공격력·크리티컬·피해 보너스·부스트가 <b>전혀 걸리지 않습니다</b>. 고정 기초값{" "}
            {DISCORD_BASE}에서 출발하는 물리 피해이고, 조화도 파괴 증폭은 여기에만 걸립니다. 담은
            뒤 사이클 카드에서 배율과 횟수를 정합니다.
          </>
        ),
      },
    ],
  });

  return groups;
}

export function AttackPaletteSection({ onAddAttack }: AttackPaletteSectionProps) {
  const { config, characterChains } = usePartyConfig();
  // 에코를 갈아끼우면 쓸 수 있는 에코 어빌리티도 바뀐다. 저장소가 localStorage 한 벌이라
  // 저장될 때마다 올라가는 번호를 구독해 두고 다시 그린다.
  useSyncExternalStore(subscribeEchoStore, echoStoreVersion);
  // 별명도 같은 방식으로 구독한다 — 별명 탭에서 적는 즉시 이 목록의 이름이 바뀐다.
  useSyncExternalStore(subscribeAttackNicknames, attackNicknamesVersion);
  // 인게임 명칭으로 볼지 별명으로 볼지. 사이클 구성 카드와 같은 값을 본다(data/attackNicknames.ts).
  const byNickname = attackNameByNickname();
  const setByNickname = setAttackNameByNickname;

  // 파티 세 자리 몫. 자리마다 그 캐릭터의 구역 목록을 미리 묶어 둔다.
  const slots = PARTY_SLOTS.map((slot, index) => {
    const character = characters.find((c) => c.id === config[slot].characterId) ?? null;
    return {
      slot,
      index,
      character,
      groups: character
        ? paletteOf(character, characterChains[character.id] ?? 0, byNickname)
        : [],
    };
  });

  // 어느 자리에든 있는 구역만 줄로 세운다. 그 줄에 없는 자리는 빈 칸으로 두고,
  // 줄의 높이는 격자가 제일 긴 칸에 맞춰 준다.
  const rows = ROW_ORDER.filter((key) =>
    slots.some((slot) => slot.groups.some((group) => group.key === key)),
  );

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>공격 추가</h2>
        {/* 인게임 명칭 / 별명 — 별명은 「별명」 탭에서 공격마다 적어 둔다. */}
        <div className="name-mode">
          <button
            className={byNickname ? "name-mode-btn" : "name-mode-btn on"}
            onClick={() => setByNickname(false)}
          >
            인게임 명칭
          </button>
          <button
            className={byNickname ? "name-mode-btn on" : "name-mode-btn"}
            title="별명 탭에서 적어 둔 이름으로 봅니다 — 적어 둔 것이 없으면 인게임 명칭 그대로입니다"
            onClick={() => setByNickname(true)}
          >
            별명
          </button>
        </div>
      </div>

      {/* 파티 세 자리를 나란히 편다 — 누구를 고르지 않아도 세 캐릭터의 공격이 다 보인다.
          한 격자에 세 자리를 같이 담아야 같은 구역끼리 한 줄에 서고 높이가 맞는다. */}
      <div className="palette-scroll">
      <div className="palette-grid">
        {slots.map((slot) => (
          <div
            key={slot.slot}
            className={slot.character ? "palette-column-head" : "palette-column-head empty"}
          >
            {slot.character?.iconUrl ? (
              <img src={slot.character.iconUrl} alt="" loading="lazy" />
            ) : (
              <span className="palette-column-blank">{slot.index + 1}</span>
            )}
            <span>
              <b>{slot.character ? slot.character.name : `${slot.index + 1}번 캐릭터`}</b>
              <em>
                {!slot.character
                  ? "비어 있음 — 파티 구성에서 편성하세요"
                  : slot.groups.length <= 1
                    ? "공격 데이터가 아직 없습니다"
                    : `${slot.index + 1}번 캐릭터`}
              </em>
            </span>
          </div>
        ))}

        {rows.map((key) =>
          slots.map((slot) => {
            const group = slot.groups.find((item) => item.key === key);
            const character = slot.character;
            // 그 자리에 없는 구역은 빈 칸으로 자리만 지킨다 — 다음 줄이 밀려 어긋나지 않게.
            if (!group || !character) {
              return <div className="palette-blank" key={`${key}|${slot.slot}`} />;
            }

            return (
              <div className="palette-group" key={`${key}|${slot.slot}`}>
                <div className="palette-group-head">
                  {group.icon ? (
                    <img src={group.icon} alt="" loading="lazy" />
                  ) : (
                    <span className="palette-group-icon-blank" />
                  )}
                  <small>{group.label}</small>
                  {/* 몇 개인지 먼저 보이면 긴 구역을 각오하고 볼 수 있다. */}
                  <span className="palette-count">{group.attacks.length}</span>
                </div>
                {/* 형태로 갈리는 구역(데니아 연극 · 환멸 등)은 작은 묶음으로 세운다. */}
                {group.subs ? (
                  group.subs.map((sub) => (
                    <div className="palette-sub" key={sub.form || "etc"}>
                      <em className="palette-sub-head">{sub.form || "그 밖"}</em>
                      <div className="palette">
                        {sub.attacks.map((attack) => (
                          <button
                            key={attack.id}
                            className={attack.extra ? "attack-extra" : undefined}
                            title={attack.title}
                            onClick={() => onAddAttack(attack.id, character.id)}
                          >
                            {attack.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="palette">
                    {group.attacks.map((attack) => (
                      <button
                        key={attack.id}
                        // 체인 · 고유 스킬로 생기는 추가 공격은 색을 달리해 원래 스킬 공격과 구별한다.
                        className={attack.extra ? "attack-extra" : undefined}
                        title={attack.title}
                        onClick={() => onAddAttack(attack.id, character.id)}
                      >
                        {attack.label}
                      </button>
                    ))}
                  </div>
                )}
                {group.notes?.map((note, at) => (
                  <p className={note.warn ? "palette-note warn" : "palette-note"} key={at}>
                    {note.text}
                  </p>
                ))}
              </div>
            );
          }),
        )}
      </div>
      </div>
    </section>
  );
}
