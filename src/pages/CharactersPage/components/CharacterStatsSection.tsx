import { useMemo } from "react";
import { characters } from "../../../data/sampleData";
import { DEFAULT_WEAPON_LEVEL, weaponAtLevel, weaponsById } from "../../../data/weapons";
import {
  CHARACTER_LEVEL_MAX,
  CHARACTER_LEVEL_MIN,
  DEFAULT_CHARACTER_LEVEL,
  characterAtLevel,
  hasLevelTable,
} from "../../../data/characterStats";
import { nodeStats } from "../../../data/characterNodes";
import { usePartyConfig } from "../../../context/PartyConfigContext";
import { calculateFinalStats } from "../../../calculator/stats";
import { echoAbilityPanelStats } from "../../../calculator/equippedBuffs";
import { equippedEchoes } from "../../../data/echoStore";
import type { Echo, Element } from "../../../types/game";
import type { Stats } from "../../../types/stats";
import { flat } from "../../../utils/format";

interface CharacterStatsSectionProps {
  characterId: string;
  characterEchoLinks: Array<{ characterId: string; echoId: number }>;
}

const ELEMENT_NAMES: Record<Element, string> = {
  Aero: "기류",
  Glacio: "응결",
  Electro: "전도",
  Fusion: "용융",
  Havoc: "인멸",
  Spectro: "회절",
};

/**
 * 표기 방식.
 *   flat = 정수 그대로(HP·공격력·방어력)
 *   pct  = 백분율(0.293 -> 29.3%)
 *   base = 기본 100%를 더해서 보여주는 값(크리티컬 피해·공명 효율)
 */
type Form = "flat" | "pct" | "base";
type Row = [keyof Stats, string, Form];

/** 위쪽 큰 칸 — 게임 「속성 상세정보」 첫 화면과 같은 순서. */
const MAIN_ROWS: Row[] = [
  ["hp", "HP", "flat"],
  ["atk", "공격력", "flat"],
  ["def", "방어력", "flat"],
  ["energyRegen", "공명 효율", "base"],
  ["critRate", "크리티컬", "pct"],
  ["critDamage", "크리티컬 피해", "base"],
];

/**
 * 아래 상세 목록 — 게임에서 펼쳐 보는 전체 속성 순서 그대로.
 * 0이어도 전부 내보내서 어떤 스탯이 잡히고 안 잡히는지 한눈에 보이게 한다.
 */
const BONUS_ROWS: Row[] = [
  ["hp", "HP", "flat"],
  ["atk", "공격력", "flat"],
  ["def", "방어력", "flat"],
  ["syncAmplify", "조화도 파괴 증폭", "pct"],
  ["critRate", "크리티컬", "pct"],
  ["critDamage", "크리티컬 피해", "base"],
  ["energyRegen", "공명 효율", "base"],
  ["discordEfficiency", "부조화 수치 누적 효율", "pct"],
  ["skillDamageBonus", "공명 스킬 피해 보너스", "pct"],
  ["basicDamageBonus", "일반 공격 피해 보너스", "pct"],
  ["heavyDamageBonus", "강공격 피해 보너스", "pct"],
  ["liberationDamageBonus", "공명 해방 피해 보너스", "pct"],
  ["physicalDamageBonus", "물리 피해 보너스", "pct"],
  ["glacioDamageBonus", "응결 피해 보너스", "pct"],
  ["fusionDamageBonus", "용융 피해 보너스", "pct"],
  ["electroDamageBonus", "전도 피해 보너스", "pct"],
  ["aeroDamageBonus", "기류 피해 보너스", "pct"],
  ["spectroDamageBonus", "회절 피해 보너스", "pct"],
  ["havocDamageBonus", "인멸 피해 보너스", "pct"],
  ["echoDamageBonus", "에코 어빌리티 피해 보너스", "pct"],
  ["physicalRes", "물리 피해 저항", "pct"],
  ["glacioRes", "응결 피해 저항", "pct"],
  ["fusionRes", "용융 피해 저항", "pct"],
  ["electroRes", "전도 피해 저항", "pct"],
  ["aeroRes", "기류 피해 저항", "pct"],
  ["spectroRes", "회절 피해 저항", "pct"],
  ["havocRes", "인멸 피해 저항", "pct"],
  ["healingBonus", "치료 효과 보너스", "pct"],
];

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

/** 한 줄의 값을 표기 방식에 맞춰 문자열로. */
function format(value: number, form: Form): string {
  if (form === "flat") return flat(value);
  return pct(form === "base" ? 1 + value : value);
}

