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
  distinctWearers,
  updateMyWeapon,
  wearersByCopy,
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
  // 「내 무기」에서 고른 자루. 아래 편집 줄(레벨 · 정련 · 지우기)이 이 자루를 가리킨다.
  const [pickedPk, setPickedPk] = useState<number | null>(null);

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

  // 자루마다 누가 끼고 있는지 — 캐릭터 관리 무기 선택창과 같은 규칙(ownedStore.wearersByCopy).
  const byCopy = useMemo(
    () => wearersByCopy(mine, characterWeapons, characters.map((c) => c.id)),
    [mine, characterWeapons],
  );
  // 모드로 갈린 같은 캐릭터는 한 명으로 센다 — 두 모드가 한 자루를 같이 쥐어도 「자루 부족」이 아니다.
  const wearersOf = (pk: number) =>
    distinctWearers(byCopy.get(pk) ?? [])
      .map((id) => characters.find((c) => c.id === id))
      .filter((c): c is (typeof characters)[number] => c !== undefined);

  const picked = mine.find((w) => w.pk === pickedPk);

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
          <>
            {/* 캐릭터 관리 무기 선택창과 같은 카드 — 그림 · 정련 · 낀 캐릭터 · 이름 · 레벨.
                누르면 아래에 그 자루의 레벨 · 정련을 고치는 줄이 뜬다. */}
            <div className="weapon-grid my-weapon-grid">
              {mine.map((item) => {
                const wearers = wearersOf(item.pk);
                const on = item.pk === pickedPk;
                return (
                  <button
                    key={item.pk}
                    className={on ? "weapon-card on" : "weapon-card"}
                    title={`${item.entry.name} — 눌러서 레벨 · 정련 고치기`}
                    onClick={() => setPickedPk(on ? null : item.pk)}
                  >
                    <span className={`weapon-card-art r${item.entry.rarity}`}>
                      {item.entry.icon && <img src={item.entry.icon} alt="" loading="lazy" />}
                      <em className={on ? "weapon-card-refine on" : "weapon-card-refine"}>
                        {item.refine}
                      </em>
                      {wearers.length > 0 && (
                        <em className="weapon-card-wearers">
                          {wearers.map((owner) =>
                            owner.iconUrl ? (
                              <img
                                key={owner.id}
                                src={owner.iconUrl}
                                alt=""
                                loading="lazy"
                                title={`${owner.name} 장착 중`}
                              />
                            ) : (
                              <b key={owner.id} title={`${owner.name} 장착 중`}>
                                {owner.name[0]}
                              </b>
                            ),
                          )}
                        </em>
                      )}
                    </span>
                    <span className="weapon-card-name">{item.entry.name}</span>
                    <span className="weapon-card-lv">Lv.{item.level}</span>
                    {/* 한 자루를 둘 이상이 끼고 있으면 알려준다 — 게임에서는 불가능한 상태다. */}
                    {wearers.length > 1 && (
                      <span className="weapon-card-warn" title="한 자루를 둘 이상의 캐릭터가 끼고 있습니다">
                        자루 부족
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {picked && (
              <div className="my-weapons">
                <div className="my-weapon">
                  {picked.entry.icon && <img src={picked.entry.icon} alt="" loading="lazy" />}

                  <div className="my-weapon-name">
                    <b>{picked.entry.name}</b>
                    <span>
                      <i className="weapon-stars">{stars(picked.entry.rarity)}</i>{" "}
                      {TYPE_LABEL[picked.entry.weaponType] ?? picked.entry.weaponType}
                      {/* 부옵션은 레벨마다 값이 다르다 — 담아둔 레벨의 값을 보여준다. */}
                      {picked.entry.subStatName
                        ? ` · ${picked.entry.subStatName} ${formatSubStat(
                            picked.entry.subStatKey,
                            picked.entry.subStatLevels?.[picked.level - 1] ??
                              picked.entry.subStatValue,
                          )}`
                        : ""}
                      {` · 공격력 ${flat(weaponAtLevel(picked.entry, picked.level).baseAtk)}`}
                      {wearersOf(picked.pk).length > 0 &&
                        ` · ${wearersOf(picked.pk)
                          .map((c) => c.name)
                          .join(", ")} 장착 중`}
                    </span>
                  </div>

                  <label className="my-weapon-field">
                    <em>레벨</em>
                    <input
                      type="number"
                      min={WEAPON_LEVEL_MIN}
                      max={WEAPON_LEVEL_MAX}
                      value={picked.level}
                      onChange={(e) =>
                        updateMyWeapon(picked.pk, {
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
                        className={step === picked.refine ? "on" : undefined}
                        onClick={() => updateMyWeapon(picked.pk, { refine: step })}
                      >
                        {step}
                      </button>
                    ))}
                  </div>

                  <button
                    className="my-weapon-remove"
                    title="이 자루를 목록에서 지웁니다"
                    onClick={() => {
                      removeMyWeapon(picked.pk);
                      setPickedPk(null);
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </>
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
