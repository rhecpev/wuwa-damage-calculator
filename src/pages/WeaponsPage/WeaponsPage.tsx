import { useMemo, useState, useSyncExternalStore } from "react";
import { characters } from "../../data/sampleData";
import {
  DEFAULT_WEAPON_LEVEL,
  WEAPON_LEVEL_MAX,
  WEAPON_LEVEL_MIN,
  weaponAtLevel,
  weapons,
  weaponsById,
  type WeaponEntry,
} from "../../data/weapons";
import {
  addMyWeapon,
  loadMyWeapons,
  ownedStoreVersion,
  ownedWeaponCount,
  removeMyWeapon,
  subscribeOwnedStore,
  updateMyWeapon,
} from "../../data/ownedStore";
import { usePartyConfig } from "../../context/PartyConfigContext";
import { flat } from "../../utils/format";

/**
 * 무기 관리 탭 — 내가 가진 무기를 등록해 두는 자리. 에코 관리와 같은 방식이다.
 *
 * 아래 도감에서 무기를 누르면 위쪽 「내 무기」에 한 자루가 담긴다.
 * **같은 무기를 여러 번 담을 수 있다** — 무기 하나는 한 캐릭터만 낄 수 있으므로,
 * 두 캐릭터에게 같은 무기를 물리려면 실제로 두 자루가 있어야 하기 때문이다.
 * 자루마다 레벨과 정련을 따로 정한다.
 *
 * 캐릭터에게 실제로 물리는 건 캐릭터 관리 → 무기선택창에서 한다.
 * 여기서 등록해 둔 무기만 그쪽 목록에 뜬다.
 */

const stars = (rarity: number) => "★".repeat(rarity);

const TYPE_LABEL: Record<string, string> = {
  Broadblade: "대검",
  Sword: "직검",
  Pistols: "권총",
  Gauntlets: "권갑",
  Rectifier: "증폭기",
};

const TYPES = ["Broadblade", "Sword", "Pistols", "Gauntlets", "Rectifier"] as const;
const REFINE_STEPS = [1, 2, 3, 4, 5];

/** 부옵션 값 표기 — 퍼센트 스탯이면 %로, 아니면 실수 그대로. */
function formatSubStat(key: string | null, value: number) {
  if (key === null) return `${(value * 100).toFixed(1)}%`;
  const isFlat = key === "hp" || key === "atk" || key === "def";
  return isFlat ? flat(value) : `${(value * 100).toFixed(1)}%`;
}

