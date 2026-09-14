import { useMemo, useState, useSyncExternalStore } from "react";
import type { DragEvent } from "react";
import { characters } from "../../data/sampleData";
import { ELEMENT_COLORS, ELEMENT_NAMES, elementIcon } from "../../data/elements";
import { isOwnedCharacter, ownedStoreVersion, subscribeOwnedStore } from "../../data/ownedStore";
import { usePartyConfig } from "../../context/PartyConfigContext";
import { useAppState } from "../../context/AppStateContext";
import { usePersistedState } from "../../utils/usePersistedState";
import type { CyclePreset } from "../../data/cyclePresets";
import type { Element } from "../../types/game";

/**
 * 매트릭스.
 *
 * 종말 매트릭스는 여러 층을 **서로 다른 편성**으로 도는 콘텐츠다. 그래서 이 화면은 피해를
 * 계산하지 않고 「누구를 어느 파티에 넣을지」와 「어느 파티부터 돌지」만 본다.
 *
 * 세부 탭은 둘이다.
 *   파티 플래너        보유 캐릭터를 파티에 담는다
 *   파티 순서 구성하기  담아 둔 파티를 도는 순서대로 끌어 옮긴다
 *
 * 파티는 **담은 순서대로** 쭉 선다(속성으로 나누지 않는다) — 그 순서가 곧 도는 순서다.
 * 한 캐릭터를 여러 파티에 넣는 것도 막지 않는다. 대신 몇 번 썼고 어느 파티에 있는지 늘 적어 둔다.
 *
 * 계산 탭 · 파티 관리 탭의 편성과는 **따로 논다.** 저장소도 따로고(matrixParties),
 * 여기서 자리를 옮겨도 계산 중인 파티는 그대로다.
 */

/** 한 파티에 앉는 캐릭터 수. 명조는 셋이다. */
const PARTY_SIZE = 3;

/** 보유 목록을 세우는 속성 순서. 게임 속성 표기 순서를 따른다. */
const ELEMENT_ORDER: Element[] = ["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"];

/**
 * 콘텐츠 규칙상 겹쳐 쓸 수 있는 횟수 — 치유·보조 다섯만 둘이고 나머지는 하나다.
 * 넘겨 담는 것을 **막지는 않는다.** 넘겼다는 것만 눈에 띄게 표시한다.
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
  /** 파티를 지우고 더해도 섞이지 않게 붙이는 번호. 화면의 「N파티」는 목록 순서로 센다. */
  id: number;
  memberIds: string[];
}

