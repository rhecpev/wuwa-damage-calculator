import { useMemo, useState, useSyncExternalStore } from "react";
import { characters } from "../../data/sampleData";
import { ELEMENT_COLORS, ELEMENT_NAMES, elementIcon } from "../../data/elements";
import { isOwnedCharacter, ownedStoreVersion, subscribeOwnedStore } from "../../data/ownedStore";
import { usePartyConfig } from "../../context/PartyConfigContext";
import { usePersistedState } from "../../utils/usePersistedState";
import type { Element } from "../../types/game";

/**
 * 매트릭스 파티 플래너.
 *
 * 종말 매트릭스는 여러 층을 **서로 다른 편성**으로 도는 콘텐츠라 한 캐릭터를 두 파티에
 * 겹쳐 넣을 수 없다. 그래서 이 화면은 피해를 계산하지 않고 「누구를 어느 파티에 넣을지」만
 * 본다 — 보유 캐릭터를 나눠 담아 보는 자리다.
 *
 * 파티는 **메인딜 속성별로 세로줄 여섯 개**에 나눠 선다. 첫 자리에 앉은 캐릭터가 메인딜이고,
 * 그 속성의 줄로 파티가 옮겨 간다 — 어느 속성이 비었는지 한눈에 보이게.
 *
 * 계산 탭 · 파티 관리 탭의 편성과는 **따로 논다.** 저장소도 따로고(matrixParties),
 * 여기서 자리를 옮겨도 계산 중인 파티는 그대로다.
 */

/** 한 파티에 앉는 캐릭터 수. 명조는 셋이다. */
const PARTY_SIZE = 3;

/** 세로줄 순서. 게임 속성 표기 순서를 따른다. */
const ELEMENT_ORDER: Element[] = ["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"];

/**
 * 두 파티에 겹쳐 쓸 수 있는 캐릭터 — 치유·보조 다섯.
 * 적어 두지 않은 캐릭터는 한 번뿐이다.
 */
const USE_LIMIT: Record<string, number> = {
  shorekeeper: 2, // 파수인
  verina: 2, // 벨리나
  baizhi: 2, // 설지
  bochi: 2, // 복링
  monie: 2, // 모니에
};

const useLimit = (characterId: string): number => USE_LIMIT[characterId] ?? 1;

interface PlannerParty {
  /** 파티를 지우고 더해도 섞이지 않게 붙이는 번호. 화면의 「N파티」는 줄 안의 순서로 센다. */
  id: number;
  /** 이 파티를 만든 세로줄. 메인딜이 앉으면 그 캐릭터의 속성이 자리를 대신 정한다. */
  element: Element;
  memberIds: string[];
}

const isElement = (value: unknown): value is Element =>
  typeof value === "string" && (ELEMENT_ORDER as string[]).includes(value);

/**
 * 캐릭터 셋을 「누가 앉았는지」만 남긴 열쇠로 바꾼다.
 * 자리 순서는 빼고 본다 — 같은 셋이면 메인딜을 누구로 잡았든 같은 조합이다.
 */
const comboKey = (characterIds: string[]): string =>
  [...new Set(characterIds.filter(Boolean))].sort().join("|");

