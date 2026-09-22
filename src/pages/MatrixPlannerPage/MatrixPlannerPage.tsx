import { useMemo, useState, useSyncExternalStore } from "react";
import { PartyPresetSection } from "../CalculatorPage/components/PartyPresetSection";
import { ElementFilter } from "../../components/ElementFilter";
import type { DragEvent } from "react";
import { characters } from "../../data/sampleData";
import { ELEMENT_COLORS, ELEMENT_NAMES, elementIcon } from "../../data/elements";
import { isOwnedCharacter, ownedStoreVersion, subscribeOwnedStore } from "../../data/ownedStore";
import { PARTY_SLOTS, resPresetOf, usePartyConfig } from "../../context/PartyConfigContext";
import { computeResults } from "../CalculatorPage/hooks/useCalculationResults";
import { useAppState } from "../../context/AppStateContext";
import { usePersistedState } from "../../utils/usePersistedState";
import type { CyclePreset } from "../../data/cyclePresets";
import type { Character, Element, PartyConfig } from "../../types/game";
import {
  MATRIX_BUFFS,
  MATRIX_MONSTERS,
  MATRIX_ROLE_BOOSTS,
  MATRIX_ROUND_COUNT,
  MATRIX_SEASON,
  matrixHpKey,
} from "../../data/matrixSeason";
import { triggersFor } from "../../data/attackTriggers";
import type { MatrixBuff, MatrixMonster, MatrixRoleBoost } from "../../data/matrixSeason";
import { isMainDps, tagsOf } from "../../data/characterTags";
import { baseCharacterId } from "../../data/modeVariants";
import { isRentalCharacter, rentalStoreVersion, subscribeRentalStore } from "../../data/rentalStore";
import { adviseFor } from "../../data/partyAdvice";
import type { AdviceRow } from "../../data/partyAdvice";

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
 * 한 캐릭터는 정해진 횟수만큼만 담을 수 있다(USE_LIMIT · EXTRA_STAMINA). 다 쓰면 목록에서
 * 눌리지 않고 맨 아래로 내려가며, 어느 파티에 있는지는 카드에 그대로 적어 둔다.
 *
 * 계산 탭 · 파티 관리 탭의 편성과는 **따로 논다.** 저장소도 따로고(matrixParties),
 * 여기서 자리를 옮겨도 계산 중인 파티는 그대로다.
 */

/** 한 파티에 앉는 캐릭터 수. 명조는 셋이다. */
const PARTY_SIZE = 3;

/** 보유 목록을 세우는 속성 순서. 게임 속성 표기 순서를 따른다. */
const ELEMENT_ORDER: Element[] = ["Glacio", "Fusion", "Electro", "Aero", "Spectro", "Havoc"];

/**
 * 콘텐츠 규칙상 겹쳐 쓸 수 있는 횟수 — 치유·보조만 둘이고 나머지는 하나다.
 * **넘겨 담을 수 없다.** 다 쓴 캐릭터는 목록에서 눌리지 않고 맨 아래로 내려간다.
 */
const USE_LIMIT: Record<string, number> = {
  shorekeeper: 2, // 파수인
  verina: 2, // 벨리나
  baizhi: 2, // 설지
  bochi: 2, // 복링
  monie: 2, // 모니에
  shushu: 2, // 수수
};

/**
 * 「추가 피로도」로 한 번 더 나갈 수 있는 캐릭터 — 이번 시즌 강화다
 * (dpmatrix API의 `Roles[].EnhanceSkillDesc`, 데니아 「캐릭터가 추가 피로도를 보유한다」).
 * 피해가 오르는 강화(MATRIX_ROLE_BOOSTS)와 달리 **쓸 수 있는 횟수**만 늘려 주므로 여기서 본다.
 */
const EXTRA_STAMINA: Record<string, string> = {
  denia: "추가 피로도(S2 2단계 한정)",
};

/**
 * **게임에서 한 명**인 캐릭터를 하나로 묶는 열쇠. 횟수를 세는 단위가 이것이다.
 *
 *   모드로 갈린 캐릭터  데니아 · 불꽃 / 데니아 · 조화 밀집 → 한 명(baseCharacterId)
 *   방랑자              기류 · 인멸 · 회절 · 전도 → **한 명**. 속성을 갈아 끼우는 것이지
 *                       네 명이 아니다. 한 속성을 쓰면 나머지 방랑자는 못 쓴다.
 */
const personId = (characterId: string): string =>
  characterId.startsWith("rover-") ? "rover" : baseCharacterId(characterId);

/**
 * 이 캐릭터를 몇 번까지 담을 수 있는지. 갈래가 여럿이어도 한 명으로 묶어 센다(personId) —
 * 데니아 · 불꽃과 데니아 · 조화 밀집이 각각 한 번씩이 아니다.
 */
const useLimit = (characterId: string): number => {
  const base = personId(characterId);
  return (USE_LIMIT[base] ?? 1) + (EXTRA_STAMINA[base] ? 1 : 0);
};

/** 툴팁 줄바꿈. title 속성은 줄바꿈 문자를 그대로 쓴다. */
const LF = String.fromCharCode(10);

/** 추천 등급별 꼬리표. 색은 styles.css의 .pool-tier-* 가 맡는다. */
const TIER_LABEL: Record<AdviceRow["tier"], string> = {
  best: "최선책",
  good: "차선책",
  ok: "참고",
};

/**
 * 보유 목록의 카드 하나. 「메인 딜러」와 「나머지」 두 구역이 같이 쓴다.
 *
 * advice가 있으면 추천 등급 · 버프 개수 · 대략적인 피해 증가를 함께 적는다.
 * basis/onBasis는 메인 딜러 칸에만 넘긴다 — 담지 않고 추천 기준만 바꾸는 ★ 단추다.
 */
function PoolCard({
  char,
  at,
  blocked,
  onPlace,
  basis,
  onBasis,
}: {
  char: Character;
  at: string[];
  blocked: string | null;
  onPlace: () => void;
  basis?: boolean;
  onBasis?: () => void;
}) {
  const limit = useLimit(char.id);
  // 겹쳐 쓸 수 있는 횟수가 남아 있으면 아직 「다 쓴 것」이 아니다 — 흐리게 하지 않는다.
  // (수수 · 파수인처럼 두 번 쓸 수 있는 캐릭터가 한 번 담겼다고 꺼져 보이면 안 된다)
  const spent = at.length >= limit;
  const tags = tagsOf(char.id);

  return (
    <div className="pool-card-wrap">
      <button
        className={spent ? "pick-card in" : "pick-card"}
        disabled={blocked !== null}
        onClick={onPlace}
        title={
          blocked ??
          (at.length > 0
            ? `${at.join(" · ")}에 있습니다 (${at.length}/${limit} 사용)`
            : [`${ELEMENT_NAMES[char.element]} · ${char.weaponType}`, tags.join(" · ")]
                .filter(Boolean)
                .join(" — "))
        }
      >
        {char.iconUrl && <img src={char.iconUrl} alt="" loading="lazy" />}
        <b>{char.name}</b>
        <em style={at.length ? undefined : { color: ELEMENT_COLORS[char.element] }}>
          {at.length ? (
            at.join(" · ")
          ) : (
            <>
              {elementIcon(char.element) && (
                <img className="pick-card-el" src={elementIcon(char.element)} alt="" />
              )}
              {ELEMENT_NAMES[char.element]}
            </>
          )}
        </em>
        {at.length > 0 && (
          <i
            className={spent ? "over" : undefined}
            title={`${at.length}/${limit} 사용 — ${at.join(" · ")}`}
          >
            {at.length}/{limit}회{spent ? " 다 씀" : ""}
          </i>
        )}
      </button>

      {/* 담지 않고 추천 기준만 바꾸는 단추. 메인 딜러 칸에만 나온다. */}
      {onBasis && (
        <button
          className={basis ? "pool-basis on" : "pool-basis"}
          title={basis ? "추천 기준입니다 — 누르면 해제" : "이 딜러를 추천 기준으로 삼습니다"}
          onClick={onBasis}
        >
          ★
        </button>
      )}

    </div>
  );
}