/** 세부 탭. 순서가 화면 순서다. */
const VIEWS = [
  { id: "planner", label: "파티 플래너", hint: "보유 캐릭터를 파티에 담기" },
  { id: "order", label: "파티 순서 구성하기", hint: "도는 순서대로 끌어 옮기기" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function MatrixPlannerPage() {
  const ownedVersion = useSyncExternalStore(subscribeOwnedStore, ownedStoreVersion);
  const { cyclePresets, applyCyclePreset } = usePartyConfig();
  const { setTab } = useAppState();
  const [stored, setParties] = usePersistedState<PlannerParty[]>("matrixParties", []);
  const [view, setView] = useState<ViewId>("planner");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  // 끌고 있는 파티와, 지금 그 위에 올라가 있는 파티. 둘 다 화면 표시에만 쓴다.
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c] as const)), []);

  /**
   * 저장된 것을 쓸 수 있는 모양으로 고친다.
   *
   * 속성 세로줄을 쓰던 시절의 파티에는 element가 붙어 있다 — 이제 줄이 없으므로 그냥 버리고
   * 담긴 순서를 그대로 쓴다. 파티가 하나도 없으면 빈 파티 하나를 놓아 바로 채울 수 있게 한다.
   */
  const parties = useMemo(() => {
    const out: PlannerParty[] = [];
    const seen = new Set<number>();

    for (const row of Array.isArray(stored) ? stored : []) {
      if (!row || typeof row !== "object") continue;
      const memberIds = (Array.isArray(row.memberIds) ? row.memberIds : []).filter(
        (id: unknown): id is string => typeof id === "string",
      );
      // id가 없거나 이미 쓴 번호면 새로 뗀다 — 번호가 겹치면 한쪽을 고칠 때 둘 다 바뀐다.
      let id = typeof row.id === "number" ? row.id : 0;
      if (!id || seen.has(id)) id = Math.max(0, ...seen) + 1;
      seen.add(id);
      out.push({ id, memberIds });
    }

    return out.length > 0 ? out : [{ id: 1, memberIds: [] }];
  }, [stored]);

  /** 캐릭터 id -> 앉아 있는 자리들(「1파티」 꼴). 목록에 몇 번 썼는지 적는 근거다. */
  const placedIn = useMemo(() => {
    const map = new Map<string, string[]>();
    parties.forEach((party, index) => {
      for (const id of party.memberIds) {
        map.set(id, [...(map.get(id) ?? []), `${index + 1}파티`]);
      }
    });
    return map;
  }, [parties]);

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
   * 이 파티의 캐릭터들**만으로** 담아 둔 사이클.
   *
   * 사이클은 빈 자리를 빼고 담기므로(currentCycleMembers) 셋을 다 쓰지 않은 사이클도 있다.
   * 그래서 「같은 셋」이 아니라 「이 파티 안에 전부 들어 있는가」로 본다 —
   * 둘만 쓰는 사이클도 그 파티로 돌 수 있는 사이클이 맞다.
   */
  const cyclesFor = (memberIds: string[]): CyclePreset[] => {
    if (memberIds.length === 0) return [];
    const inParty = new Set(memberIds);
    return cyclePresets.filter((preset) => {
      const ids = preset.members.map((m) => m.characterId).filter(Boolean);
      return ids.length > 0 && ids.every((id) => inParty.has(id));
    });
  };

  /** 그 사이클을 계산 탭에 앉히고 그리로 넘어간다. 「연결」을 누르면 곧장 돌려볼 수 있게. */
  const openCycle = (preset: CyclePreset) => {
    applyCyclePreset(preset.id);
    setTab("calculator");
  };

  /** 지금 채우는 파티. 아직 안 골랐거나 지워졌으면 자리가 남은 첫 파티를 쓴다. */
  const active =
    parties.find((p) => p.id === activeId) ??
    parties.find((p) => p.memberIds.length < PARTY_SIZE);

  /**
   * 이 캐릭터를 지금 더 앉힐 수 있는지. 못 앉히는 까닭까지 같이 돌려준다.
   *
   * 겹쳐 쓰는 횟수는 여기서 보지 않는다 — 넘겨 담는 것도 해 볼 수 있어야 해서,
   * 막는 대신 목록에 「N회 사용」으로 적어 둔다. 한 파티 안의 중복만 막는다.
   */
  const blockedReason = (characterId: string): string | null => {
    if (!active) return "채울 파티가 없습니다";
    if (active.memberIds.includes(characterId)) return "이미 이 파티에 있습니다";
    if (active.memberIds.length >= PARTY_SIZE)
      return "채우는 파티가 꽉 찼습니다 — 다른 파티를 고르세요";
    return null;
  };

  /**
   * 캐릭터를 지금 채우는 파티에 앉힌다.
   * 꽉 채운 뒤에는 자리가 남은 다음 파티로 옮겨 준다 — 목록을 계속 누르기만 해도 차게.
   */
  const place = (characterId: string) => {
    if (!active || blockedReason(characterId)) return;

    const next = parties.map((p) =>
      p.id === active.id ? { ...p, memberIds: [...p.memberIds, characterId] } : p,
    );
    setParties(next);

    if (active.memberIds.length + 1 >= PARTY_SIZE) {
      setActiveId(
        next.find((p) => p.id !== active.id && p.memberIds.length < PARTY_SIZE)?.id ?? null,
      );
    }
  };

  const remove = (partyId: number, characterId: string) =>
    setParties(
      parties.map((p) =>
        p.id === partyId ? { ...p, memberIds: p.memberIds.filter((id) => id !== characterId) } : p,
      ),
    );

  /** 맨 뒤에 빈 파티를 하나 더 놓는다. */
  const addParty = () => {
    const id = parties.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    setParties([...parties, { id, memberIds: [] }]);
    setActiveId(id);
  };

  /** 사람이 앉아 있으면 비우고, 이미 빈 파티면 목록에서 치운다. */
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

  /**
   * 끌어다 놓아 순서를 바꾼다. beforeId가 가리키는 파티 **앞**에 끼우고,
   * null이면 맨 뒤로 보낸다. 목록 순서가 곧 도는 순서라 여기서 층 차례가 정해진다.
   */
  const moveParty = (id: number, beforeId: number | null) => {
    if (id === beforeId) return;
    const moving = parties.find((p) => p.id === id);
    if (!moving) return;
    const rest = parties.filter((p) => p.id !== id);
    const at = beforeId === null ? -1 : rest.findIndex((p) => p.id === beforeId);
    setParties(at >= 0 ? [...rest.slice(0, at), moving, ...rest.slice(at)] : [...rest, moving]);
  };

  /** 파티 카드에 붙는 끌기 손잡이 한 벌. 두 세부 탭이 같은 조작을 쓴다. */
  const dragProps = (partyId: number) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(partyId));
      setDragId(partyId);
    },
    onDragEnd: () => {
      setDragId(null);
      setOverId(null);
    },
    onDragOver: (event: DragEvent) => {
      if (dragId === null || dragId === partyId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (overId !== partyId) setOverId(partyId);
    },
    onDragLeave: () => setOverId((cur) => (cur === partyId ? null : cur)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      if (dragId !== null) moveParty(dragId, partyId);
      setDragId(null);
      setOverId(null);
    },
  });

  /** 목록 맨 뒤로 보내는 자리. 카드 사이에 놓을 곳이 없을 때 쓴다. */
  const endDropProps = {
    onDragOver: (event: DragEvent) => {
      if (dragId === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      if (dragId !== null) moveParty(dragId, null);
      setDragId(null);
      setOverId(null);
    },
  };

  const dragClass = (partyId: number, base: string) =>
    [base, dragId === partyId ? "dragging" : "", overId === partyId ? "over" : ""]
      .filter(Boolean)
      .join(" ");

  const placedCount = [...placedIn.values()].reduce((sum, at) => sum + at.length, 0);
  const usedCharacters = placedIn.size;
  /** 겹쳐 쓸 수 있는 횟수를 넘겨 담은 사람 수. 넘겨도 막지 않으므로 세어서 알려만 준다. */
  const overCount = [...placedIn.entries()].filter(
    ([id, at]) => at.length > useLimit(id),
  ).length;

  /** 파티 하나에 딸린 사이클 줄. 두 세부 탭이 같은 모양으로 쓴다. */
  const cycleRow = (party: PlannerParty) => {
    if (party.memberIds.length === 0) return null;
    const found = cyclesFor(party.memberIds);
    if (found.length === 0) {
      return <p className="matrix-cycles none">이 캐릭터들로 담아 둔 사이클이 없습니다</p>;
    }
    return (
      <div className="matrix-cycles">
        {found.map((preset) => (
          <button
            key={preset.id}
            title={`${preset.members.map((m) => m.characterName).join(" · ")} — 누르면 계산 탭에 앉히고 넘어갑니다`}
            onClick={(event) => {
              event.stopPropagation();
              openCycle(preset);
            }}
          >
            ▶ {preset.name}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="matrix-planner">
      <section className="panel matrix-intro">
        <div>
          <small>MATRIX</small>
          <h2>매트릭스</h2>
          <p>
            보유 캐릭터를 파티로 나눠 담고, 도는 순서를 정합니다. 파티는 <b>담은 순서대로</b>{" "}
            서고, 카드를 끌어 옮기면 순서가 바뀝니다.
          </p>
          <p className="matrix-note">
            한 캐릭터를 여러 파티에 넣어도 막지 않습니다 — 몇 번 썼고 어느 파티에 있는지 목록에
            적어 둡니다. 계산 탭 · 파티 관리 탭의 편성과는 따로 놉니다.
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
          <span className={overCount > 0 ? "over" : undefined}>
            <b>{overCount}</b>
            <em>초과</em>
          </span>
        </div>
      </section>

      {/* 세부 탭 — 담는 화면과 순서 정하는 화면을 갈라 둔다. */}
      <nav className="matrix-views">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            className={item.id === view ? "matrix-view on" : "matrix-view"}
            onClick={() => setView(item.id)}
          >
            <b>{item.label}</b>
            <em>{item.hint}</em>
          </button>
        ))}
      </nav>

      {view === "planner" ? (
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
                보유로 표시한 캐릭터가 없습니다. <b>캐릭터 관리</b> 탭 목록에서 줄 오른쪽의 ✓를
                눌러 가지고 있는 캐릭터를 먼저 표시해 주세요.
              </p>
            ) : (
              <div className="pick-grid matrix-pool">
                {shown.map((char) => {
                  const at = placedIn.get(char.id) ?? [];
                  const limit = useLimit(char.id);
                  const blocked = blockedReason(char.id);
                  const over = at.length > limit;

                  return (
                    <button
                      key={char.id}
                      className={at.length > 0 ? "pick-card in" : "pick-card"}
                      disabled={blocked !== null}
                      onClick={() => place(char.id)}
                      title={
                        blocked ??
                        (at.length > 0
                          ? `${at.join(" · ")}에 있습니다 (${at.length}/${limit} 사용)`
                          : `${ELEMENT_NAMES[char.element]} · ${char.weaponType}`)
                      }
                    >
                      {char.iconUrl && <img src={char.iconUrl} alt="" loading="lazy" />}
                      <b>{char.name}</b>
                      <em style={at.length ? undefined : { color: ELEMENT_COLORS[char.element] }}>
                        {at.length ? at.join(" · ") : ELEMENT_NAMES[char.element]}
                      </em>
                      {/* 몇 번 썼는지 — 겹쳐 쓸 수 있는 횟수를 넘기면 붉게 센다. */}
                      {at.length > 0 && (
                        <i
                          className={over ? "over" : undefined}
                          title={
                            over
                              ? `겹쳐 쓸 수 있는 ${limit}회를 넘겼습니다 — ${at.join(" · ")}`
                              : `${at.length}/${limit} 사용 — ${at.join(" · ")}`
                          }
                        >
                          {at.length}회 사용{over ? ` · ${limit}회 초과` : ""}
                        </i>
                      )}
                    </button>
                  );
                })}

                {shown.length === 0 && (
                  <p className="matrix-empty">이름에 맞는 캐릭터가 없습니다.</p>
                )}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>파티 구성</h2>
              <div className="matrix-actions">
                <button onClick={addParty}>+ 파티</button>
                <button onClick={clearAll}>전체 비우기</button>
              </div>
            </div>

            {/* 담은 순서대로 쭉. 좁아지면 한 줄에 서는 카드 수가 줄어든다. */}
            <div className="matrix-list">
              {parties.map((party, index) => (
                <article
                  key={party.id}
                  className={dragClass(
                    party.id,
                    party.id === active?.id ? "matrix-party on" : "matrix-party",
                  )}
                  onClick={() => setActiveId(party.id)}
                  {...dragProps(party.id)}
                >
                  <header>
                    <span className="matrix-grip" title="끌어서 순서를 바꿉니다">
                      ⠿
                    </span>
                    <b>{index + 1}파티</b>
                    <small>
                      {party.memberIds.length}/{PARTY_SIZE}
                    </small>
                    {(party.memberIds.length > 0 || parties.length > 1) && (
                      <button
                        className="matrix-drop"
                        title={
                          party.memberIds.length > 0 ? "이 파티를 비웁니다" : "이 파티를 치웁니다"
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

                  <div className="matrix-slots">
                    {Array.from({ length: PARTY_SIZE }, (_, slot) => {
                      const char = byId.get(party.memberIds[slot] ?? "");
                      if (!char)
                        return <div key={slot} className="matrix-slot empty" aria-hidden="true" />;

                      const used = (placedIn.get(char.id) ?? []).length;
                      const over = used > useLimit(char.id);

                      return (
                        <button
                          key={slot}
                          className="matrix-slot"
                          title={`${char.name} — 누르면 파티에서 빠집니다${
                            used > 1 ? ` (${used}개 파티에 있음)` : ""
                          }`}
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
                          {/* 여러 파티에 든 캐릭터는 몇 번째로 쓰는 것인지 카드에도 적는다. */}
                          {used > 1 && <i className={over ? "over" : undefined}>×{used}</i>}
                        </button>
                      );
                    })}
                  </div>

                  {cycleRow(party)}
                </article>
              ))}

              {/* 맨 뒤로 보내는 자리이자 파티를 더 놓는 자리. */}
              <button className="matrix-add" onClick={addParty} {...endDropProps}>
                + 파티
              </button>
            </div>

            <p className="matrix-hint">
              테두리가 밝은 파티가 <b>지금 채우는 파티</b>입니다. 파티를 눌러 옮기고, 왼쪽
              목록에서 캐릭터를 누르면 그 파티에 들어갑니다. 파티의 캐릭터를 누르면 빠집니다.
              카드를 끌어다 놓으면 <b>순서</b>가 바뀝니다.
            </p>
          </section>
        </div>
      ) : (
        <section className="panel">
          <div className="panel-head">
            <h2>파티 순서 구성하기</h2>
            <div className="matrix-actions">
              <button onClick={addParty}>+ 파티</button>
            </div>
          </div>

          <div className="matrix-order">
            {parties.map((party, index) => (
              <article
                key={party.id}
                className={dragClass(party.id, "matrix-row")}
                {...dragProps(party.id)}
              >
                <span className="matrix-grip" title="끌어서 순서를 바꿉니다">
                  ⠿
                </span>
                <b className="matrix-rank">{index + 1}</b>

                <div className="matrix-row-body">
                  <div className="matrix-row-members">
                    {party.memberIds.length === 0 ? (
                      <em className="matrix-row-empty">비어 있습니다</em>
                    ) : (
                      party.memberIds.map((id) => {
                        const char = byId.get(id);
                        if (!char) return null;
                        const icon = elementIcon(char.element);
                        return (
                          <span key={id} className="matrix-chip">
                            {char.iconUrl && <img src={char.iconUrl} alt="" loading="lazy" />}
                            <b>{char.name}</b>
                            {icon && <img className="matrix-chip-el" src={icon} alt="" />}
                          </span>
                        );
                      })
                    )}
                  </div>

                  {cycleRow(party)}
                </div>

                <button
                  className="matrix-drop"
                  title={party.memberIds.length > 0 ? "이 파티를 비웁니다" : "이 파티를 치웁니다"}
                  onClick={() => dropParty(party.id)}
                >
                  ✕
                </button>
              </article>
            ))}

            <div className="matrix-endzone" {...endDropProps}>
              여기에 놓으면 맨 뒤로 갑니다
            </div>
          </div>

          <p className="matrix-hint">
            위에서부터 도는 순서입니다. 줄을 끌어다 놓아 순서를 바꾸세요. 파티에 캐릭터를 담는
            것은 <b>파티 플래너</b> 쪽에서 합니다. 사이클 이름을 누르면 그 사이클을 계산 탭에
            앉히고 넘어갑니다.
          </p>
        </section>
      )}
    </div>
  );
}
