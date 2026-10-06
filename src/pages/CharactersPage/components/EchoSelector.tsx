import { useMemo, useState } from "react";
import { characters } from "../../../data/sampleData";
import {
  loadEchoPresets,
  loadMyEchoes,
  sameEchoes,
  saveEchoPresets,
} from "../../../data/echoStore";
import { EchoPresetDialog } from "../../../components/EchoPresetDialog";
import type { EchoPreset } from "../../../data/echoStore";
import { echoAbility, echoesById, fetterEffects, fetterGroupByName } from "../../../data/echoes";
import { EchoDetailDialog } from "./EchoDetailDialog";
import { DeleteDialog, Dialog } from "../../../components/Feedback";
import type { DeleteAsk } from "../../../components/Feedback";

interface EchoSelectorProps {
  characterId: string;
  onToggleEcho: (characterId: string, echoId: string) => void;
  /** 목록을 통째로 갈아끼운다. 드래그로 자리를 바꿀 때 쓴다(순서 = 슬롯 순서). */
  onSetEchoes?: (characterId: string, echoIds: number[]) => void;
  /** 새 캐릭터 관리 레이아웃에서는 닫기 개념이 없어 생략한다. */
  onClose?: () => void;
  characterEchoLinks?: Array<{ characterId: string; echoId: number }>;
}

/** 장착 칸 수. 게임과 같이 다섯 자리다. */
const SLOTS = 5;

/** 장착 여부로 거르는 라디오. */
const EQUIP_FILTERS = [
  { id: "all", label: "전체" },
  { id: "on", label: "장착" },
  { id: "off", label: "미장착" },
] as const;

type EquipFilter = (typeof EQUIP_FILTERS)[number]["id"];