export function CharacterStatsSection({
  characterId,
  characterEchoLinks,
}: CharacterStatsSectionProps) {
  const { characterWeapons, characterChains, characterLevels, setCharacterLevel, characterNodes } =
    usePartyConfig();
  const found = characters.find((c) => c.id === characterId);
  // 고른 레벨의 기초 스탯을 채운 사본으로 계산·표시한다. 레벨이 없으면 90.
  const level = characterLevels[characterId] ?? DEFAULT_CHARACTER_LEVEL;
  const character = found ? characterAtLevel(found, level) : undefined;

  const equipped = characterWeapons[characterId];
  // 공격력은 무기 설정에서 정한 레벨의 값을 쓴다. 레벨이 없던 예전 설정은 90으로 본다.
  const weaponEntry = equipped ? weaponsById.get(equipped.weaponId) : undefined;
  const weapon = weaponEntry
    ? weaponAtLevel(weaponEntry, equipped?.level ?? DEFAULT_WEAPON_LEVEL)
    : undefined;
  const chain = characterChains[characterId] ?? 0;

  // 이 캐릭터에 연결된 보유 에코를 계산 엔진이 먹는 모양(Echo)으로 옮긴다.
  // 계산 탭과 같은 헬퍼를 쓴다 — 두 화면의 스탯이 어긋날 수 없게.
  const echoes = useMemo<Echo[]>(
    () => equippedEchoes(characterId, characterEchoLinks),
    [characterId, characterEchoLinks],
  );

  const stats = useMemo(() => {
    if (!character) return null;
    // 조건부 버프(무기 스킬·고유효과·수기 버프)는 공격마다 판정이 달라서 빼고,
    // 항상 붙는 것(기초 스탯·무기·에코·공명체인 고정 스탯)만 합산한다.
    return calculateFinalStats(
      character,
      weapon ?? { id: "", name: "", baseAtk: 0, stats: {} },
      echoes,
      // 켜둔 스킬 트리 노드의 합계를 버프 한 줄처럼 얹는다.
      [
        {
          id: "skillTree",
          name: "스킬 트리",
          source: character.name,
          description: "켜둔 스킬 트리 스탯 노드의 합계",
          stats: nodeStats(character.id, characterNodes[character.id]),
        },
        // 1번 자리 에코의 「메인 슬롯에 장착 시」 효과. 발동 조건이 없어 늘 걸려 있고
        // 게임 속성 창에도 그대로 찍히는 값이라 여기서 함께 더한다.
        // (화음 세트 효과는 속성 창에 찍히지 않으므로 들어오지 않는다 — equippedBuffs.ts 참고.)
        {
          id: "echoAbility",
          name: "메인 에코 어빌리티",
          source: "장착 효과",
          description: "1번 자리 에코의 「메인 슬롯에 장착 시」 효과",
          stats: echoAbilityPanelStats(characterId, characterEchoLinks),
        },
      ],
      chain,
    );
  }, [character, characterId, characterEchoLinks, weapon, echoes, chain, characterNodes]);

  if (!character || !stats) return null;

  // 0인 항목도 그대로 둔다 — 어떤 스탯이 잡히고 안 잡히는지 한눈에 보려는 목적.
  const bonusRows = BONUS_ROWS;

  return (
    <section className="panel">
      <div className="row">
        <div>
          <small>STATS</small>
          <h2>
            {character.name} - 스탯
            <span style={{ color: "#9ea7b7", fontSize: 14, marginLeft: 8 }}>
              Lv.{character.level} · {ELEMENT_NAMES[character.element]} · 공명체인 {chain}단계
            </span>
          </h2>
        </div>
      </div>

      <div className="char-level">
        <small>레벨</small>
        <input
          type="range"
          min={CHARACTER_LEVEL_MIN}
          max={CHARACTER_LEVEL_MAX}
          value={level}
          onChange={(event) => setCharacterLevel(characterId, Number(event.target.value))}
        />
        <b>{level}</b>
        {!hasLevelTable(characterId) && (
          <em className="char-level-warn">
            레벨별 기초 스탯 표가 없어 수치는 Lv.90 값 그대로입니다.
          </em>
        )}
      </div>

      <div className="stats">
        {MAIN_ROWS.map(([key, label, form]) => (
          <div key={key}>
            <small>{label}</small>
            <b>{format(stats[key], form)}</b>
          </div>
        ))}
      </div>

      {bonusRows.length > 0 && (
        <div className="stat-bonus">
          {bonusRows.map(([key, label, form]) => (
            <div key={key} className={stats[key] === 0 ? "zero" : undefined}>
              <span>{label}</span>
              <b>{format(stats[key], form)}</b>
            </div>
          ))}
        </div>
      )}

      <div className="stat-source">
        <span>
          기초 <b>{flat(character.baseStats.atk)}</b> 공격력 (Lv.{level})
        </span>
        <span>
          무기{" "}
          <b>{weapon ? `${weapon.name} (+${flat(weapon.baseAtk)})` : "없음"}</b>
        </span>
        <span>
          에코 <b>{echoes.length}개</b>
        </span>
      </div>

      <p className="stat-note">
        기초 스탯 · 무기 · 장착 에코 · 공명체인 고정 스탯만 합산한 값입니다. 공명 효율은
        표시 전용으로, 피해 계산식에는 들어가지 않습니다. 조건부로 걸리는
        무기 스킬 · 고유효과 · 수기 버프는 공격마다 판정이 달라 계산 탭에서 반영됩니다.
      </p>
    </section>
  );
}
