import { useMemo, useState, useSyncExternalStore } from "react";
import { characters } from "../../data/sampleData";
import { ELEMENT_COLORS, ELEMENT_NAMES, elementIcon } from "../../data/elements";
import { isOwnedCharacter, ownedStoreVersion, subscribeOwnedStore } from "../../data/ownedStore";
import { usePartyConfig } from "../../context/PartyConfigContext";
import { usePersistedState } from "../../utils/usePersistedState";

/**
 * 매트릭스 파티 플래너.
 *
 * 종말 매트릭스는 여러 층을 **서로 다른 편성**으로 도는 콘텐츠라 한 캐릭터를 두 파티에
 * 겹쳐 넣을 수 없다. 그래서 이 화면은 피해를 계산하지 않고 「누구를 어느 파티에 넣을지」만
 * 본다 — 보유 캐릭터를 한 번씩만 나눠 담아 보는 자리다.
 *
 * 계산 탭 · 파티 관리 탭의 편성과는 **따로 논다.** 저장소도 따로고(matrixParties),
 * 여기서 자리를 옮겨도 계산 중인 파티는 그대로다.
 */

/** 한 파티에 앉는 캐릭터 수. 명조는 셋이다. */
const PARTY_SIZE = 3;

interface PlannerParty {
  /** 파티를 지우고 더해도 섞이지 않게 붙이는 번호. 화면의 「N파티」는 순서로 센다. */
  id: number;
  memberIds: string[];
}

const emptyParty = (id: number): PlannerParty => ({ id, memberIds: [] });

/** 처음 열면 빈 파티 셋. 매트릭스가 보통 셋을 요구한다. */
const INITIAL: PlannerParty[] = [emptyParty(1), emptyParty(2), emptyParty(3)];

/**
 * 캐릭터 셋을 「누가 앉았는지」만 남긴 열쇠로 바꾼다.
 * 자리 순서는 빼고 본다 — 같은 셋이면 메인딜을 누구로 잡았든 같은 조합이다.
 */
const comboKey = (characterIds: string[]): string =>
  [...new Set(characterIds.filter(Boolean))].sort().join("|");