export function WeaponsPage() {
  const version = useSyncExternalStore(subscribeOwnedStore, ownedStoreVersion);
  const { characterWeapons } = usePartyConfig();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [rarity, setRarity] = useState<number | null>(null);

  const mine = useMemo(() => {
    // version이 바뀌면 보유 목록도 바뀐다.
    void version;
    return loadMyWeapons()
      .map((w) => ({ ...w, entry: weaponsById.get(w.weaponId) }))
      .filter((w): w is typeof w & { entry: WeaponEntry } => w.entry !== undefined)
      .sort(
        (a, b) => b.entry.rarity - a.entry.rarity || a.entry.name.localeCompare(b.entry.name, "ko"),
      );
  }, [version]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return weapons
      .filter((w) => (type ? w.weaponType === type : true))
      .filter((w) => (rarity ? w.rarity === rarity : true))
      .filter((w) => (q ? w.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name, "ko"));
  }, [query, type, rarity]);

  /** 이 무기를 지금 끼고 있는 캐릭터들. 자루가 모자라면 경고를 띄우는 데 쓴다. */
  const wearersOf = (weaponId: string) =>
    characters.filter((c) => characterWeapons[c.id]?.weaponId === weaponId);

  return (
    <div className="data-page">
      <header>
        <div>
          <h1>무기 관리</h1>
          <p>
            아래 도감에서 무기를 누르면 「내 무기」에 한 자루가 담깁니다.{" "}
            <b className="weapon-dup-note">같은 무기를 여러 번 담을 수 있습니다</b> — 무기 한 자루는
            한 캐릭터만 낄 수 있으니, 둘에게 물리려면 두 자루가 있어야 합니다.
          </p>
          <p>
            캐릭터에게 실제로 물리는 건 <b>캐릭터 관리 → 무기선택창</b>에서 합니다. 여기 담아 둔
            무기만 그쪽 목록에 뜹니다.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="row">
          <h2>내 무기 {mine.length}자루</h2>
        </div>

        {mine.length === 0 ? (
          <p className="data-empty">
            아직 담은 무기가 없습니다. 아래 목록에서 무기를 눌러 담으세요.
          </p>
        ) : (
          <div className="my-weapons">
            {mine.map((item) => {
              const wearers = wearersOf(item.weaponId);
              const copies = ownedWeaponCount(item.weaponId);
              return (
                <div className="my-weapon" key={item.pk}>
                  {item.entry.icon && <img src={item.entry.icon} alt="" loading="lazy" />}

                  <div className="my-weapon-name">
                    <b>{item.entry.name}</b>
                    <span>
                      <i className="weapon-stars">{stars(item.entry.rarity)}</i>{" "}
                      {TYPE_LABEL[item.entry.weaponType] ?? item.entry.weaponType}
                      {/* 부옵션은 레벨마다 값이 다르다 — 담아둔 레벨의 값을 보여준다. */}
                      {item.entry.subStatName
                        ? ` · ${item.entry.subStatName} ${formatSubStat(
                            item.entry.subStatKey,
                            item.entry.subStatLevels?.[item.level - 1] ?? item.entry.subStatValue,
                          )}`
                        : ""}
                      {` · 공격력 ${flat(weaponAtLevel(item.entry, item.level).baseAtk)}`}
                    </span>
                  </div>

                  <label className="my-weapon-field">
                    <em>레벨</em>
                    <input
                      type="number"
                      min={WEAPON_LEVEL_MIN}
                      max={WEAPON_LEVEL_MAX}
                      value={item.level}
                      onChange={(e) =>
                        updateMyWeapon(item.pk, {
                          level: Math.min(
                            Math.max(Number(e.target.value) || WEAPON_LEVEL_MIN, WEAPON_LEVEL_MIN),
                            WEAPON_LEVEL_MAX,
                          ),
                        })
                      }
                    />
                  </label>

                  <div className="my-weapon-refine">
                    <em>정련</em>
                    {REFINE_STEPS.map((step) => (
                      <button
                        key={step}
                        className={step === item.refine ? "on" : undefined}
                        onClick={() => updateMyWeapon(item.pk, { refine: step })}
                      >
                        {step}
                      </button>
                    ))}
                  </div>

                  {/* 자루보다 더 많은 캐릭터가 끼고 있으면 알려준다 — 게임에서는 불가능한 상태다. */}
                  {wearers.length > copies && (
                    <span className="my-weapon-warn">
                      {wearers.length}명이 끼고 있는데 {copies}자루뿐입니다
                    </span>
                  )}

                  <button
                    className="my-weapon-remove"
                    title="이 자루를 목록에서 지웁니다"
                    onClick={() => removeMyWeapon(item.pk)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="row">
          <h2>무기 도감</h2>
        </div>

        <div className="data-filters">
          <div className="chips">
            <button
              className={type === null ? "chip chip-active" : "chip"}
              onClick={() => setType(null)}
            >
              전체
            </button>
            {TYPES.map((t) => (
              <button
                key={t}
                className={type === t ? "chip chip-active" : "chip"}
                onClick={() => setType(t)}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <div className="chips">
            <button
              className={rarity === null ? "chip chip-active" : "chip"}
              onClick={() => setRarity(null)}
            >
              모든 등급
            </button>
            {[5, 4, 3].map((r) => (
              <button
                key={r}
                className={rarity === r ? "chip chip-active" : "chip"}
                onClick={() => setRarity(r)}
              >
                {stars(r)}
              </button>
            ))}
          </div>

          <input
            className="weapon-search data-search"
            placeholder="무기 이름으로 찾기"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="weapon-catalog">
          {list.map((weapon) => {
            const copies = ownedWeaponCount(weapon.id);
            return (
              <button
                key={weapon.id}
                className={copies ? "weapon-card owned" : "weapon-card"}
                title={`${weapon.name} — 눌러서 한 자루 담기`}
                onClick={() => addMyWeapon(weapon.id, DEFAULT_WEAPON_LEVEL, 1)}
              >
                {weapon.icon && <img src={weapon.icon} alt="" loading="lazy" />}
                <b>{weapon.name}</b>
                <span className="weapon-stars">{stars(weapon.rarity)}</span>
                <em>{TYPE_LABEL[weapon.weaponType] ?? weapon.weaponType}</em>
                {copies > 0 && <i className="weapon-count">{copies}</i>}
              </button>
            );
          })}
        </div>

        {list.length === 0 && <p className="data-empty">조건에 맞는 무기가 없습니다.</p>}
      </section>
    </div>
  );
}