export function EchoSelector({
  characterId,
  onToggleEcho,
  onSetEchoes,
  onClose,
  characterEchoLinks = [],
}: EchoSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fetterFilter, setFetterFilter] = useState("");
  const [equipFilter, setEquipFilter] = useState<EquipFilter>("all");
  // 지금 끌고 있는 것. 목록 카드에서 왔는지, 슬롯에서 왔는지 구분한다.
  const [drag, setDrag] = useState<{ pk: number; from: number | null } | null>(null);
  // 드래그가 올라와 있는 슬롯. 테두리를 밝혀 어디에 놓이는지 보여준다.
  const [overSlot, setOverSlot] = useState<number | null>(null);
  // 상세보기 다이얼로그에 띄운 에코의 pk.
  const [detailPk, setDetailPk] = useState<number | null>(null);
  // 다른 캐릭터가 낀 에코를 가져오려 할 때 띄우는 물음. run이 「예」를 눌렀을 때 할 일이다.
  const [takeAsk, setTakeAsk] = useState<{ ownerName: string; run: () => void } | null>(null);
  // 에코 프리셋 — 지금 낀 한 벌을 이름 붙여 담아 두고, 나중에 통째로 다시 끼운다.
  const [presets, setPresets] = useState(loadEchoPresets);
  const commitPresets = (next: EchoPreset[]) => {
    setPresets(next);
    saveEchoPresets(next);
  };
  // 「프리셋 저장」 창에 적는 중인 이름. 창이 닫혀 있으면 null.
  const [presetName, setPresetName] = useState<string | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  // 지울지 묻는 중인 프리셋.
  const [deleteAsk, setDeleteAsk] = useState<DeleteAsk | null>(null);
  const found = characters.find((c) => c.id === characterId);
  const myEchoes = loadMyEchoes() as any[];

  const equippedIds = characterEchoLinks
    .filter((link) => link.characterId === characterId)
    .map((link) => link.echoId);
  const equipped = equippedIds
    .map((id) => myEchoes.find((e) => e.pk === id))
    .filter(Boolean) as any[];

  if (!found) return null;

  // ── 화음 이펙트 ──
  // 장착한 에코가 고른 화음별로 몇 개인지 세고, 2셋 · 5셋이 열렸는지 본다.
  const fetterCounts = new Map<string, number>();
  for (const e of equipped) {
    const name = e.options?.selectedFetter;
    if (name) fetterCounts.set(name, (fetterCounts.get(name) ?? 0) + 1);
  }

  const fetterRows = [...fetterCounts.entries()].map(([name, count]) => ({
    name,
    count,
    group: fetterGroupByName(name),
    // 맞춘 개수에 따라 열리는 단계가 달라진다. 2셋만 열렸는지, 5셋까지 열렸는지.
    effects: fetterEffects(name, count),
  }));

  // 맨 위 슬롯(메인 에코)의 에코 어빌리티. 게임도 메인 슬롯 것만 보여준다.
  const mainEcho = equipped[0];
  const ability = mainEcho ? echoAbility(String(mainEcho.id)) : undefined;

  // ── 목록 ──
  const allFetters = Array.from(
    myEchoes
      .flatMap((e) =>
        e.options?.selectedFetter && e.fetterGroups
          ? e.fetterGroups
              .filter((g: any) => g.name === e.options.selectedFetter)
              .map((g: any) => ({ name: g.name, icon: g.icon }))
          : [],
      )
      .reduce((map: Map<string, any>, f: any) => map.set(f.name, f), new Map())
      .values(),
  ) as { name: string; icon: string }[];

  // 누구든 끼고 있는 에코들. 장착 여부는 이 캐릭터가 아니라 **아무 캐릭터나** 끼고 있는지로 본다.
  const wornPks = new Set(characterEchoLinks.map((link) => link.echoId));

  const filtered = myEchoes.filter((e) => {
    if (!e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (fetterFilter && e.options?.selectedFetter !== fetterFilter) return false;
    if (equipFilter === "on") return wornPks.has(e.pk);
    if (equipFilter === "off") return !wornPks.has(e.pk);
    return true;
  });

  // 에코 하나당 낀 캐릭터는 최대 한 명이다. 카드 왼쪽 위에 그 캐릭터 아이콘을 붙인다.
  const ownerOf = new Map<number, (typeof characters)[number]>();
  for (const link of characterEchoLinks) {
    const owner = characters.find((c) => c.id === link.characterId);
    if (owner) ownerOf.set(link.echoId, owner);
  }

  /** 다른 캐릭터가 끼고 있는 에코인지. */
  const isTaken = (pk: number) => {
    const owner = ownerOf.get(pk);
    return owner !== undefined && owner.id !== characterId;
  };

  // 「전체」·「장착」에서는 이 캐릭터가 낀 에코를 맨 위로 당기고, 다른 캐릭터가 낀 에코를 아래로 민다
  // — 이 캐릭터 것 · 아무도 안 낀 것 · 남이 낀 것 순서다. 「미장착」은 한 갈래뿐이라 그대로 둔다.
  // 그 안에서의 순서는 그대로다(sort는 같은 값끼리 순서를 지킨다).
  const rankOf = (pk: number) => (equippedIds.includes(pk) ? 0 : isTaken(pk) ? 2 : 1);
  const listed =
    equipFilter === "off" ? filtered : [...filtered].sort((a, b) => rankOf(a.pk) - rankOf(b.pk));

  /**
   * 다른 캐릭터가 끼고 있는 에코면 가져올지 먼저 묻고, 아니면 바로 한다.
   * 누르든 슬롯으로 끌든 같은 물음을 거친다.
   */
  const askBeforeTaking = (pk: number, run: () => void) => {
    const owner = ownerOf.get(pk);
    if (owner && owner.id !== characterId) setTakeAsk({ ownerName: owner.name, run });
    else run();
  };

  /** 그 에코가 고른 화음의 아이콘. 카드 왼쪽 아래에 붙인다. */
  const fetterIcon = (e: any) =>
    e.fetterGroups?.find((g: any) => g.name === e.options?.selectedFetter)?.icon ?? null;

  // ── 드래그 앤 드롭 ──
  // 목록 카드를 슬롯에 떨구면 장착, 슬롯끼리 떨구면 자리 교환,
  // 슬롯을 목록 쪽으로 떨구면 해제된다. onSetEchoes가 없으면 드래그를 끈다.
  const canDrag = Boolean(onSetEchoes);

  /** 슬롯 index에 지금 끌고 있는 것을 놓는다. */
  function dropOnSlot(index: number) {
    if (!drag || !onSetEchoes) return;
    const ids = [...equippedIds];
    const at = ids.indexOf(drag.pk);

    if (at !== -1) {
      // 이미 장착 중인 에코 — 자리를 맞바꾼다. 빈 칸으로 끌면 그 끝으로 옮긴다.
      if (index === at) return;
      if (index < ids.length) [ids[index], ids[at]] = [ids[at], ids[index]];
      else {
        ids.splice(at, 1);
        ids.push(drag.pk);
      }
    } else if (index < ids.length) {
      ids[index] = drag.pk; // 차 있는 칸 — 그 자리를 갈아끼운다
    } else if (ids.length < SLOTS) {
      ids.push(drag.pk); // 빈 칸 — 뒤에 붙인다
    } else {
      return; // 다 찼는데 빈 칸에 놓으려는 경우
    }

    askBeforeTaking(drag.pk, () => onSetEchoes(characterId, ids));
  }

  /** 슬롯에서 끌어낸 것을 목록 위에 떨구면 해제. */
  function dropOnList() {
    if (!drag || drag.from === null || !onSetEchoes) return;
    onSetEchoes(
      characterId,
      equippedIds.filter((id) => id !== drag.pk),
    );
  }

  // ── 프리셋 ──
  const defaultPresetName = `${found.name} 프리셋`;

  /** 지금 낀 한 벌을 그 이름으로 담는다. 같은 이름이 있으면 그 프리셋을 갈아 쓴다. */
  const savePreset = () => {
    const name = (presetName ?? "").trim() || defaultPresetName;
    const same = presets.find((p) => p.name === name);
    commitPresets(
      same
        ? presets.map((p) => (p === same ? { ...p, echoIds: equippedIds } : p))
        : [...presets, { id: crypto.randomUUID(), name, echoIds: equippedIds }],
    );
    setPresetName(null);
  };

  /** 프리셋에 담긴 에코들 — 그 뒤에 지운 에코는 빠진다. */
  const presetEchoes = (preset: EchoPreset) =>
    preset.echoIds.map((pk) => myEchoes.find((e) => e.pk === pk)).filter(Boolean) as any[];

  /** 프리셋 한 벌을 이 캐릭터에 끼운다. 다른 캐릭터가 낀 에코가 섞여 있으면 가져올지 먼저 묻는다. */
  const applyPreset = (preset: EchoPreset) => {
    if (!onSetEchoes) return;
    const ids = presetEchoes(preset).map((e) => e.pk as number);
    const run = () => {
      onSetEchoes(characterId, ids);
      setPresetOpen(false);
    };
    const owners = [...new Set(ids.filter(isTaken).map((pk) => ownerOf.get(pk)!.name))];
    if (owners.length > 0) setTakeAsk({ ownerName: owners.join(" · "), run });
    else run();
  };

  /** 줄 · 슬롯이 버튼이라 안에 버튼을 못 넣는다 — span에 버튼 역할을 준다. */
  const detailButton = (pk: number) => (
    <span
      role="button"
      tabIndex={0}
      className="echo-detail-btn"
      title="상세보기"
      draggable={false}
      onClick={(event) => {
        event.stopPropagation();
        setDetailPk(pk);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          setDetailPk(pk);
        }
      }}
    >
      상세
    </span>
  );

  const detailEcho = detailPk !== null ? myEchoes.find((e) => e.pk === detailPk) : undefined;
  const detailLink = characterEchoLinks.find((link) => link.echoId === detailPk);
  const detailSlot = detailLink
    ? characterEchoLinks
        .filter((link) => link.characterId === detailLink.characterId)
        .findIndex((link) => link.echoId === detailPk)
    : undefined;

  const endDrag = () => {
    setDrag(null);
    setOverSlot(null);
  };

  return (
    <section className="panel">
      <div className="row">
        <div>
          <h2>에코 설정</h2>
        </div>
        {onClose && <button onClick={onClose}>닫기</button>}
      </div>

      <div className="echo-layout">
        {/* ── 왼쪽: 스탯 · 화음 이펙트 ── */}
        <div className="echo-info">
          {/* 목록에서 고르기. 게임의 「교체」 자리 — 스탯 대신 여기에 둔다. */}
          <div className="echo-picker-head">
            <input
              type="text"
              className="weapon-search"
              placeholder="에코 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="echo-filters">
              {EQUIP_FILTERS.map((item) => (
                <button
                  key={item.id}
                  className={item.id === equipFilter ? "on" : ""}
                  onClick={() => setEquipFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="echo-filters">
              <button className={fetterFilter === "" ? "on" : ""} onClick={() => setFetterFilter("")}>
                전체 화음
              </button>
              {allFetters.map((f) => (
                <button
                  key={f.name}
                  className={fetterFilter === f.name ? "on" : ""}
                  onClick={() => setFetterFilter(f.name)}
                >
                  {f.icon && <img src={f.icon} alt="" loading="lazy" />}
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* 줄 구성은 에코 관리 탭 목록과 같다 —
              아이콘 · 화음 · 이름과 메인 옵션 · 부옵션 5줄 · 장착 표시. */}
          <div
            className="echo-list"
            onDragOver={(event) => {
              if (drag?.from !== null && drag) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              dropOnList();
              endDrag();
            }}
          >
            {listed.map((e: any) => {
              const on = equippedIds.includes(e.pk);
              const icon = fetterIcon(e);
              const owner = ownerOf.get(e.pk);
              const taken = isTaken(e.pk);

              return (
                <button
                  key={e.pk}
                  className={[
                    "echo-row",
                    on ? "on" : "",
                    taken ? "taken" : "",
                    drag?.pk === e.pk ? "dragging" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    const run = () => onToggleEcho(characterId, String(e.pk));
                    // 다섯 칸이 다 찼으면 눌러도 들어갈 자리가 없다 — 가져올지 묻고 나서
                    // 아무 일도 안 일어나면 안 되므로 묻지 않는다(슬롯으로 끌어 갈아 끼우는 것은 된다).
                    if (!on && equippedIds.length >= SLOTS) run();
                    else askBeforeTaking(e.pk, run);
                  }}
                  title={
                    taken
                      ? equippedIds.length >= SLOTS
                        ? `${owner!.name} 사용 중 — 칸이 다 차서 누르는 것으로는 못 가져옵니다(슬롯으로 끌어다 놓으세요)`
                        : `${owner!.name} 사용 중 — 누르면 가져올지 묻습니다`
                      : e.name
                  }
                  draggable={canDrag}
                  onDragStart={() => setDrag({ pk: e.pk, from: null })}
                  onDragEnd={endDrag}
                >
                  {/* 왼쪽 — 에코 그림과 그 아래 화음 세트. */}
                  <span className="echo-row-left">
                    <span className="echo-row-icon">
                      {e.iconUrl && <img src={e.iconUrl} alt="" loading="lazy" />}
                    </span>
                    <span className="echo-row-fetter">
                      {icon && <img src={icon} alt="" loading="lazy" />}
                      <b>{e.options?.selectedFetter || "화음 없음"}</b>
                    </span>
                  </span>

                  {/* 오른쪽 — 이름 · 주옵션 · 메인 서브 옵션 · 부옵션을 세로로 쭉. */}
                  <span className="echo-row-right">
                    <strong className="echo-row-name">{e.name}</strong>

                    {e.options?.mainOption?.type && (
                      <em className="echo-row-main">
                        <span>{e.options.mainOption.type}</span>
                        <b>{e.options.mainOption.value}</b>
                      </em>
                    )}
                    {e.options?.mainSubOption?.type && (
                      <em className="echo-row-mainsub">
                        <span>{e.options.mainSubOption.type}</span>
                        <b>{e.options.mainSubOption.value}</b>
                      </em>
                    )}

                    <span className="echo-row-subs">
                      {(e.options?.mainSelects ?? []).map((opt: string, index: number) =>
                        opt ? (
                          <span key={index}>
                            <span>{opt}</span>
                            <b>{e.options?.subSelects?.[index]}</b>
                          </span>
                        ) : null,
                      )}
                    </span>
                  </span>

                  <span className="echo-row-state">
                    {owner && (
                      <i
                        className={owner.id === characterId ? "echo-row-owner self" : "echo-row-owner"}
                        title={`${owner.name} 장착 중`}
                      >
                        {owner.iconUrl ? (
                          <img src={owner.iconUrl} alt="" loading="lazy" />
                        ) : (
                          owner.name[0]
                        )}
                      </i>
                    )}
                    {on && <i className="echo-row-check">✓</i>}
                  </span>
                </button>
              );
            })}

            {filtered.length === 0 && <p className="echo-note">조건에 맞는 에코가 없습니다.</p>}
          </div>

          <small className="echo-note">
            최대 {SLOTS}개까지 장착됩니다. 눌러서 장착·해제하거나, 카드를 오른쪽 슬롯으로 끌어다
            놓으면 됩니다. 슬롯끼리 끌면 자리가 바뀌고(첫 칸이 메인 에코), 슬롯을 이 목록으로 끌면
            해제됩니다. 에코는 하나씩뿐이라 두 캐릭터가 같이 낄 수 없습니다.
          </small>

          <h4 className="echo-heading">에코 어빌리티</h4>
          {ability ? (
            <div className="echo-ability">
              <b>
                {mainEcho.iconUrl && <img src={mainEcho.iconUrl} alt="" loading="lazy" />}
                {mainEcho.name}
                {ability.cooldown ? <em>쿨타임 {ability.cooldown}초</em> : null}
              </b>
              <p>{ability.skill}</p>
            </div>
          ) : (
            <p className="echo-note">
              {mainEcho ? "이 에코의 어빌리티 데이터가 없습니다." : "장착한 에코가 없습니다."}
            </p>
          )}

          <h4 className="echo-heading">화음 이펙트</h4>
          {fetterRows.length === 0 ? (
            <p className="echo-note">장착한 에코가 없습니다.</p>
          ) : (
            <ul className="echo-fetters">
              {fetterRows.map(({ name, count, group, effects }) =>
                effects.map((effect) => (
                  <li key={`${name}-${effect.key}`} className={effect.on ? "on" : ""}>
                    <span className="echo-check">{effect.on ? "✓" : "·"}</span>
                    <span>
                      <b>
                        {group?.icon && <img src={group.icon} alt="" loading="lazy" />}
                        {name}
                        <em>
                          ({Math.min(count, effect.key)}/{effect.key})
                        </em>
                      </b>
                      <small>{effect.description}</small>
                    </span>
                  </li>
                )),
              )}
            </ul>
          )}
          <p className="echo-note">
            에코 어빌리티와 화음 효과는 표시 전용입니다. 계산에는 에코 옵션(메인·부옵션)만
            들어갑니다.
          </p>
        </div>

        {/* ── 오른쪽: 장착 슬롯 다섯 자리 ── */}
        <div className="echo-slots">
          <div className="echo-cost">
            <small>ECHO</small>
            <b>
              {equipped.length}
              <em>/{SLOTS}</em>
            </b>
          </div>

          {Array.from({ length: SLOTS }, (_, index) => {
            const e = equipped[index];
            const dropProps = {
              onDragOver: (event: React.DragEvent) => {
                if (!drag) return;
                event.preventDefault();
                setOverSlot(index);
              },
              onDragLeave: () => setOverSlot((cur) => (cur === index ? null : cur)),
              onDrop: (event: React.DragEvent) => {
                event.preventDefault();
                dropOnSlot(index);
                endDrag();
              },
            };
            const over = overSlot === index ? " over" : "";

            if (!e) {
              return (
                <span className={`echo-slot empty${over}`} key={`empty-${index}`} {...dropProps}>
                  <em>+</em>
                </span>
              );
            }

            const entry = echoesById.get(String(e.id));
            const icon = fetterIcon(e);

            return (
              <button
                className={`echo-slot${over}${drag?.pk === e.pk ? " dragging" : ""}`}
                key={e.pk}
                onClick={() => onToggleEcho(characterId, String(e.pk))}
                title={`${e.name} — 눌러서 해제, 끌어서 자리 이동`}
                draggable={canDrag}
                onDragStart={() => setDrag({ pk: e.pk, from: index })}
                onDragEnd={endDrag}
                {...dropProps}
              >
                <img src={e.iconUrl} alt="" loading="lazy" />
                {entry && <i className="echo-slot-rarity">{entry.rarity + 1}</i>}
                <span className="echo-slot-foot">
                  {icon && <img src={icon} alt="" loading="lazy" />}
                  {e.options?.mainOption?.value ?? ""}
                </span>
              </button>
            );
          })}

          {/* 프리셋 — 지금 낀 한 벌을 담아 두거나, 담아 둔 한 벌을 통째로 끼운다. */}
          {onSetEchoes && (
            <div className="echo-preset-buttons">
              <button
                disabled={equipped.length === 0}
                title={
                  equipped.length === 0
                    ? "장착한 에코가 없습니다"
                    : "지금 장착한 에코 한 벌을 프리셋으로 담아 둡니다"
                }
                onClick={() => setPresetName("")}
              >
                프리셋 저장
              </button>
              <button
                title="담아 둔 프리셋을 이 캐릭터에 끼웁니다"
                onClick={() => setPresetOpen(true)}
              >
                프리셋 불러오기{presets.length > 0 ? ` (${presets.length})` : ""}
              </button>
            </div>
          )}
        </div>
      </div>

      {presetName !== null && (
        <div className="dialog-backdrop" onClick={() => setPresetName(null)} role="presentation">
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>에코 프리셋 저장</h3>
            <label className="party-form-field">
              <b>
                프리셋 이름<em>지금 장착한 에코 {equipped.length}개를 담습니다</em>
              </b>
              <input
                type="text"
                autoFocus
                placeholder={defaultPresetName}
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") savePreset();
                  if (event.key === "Escape") setPresetName(null);
                }}
              />
            </label>
            {presets.some((p) => p.name === (presetName.trim() || defaultPresetName)) && (
              <p className="echo-note">같은 이름의 프리셋이 있습니다 — 저장하면 그 프리셋을 덮어씁니다.</p>
            )}
            <div className="dialog-buttons">
              <button className="primary" onClick={savePreset}>
                저장
              </button>
              <button onClick={() => setPresetName(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {presetOpen && (
        <EchoPresetDialog
          characterName={found.name}
          presets={presets}
          activeId={presets.find((p) => sameEchoes(p.echoIds, equippedIds))?.id}
          onApply={applyPreset}
          onDelete={(preset) =>
            setDeleteAsk({
              title: "프리셋 삭제",
              lines: [
                `「${preset.name}」 프리셋을 지웁니다.`,
                "에코 자체와 지금 장착 상태는 그대로 남습니다.",
              ],
              run: () => commitPresets(presets.filter((p) => p.id !== preset.id)),
            })
          }
          onClose={() => setPresetOpen(false)}
        />
      )}

      {deleteAsk && <DeleteDialog ask={deleteAsk} onClose={() => setDeleteAsk(null)} />}

      {takeAsk && (
        <Dialog
          title="에코 가져오기"
          // 이름 끝 글자에 받침이 있으면 「이」, 없으면 「가」(치사가 · 기염이).
          lines={[
            `${takeAsk.ownerName}${
              /[가-힣]$/.test(takeAsk.ownerName) &&
              (takeAsk.ownerName.charCodeAt(takeAsk.ownerName.length - 1) - 0xac00) % 28 !== 0
                ? "이"
                : "가"
            } 사용중입니다. 가져오시겠습니까?`,
          ]}
          buttons={[
            {
              label: "가져오기",
              primary: true,
              onClick: () => {
                takeAsk.run();
                setTakeAsk(null);
              },
            },
            { label: "취소", onClick: () => setTakeAsk(null) },
          ]}
          onDismiss={() => setTakeAsk(null)}
        />
      )}

      {detailEcho && (
        <EchoDetailDialog
          echo={detailEcho}
          ownerId={detailLink?.characterId}
          slotIndex={detailSlot}
          onClose={() => setDetailPk(null)}
        />
      )}

    </section>
  );
}