export function MatrixPlannerPage() {
  const ownedVersion = useSyncExternalStore(subscribeOwnedStore, ownedStoreVersion);
  const { cyclePresets } = usePartyConfig();
  const [stored, setParties] = usePersistedState<PlannerParty[]>("matrixParties", []);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c] as const)), []);

  /**
   * 저장된 것을 쓸 수 있는 모양으로 고친다.
   *
   * 속성 세로줄이 생기기 전에 담긴 파티에는 element가 없다 — 첫 자리 캐릭터의 속성으로
   * 옮기고, 사람도 속성도 없는 것은 버린다. 파티가 하나도 없는 속성에는 빈 파티를 놓아
   * 어느 줄이든 바로 채울 수 있게 한다(더 필요하면 「+ 파티」로 늘린다).
   */
  const parties = useMemo(() => {
    const out: PlannerParty[] = [];

    for (const row of Array.isArray(stored) ? stored : []) {
      if (!row || typeof row !== "object") continue;
      const memberIds = (Array.isArray(row.memberIds) ? row.memberIds : []).filter(
        (id: unknown): id is string => typeof id === "string",
      );
      const lead = byId.get(memberIds[0] ?? "");
      const element = isElement(row.element) ? row.element : lead?.element;
      if (!element) continue;
      out.push({
        id: typeof row.id === "number" ? row.id : out.length + 1,
        element,
        memberIds,
      });
    }

    // 줄이 텅 비면 고를 것이 없다 — 파티가 하나도 없는 속성에만 빈 파티를 놓는다.
    // 어느 줄에 설지는 메인딜(첫 자리)이 정하므로 stored의 element가 아니라 그것으로 센다.
    const columnOfRow = (p: PlannerParty) =>
      byId.get(p.memberIds[0] ?? "")?.element ?? p.element;
    let nextId = out.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    for (const element of ELEMENT_ORDER) {
      if (!out.some((p) => columnOfRow(p) === element)) {
        out.push({ id: nextId++, element, memberIds: [] });
      }
    }
    return out;
  }, [stored, byId]);

  /** 이 파티가 설 세로줄. 메인딜(첫 자리)이 있으면 그 속성이 이긴다. */
  const columnOf = (party: PlannerParty): Element =>
    byId.get(party.memberIds[0] ?? "")?.element ?? party.element;

  /** 속성 -> 그 줄에 선 파티들. 담긴 순서를 그대로 지킨다. */
  const columns = useMemo(() => {
    const map = new Map<Element, PlannerParty[]>(ELEMENT_ORDER.map((e) => [e, []]));
    for (const party of parties) map.get(columnOf(party))!.push(party);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties, byId]);

  /** 캐릭터 id -> 앉아 있는 자리들(「기류 1파티」 꼴). 목록을 잠그는 근거다. */
  const placedIn = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const element of ELEMENT_ORDER) {
      (columns.get(element) ?? []).forEach((party, index) => {
        for (const id of party.memberIds) {
          const label = `${ELEMENT_NAMES[element]} ${index + 1}파티`;
          map.set(id, [...(map.get(id) ?? []), label]);
        }
      });
    }
    return map;
  }, [columns]);

  /** 보유한 캐릭터만. 속성으로 묶고 그 안에서 이름순 — 원소 구성이 눈에 들어오게. */
  const owned = useMemo(
    () =>
      characters
        .filter((c) => isOwnedCharacter(c.id))
        .sort((a, b) =>
          a.element === b.element
            ? a.name.localeCompare(b.name, "ko")
            : ELEMENT_ORDER.indexOf(a.element) - ELEMENT_ORDER.indexOf(b.element),
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

  /** 지금 채우는 파티. 아직 안 골랐거나 지워졌으면 자리가 남은 첫 파티를 쓴다. */
  const active =
    parties.find((p) => p.id === activeId) ??
    ELEMENT_ORDER.flatMap((e) => columns.get(e) ?? []).find(
      (p) => p.memberIds.length < PARTY_SIZE,
    );

  /** 이 캐릭터를 지금 더 앉힐 수 있는지. 못 앉히는 까닭까지 같이 돌려준다. */
  const blockedReason = (characterId: string): string | null => {
    const at = placedIn.get(characterId) ?? [];
    const limit = useLimit(characterId);
    if (at.length >= limit)
      return limit > 1
        ? `두 파티까지만 겹쳐 쓸 수 있습니다 — ${at.join(" · ")}`
        : `${at.join(" · ")}에 있습니다 (그 파티에서 빼면 다시 고를 수 있습니다)`;
    if (!active) return "채울 파티가 없습니다";
    if (active.memberIds.length >= PARTY_SIZE)
      return "채우는 파티가 꽉 찼습니다 — 다른 파티를 고르세요";
    if (active.memberIds.includes(characterId)) return "이미 이 파티에 있습니다";
    return null;
  };

  /**
   * 캐릭터를 지금 채우는 파티에 앉힌다.
   *
   * 꽉 채운 뒤에는 자리가 남은 다음 파티로 옮겨 준다. 목록을 계속 누르기만 해도
   * 응결 -> 용융 -> … 순으로 차게 해서 파티를 일일이 고르지 않게 한다.
   */
  const place = (characterId: string) => {
    if (!active || blockedReason(characterId)) return;

    const next = parties.map((p) =>
      p.id === active.id ? { ...p, memberIds: [...p.memberIds, characterId] } : p,
    );
    setParties(next);

    if (active.memberIds.length + 1 >= PARTY_SIZE) {
      // 화면에 보이는 순서(속성 줄 -> 줄 안의 순서)대로 다음 빈자리를 찾는다.
      const seen = next.filter((p) => p.id !== active.id);
      const order = ELEMENT_ORDER.flatMap((element) =>
        seen.filter((p) => (byId.get(p.memberIds[0] ?? "")?.element ?? p.element) === element),
      );
      setActiveId(order.find((p) => p.memberIds.length < PARTY_SIZE)?.id ?? null);
    }
  };

  const remove = (partyId: number, characterId: string) =>
    setParties(
      parties.map((p) =>
        p.id === partyId ? { ...p, memberIds: p.memberIds.filter((id) => id !== characterId) } : p,
      ),
    );

  /** 그 속성 줄에 빈 파티를 하나 더 놓는다. */
  const addParty = (element: Element) => {
    const id = parties.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    setParties([...parties, { id, element, memberIds: [] }]);
    setActiveId(id);
  };

  /** 사람이 앉아 있으면 비우고, 이미 빈 파티면 줄에서 치운다. */
  const dropParty = (partyId: number) => {
    const party = parties.find((p) => p.id === partyId);
    if (!party) return;
    if (party.memberIds.length > 0) {
      setParties(parties.map((p) => (p.id === partyId ? { ...p, memberIds: [] } : p)));
      return;
    }
    setParties(parties.filter((p) => p.id !== partyId));
    if (partyId === activeId) setActiveId(null);
  };

  const clearAll = () => setParties(parties.map((p) => ({ ...p, memberIds: [] })));

  const placedCount = [...placedIn.values()].reduce((sum, at) => sum + at.length, 0);
  const usedCharacters = placedIn.size;

  return (
    <div className="matrix-planner">
      <section className="panel matrix-intro">
        <div>
          <small>MATRIX PARTY PLANNER</small>
          <h2>매트릭스 파티 플래너</h2>
          <p>
            보유 캐릭터를 메인딜 속성별로 나눠 담아 봅니다. 한 캐릭터는 <b>한 파티에만</b>{" "}
            들어갑니다 — 치유·보조 다섯(파수인 · 벨리나 · 설지 · 복링 · 모니에)만 <b>두 파티</b>까지
            겹쳐 쓸 수 있습니다.
          </p>
          <p className="matrix-note">
            첫 자리에 앉은 캐릭터가 메인딜이고, 그 속성의 세로줄로 파티가 옮겨 갑니다. 계산 탭 ·
            파티 관리 탭의 편성과는 따로 놉니다.
          </p>
        </div>

        <div className="matrix-tally">
          <span>
            <b>{owned.length}</b>
            <em>보유</em>
          </span>
          <span>
            <b>{usedCharacters}</b>
            <em>사용</em>
          </span>
          <span>
            <b>{placedCount}</b>
            <em>배치</em>
          </span>
          <span>
            <b>{owned.length - usedCharacters}</b>
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
              placeholder="이름 · 속성"
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
                const at = placedIn.get(char.id) ?? [];
                const limit = useLimit(char.id);
                const blocked = blockedReason(char.id);
                const spent = at.length >= limit;

                return (
                  <button
                    key={char.id}
                    className={spent ? "pick-card in" : "pick-card"}
                    disabled={blocked !== null}
                    onClick={() => place(char.id)}
                    title={blocked ?? `${ELEMENT_NAMES[char.element]} · ${char.weaponType}`}
                  >
                    {char.iconUrl && <img src={char.iconUrl} alt="" loading="lazy" />}
                    <b>{char.name}</b>
                    <em style={at.length ? undefined : { color: ELEMENT_COLORS[char.element] }}>
                      {at.length ? at.join(" · ") : ELEMENT_NAMES[char.element]}
                    </em>
                    {/* 겹쳐 쓸 수 있는 치유·보조는 쓸 때마다 남은 횟수를 깎아 보여준다. */}
                    {limit > 1 && (
                      <i
                        className={spent ? "spent" : undefined}
                        title={`두 파티까지 겹쳐 쓸 수 있습니다 — ${at.length}/${limit} 사용`}
                      >
                        {spent ? "다 씀" : `${limit - at.length}회 남음`}
                      </i>
                    )}
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
            </div>
          </div>

          {/* 속성 여섯 세로줄. 좁아지면 셋 · 둘 · 하나로 접힌다. */}
          <div className="matrix-columns">
            {ELEMENT_ORDER.map((element) => {
              const column = columns.get(element) ?? [];
              const icon = elementIcon(element);
              const filled = column.filter((p) => p.memberIds.length > 0).length;

              return (
                <div className="matrix-column" key={element}>
                  {/* 줄 머리 — 속성 아이콘을 크게 세우고 이름·파티 수를 그 아래 가운데에 둔다. */}
                  <header style={{ borderColor: ELEMENT_COLORS[element] }}>
                    {icon && <img src={icon} alt="" loading="lazy" />}
                    <b style={{ color: ELEMENT_COLORS[element] }}>{ELEMENT_NAMES[element]}</b>
                    <small>{filled > 0 ? `${filled}파티` : "비어 있음"}</small>
                  </header>

                  {column.map((party, index) => {
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
                          {(party.memberIds.length > 0 || column.length > 1) && (
                            <button
                              className="matrix-drop"
                              title={
                                party.memberIds.length > 0
                                  ? "이 파티를 비웁니다"
                                  : "이 파티를 치웁니다"
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                dropParty(party.id);
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </header>

                        {lead && (
                          <div className="matrix-lead">
                            <span style={{ color: ELEMENT_COLORS[lead.element] }}>
                              {leadIcon && <img src={leadIcon} alt="" loading="lazy" />}
                              메인딜 속성 : <b>{ELEMENT_NAMES[lead.element]}</b>
                            </span>
                          </div>
                        )}

                        {saved.length > 0 && (
                          <em
                            className="matrix-saved"
                            title={`이 조합으로 담아 둔 사이클 — ${saved.join(" · ")}`}
                          >
                            저장된 사이클 있음{saved.length > 1 ? ` ${saved.length}` : ""}
                          </em>
                        )}

                        <div className="matrix-slots">
                          {Array.from({ length: PARTY_SIZE }, (_, slot) => {
                            const char = byId.get(party.memberIds[slot] ?? "");
                            if (!char)
                              return (
                                <div key={slot} className="matrix-slot empty" aria-hidden="true" />
                              );

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
                                {char.iconUrl && <img src={char.iconUrl} alt="" loading="lazy" />}
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

                  <button className="matrix-add" onClick={() => addParty(element)}>
                    + 파티
                  </button>
                </div>
              );
            })}
          </div>

          <p className="matrix-hint">
            테두리가 밝은 파티가 <b>지금 채우는 파티</b>입니다. 파티를 눌러 옮기고, 왼쪽 목록에서
            캐릭터를 누르면 그 파티에 들어갑니다. 파티의 캐릭터를 누르면 빠집니다. 메인딜을 바꾸면
            파티가 그 속성 줄로 옮겨 갑니다.
          </p>
        </section>
      </div>
    </div>
  );
}