/** 버프가 붙는 자리 이름 — 꼬리표에 짧게 적는다. */
const TARGET_SHORT: Record<string, string> = {
  atkPercent: "공격력",
  damageBonus: "피해",
  boost: "부스트",
  totalDamage: "최종",
  damageTaken: "받는피해",
  critRate: "크리",
  critDamage: "크리피해",
  defIgnore: "방무",
  defReduction: "방깎",
  resPen: "저항무시",
  resReduction: "저항감소",
  energyRegen: "공명효율",
  syncAmplify: "증폭",
};

/**
 * 추천 순으로 세울 때 쓰는 **가로로 긴** 카드.
 *
 * 격자 카드는 「버프 6」처럼 개수만 적을 수밖에 없었다 — 어느 버프인지가 정작 고르는 기준인데
 * 그게 안 보였다. 한 줄을 통째로 쓰고 걸리는 버프를 이름과 수치까지 전부 늘어놓는다.
 */
function AdviceCard({
  char,
  at,
  blocked,
  onPlace,
  advice,
}: {
  char: Character;
  at: string[];
  blocked: string | null;
  onPlace: () => void;
  advice?: AdviceRow;
}) {
  const limit = useLimit(char.id);
  // 위 PoolCard와 같은 규칙 — 횟수가 남았으면 흐리게 하지 않는다.
  const spent = at.length >= limit;

  return (
    <button
      className={`advice-card${advice ? ` pool-tier-${advice.tier}` : ""}${spent ? " in" : ""}`}
      disabled={blocked !== null}
      onClick={onPlace}
      title={
        blocked ??
        [
          `대략 +${((advice?.gain ?? 0) * 100).toFixed(0)}% — 이 캐릭터의 파티 버프를 전부 최대로 받았을 때의 어림값입니다.`,
          "사이클도 장비도 없는 자리라 크리티컬 확률 70%를 가정하고 셉니다. 정확한 값은 사이클을 짜고 계산 탭에서 보세요.",
          "",
          ...(advice?.reasons ?? []),
        ].join(LF)
      }
    >
      {char.iconUrl && <img className="advice-face" src={char.iconUrl} alt="" loading="lazy" />}

      <span className="advice-who">
        <b>{char.name}</b>
        <em style={{ color: ELEMENT_COLORS[char.element] }}>
          {elementIcon(char.element) && (
            <img className="advice-el" src={elementIcon(char.element)} alt="" />
          )}
          {ELEMENT_NAMES[char.element]}
        </em>
        {at.length > 0 && (
          <i className={spent ? "over" : undefined} title={`${at.length}/${limit} 사용`}>
            {at.join(" · ")}
          </i>
        )}
      </span>

      {advice && (
        <span className="advice-mark">
          <span className="pool-tier">{TIER_LABEL[advice.tier]}</span>
          <span className="pool-gain">
            {advice.gain > 0 ? `+${(advice.gain * 100).toFixed(0)}%` : "—"}
          </span>
        </span>
      )}

      {/* 걸리는 버프를 전부 — 큰 것부터. 좁아지면 다음 줄로 흐른다. */}
      <span className="advice-buffs">
        {/* 조건이 안 서서 뺀 줄 — 왜 못 쓰는지 그 자리에 적는다. */}
        {advice?.skipped.map((sk, i) => (
          <span key={`x${i}`} className="advice-buff unmet" title={`${sk.label} — ${sk.why}`}>
            <u>조건 안 섬</u>
            {sk.label}
          </span>
        ))}
        {advice?.buffs.length ? (
          advice.buffs.map((b, i) => (
            <span
              key={i}
              className={b.switchBound ? "advice-buff switch" : "advice-buff"}
              title={b.switchBound ? `${b.label} — 교체하면 사라집니다` : b.label}
            >
              {b.switchBound && <u>교체 시 해제</u>}
              {b.label}
              <b>
                +{(b.amount * 100).toFixed(0)}%
                {TARGET_SHORT[b.target] ? ` ${TARGET_SHORT[b.target]}` : ""}
              </b>
            </span>
          ))
        ) : (
          <span className="advice-none">이 딜러에게 걸리는 파티 버프가 없습니다</span>
        )}
      </span>
    </button>
  );
}

interface PlannerParty {
  /** 파티를 지우고 더해도 섞이지 않게 붙이는 번호. 화면의 「N파티」는 목록 순서로 센다. */
  id: number;
  memberIds: string[];
}

