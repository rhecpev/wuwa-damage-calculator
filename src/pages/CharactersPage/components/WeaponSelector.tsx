import { useState, useSyncExternalStore } from "react";
import { characters } from "../../../data/sampleData";
import {
  DEFAULT_WEAPON_LEVEL,
  WEAPON_LEVEL_MAX,
  WEAPON_LEVEL_MIN,
  weaponAtLevel,
  weaponsById,
  weaponsFor,
  type WeaponEntry,
} from "../../../data/weapons";
import { usePartyConfig } from "../../../context/PartyConfigContext";
import {
  ownedStoreVersion,
  ownedWeaponCount,
  ownedWeaponIds,
  subscribeOwnedStore,
} from "../../../data/ownedStore";
import { flat } from "../../../utils/format";

interface WeaponSelectorProps {
  characterId: string;
}

/** 별 개수를 그대로 문자열로. */
const stars = (rarity: number) => "★".repeat(rarity);

const REFINE_STEPS = [1, 2, 3, 4, 5];

/** 목록 정렬 기준 — 게임의 「레벨 순서」 자리에 해당한다. */
const SORTS = [
  { id: "rarity", label: "등급 순" },
  { id: "atk", label: "공격력 순" },
  { id: "name", label: "이름 순" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

/**
 * 무기 스킬 본문에는 정련 1~5단계 수치가 "4%/6.2%/8.4%/10.6%/12.8%" 처럼
 * 슬래시로 붙어 있다. 고른 단계의 값 하나만 남겨서 읽기 쉽게 만든다.
 */
function resolvePassive(desc: string, params: string[][], refine: number): string {
  return params.reduce((text, values) => {
    const joined = values.join("/");
    const picked = values[refine - 1] ?? values.at(-1) ?? joined;
    return text.split(joined).join(picked);
  }, desc);
}

/**
 * 부옵션 값 표기 — 퍼센트 스탯이면 %로, 아니면 실수 그대로.
 * 값은 weapons.ts에서 이미 퍼센트 소수 한 자리까지 버린 뒤다.
 */
function formatSubStat(key: string | null, value: number) {
  if (key === null) return `${(value * 100).toFixed(1)}%`; // 매핑이 없는 부옵션(현재는 없음)
  const isFlat = key === "hp" || key === "atk" || key === "def";
  return isFlat ? flat(value) : `${(value * 100).toFixed(1)}%`;
}

/**
 * 무기 교체 화면. 게임과 같은 두 단 구성 —
 *   왼쪽: 보유 무기 격자(세로 스크롤), 아래에 정렬 기준
 *   오른쪽: 고른 무기의 이름 · 레벨 · 등급 · 스탯 · 정련 스킬
 */
export function WeaponSelector({ characterId }: WeaponSelectorProps) {
  const { characterWeapons, setCharacterWeapon, setWeaponRefine, setWeaponLevel } =
    usePartyConfig();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("rarity");
  // 기본은 무기 관리 탭에 담아둔 것만 보여준다. 아직 아무것도 안 담았거나
  // 도감에서 바로 고르고 싶을 때를 위해 전체 보기를 열어 둔다.
  const [ownedOnly, setOwnedOnly] = useState(true);
  const ownedVersion = useSyncExternalStore(subscribeOwnedStore, ownedStoreVersion);
  const character = characters.find((c) => c.id === characterId);
  if (!character) return null;

  const equipped = characterWeapons[characterId];
  const selectedId = equipped?.weaponId;
  const equippedEntry = selectedId ? weaponsById.get(selectedId) : undefined;
  const refine = equipped?.refine ?? 1;
  // 예전에 저장된 설정에는 레벨이 없다 — 그때 기준이던 90으로 본다.
  const level = equipped?.level ?? DEFAULT_WEAPON_LEVEL;
  // 표시도 계산과 같은 값을 보도록 고른 레벨의 공격력을 채운 사본을 쓴다.
  const selected = equippedEntry ? weaponAtLevel(equippedEntry, level) : undefined;

  // 이 무기를 끼고 있는 캐릭터들. 무기 그림 왼쪽 아래에 아이콘으로 표시한다.
  // 지금 보고 있는 캐릭터도 포함하고, 그 아이콘만 맨 앞에 세운다.
  // 같은 무기를 여럿이 들고 있을 수도 있어 배열로 모은다.
  const wearers = new Map<string, typeof characters>();
  for (const other of characters) {
    const worn = characterWeapons[other.id]?.weaponId;
    if (!worn) continue;
    const list = wearers.get(worn);
    if (!list) wearers.set(worn, [other]);
    else if (other.id === characterId) list.unshift(other);
    else list.push(other);
  }

  /**
   * 카드에 늘 띄우는 정련 단계.
   * 누군가 끼고 있으면 그 설정값(본인이 우선), 아무도 안 끼고 있으면 기본 1단계다.
   */
  const refineOf = (weaponId: string) => {
    const owner = wearers.get(weaponId)?.[0];
    return owner ? (characterWeapons[owner.id]?.refine ?? 1) : 1;
  };

  const compare = (a: WeaponEntry, b: WeaponEntry) => {
    if (sort === "atk") return b.baseAtk - a.baseAtk || a.name.localeCompare(b.name);
    if (sort === "name") return a.name.localeCompare(b.name);
    return b.rarity - a.rarity || a.name.localeCompare(b.name);
  };

  // 캐릭터가 드는 무기 종류만. 그 안에서 보유 여부와 이름으로 한 번 더 거른다.
  void ownedVersion; // 보유 목록이 바뀌면 다시 그린다
  const owned = ownedWeaponIds();
  // 「보유한 무기만」을 켜 두었으면 담아둔 게 없어도 전체를 보여주지 않는다.
  // 예전에는 빈 화면을 피하려고 전체로 되돌렸는데, 그러면 안 가진 무기를 가진 것처럼
  // 골라 끼우게 된다 — 걸러진 결과가 비었다는 사실 자체를 보여주는 편이 맞다.
  // 이 캐릭터가 드는 종류 전체. 걸러서 비었을 때 종류 이름을 대려면 이쪽이 필요하다.
  const ofType = weaponsFor(character.weaponType);
  const typeName = ofType[0]?.typeName ?? character.weaponType;
  const candidates = ofType
    .filter((w) => (ownedOnly ? owned.has(w.id) : true))
    .filter((w) => w.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort(compare);

  /**
   * 가진 자루보다 더 많은 캐릭터가 끼고 있는지.
   * 무기 한 자루는 한 캐릭터만 낄 수 있어서, 둘에게 물리려면 두 자루가 있어야 한다.
   */
  const overEquipped = (weaponId: string) => {
    const copies = ownedWeaponCount(weaponId);
    return copies > 0 && (wearers.get(weaponId)?.length ?? 0) > copies;
  };

  return (
    <section className="panel">
      <div className="row">
        <div>
          <small>WEAPON</small>
          <h2>
            {character.name} - 무기 교체
            <span style={{ color: "#9ea7b7", fontSize: 14, marginLeft: 8 }}>
              {typeName}
            </span>
          </h2>
        </div>
      </div>

      <div className="weapon-layout">
        {/* ── 왼쪽: 보유 무기 격자 ── */}
        <div className="weapon-pane">
          <input
            type="text"
            className="weapon-search"
            placeholder="무기 이름 검색..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <label className="weapon-owned-filter">
            <input
              type="checkbox"
              checked={ownedOnly}
              onChange={(event) => setOwnedOnly(event.target.checked)}
            />
            보유한 무기만
            {owned.size === 0 && <em>— 무기 관리 탭에서 먼저 담아야 합니다</em>}
          </label>

          {candidates.length === 0 && (
            <p className="weapon-empty">
              {ownedOnly ? (
                <>
                  보유한 {typeName}가 없습니다.
                  <button className="weapon-empty-off" onClick={() => setOwnedOnly(false)}>
                    전체 무기 보기
                  </button>
                </>
              ) : (
                "이름에 맞는 무기가 없습니다."
              )}
            </p>
          )}

          <div className="weapon-grid">
            {candidates.map((weapon) => {
              const active = weapon.id === selectedId;

              return (
                <button
                  key={weapon.id}
                  className={active ? "weapon-card on" : "weapon-card"}
                  onClick={() => setCharacterWeapon(characterId, weapon.id)}
                >
                  <span className={`weapon-card-art r${weapon.rarity}`}>
                    <img src={weapon.icon} alt="" loading="lazy" />
                    <em className={active ? "weapon-card-refine on" : "weapon-card-refine"}>
                      {refineOf(weapon.id)}
                    </em>
                    {(wearers.get(weapon.id) ?? []).length > 0 && (
                      <em className="weapon-card-wearers">
                        {wearers.get(weapon.id)!.map((owner) => {
                          const self = owner.id === characterId;
                          const tip = `${owner.name} 장착 중`;

                          return owner.iconUrl ? (
                            <img
                              key={owner.id}
                              className={self ? "self" : undefined}
                              src={owner.iconUrl}
                              alt=""
                              loading="lazy"
                              title={tip}
                            />
                          ) : (
                            <b key={owner.id} className={self ? "self" : undefined} title={tip}>
                              {owner.name[0]}
                            </b>
                          );
                        })}
                      </em>
                    )}
                  </span>
                  <span className="weapon-card-name">{weapon.name}</span>
                  <span className="weapon-card-lv">Lv.{active ? level : WEAPON_LEVEL_MAX}</span>
                  {/* 가진 자루보다 많은 캐릭터가 끼고 있으면 알려준다 — 게임에선 불가능한 상태다. */}
                  {overEquipped(weapon.id) && (
                    <span className="weapon-card-warn" title="가진 자루보다 많은 캐릭터가 끼고 있습니다">
                      자루 부족
                    </span>
                  )}
                </button>
              );
            })}

            {candidates.length === 0 && (
              <p style={{ color: "#9ea7b7" }}>조건에 맞는 무기가 없습니다.</p>
            )}
          </div>

          <div className="weapon-sort">
            {SORTS.map((item) => (
              <button
                key={item.id}
                className={item.id === sort ? "on" : ""}
                onClick={() => setSort(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 오른쪽: 고른 무기 상세 ── */}
        <div className="weapon-detail">
          {selected ? (
            <>
              <div className="weapon-detail-head">
                <span className={`weapon-card-art r${selected.rarity}`}>
                  <img src={selected.icon} alt="" loading="lazy" />
                </span>
                <div>
                  <strong>{selected.name}</strong>
                  <span className="weapon-detail-lv">
                    {level}
                    <em>/{WEAPON_LEVEL_MAX}</em>
                    {level === WEAPON_LEVEL_MAX && <b className="weapon-max">MAX</b>}
                  </span>
                  <span className="weapon-stars">{stars(selected.rarity)}</span>
                </div>
              </div>

              <div className="weapon-stat-rows">
                <div>
                  <span>공격력</span>
                  <b>{flat(selected.baseAtk)}</b>
                </div>
                <div>
                  <span>{selected.subStatName}</span>
                  <b>{formatSubStat(selected.subStatKey, selected.subStatValue)}</b>
                </div>
              </div>

              <span className="weapon-level">
                레벨
                <input
                  type="range"
                  min={WEAPON_LEVEL_MIN}
                  max={WEAPON_LEVEL_MAX}
                  value={level}
                  onChange={(event) => setWeaponLevel(characterId, Number(event.target.value))}
                />
                <b>{level}</b>
              </span>

              <span className="weapon-refine">
                정련
                {REFINE_STEPS.map((step) => (
                  <button
                    key={step}
                    className={step === refine ? "on" : ""}
                    onClick={() => setWeaponRefine(characterId, step)}
                  >
                    {step}
                  </button>
                ))}
              </span>

              {selected.passiveName && (
                <>
                  <h4 className="weapon-passive-name">
                    {refine}단계 {selected.passiveName}
                  </h4>
                  <p className="weapon-passive">
                    {resolvePassive(selected.passiveDesc, selected.passiveParams, refine)}
                  </p>
                </>
              )}

              <span className="weapon-equipped">
                {character.iconUrl && <img src={character.iconUrl} alt="" loading="lazy" />}
                {character.name} 장착 중
              </span>

              {selected.subStatKey === "energyRegen" && (
                <span className="weapon-warn">
                  공명 효율은 스탯 표시에만 반영되고 피해 계산식에는 들어가지 않습니다.
                </span>
              )}

              <button
                className="weapon-unequip"
                onClick={() => setCharacterWeapon(characterId, selected.id)}
              >
                해제
              </button>
            </>
          ) : (
            <p className="weapon-none">왼쪽에서 무기를 고르세요.</p>
          )}
        </div>
      </div>
    </section>
  );
}