export function MatrixPlannerPage() {
  const ownedVersion = useSyncExternalStore(subscribeOwnedStore, ownedStoreVersion);
  const { cyclePresets } = usePartyConfig();
  const [parties, setParties] = usePersistedState<PlannerParty[]>("matrixParties", INITIAL);
  const [activeId, setActiveId] = useState(INITIAL[0].id);
  const [query, setQuery] = useState("");

  /** 보유한 캐릭터만. 속성으로 묶고 그 안에서 이름순 — 원소 구성이 눈에 들어오게. */
  const owned = useMemo(
    () =>
      characters
        .filter((c) => isOwnedCharacter(c.id))
        .sort((a, b) =>
          a.element === b.element
            ? a.name.localeCompare(b.name, "ko")
            : ELEMENT_NAMES[a.element].localeCompare(ELEMENT_NAMES[b.element], "ko"),
        ),
    // ownedVersion이 바뀌면 보유 목록이 달라진다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownedVersion],
  );

  const needle = query.trim().toLowerCase();
  const shown = owned.filter(
    (c) =>
      !needle ||
      c.name.toLowerCase().includes(needle) ||
      ELEMENT_NAMES[c.element].includes(needle),
  );

  /** 캐릭터 id -> 몇 번째 파티에 앉아 있는지(1부터). 목록을 잠그는 근거다. */
  const placedIn = useMemo(() => {
    const map = new Map<string, number>();
    parties.forEach((party, index) => party.memberIds.forEach((id) => map.set(id, index + 1)));
    return map;
  }, [parties]);

  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c] as const)), []);

  /**
   * 조합 열쇠 -> 그 조합으로 담아 둔 사이클 이름들.
   * 사이클을 담을 때 빈 자리는 빼고 담으므로(currentCycleMembers) 셋만 비교하면 된다.
   */
  const cyclesByCombo = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const preset of cyclePresets) {
      const key = comboKey(preset.members.map((m) => m.characterId));
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), preset.name]);
    }
    return map;
  }, [cyclePresets]);

  /** 지금 채우는 파티. 지워졌으면 첫 파티로 되돌린다. */
  const active = parties.find((p) => p.id === activeId) ?? parties[0];
  const activeFull = !active || active.memberIds.length >= PARTY_SIZE;

  /**
   * 캐릭터를 지금 채우는 파티에 앉힌다.
   * 이미 어딘가에 앉아 있거나 자리가 없으면 아무 일도 하지 않는다 — 겹쳐 넣기가 이 화면의 금기다.
   *
   * 꽉 채운 뒤에는 자리가 남은 다음 파티로 옮겨 준다. 목록을 계속 누르기만 해도
   * 1파티 -> 2파티 -> 3파티 순으로 차게 해서 파티를 일일이 고르지 않게 한다.
   */
  const place = (characterId: string) => {
    if (activeFull || placedIn.has(characterId)) return;

    const next = parties.map((p) =>
      p.id === active.id ? { ...p, memberIds: [...p.memberIds, characterId] } : p,
    );
    setParties(next);

    if (active.memberIds.length + 1 >= PARTY_SIZE) {
      const from = next.findIndex((p) => p.id === active.id);
      const after = [...next.slice(from + 1), ...next.slice(0, from)];
      const room = after.find((p) => p.memberIds.length < PARTY_SIZE);
      if (room) setActiveId(room.id);
    }
  };

  const remove = (partyId: number, characterId: string) =>
    setParties((current) =>
      current.map((p) =>
        p.id === partyId ? { ...p, memberIds: p.memberIds.filter((id) => id !== characterId) } : p,
      ),
    );

  const addParty = () => {
    const id = parties.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    setParties([...parties, emptyParty(id)]);
    setActiveId(id);
  };

  /** 마지막 한 파티는 지우지 않고 비운다 — 채울 자리가 아예 없어지면 안 된다. */
  const dropParty = (partyId: number) => {
    if (parties.length <= 1) {
      setParties(parties.map((p) => ({ ...p, memberIds: [] })));
      return;
    }
    const next = parties.filter((p) => p.id !== partyId);
    setParties(next);
    if (partyId === activeId) setActiveId(next[0].id);
  };

  const clearAll = () => setParties(parties.map((p) => ({ ...p, memberIds: [] })));

  const placedCount = placedIn.size;

  return (
    <div className="matrix-planner">
      <section className="panel matrix-intro">
        <div>
          <small>MATRIX PARTY PLANNER</small>
          <h2>매트릭스 파티 플래너</h2>
          <p>
            보유 캐릭터를 여러 파티로 나눠 담아 봅니다. 한 캐릭터는 <b>한 파티에만</b> 들어갑니다 —
            이미 쓴 캐릭터는 목록에서 잠기고, 어느 파티에 있는지 표시됩니다.
          </p>
          <p className="matrix-note">
            계산 탭 · 파티 관리 탭의 편성과는 따로 놉니다. 여기서 자리를 옮겨도 계산 중인 파티는
            그대로입니다.
          </p>
        </div>

        <div className="matrix-tally">
          <span>
            <b>{owned.length}</b>
            <em>보유</em>
          </span>
          <span>
            <b>{placedCount}</b>
            <em>배치</em>
          </span>
          <span>
            <b>{owned.length - placedCount}</b>
            <em>남음</em>
          </span>
        </div>
      </section>

      <div className="matrix-body">
        <section className="panel">
          <div className="panel-head">
            <h2>보유 캐릭터</h2>
            <input
              type="text"
              className="panel-search"
              placeholder="이름 · 속성으로 찾기"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {owned.length === 0 ? (
            <p className="matrix-empty">
              보유로 표시한 캐릭터가 없습니다. <b>캐릭터 관리</b> 탭 목록에서 줄 오른쪽의 ✓를 눌러
              가지고 있는 캐릭터를 먼저 표시해 주세요.
            </p>
          ) : (
            <div className="pick-grid matrix-pool">
              {shown.map((char) => {
                const at = placedIn.get(char.id);

                return (
                  <button
                    key={char.id}
                    className={at ? "pick-card in" : "pick-card"}
                    disabled={at !== undefined || activeFull}
                    onClick={() => place(char.id)}
                    title={
                      at
                        ? `${ELEMENT_NAMES[char.element]} — ${at}파티에 있습니다 (그 파티에서 빼면 다시 고를 수 있습니다)`
                        : activeFull
                          ? "채우는 파티가 꽉 찼습니다 — 오른쪽에서 다른 파티를 고르세요"
                          : `${ELEMENT_NAMES[char.element]} · ${char.weaponType}`
                    }
                  >
                    {char.iconUrl && <img src={char.iconUrl} alt="" loading="lazy" />}
                    <b>{char.name}</b>
                    <em style={at ? undefined : { color: ELEMENT_COLORS[char.element] }}>
                      {at ? `${at}파티` : ELEMENT_NAMES[char.element]}
                    </em>
                  </button>
                );
              })}

              {shown.length === 0 && <p className="matrix-empty">이름에 맞는 캐릭터가 없습니다.</p>}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>파티 구성</h2>
            <div className="matrix-actions">
              <button onClick={clearAll}>전체 비우기</button>
              <button className="primary" onClick={addParty}>
                파티 추가
              </button>
            </div>
          </div>

          <div className="matrix-parties">
            {parties.map((party, index) => {
              // 메인딜은 첫 자리에 앉은 캐릭터로 본다 — 목록에서 먼저 누른 쪽이다.
              const lead = byId.get(party.memberIds[0] ?? "");
              const leadIcon = lead && elementIcon(lead.element);
              const saved = cyclesByCombo.get(comboKey(party.memberIds)) ?? [];

              return (
                <article
                  key={party.id}
                  className={party.id === active?.id ? "matrix-party on" : "matrix-party"}
                  onClick={() => setActiveId(party.id)}
                >
                  <header>
                    <b>{index + 1}파티</b>
                    <small>
                      {party.memberIds.length}/{PARTY_SIZE}
                    </small>
                    <button
                      className="matrix-drop"
                      title={parties.length <= 1 ? "이 파티를 비웁니다" : "이 파티를 지웁니다"}
                      onClick={(event) => {
                        event.stopPropagation();
                        dropParty(party.id);
                      }}
                    >
                      ✕
                    </button>
                  </header>

                  {lead && (
                    <div className="matrix-lead">
                      <span style={{ color: ELEMENT_COLORS[lead.element] }}>
                        {leadIcon && <img src={leadIcon} alt="" loading="lazy" />}
                        메인딜 속성 : <b>{ELEMENT_NAMES[lead.element]}</b>
                      </span>

                      {saved.length > 0 && (
                        <em
                          className="matrix-saved"
                          title={`이 조합으로 담아 둔 사이클 — ${saved.join(" · ")}`}
                        >
                          저장된 사이클 있음{saved.length > 1 ? ` ${saved.length}` : ""}
                        </em>
                      )}
                    </div>
                  )}

                  <div className="matrix-slots">
                    {Array.from({ length: PARTY_SIZE }, (_, slot) => {
                      const char = byId.get(party.memberIds[slot] ?? "");
                      if (!char)
                        return <div key={slot} className="matrix-slot empty" aria-hidden="true" />;

                      return (
                        <button
                          key={slot}
                          className="matrix-slot"
                          title={`${char.name} — 누르면 파티에서 빠집니다`}
                          onClick={(event) => {
                            event.stopPropagation();
                            remove(party.id, char.id);
                          }}
                        >
                          <b>{char.name}</b>
                          <em style={{ color: ELEMENT_COLORS[char.element] }}>
                            {ELEMENT_NAMES[char.element]}
                          </em>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>

          <p className="matrix-hint">
            테두리가 밝은 파티가 <b>지금 채우는 파티</b>입니다. 파티를 눌러 옮기고, 왼쪽 목록에서
            캐릭터를 누르면 그 파티에 들어갑니다. 파티의 캐릭터를 누르면 빠집니다.
          </p>
        </section>
      </div>
    </div>
  );
}