/** 세부 탭. 순서가 화면 순서다. */
const VIEWS = [
  { id: "planner", label: "파티 플래너", hint: "보유 캐릭터를 파티에 담기" },
  { id: "order", label: "매트릭스 시뮬레이터", hint: "순서대로 돌려 체력을 깎아 보기" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function MatrixPlannerPage() {
  const ownedVersion = useSyncExternalStore(subscribeOwnedStore, ownedStoreVersion);
  // 대여로 둔 캐릭터는 파티 줄에 그렇게 적는다 — 내 세팅이 아니라 대여 빌드로 점수가 난다.
  const rentalVersion = useSyncExternalStore(subscribeRentalStore, rentalStoreVersion);
  void rentalVersion;
  const { cyclePresets, applyCyclePreset, characterChains, characterModes } = usePartyConfig();
  const { setTab } = useAppState();
  const [stored, setParties] = usePersistedState<PlannerParty[]>("matrixParties", []);
  const [view, setView] = useState<ViewId>("planner");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  // 보유 목록을 속성으로 거른다. null이면 전체.
  const [elementFilter, setElementFilter] = useState<Element | null>(null);
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

  /**
   * 캐릭터(한 명) -> 앉아 있는 자리들(「1파티」 꼴). 목록에 몇 번 썼는지 적는 근거다.
   * 모드로 갈린 캐릭터와 방랑자는 게임에서 한 명이라 **묶어서** 센다(personId).
   */
  const placedIn = useMemo(() => {
    const map = new Map<string, string[]>();
    parties.forEach((party, index) => {
      for (const id of party.memberIds) {
        const base = personId(id);
        map.set(base, [...(map.get(base) ?? []), `${index + 1}파티`]);
      }
    });
    return map;
  }, [parties]);

  /** 그 캐릭터가 지금 앉아 있는 자리들. */
  const usedAt = (characterId: string): string[] =>
    placedIn.get(personId(characterId)) ?? [];

  /** 쓸 수 있는 횟수를 다 썼는지. 더 담을 수 없고 목록에서도 맨 아래로 내려간다. */
  const isSpent = (characterId: string): boolean =>
    usedAt(characterId).length >= useLimit(characterId);

  /**
   * 한 명이 담긴 갈래들(모드 · 방랑자 속성). 목록에서 나머지 갈래를 감출 때 본다.
   *
   * 감추는 때는 **횟수를 다 썼을 때뿐이다.** 한 갈래를 담았다고 바로 감추면, 두 번 쓸 수 있는
   * 캐릭터의 남은 한 번을 다른 갈래로 쓰지 못한다 — 데니아는 「추가 피로도」로 두 번 나가므로
   * 조화 밀집으로 한 번 담고도 불꽃으로 한 번 더 담을 수 있어야 한다.
   * 다 쓰고 나면 담기지 않은 갈래는 목록에서 빠지고, 담은 갈래만 「N/N회 다 씀」으로 남는다.
   */
  const placedForms = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const party of parties) {
      for (const id of party.memberIds) {
        const key = personId(id);
        map.set(key, (map.get(key) ?? new Set()).add(id));
      }
    }
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
      (!elementFilter || c.element === elementFilter) &&
      (!needle ||
        c.name.toLowerCase().includes(needle) ||
        ELEMENT_NAMES[c.element].includes(needle)) &&
      // 횟수를 다 쓴 뒤에는 담아 둔 갈래만 남긴다(모드 · 방랑자 속성).
      (!isSpent(c.id) || (placedForms.get(personId(c.id))?.has(c.id) ?? false)),
  );

  /** 지금 채우는 파티. 아직 안 골랐거나 지워졌으면 자리가 남은 첫 파티를 쓴다. */
  const active =
    parties.find((p) => p.id === activeId) ??
    parties.find((p) => p.memberIds.length < PARTY_SIZE);

  /**
   * 손으로 못 박아 둔 추천 기준. 비어 있으면 **지금 채우는 파티의 1번 자리**를 기준으로 삼는다.
   * 예전에는 이 값만 봤는데, 그러면 파티를 옮기거나 태그가 「메인 딜러」가 아닌 캐릭터를
   * 1번에 넣었을 때 기준이 안 잡혀 추천이 통째로 사라졌다.
   */
  const [pinnedMain, setPinnedMain] = useState<string | null>(null);

  /**
   * 추천 기준. 손으로 못 박은 것이 먼저고, 없으면 지금 채우는 파티의 1번 자리다.
   * 테두리가 밝은 파티가 곧 기준이 되므로 파티를 옮기면 추천도 따라 바뀐다.
   */
  const mainPick = pinnedMain ?? active?.memberIds[0] ?? null;

  /** 목록을 「메인 딜러」와 「나머지」로 가른다 — 태그가 붙인 구분을 그대로 쓴다.
   *  기준으로 잡힌 캐릭터는 태그와 상관없이 왼쪽(메인 딜러) 칸에 세운다. */
  //  다 쓴 캐릭터는 맨 아래로 민다 — 남은 횟수가 있는 쪽이 늘 위에 선다(sort는 안정 정렬이라
  //  같은 처지끼리는 속성 순서가 그대로 남는다).
  const mains = shown
    .filter((c) => isMainDps(c.id) || c.id === mainPick)
    .sort((a, b) => Number(isSpent(a.id)) - Number(isSpent(b.id)));

  /** 두 칸 제목 옆의 설명. 한 줄로 잘리므로 title에도 같은 말을 단다. */
  const mainHeadNote = mainPick
    ? `${byId.get(mainPick)?.name} 기준 — ${pinnedMain ? "★로 고정" : "지금 채우는 파티의 1번 자리"}`
    : "파티 1번 자리를 채우거나 ★를 누르면 같이 세울 캐릭터를 추천합니다";
  const restHeadNote = mainPick
    ? "추천 순 — 초록이 최선책, 노랑이 차선책입니다. 숫자는 버프를 전부 받았을 때의 어림값"
    : "속성 순";
  const others = shown.filter((c) => !isMainDps(c.id) && c.id !== mainPick);

  /**
   * 나머지 칸. 기준 딜러가 있으면 추천 순으로 다시 세우고, 없으면 속성 순 그대로다.
   * 점수는 태그와 그 캐릭터의 파티 버프를 함께 본다(data/partyAdvice.ts).
   */
  const rest = useMemo(() => {
    //  추천 순이든 속성 순이든 다 쓴 캐릭터는 맨 아래다.
    const spentLast = (a: string, b: string) => Number(isSpent(a)) - Number(isSpent(b));
    if (!mainPick)
      return others
        .map((char) => ({ char, advice: undefined }))
        .sort((a, b) => spentLast(a.char.id, b.char.id));
    // 체인 · 모드를 같이 넘긴다 — 보유하지 않은 체인의 버프가 세어지면 안 된다.
    const table = new Map(
      adviseFor(
        mainPick,
        others.map((c) => c.id),
        characterChains,
        characterModes,
      ).map((r) => [r.character.id, r]),
    );
    return others
      .map((char) => ({ char, advice: table.get(char.id) }))
      .sort(
        (a, b) =>
          spentLast(a.char.id, b.char.id) ||
          (b.advice?.score ?? -1) - (a.advice?.score ?? -1),
      );
    // others는 shown에서 나온 파생값이라 needle · ownedVersion이 바뀔 때 같이 바뀐다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainPick, needle, elementFilter, ownedVersion, characterChains, characterModes, parties]);

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

  /**
   * 이 캐릭터를 지금 더 앉힐 수 있는지. 못 앉히는 까닭까지 같이 돌려준다.
   *
   * 쓸 수 있는 횟수를 **넘겨 담을 수 없다.** 한 번씩이 규칙이고, 치유 · 보조 몇몇만 두 번이며
   * (USE_LIMIT), 「추가 피로도」가 붙은 캐릭터는 거기에 한 번이 더 붙는다(EXTRA_STAMINA).
   * 모드로 갈린 캐릭터는 원래 한 명이라 모드를 바꿔 담는 것으로 횟수를 늘릴 수 없다.
   */
  const blockedReason = (characterId: string): string | null => {
    if (!active) return "채울 파티가 없습니다";
    const base = personId(characterId);
    if (active.memberIds.some((id) => personId(id) === base))
      return "이미 이 파티에 있습니다";
    if (active.memberIds.length >= PARTY_SIZE)
      return "채우는 파티가 꽉 찼습니다 — 다른 파티를 고르세요";

    const at = usedAt(characterId);
    const limit = useLimit(characterId);
    if (at.length >= limit) {
      const extra = EXTRA_STAMINA[base];
      return [
        limit > 1
          ? `쓸 수 있는 ${limit}회를 다 썼습니다 — ${at.join(" · ")}`
          : `한 번만 쓸 수 있습니다 — ${at.join(" · ")}에 있습니다`,
        extra ? `(${extra}로 한 번이 더 붙은 것입니다)` : "",
      ]
        .filter(Boolean)
        .join(LF);
    }
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
  /**
   * 파티를 통째로 치운다. 캐릭터가 들어 있어도 한 번에 없앤다 —
   * 예전에는 먼저 비우고 다시 눌러야 사라져서, 지우려면 늘 두 번 눌러야 했다.
   */
  const dropParty = (partyId: number) => {
    setParties(parties.filter((p) => p.id !== partyId));
    if (partyId === activeId) setActiveId(null);
  };

  const clearAll = () => setParties(parties.map((p) => ({ ...p, memberIds: [] })));

  // 파티 관리 탭에 담아 둔 파티를 고르는 창. 계산 탭의 「파티 불러오기」와 같은 목록이다.
  const [presetOpen, setPresetOpen] = useState(false);

  /**
   * 담아 둔 파티를 **지금 채우는 파티**에 통째로 앉힌다(원래 있던 캐릭터는 비운다).
   * 채우는 파티가 없으면(전부 꽉 참) 맨 뒤에 새 파티를 만들어 앉힌다.
   * 계산 탭의 편성은 건드리지 않는다.
   */
  const loadPreset = (memberIds: string[]) => {
    const ids = memberIds.filter(Boolean).slice(0, PARTY_SIZE);
    if (active) {
      setParties(parties.map((p) => (p.id === active.id ? { ...p, memberIds: ids } : p)));
    } else {
      const id = parties.reduce((max, p) => Math.max(max, p.id), 0) + 1;
      setParties([...parties, { id, memberIds: ids }]);
      setActiveId(id);
    }
    setPresetOpen(false);
  };

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

  /**
   * 「메인딜러 : 속성」 — 파티의 1번 캐릭터를 메인딜러로 보고 그 속성을 적는다.
   * 매트릭스는 속성별로 적을 고르므로 파티가 어느 속성으로 치는지 한눈에 보이게 한다. 두 세부 탭이 같이 쓴다.
   */
  const mainElement = (party: PlannerParty) => {
    const main = byId.get(party.memberIds[0] ?? "");
    if (!main) return null;
    const icon = elementIcon(main.element);
    return (
      <span className="matrix-main" title={`메인딜러 ${main.name}`}>
        메인딜러 :
        {icon && <img src={icon} alt="" />}
        <b style={{ color: ELEMENT_COLORS[main.element] }}>{ELEMENT_NAMES[main.element]}</b>
      </span>
    );
  };

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

  // 파티 순서 구성하기에서 파티마다 드롭다운으로 고른 사이클. 안 골랐으면 첫 사이클.
  const [pickedCycle, setPickedCycle] = useState<Record<number, string>>({});
  // 파티마다 고른 매트릭스 스테이지 버프 id. 넷 중 하나는 반드시 고른다 — 고른 적이 없으면 첫 버프다.
  const [pickedBuff, setPickedBuff] = usePersistedState<Record<number, number>>("matrix.buffs", {});

  /** 파티 순서대로, 파티마다 고른 사이클. 몬스터 체력 깎기가 이 순서로 돈다. */
  const matrixRuns = useMemo(
    () =>
      parties.map((party, index) => {
        const found = cyclesFor(party.memberIds);
        return {
          index,
          cycle: found.find((p) => p.id === pickedCycle[party.id]) ?? found[0] ?? null,
          buff: MATRIX_BUFFS.find((b) => b.id === pickedBuff[party.id]) ?? MATRIX_BUFFS[0],
        };
      }),
    // cyclesFor는 cyclePresets로만 결과가 달라진다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parties, pickedCycle, pickedBuff, cyclePresets],
  );
  const matrix = useMatrixSim(matrixRuns);

  /**
   * 파티가 얻은 점수. 몬스터마다 「그 파티가 깎은 체력 ÷ 몬스터 체력 × 그 몬스터 점수」를 더한다 —
   * 몬스터 칸의 점수 규칙(깎은 만큼 점수, 처치하면 표 점수 그대로)을 파티별로 나눈 것이라
   * 파티 점수를 모두 더하면 몬스터 판의 총점과 같다.
   */
  const partyScore = (index: number) =>
    MATRIX_MONSTERS.reduce((sum, m, monsterIndex) => {
      const hp = matrix.hpOf(m);
      return hp > 0 ? sum + (m.score * (matrix.sim.dealt[monsterIndex][index] ?? 0)) / hp : sum;
    }, 0);

  /** 파티 순서 줄의 사이클 고르개 — 캐릭터 오른쪽에 드롭다운 + 열기. 사이클이 여럿이어도 한 줄에 선다. */
  const cyclePicker = (party: PlannerParty) => {
    if (party.memberIds.length === 0) return null;
    const found = cyclesFor(party.memberIds);
    if (found.length === 0) {
      return <span className="matrix-cycle-pick none">담아 둔 사이클 없음</span>;
    }
    const chosen = found.find((p) => p.id === pickedCycle[party.id]) ?? found[0];
    return (
      <span className="matrix-cycle-pick" onClick={(event) => event.stopPropagation()}>
        <select
          value={chosen.id}
          title={chosen.members.map((m) => m.characterName).join(" · ")}
          onChange={(event) => setPickedCycle((cur) => ({ ...cur, [party.id]: event.target.value }))}
        >
          {found.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </span>
    );
  };

  return (
    <div className="matrix-planner">
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
              <ElementFilter value={elementFilter} onChange={setElementFilter} />
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
              <div className="matrix-pool-split">
                {/* ── 메인 딜러 ── 고르면 오른쪽 「나머지」가 그 딜러에 맞는 순서로 다시 선다. */}
                <div className="matrix-pool-col">
                <div className="matrix-pool-head">
                  <b>메인 딜러</b>
                  {/* 설명은 한 줄로 자른다 — 옆 칸 제목과 높이를 맞추려고. 전체는 title로 본다. */}
                  <em title={mainHeadNote}>{mainHeadNote}</em>
                  {pinnedMain && (
                    <button
                      className="matrix-pool-clear"
                      title="지금 채우는 파티의 1번 자리를 기준으로 되돌립니다"
                      onClick={() => setPinnedMain(null)}
                    >
                      기준 해제
                    </button>
                  )}
                </div>
                <div className="pick-grid matrix-pool">
                  {mains.map((char) => (
                    <PoolCard
                      key={char.id}
                      char={char}
                      at={usedAt(char.id)}
                      blocked={blockedReason(char.id)}
                      onPlace={() => place(char.id)}
                      basis={char.id === mainPick}
                      onBasis={() => setPinnedMain(char.id === pinnedMain ? null : char.id)}
                    />
                  ))}
                  {mains.length === 0 && (
                    <p className="matrix-empty">이름에 맞는 메인 딜러가 없습니다.</p>
                  )}
                </div>
                </div>

                {/* ── 나머지 ── 기준 딜러가 있으면 추천 순, 없으면 원래 순서. */}
                <div className="matrix-pool-col">
                <div className="matrix-pool-head">
                  <b>2 · 3 캐릭터</b>
                  <em title={restHeadNote}>{restHeadNote}</em>
                </div>
                {mainPick ? (
                  // 추천 순일 때는 격자 대신 한 줄짜리 카드로 — 무슨 버프인지 다 적으려면 가로가 필요하다.
                  // 자리로 한 번 더 가른다. 교체로 끊기는 버프는 메인 딜러 **바로 앞**에서만 값어치를 한다.
                  <div className="advice-split">
                    {([2, 1] as const).map((group) => {
                      const list = rest.filter((r) => r.advice?.group === group);
                      if (list.length === 0) return null;
                      return (
                        <div key={group} className="advice-col">
                          <div className="matrix-pool-head sub">
                            <b>{group === 2 ? "2번 자리" : "3번 자리"}</b>
                            <em>
                              {group === 2
                                ? "「교체 시 해제」가 붙은 버프를 줍니다 — 메인 딜러 바로 앞에 세워야 살아납니다"
                                : "교체해도 남는 파티 버프만 줍니다 — 앞에서 미리 깔아 두면 됩니다"}
                            </em>
                          </div>
                          <div className="advice-list">
                            {list.map(({ char, advice }) => (
                              <AdviceCard
                                key={char.id}
                                char={char}
                                at={usedAt(char.id)}
                                blocked={blockedReason(char.id)}
                                onPlace={() => place(char.id)}
                                advice={advice}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {rest.length === 0 && (
                      <p className="matrix-empty">이름에 맞는 캐릭터가 없습니다.</p>
                    )}
                  </div>
                ) : (
                  <div className="pick-grid matrix-pool">
                    {rest.map(({ char }) => (
                      <PoolCard
                        key={char.id}
                        char={char}
                        at={usedAt(char.id)}
                        blocked={blockedReason(char.id)}
                        onPlace={() => place(char.id)}
                      />
                    ))}
                    {rest.length === 0 && (
                      <p className="matrix-empty">이름에 맞는 캐릭터가 없습니다.</p>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>파티 구성</h2>
              <div className="matrix-actions">
                <button
                  onClick={() => setPresetOpen(true)}
                  title="파티 관리 탭에 담아 둔 파티를 지금 채우는 파티에 앉힙니다"
                >
                  파티 불러오기
                </button>
                <button onClick={addParty}>+ 파티</button>
                <button onClick={clearAll}>전체 비우기</button>
              </div>
            </div>

            {presetOpen && (
              // 계산 탭의 파티 불러오기와 같은 창 — 바깥이나 Esc로 닫는다.
              <div
                className="formula-backdrop"
                onClick={() => setPresetOpen(false)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setPresetOpen(false);
                }}
                role="presentation"
              >
                <div className="formula-modal party-load-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="formula-head">
                    <div>
                      <small>PARTY</small>
                      <h3>파티 불러오기</h3>
                      <span>
                        {active
                          ? `담아둔 파티를 눌러 ${parties.indexOf(active) + 1}파티에 앉힙니다.`
                          : "담아둔 파티를 눌러 새 파티로 앉힙니다."}
                      </span>
                    </div>
                    <button className="formula-close" onClick={() => setPresetOpen(false)}>
                      ×
                    </button>
                  </div>
                  <PartyPresetSection
                    onPick={(preset) =>
                      loadPreset(PARTY_SLOTS.map((slot) => preset.config[slot].characterId))
                    }
                  />
                </div>
              </div>
            )}

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
                    {mainElement(party)}
                    {(party.memberIds.length > 0 || parties.length > 1) && (
                      <button
                        className="matrix-drop"
                        title="이 파티를 치웁니다"
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

                      const used = usedAt(char.id).length;
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
                          {elementIcon(char.element) && (
                            <img
                              className="matrix-slot-el"
                              src={elementIcon(char.element)}
                              alt={ELEMENT_NAMES[char.element]}
                              title={ELEMENT_NAMES[char.element]}
                            />
                          )}
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
        // 왼쪽 파티 순서 · 오른쪽 몬스터 체력 깎기
        <div className="matrix-order-layout">
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
                  {mainElement(party)}
                  {/* 캐릭터 줄 오른쪽에 사이클 드롭다운. 좁으면 아래로 내려간다. */}
                  <div className="matrix-row-line">
                  <div className="matrix-row-members">
                    {party.memberIds.length === 0 ? (
                      <em className="matrix-row-empty">비어 있습니다</em>
                    ) : (
                      party.memberIds.map((id) => {
                        const char = byId.get(id);
                        if (!char) return null;
                        const icon = elementIcon(char.element);
                        return (
                          <span key={id} className="matrix-chip matrix-chip-tall" title={char.name}>
                            {char.iconUrl && <img src={char.iconUrl} alt="" loading="lazy" />}
                            {icon && <img className="matrix-chip-el" src={icon} alt="" />}
                            {isRentalCharacter(id) && (
                              <i
                                className="matrix-chip-rent"
                                title="대여 빌드로 셉니다 — 캐릭터 관리 탭의 「대」 단추로 내 세팅과 바꿉니다"
                              >
                                대여
                              </i>
                            )}
                            {MATRIX_ROLE_BOOSTS[id] && (
                              <i
                                className="matrix-chip-boost"
                                title={`매트릭스 강화 — ${MATRIX_ROLE_BOOSTS[id].desc}`}
                              >
                                강화
                              </i>
                            )}
                            <b>{char.name}</b>
                          </span>
                        );
                      })
                    )}
                  </div>
                  {party.memberIds.length > 0 && (
                    <select
                      className="matrix-buff-pick"
                      value={matrixRuns[index].buff.id}
                      title={matrixRuns[index].buff.desc}
                      onChange={(event) => {
                        const id = Number(event.target.value);
                        setPickedBuff((cur) => ({ ...cur, [party.id]: id }));
                      }}
                    >
                      {MATRIX_BUFFS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {cyclePicker(party)}
                  {/* 이 파티가 깎은 체력 — 색은 오른쪽 체력바의 이 파티 몫과 같다. */}
                  {(() => {
                    const run = matrixRuns[index];
                    const r = matrix.sim.report[index];
                    if (!run?.cycle) return null;
                    return (
                      <span className="matrix-row-result">
                        <i style={{ background: partyColor(index) }} />
                        <b>{Math.round(r.damage).toLocaleString()}</b>
                        {/* 이 파티가 얻은 점수 — 깎은 체력만큼 몬스터 점수를 나눠 받는다. */}
                        <em className="matrix-row-score" title="이 파티가 깎은 체력만큼 받은 점수">
                          {Math.floor(partyScore(index)).toLocaleString()}점
                        </em>
                      </span>
                    );
                  })()}
                  </div>
                </div>
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
        {/* 파티 순서대로 고른 사이클을 한 번씩 써서 매트릭스 몬스터 체력을 타수별로 깎아 본다. */}
        <MatrixRounds runs={matrixRuns} matrix={matrix} />
        </div>
      )}
    </div>
  );
}

/**
 * 매트릭스 몬스터 — 라운드마다 다섯(마지막이 미믹), 세 라운드. 체력을 정하고 파티 순서대로 깎아 본다.
 *
 * 깎는 규칙
 *   - 파티 순서 목록의 위에서부터, 파티마다 고른 사이클을 **한 번** 쓴다. 공격을 다 쓰면 그 파티는 끝이다.
 *   - 사이클의 타를 순서대로 지금 몬스터에 넣고, 쓰러지면 **다음 타부터** 다음 몬스터를 친다
 *     — 1번 몬스터에서 2사이클 3번째 타까지 썼으면 2번 몬스터는 2사이클 4번째 타부터 맞는다.
 *   - 넘친 피해는 다음 몬스터로 넘기지 않는다. 미믹을 잡으면 다음 라운드 첫 몬스터로 넘어간다.
 *   - 다음 파티는 앞 파티가 멈춘 몬스터의 남은 체력부터 이어서 깎는다.
 *   - 피해는 몬스터마다 따로 계산한다 — 그 몬스터의 속성과 매트릭스 저항(기본 20% · 같은 속성 40%).
 *     방어력 등 레벨이 들어가는 계산은 라운드와 상관없이 레벨 100 고정(몬스터 레벨은 체력에만 쓴다).
 *     한 타는 기대 피해(크리티컬 확률 반영), 고정 피해는 그 공격의 마지막 타에 붙인다.
 *   - 매트릭스 스테이지 버프 · 몬스터 위기 진화는 넣지 않았다.
 */

/** 파티 순서별 색 — 순서가 넘치면 처음 색으로 돌아간다. 라이트 · 다크 둘 다 있는 변수만 쓴다. */
const PARTY_COLORS = [
  "var(--c-e8c66a)",
  "var(--c-5f8fcf)",
  "var(--c-7fc08a)",
  "var(--c-c06a94)",
  "var(--c-9b7ac2)",
  "var(--c-e0a94d)",
  "var(--c-4fa3a8)",
  "var(--c-d55181)",
];
const partyColor = (index: number) => PARTY_COLORS[index % PARTY_COLORS.length];

interface MatrixRun {
  /** 파티 순서(0부터). */
  index: number;
  cycle: CyclePreset | null;
  /** 이 파티에 고른 매트릭스 스테이지 버프. 넷 중 하나는 늘 고른다. */
  buff: MatrixBuff;
}

/** 매트릭스 체력 깎기 계산 — 파티 순서 줄(파티별 결과)과 몬스터 칸이 같이 쓰도록 위로 올린다. */
function useMatrixSim(runs: MatrixRun[]) {
  // 키에 v2 — 예전 기본값은 도감 어림값이라 실제의 1/5였다. 그때 손으로 고쳐 둔 값이 남아 있으면
  // 실측표로 바꾼 기본값을 덮어써 버리므로, 자리를 새로 잡아 실측값에서 다시 시작한다.
  const [hpByKey, setHpByKey] = usePersistedState<Record<string, number>>("matrix.hp-v2", {});
  const {
    config,
    buffsWith,
    characterWeapons,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
  } = usePartyConfig();

  const hpOf = (m: MatrixMonster) => hpByKey[matrixHpKey(m)] ?? m.defaultHp;
  const edited = Object.keys(hpByKey).length > 0;

  const sim = useMemo(() => {
    const matrix = resPresetOf("matrix");
    const hp = MATRIX_MONSTERS.map(hpOf);
    /** dealt[몬스터][파티] — 그 파티가 그 몬스터에서 깎은 체력(넘친 피해 제외). */
    const dealt = MATRIX_MONSTERS.map(() => runs.map(() => 0));
    const killedBy: (number | null)[] = MATRIX_MONSTERS.map(() => null);
    /** 몬스터마다 사이클이 실제로 켠 전용 시스템 배수(1이면 조건을 못 채운 것). */
    const featureUp = MATRIX_MONSTERS.map(() => 1);
    /** 몬스터마다 스테이지 버프가 실제로 낸 최대 배수(조건을 못 채웠으면 조건 없는 몫만 남는다). */
    const stageUp = MATRIX_MONSTERS.map(() => 1);
    const report = runs.map(() => ({ damage: 0, hits: 0, totalHits: 0, stoppedAt: -1 }));

    // 파티 · 몬스터마다 타수별 피해 목록. 실제로 맞는 몬스터만 계산한다(계산이 무겁다).
    const cache = new Map<string, number[]>();
    const hitsFor = (run: MatrixRun, monsterIndex: number): number[] => {
      const key = `${run.index}:${run.buff.id}:${monsterIndex}`;
      const hit = cache.get(key);
      if (hit) return hit;
      const cycle = run.cycle!;
      const m = MATRIX_MONSTERS[monsterIndex];
      const partyIds = PARTY_SLOTS.map(
        (slot) => cycle.members.find((x) => x.slot === slot)?.characterId ?? "",
      );
      const base = buffsWith(partyIds.filter(Boolean));
      const buffs = [...base, ...cycle.manualBuffs.filter((b) => !base.some((a) => a.id === b.id))];
      const cfg: PartyConfig = {
        ...config,
        ...Object.fromEntries(
          PARTY_SLOTS.map((slot, i) => [slot, { ...config[slot], characterId: partyIds[i] }]),
        ),
        rotation: cycle.rotation,
        enemy: {
          ...config.enemy,
          id: String(m.monsterId),
          name: m.name,
          // 매트릭스는 라운드가 올라 몬스터 레벨이 110 · 120이 돼도 방어력 등 피해 계산은 레벨 100으로 고정이다.
          // 레벨은 체력(기본값)에만 쓴다.
          level: matrix.fixedLevel ?? 100,
          element: m.element,
          resPreset: "matrix",
          baseRes: matrix.baseRes,
          // 저항이 모두 같은 몬스터(미믹)는 같은 속성으로 때려도 오르지 않는다 — 둘을 같은 값으로 둔다.
          sameElementRes: m.uniformRes ? matrix.baseRes : matrix.sameElementRes,
          damageReduction: 0,
        },
      };
      const results = computeResults(
        cfg,
        characterWeapons,
        buffs,
        characterChains,
        characterSkillLevels,
        characterLevels,
        characterNodes,
      );

      /**
       * 그 몬스터에만 걸린 매트릭스 전용 시스템을 **공격 트리거로 켠다.**
       *
       * 만와뢰는 암흑을 걸수록(스택당 5% · 최대 5), 걸어 둔 암흑을 태우면(+20%) 받는 피해가 오른다.
       * 천둥의 비늘은 조화 밀집을 붙인 뒤부터 20% 오른다. 어느 공격이 무엇을 걸고 태우는지는
       * 공격 자료의 trigger가 알고 있으므로(data/attackTriggers.ts) 사이클을 훑으며 그대로 따라간다.
       *
       * 배수는 **그 공격 앞의 상태**로 매긴다 — 스택을 붙이는 그 타는 아직 덕을 보지 않는다.
       * 지속 시간(30초)은 보지 않는다. 사이클 한 벌 안에서는 유지되는 것으로 본다.
       */
      const rule = m.feature?.rule;
      let stacks = 0;
      let consumed = false;
      let statusOn = false;
      /**
       * 스테이지 버프의 조건부 줄이 보는 상태. 몬스터 전용 시스템과 **같은 트리거 자료**를 읽는다
       * — 30번은 이상 효과를 붙였는지, 32번은 어떤 「이탈」을 붙였는지로 갈린다.
       */
      const stage = { anomalyOn: false, breaches: new Set<string>() };
      const featureScale = (syncAmplify: number) => {
        if (!rule) return 1;
        if (rule.kind === "anomaly") {
          return (1 + rule.perStack * Math.min(stacks, rule.maxStacks)) * (consumed ? 1 + rule.onConsume : 1);
        }
        if (!statusOn) return 1;
        // 상한이 늘면 그만큼 간섭을 더 쌓을 수 있다 — 스택마다 「증폭 1pt당 0.12%」가 더 붙는다.
        // 늘어난 상한을 실제로 채운다고 보고 곱한다(채우려면 조화도 파괴를 그만큼 더 써야 한다).
        const extra =
          rule.extraStacks && rule.perStackPerAmp
            ? rule.perStackPerAmp * syncAmplify * rule.extraStacks
            : 0;
        return (1 + rule.bonus) * (1 + extra);
      };
      /** 이 공격이 걸거나 태운 것을 상태에 반영한다. */
      const follow = (characterId: string, attackId: string) => {
        // 공용 항목(조화도 파괴)은 누가 썼느냐로 달라진다 — 캐릭터를 묶은 줄까지 함께 본다.
        // 공명 모드가 다른 줄(불꽃 데니아의 「조화 밀집」 등)은 triggersFor가 걸러서 준다.
        for (const t of triggersFor(characterId, attackId)) {
          // ── 스테이지 버프 쪽 — 몬스터가 무엇이든 늘 따라간다.
          if (t.action === "add") {
            if (t.anomaly) stage.anomalyOn = true;
            if (t.status?.endsWith("이탈")) stage.breaches.add(t.status);
          }

          // ── 이 몬스터의 전용 시스템 쪽.
          if (!rule) continue;
          if (rule.kind === "anomaly") {
            if (t.anomaly !== rule.anomaly) continue;
            // 개수를 안 적어 둔 줄(「최대 스택까지」)은 상한까지 채운 것으로 본다.
            const n = t.amount ?? rule.maxStacks;
            stacks = t.action === "add" ? stacks + n : Math.max(0, stacks - n);
            if (t.action === "consume") consumed = true;
          } else if (t.action === "add" && t.status && rule.statuses.includes(t.status)) {
            statusOn = true;
          }
        }
      };

      /**
       * 매트릭스 전용 캐릭터 강화(MATRIX_ROLE_BOOSTS).
       *   최종 피해 — 강화받은 캐릭터가 낸 피해에 곱한다.
       *   파티 피해 보너스 — 강화받은 캐릭터가 공명 해방을 쓴 **뒤의** 공격부터, 그 공격의
       *   피해 보너스 합(1+Σ)에 더해 다시 나눈다. 해방 그 타는 아직 덕을 보지 않는다.
       */
      const partyBoosts: NonNullable<MatrixRoleBoost["party"]>[] = [];
      const roleScale = (r: (typeof results)[number]) => {
        const own = 1 + (MATRIX_ROLE_BOOSTS[r.item.characterId]?.finalDamage ?? 0);
        if (r.damage.kind !== "normal" || partyBoosts.length === 0) return own;
        const { dmgBonus, category, element } = r.damage.breakdown;
        const extra = partyBoosts
          .filter((b) => (b.category ? b.category === category : b.element === element))
          .reduce((sum, b) => sum + b.amount, 0);
        return own * (dmgBonus > 0 ? (dmgBonus + extra) / dmgBonus : 1);
      };
      const followRole = (r: (typeof results)[number]) => {
        const party = MATRIX_ROLE_BOOSTS[r.item.characterId]?.party;
        const liberation =
          r.skillCategory === "Liberation" || r.attack.type === "Liberation" || r.attack.type === "Ultimate";
        if (party && liberation && !partyBoosts.includes(party)) partyBoosts.push(party);
      };

      const list = results.flatMap((r) => {
        // 스테이지 버프는 「최종적으로」라 공격마다 따로 곱한다. 캐릭터 강화도 같은 자리에서 곱한다.
        const scale =
          run.buff.multiplier(
            {
              category: r.attack.damageBonusType ?? r.attack.type,
              element: r.attack.element,
              anomaly: r.attack.anomaly,
            },
            stage,
          ) * roleScale(r);
        const feature = featureScale(r.stats.syncAmplify);
        featureUp[monsterIndex] = Math.max(featureUp[monsterIndex], feature);
        stageUp[monsterIndex] = Math.max(stageUp[monsterIndex], scale);
        follow(r.item.characterId, r.attack.id);
        followRole(r);
        return r.damage.hits.map(
          (h, i) =>
            (h.expectedDamage + (i === r.damage.hits.length - 1 ? (r.damage.fixedDamage ?? 0) : 0)) *
            scale *
            feature,
        );
      });
      cache.set(key, list);
      return list;
    };

    let cur = 0;
    for (const run of runs) {
      if (!run.cycle || cur >= MATRIX_MONSTERS.length) continue;
      const total = hitsFor(run, cur).length;
      report[run.index].totalHits = total;
      for (let k = 0; k < total && cur < MATRIX_MONSTERS.length; k++) {
        const damage = hitsFor(run, cur)[k] ?? 0;
        const used = Math.min(damage, hp[cur]);
        hp[cur] -= used;
        dealt[cur][run.index] += used;
        report[run.index].damage += used;
        report[run.index].hits = k + 1;
        if (hp[cur] <= 0) {
          killedBy[cur] = run.index;
          cur++;
        }
      }
      report[run.index].stoppedAt = cur;
    }

    return { hp, dealt, killedBy, report, featureUp, stageUp, reached: cur };
    // hpByKey가 바뀌면 hpOf도 달라진다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    runs,
    hpByKey,
    config,
    buffsWith,
    characterWeapons,
    characterChains,
    characterSkillLevels,
    characterLevels,
    characterNodes,
  ]);

  return { sim, hpOf, setHpByKey, edited };
}

/** 파티가 멈춘 자리 이름. */
const matrixPlaceOf = (index: number) => {
  if (index >= MATRIX_MONSTERS.length) return "전부 처치";
  const m = MATRIX_MONSTERS[index];
  return `${m.round}라운드 ${m.slot}번 ${m.name}`;
};

function MatrixRounds({ runs, matrix }: { runs: MatrixRun[]; matrix: ReturnType<typeof useMatrixSim> }) {
  const { sim, hpOf, setHpByKey, edited } = matrix;

  /**
   * 깎은 체력만큼 점수를 준다 — 게임도 피해량을 점수로 환산하지, 처치 여부로 끊지 않는다.
   *
   * 환산은 그 몬스터의 「체력 1당 점수」(score ÷ 체력)다. 실측표 기준으로 1라운드가
   * 체력 1,200당 1점이고 라운드마다 ×1.15 · ×1.25로 오른다.
   * 체력을 화면에서 고쳐 두었으면 고친 값을 기준으로 삼는다 — 그래야 처치했을 때
   * 표에 적힌 점수(m.score)가 그대로 나온다.
   */
  const scoreOf = (m: (typeof MATRIX_MONSTERS)[number], index: number) => {
    const hp = hpOf(m);
    if (hp <= 0) return 0;
    if (sim.killedBy[index] !== null) return m.score; // 처치했으면 반올림 없이 표 값 그대로
    const dealt = Math.max(0, Math.min(hp, hp - sim.hp[index]));
    return (m.score * dealt) / hp;
  };

  const earned = MATRIX_MONSTERS.reduce((sum, m, index) => sum + scoreOf(m, index), 0);
  const fullScore = MATRIX_MONSTERS.reduce((sum, m) => sum + m.score, 0);

  return (
    <section className="panel matrix-round">
      <div className="panel-head">
        <h2>매트릭스 몬스터</h2>
        <div className="matrix-actions">
          <small className="matrix-round-meta">
            {MATRIX_SEASON.name} · {MATRIX_SEASON.level}
          </small>
          <small className="matrix-score-total" title="깎은 체력만큼 점수가 붙습니다(처치는 표 점수 그대로)">
            점수 <b>{Math.floor(earned).toLocaleString()}</b> / {fullScore.toLocaleString()}
          </small>
          {edited && (
            <button onClick={() => setHpByKey({})} title="체력을 실측표 기본값으로 되돌립니다">
              기본값으로
            </button>
          )}
        </div>
      </div>


      {Array.from({ length: MATRIX_ROUND_COUNT }, (_, r) => {
        const round = r + 1;
        const list = MATRIX_MONSTERS.map((m, index) => ({ m, index })).filter((x) => x.m.round === round);
        return (
          <div key={round} className="matrix-round-block">
            <div className="matrix-round-title">
              <b>{round}라운드</b>
              {/* 표기 레벨일 뿐이다 — 체력만 이 레벨을 타고, 방어력은 라운드와 무관하게 100이다. */}
              <small title="표기 레벨입니다 — 체력만 이 레벨을 따르고, 방어력 · 피해 계산은 레벨 100 고정입니다">
                Lv.{list[0].m.level}
                {list[0].m.level !== 100 && <span className="muted"> · 방어 100</span>}
              </small>
              <small>
                점수 {list.reduce((sum, x) => sum + x.m.score, 0).toLocaleString()}
              </small>
            </div>

            <div className="matrix-monsters">
              {list.map(({ m, index }) => {
                const hp = hpOf(m);
                const icon = elementIcon(m.element);
                const killer = sim.killedBy[index];
                return (
                  <article key={m.wave} className={killer !== null ? "matrix-monster dead" : "matrix-monster"}>
                    <img className="matrix-monster-face" src={m.icon} alt="" loading="lazy" />
                    <div className="matrix-monster-body">
                      <div className="matrix-monster-head">
                        <em>{m.slot}</em>
                        <b title={m.name}>{m.name}</b>
                      </div>
                      {/* 이름 아래 — 속성과 체력. 칸이 넉넉하면 한 줄, 좁으면 둘로 접힌다. */}
                      <div className="matrix-monster-meta">
                        {/* 그 몬스터에만 걸린 매트릭스 전용 시스템. 파티가 조건을 채워야 성립한다. */}
                        {m.feature && (
                          <span
                            className={sim.featureUp[index] > 1 ? "matrix-innate on" : "matrix-innate"}
                            title={`${m.feature.name} — ${m.feature.desc}${
                              sim.featureUp[index] > 1
                                ? ` (이 파티가 켰습니다 — 최대 ×${sim.featureUp[index].toFixed(2)})`
                                : " (이 파티는 조건을 채우지 못했습니다)"
                            }`}
                          >
                            {m.feature.name}
                            {sim.featureUp[index] > 1
                              ? ` ×${sim.featureUp[index].toFixed(2)}`
                              : m.feature.damageTaken
                                ? ` 최대 ×${m.feature.damageTaken}`
                                : ""}
                          </span>
                        )}
                        {/* 고른 스테이지 버프가 이 몬스터에서 실제로 낸 배수 —
                            조건부(이상 효과 추가 · 이탈 추가)는 사이클이 실제로 붙여야 오른다. */}
                        {sim.stageUp[index] > 1 && (
                          <span className="matrix-innate on" title="고른 스테이지 버프가 낸 최대 배수">
                            스테이지 ×{sim.stageUp[index].toFixed(2)}
                          </span>
                        )}
                        {m.uniformRes ? (
                          // 저항이 전부 같아 「어느 속성으로 때리든 같다」만 알리면 된다.
                          <span className="matrix-monster-el muted" title="속성 저항이 모두 같습니다 — 어느 속성으로 때려도 20%">
                            저항 같음
                          </span>
                        ) : (
                          <span className="matrix-monster-el" style={{ color: ELEMENT_COLORS[m.element] }}>
                            {icon && <img src={icon} alt="" />}
                            {ELEMENT_NAMES[m.element]}
                          </span>
                        )}
                        {/* 잡으면 받는 점수 — 어느 몬스터를 먼저 눕힐지 고르는 기준이다. */}
                        <span className="matrix-monster-score">{m.score.toLocaleString()}점</span>
                        <label className="matrix-hp-input">
                          HP
                          <input
                            type="number"
                            min={1}
                            step={1000}
                            value={hp}
                            onChange={(event) => {
                              const value = Math.round(Number(event.target.value));
                              if (!Number.isFinite(value) || value <= 0) return;
                              setHpByKey((cur) => ({ ...cur, [matrixHpKey(m)]: value }));
                            }}
                          />
                        </label>
                      </div>
                      <small className="matrix-monster-state">
                        {killer !== null ? (
                          <span style={{ color: partyColor(killer) }}>{killer + 1}파티가 처치</span>
                        ) : sim.hp[index] < hp ? (
                          <>
                            남은 체력 {Math.round(sim.hp[index]).toLocaleString()}
                            {/* 못 눕혀도 깎은 만큼은 점수가 붙는다 — 어디까지 갔는지 바로 보이게. */}
                            <em className="matrix-monster-part">
                              {Math.floor(scoreOf(m, index)).toLocaleString()}점
                            </em>
                          </>
                        ) : (
                          <span className="muted">안 맞음</span>
                        )}
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* 다섯 마리 체력바를 한 줄로 잇는다. 칸마다 제 체력이 꽉 찬 길이이고, 파티 색으로 깎은 만큼 칠한다. */}
            <div className="matrix-hpline">
              {list.map(({ m, index }) => {
                const hp = hpOf(m);
                return (
                  <div
                    key={m.wave}
                    className="matrix-hpline-seg"
                    title={`${m.name} — 남은 체력 ${Math.round(sim.hp[index]).toLocaleString()} / ${hp.toLocaleString()}`}
                  >
                    {runs.map((run) =>
                      sim.dealt[index][run.index] > 0 ? (
                        <span
                          key={run.index}
                          className="matrix-hpline-dealt"
                          style={{
                            width: `${(sim.dealt[index][run.index] / hp) * 100}%`,
                            background: partyColor(run.index),
                          }}
                        />
                      ) : null,
                    )}
                    <span className="matrix-hpline-left" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="matrix-hint">
        기본 체력 · 점수는 인게임 <b>실측표</b>(s2.2 매트릭스 혈량 · 분수표)를 그대로 옮긴 값입니다 —
        다르면 게임에서 본 값으로 고쳐 주세요. 라운드 레벨(110 · 120)은 <b>표기일 뿐</b>이라 체력에만
        걸립니다. 방어력은 라운드와 상관없이 <b>레벨 100</b>으로 계산합니다. 만와뢰(<b>이상 효과 시스템</b>)와 천둥의 비늘
        (<b>조화도 파괴 시스템</b>)의 전용 시스템은 <b>공격 트리거를 보고 켭니다</b> — 사이클의 공격이
        암흑 · 조화 밀집을 걸면 그때부터 받는 피해 배수가 붙고, 암흑을 태우는 공격이 나오면 20%가 더
        붙습니다. 조건을 못 채우는 파티에는 걸리지 않습니다(꼬리표에 마우스를 올리면 보입니다). 파티 순서대로 고른 사이클을 한 번씩 쓰고, 타수 순서대로
        기대 피해로 깎습니다. 몬스터가 쓰러지면 다음 타부터 다음 몬스터를 치고, 미믹을 잡으면 다음
        라운드로 넘어갑니다. 넘친 피해는 넣지 않았습니다. 스테이지 버프는 파티마다 넷 중 하나를 고르고,
        이번 시즌 <b>강화 캐릭터</b>(최종 피해 20~25% · 일부는 공명 해방 뒤 파티 피해 보너스)도 같이 곱합니다.
      </p>
    </section>
  );
}
