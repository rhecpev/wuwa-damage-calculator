import { useMemo, useState } from "react";
import { characters } from "../../data/sampleData";
import { weapons } from "../../data/weapons";
import { isExcludedEcho } from "../../data/echoExcludes";
import { usePartyConfig } from "../../context/PartyConfigContext";
import {
  addMyWeapon,
  isOwnedCharacter,
  toggleOwnedCharacter,
} from "../../data/ownedStore";
import {
  loadEchoLinks,
  loadMyEchoes,
  nextPk,
  saveEchoLinks,
  saveMyEchoes,
  type MyEcho,
} from "../../data/echoStore";
import {
  CATALOG,
  OPTIONS,
  editDistance,
  normKey,
  readProfileCard,
  type EchoIconGuess,
  type ProfileRead,
  type ValueState,
} from "../../utils/ocr";
import { SearchPicker } from "./SearchPicker";
import { Dialog, ProgressBar, type Progress } from "../../components/Feedback";
import { LevelSlider } from "../../components/LevelSlider";
import echoData from "../../data/echo.json";

/**
 * 디스코드 프로필 카드 한 장으로 캐릭터 설정을 통째로 채우는 화면.
 *
 * 게임이 만들어 주는 카드라 글자 자리가 늘 같아서, 자리별로 잘라 읽는다(utils/ocr.ts).
 * **읽은 값을 바로 저장하지 않는다.** OCR은 반드시 틀리는 데가 있어서,
 * 이 화면에서 사람이 전부 눈으로 확인하고 고친 뒤에야 「적용」이 열린다.
 *
 * 적용하면 이것들이 한 번에 정리된다 —
 *   캐릭터 보유 표시 · 캐릭터 레벨 · 스킬 다섯 개 레벨
 *   무기를 보유 목록에 담고 · 그 캐릭터에게 장착 · 레벨과 정련까지
 *   에코 다섯 개를 보유 목록에 담고 · 그 캐릭터의 다섯 자리에 그대로 장착
 */

/**
 * 스킬 노드 다섯 개의 자리 순서.
 * 카드에서 노드는 그림뿐이라 자리로만 구분된다 — **12시에서 반시계 방향**이다.
 * 읽는 쪽(ocr.ts의 readSkillLevels)이 각도로 정렬해서 이 순서로 넘겨준다.
 */
const SKILL_SLOTS = [
  { key: "Basic", label: "기본 공격", where: "12시" },
  { key: "Skill", label: "공명 스킬", where: "왼쪽 위" },
  { key: "Variation", label: "변주 스킬", where: "왼쪽 아래" },
  { key: "Circuit", label: "공명 회로", where: "오른쪽 아래" },
  { key: "Liberation", label: "공명 해방", where: "오른쪽 위" },
] as const;

/** 확인이 필요한 칸만 눈에 띄게 한다. 「정확」은 조용히 지나간다. */
const STATE_NOTE: Record<ValueState, string> = {
  정확: "",
  소수점복원: "소수점 복원",
  근사: "확인 필요",
  벗어남: "많이 다름 — 직접 고르세요",
  못찾음: "못 읽음 — 직접 고르세요",
};

/** 도감의 화음(세트) 정보. 에코를 고르면 어떤 세트를 고를 수 있는지 여기서 본다. */
interface RawEcho {
  Id: number;
  Name: string;
  Icon?: string;
  FetterGroups?: { Name: string; Icon?: string }[];
}
const RAW_ECHOES = (echoData as { Echo: RawEcho[] }).Echo;
const iconUrlOf = (catalogId: string): string | undefined =>
  RAW_ECHOES.find((e) => String(e.Id) === catalogId)?.Icon;
const fetterNamesOf = (catalogId: string): { name: string; icon?: string }[] =>
  RAW_ECHOES.find((e) => String(e.Id) === catalogId)?.FetterGroups?.map((g) => ({
    name: g.Name,
    icon: g.Icon,
  })) ?? [];

interface EchoDraft {
  /** 도감 id. 비어 있으면 아직 어느 에코인지 안 정한 것이다. */
  catalogId: string;
  /** 그림으로 찾은 결과가 미덥지 않으면 남기는 한 줄. 확실하면 빈 문자열이다. */
  iconNote: string;
  /** 고른 화음(세트). 에코마다 두어 개 중 하나를 고른다. */
  fetter: string;
  cost?: number;
  mainKey: string;
  mainValue: string;
  subKey: string;
  subValue: string;
  /** 부옵션 다섯 줄. 항목과 값을 따로 고칠 수 있다. */
  options: { key: string; value: string; note: string }[];
}

interface Draft {
  characterId: string;
  characterLevel: number;
  /** 공명체인 단계(0~6). 카드에는 동그라미 그림뿐이라 못 읽는다 — 사람이 고른다. */
  resonanceChain: number;
  skillLevels: number[];
  weaponId: string;
  weaponLevel: number;
  weaponRefine: number;
  echoes: EchoDraft[];
}

/**
 * 목록에서 하나 고르는 칸.
 *
 * **못 읽은 값을 「비어 있음」으로 보여 주는 것**이 이 조각의 요점이다. 그냥 select에
 * 없는 값을 넣으면 브라우저가 첫 항목을 골라 놓은 것처럼 그려서, 사람은 값이 제대로
 * 들어간 줄 알고 넘어간다. 그래서 지금 값이 목록에 없으면 자리표를 맨 앞에 끼운다.
 */
function OptionSelect({
  value,
  items,
  onChange,
  blank = "— 고르세요 —",
}: {
  value: string;
  items: string[];
  onChange: (value: string) => void;
  /** 비어 있는 상태에 붙일 이름. 부옵션처럼 「없어도 되는」 칸은 「없음」이라고 쓴다. */
  blank?: string;
}) {
  const missing = !items.includes(value);
  return (
    <select
      className={missing ? "blank" : ""}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {missing && <option value={value}>{blank}</option>}
      {items.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}

/**
 * 그림으로 찾은 결과가 미덥지 않으면 한 줄 남긴다.
 *
 * 눈금은 실제 카드로 재 본 값이다 — 제대로 맞은 것들이 8~32에 들어왔고, 엉뚱한 것을
 * 고를 때는 40을 넘었다. 2등과 3도 안 벌어지면 그림이 거의 같은 짝(예: 「우글글」과
 * 「악몽 · 우글글」)이라는 뜻이라 사람이 봐야 한다.
 */
function echoIconNote(icon?: EchoIconGuess): string {
  if (!icon) return "그림을 못 읽었습니다 — 직접 고르세요";
  if (icon.distance > 40) return "그림이 잘 안 맞습니다 — 확인하세요";
  if (icon.margin < 3) return "닮은 에코가 둘 있습니다 — 확인하세요";
  return "";
}

/** 이름이 가장 가까운 것을 찾는다. OCR이 한두 글자 틀려도 붙는다. */
function closestBy<T>(items: T[], nameOf: (x: T) => string, raw: string): T | undefined {
  const key = normKey(raw);
  if (!key) return undefined;
  const exact = items.find((x) => normKey(nameOf(x)) === key);
  if (exact) return exact;
  let best: T | undefined;
  let bestD = Infinity;
  for (const x of items) {
    const d = editDistance(key, normKey(nameOf(x)));
    if (d < bestD) {
      bestD = d;
      best = x;
    }
  }
  // 절반 넘게 틀렸으면 붙였다고 보지 않는다 — 엉뚱한 것을 고르느니 비워 두는 게 낫다.
  return best && bestD <= Math.max(2, Math.ceil(key.length * 0.5)) ? best : undefined;
}

export function ProfileImportPage() {
  const {
    setCharacterLevel,
    setSkillLevel,
    setCharacterWeapon,
    setWeaponLevel,
    setWeaponRefine,
    characterChains,
    setCharacterChain,
  } = usePartyConfig();

  const [busy, setBusy] = useState<Progress | null>(null);
  const [read, setRead] = useState<ProfileRead | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  /** 적용이 끝나면 뜨는 알림. 무엇이 저장됐는지 줄줄이 보여 준다. */
  const [done, setDone] = useState<string[] | null>(null);
  /** 이미 가진 것과 똑같은 에코가 있을 때, 어떻게 할지 물어보는 창. */
  const [duplicates, setDuplicates] = useState<EchoDraft[] | null>(null);
  /**
   * 부옵션을 끌어 옮기는 중인 자리. echo는 몇 번째 에코인지, from은 집어 든 줄,
   * over는 지금 손이 올라가 있는 줄이다(그 줄에 놓을 자리 표시를 그린다).
   * 다른 에코 칸으로는 옮길 수 없다 — echo가 다르면 놓기를 받지 않는다.
   */
  const [drag, setDrag] = useState<{ echo: number; from: number; over: number } | null>(null);

  // 목록에서 뺀 에코(새알심 · 「이상」 중복)는 고를 수 없어야 한다.
  const echoItems = useMemo(
    () =>
      RAW_ECHOES.filter((e) => !isExcludedEcho(e.Id))
        .map((e) => ({ id: String(e.Id), name: e.Name, iconUrl: e.Icon }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const characterItems = useMemo(
    () => characters.map((c) => ({ id: c.id, name: c.name, iconUrl: c.iconUrl })),
    [],
  );
  const weaponItems = useMemo(
    // WeaponEntry의 종류는 typeName(「증폭기」), 그림은 icon이다 — type · iconUrl은 없다.
    () => weapons.map((w) => ({ id: w.id, name: w.name, note: w.typeName, iconUrl: w.icon })),
    [],
  );

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setDone(null);
    setBusy({ label: "사진 여는 중", done: 0, total: 1 });
    try {
      const result = await readProfileCard(file, (label, done, total) =>
        setBusy({ label, done, total }),
      );
      setRead(result);

      const character = closestBy(characters, (c) => c.name, result.characterName);
      const weapon = closestBy(weapons, (w) => w.name, result.weaponName);
      // 캐릭터는 반신 그림으로 찾은 쪽을 먼저 믿는다 — 이름 OCR보다 잘 맞는다.
      const byIcon = result.characterIcon?.characterId;
      const characterId =
        (byIcon && characters.some((c) => c.id === byIcon) ? byIcon : character?.id) ?? "";
      setDraft({
        characterId,
        characterLevel: result.characterLevel ?? 90,
        // 카드로는 못 읽는 값이라 **이미 저장해 둔 단계**에서 출발한다.
        // 0으로 두면 다시 불러올 때마다 체인이 조용히 지워진다.
        resonanceChain: characterChains[characterId] ?? 0,
        // 다섯 개를 못 읽었으면 나머지는 10으로 둔다 — 보통 다 만렙이다.
        skillLevels: SKILL_SLOTS.map((_, i) => result.skillLevels[i] ?? 10),
        weaponId: weapon?.id ?? "",
        weaponLevel: result.weaponLevel ?? 90,
        // 정련은 카드에 별 개수로만 있어서 글자로 읽을 수 없다. 1로 두고 사람이 고른다.
        weaponRefine: 1,
        echoes: result.echoes.map((e) => ({
          // 에코 이름과 화음은 카드에 글자로 없다 — 그림으로 찾은 것을 그대로 채워 둔다.
          catalogId: e.icon?.catalogId ?? "",
          fetter: e.icon?.fetter ?? "",
          iconNote: echoIconNote(e.icon),
          cost: e.cost,
          mainKey: e.mainOption.key ?? "",
          mainValue: e.mainOption.value,
          subKey: e.mainSubOption.key ?? "",
          subValue: e.mainSubOption.value,
          // 에코의 부옵션은 언제나 다섯 줄이다. OCR이 세 줄만 읽었다고 두 줄을 없애 버리면
          // 사람이 손으로 채울 자리마저 사라진다. 못 읽은 자리는 빈 줄로 남겨 둔다.
          options: Array.from({ length: 5 }, (_, n) => {
            const o = e.subOptions[n];
            return o
              ? { key: o.key ?? "", value: o.value, note: STATE_NOTE[o.state] }
              : { key: "", value: "", note: "못 읽음 — 직접 고르세요" };
          }),
        })),
      });
    } catch (err) {
      console.error("프로필 읽기 실패:", err);
      alert("사진을 읽지 못했습니다. 프로필 카드 원본인지 확인해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  const patch = (next: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...next } : d));
  const patchEcho = (i: number, next: Partial<EchoDraft>) =>
    setDraft((d) =>
      d ? { ...d, echoes: d.echoes.map((e, n) => (n === i ? { ...e, ...next } : e)) } : d,
    );

  /**
   * 부옵션 한 줄을 다른 자리로 옮긴다.
   *
   * OCR이 줄을 통째로 놓치거나 두 줄을 뒤바꿔 읽는 일이 있어서, 사람이 카드를 보고
   * 자리를 맞출 수 있어야 한다. 지우고 다시 고르는 것보다 끌어 옮기는 쪽이 빠르다.
   * 다섯 줄을 통째로 다시 늘어놓으므로 빈 줄도 함께 밀린다 — 빈 자리가 어디였는지가
   * 그대로 지켜진다(utils/ocr.ts의 pairRows 설명 참고).
   */
  const moveOption = (echo: number, from: number, to: number) =>
    setDraft((d) =>
      !d || from === to
        ? d
        : {
            ...d,
            echoes: d.echoes.map((e, n) => {
              if (n !== echo) return e;
              const options = [...e.options];
              const [moved] = options.splice(from, 1);
              options.splice(to, 0, moved);
              return { ...e, options };
            }),
          },
    );

  /** 종류와 값이 모두 있는 부옵션 줄만. 빈 줄은 저장하지 않는다. */
  const filled = (e: EchoDraft) => e.options.filter((o) => o.key && o.value);

  /**
   * 이미 가진 것과 **완전히 같은** 에코를 찾는다.
   *
   * 같은 도감 id에 주옵션 · 메인 서브옵션 · 부옵션 다섯 줄 · 화음까지 하나도 다르지 않은
   * 것만 같다고 본다. 한 자리라도 다르면 다른 에코다(같은 이름이어도 굴린 값이 다르다).
   */
  function findDuplicates(): EchoDraft[] {
    const owned = loadMyEchoes();
    return draft
      ? draft.echoes.filter(
          (e) =>
            e.catalogId &&
            owned.some(
              (o) =>
                o.id === e.catalogId &&
                o.options.mainOption.type === e.mainKey &&
                String(o.options.mainOption.value) === e.mainValue &&
                o.options.mainSubOption.type === e.subKey &&
                String(o.options.mainSubOption.value) === e.subValue &&
                (o.options.selectedFetter ?? "") === e.fetter &&
                o.options.mainSelects.join("|") === filled(e).map((x) => x.key).join("|") &&
                o.options.subSelects.join("|") === filled(e).map((x) => x.value).join("|"),
            ),
        )
      : [];
  }

  /** 적용 단추. 똑같은 에코가 이미 있으면 먼저 물어본다. */
  function apply() {
    const same = findDuplicates();
    if (same.length > 0) {
      setDuplicates(same);
      return;
    }
    runApply(true);
  }

  /** 확인이 끝난 값을 실제 설정에 넣는다. 여기서만 저장이 일어난다. */
  function runApply(keepDuplicates: boolean) {
    if (!draft) return;
    const character = characters.find((c) => c.id === draft.characterId);
    if (!character) return;

    const log: string[] = [];

    // ── 캐릭터 ──
    if (!isOwnedCharacter(character.id)) {
      toggleOwnedCharacter(character.id);
      log.push(`${character.name}을(를) 보유 캐릭터로 표시했습니다.`);
    }
    setCharacterLevel(character.id, draft.characterLevel);
    SKILL_SLOTS.forEach((slot, i) => {
      const skill = character.skills.find((s) => s.category === slot.key);
      if (skill) setSkillLevel(character.id, skill.id, draft.skillLevels[i]);
    });
    setCharacterChain(character.id, draft.resonanceChain);
    log.push(
      `레벨 ${draft.characterLevel} · 공명체인 ${draft.resonanceChain}단계 · 스킬 ${draft.skillLevels.join("/")} 로 맞췄습니다.`,
    );

    // ── 무기 ── 보유 목록에 한 자루 담고, 그것을 이 캐릭터에게 채운다.
    if (draft.weaponId) {
      const weapon = weapons.find((w) => w.id === draft.weaponId);
      addMyWeapon(draft.weaponId, draft.weaponLevel, draft.weaponRefine);
      setCharacterWeapon(character.id, draft.weaponId);
      setWeaponLevel(character.id, draft.weaponLevel);
      setWeaponRefine(character.id, draft.weaponRefine);
      log.push(
        `무기 「${weapon?.name ?? draft.weaponId}」 Lv.${draft.weaponLevel} · 정련 ${draft.weaponRefine} 을(를) 담고 장착했습니다.`,
      );
    }

    // ── 에코 ── 새로 등록하고 이 캐릭터의 다섯 자리에 그대로 끼운다.
    const owned = loadMyEchoes();
    const added: MyEcho[] = [];
    const same = keepDuplicates ? [] : findDuplicates();
    let pk = nextPk(owned);
    for (const e of draft.echoes) {
      const info = RAW_ECHOES.find((c) => String(c.Id) === e.catalogId);
      if (!info) continue;
      if (same.includes(e)) continue;
      added.push({
        pk,
        id: String(info.Id),
        name: info.Name,
        iconUrl: info.Icon,
        fetterGroups: (info.FetterGroups ?? []).map((g) => ({ name: g.Name, icon: g.Icon ?? "" })),
        options: {
          mainOption: { type: e.mainKey, value: e.mainValue, isMatched: true },
          mainSubOption: { type: e.subKey, value: e.subValue, isMatched: true },
          // 화면에는 다섯 줄을 늘 띄우지만, 끝내 안 고른 줄은 담지 않는다.
          mainSelects: filled(e).map((o) => o.key),
          subSelects: filled(e).map((o) => o.value),
          selectedFetter: e.fetter,
        },
      });
      pk += 1;
    }
    if (added.length > 0) {
      saveMyEchoes([...owned, ...added]);
      const ids = added.map((e) => e.pk);
      const links = loadEchoLinks();
      saveEchoLinks([
        ...links.filter((l) => l.characterId !== character.id && !ids.includes(l.echoId)),
        ...ids.map((echoId) => ({ characterId: character.id, echoId })),
      ]);
    }
    const unnamed = draft.echoes.filter((e) => !e.catalogId).length;
    const duplicated = draft.echoes.length - added.length - unnamed;
    log.push(
      `에코 ${added.length}개를 담고 장착했습니다.` +
        (unnamed > 0 ? ` ${unnamed}개는 어느 에코인지 안 골라서 건너뛰었습니다.` : "") +
        (duplicated > 0 ? ` ${duplicated}개는 이미 같은 것이 있어 건너뛰었습니다.` : ""),
    );

    setDuplicates(null);
    setDone(log);
  }

  const chosenCharacter = characters.find((c) => c.id === draft?.characterId);
  /** 화음을 골라야 하는데 안 고른 에코가 있으면 적용을 막는다. */
  const missingFetter =
    draft?.echoes.some((e) => e.catalogId && fetterNamesOf(e.catalogId).length > 0 && !e.fetter) ??
    false;

  return (
    <div className="page profile-import">
      <section className="panel">
        {/* 제목·설명은 왼쪽, 고르기 단추는 오른쪽 — 위아래로 쌓지 않는다. */}
        <div className="import-head">
          <div>
            <h2>디스코드 프로필 입력</h2>
            <p className="hint">
              명조 디스코드가 만들어 주는 프로필 카드 사진을 넣으면 캐릭터 · 레벨 · 스킬 레벨 ·
              무기 · 에코 다섯 개를 한 번에 읽습니다. 읽은 값은 <b>바로 저장되지 않고</b> 아래에서
              확인·수정한 뒤에 적용됩니다.
            </p>
          </div>

          <label className="file-button">
            <input type="file" accept="image/*" onChange={onPick} disabled={!!busy} />
            <span>{busy ? "읽는 중…" : "프로필 카드 사진 고르기"}</span>
          </label>
        </div>

        {busy && <ProgressBar progress={busy} />}
      </section>

      {draft && read && (
        <>
          <section className="panel">
            <h3>캐릭터 · 무기</h3>
            <div className="grid4">
              <label>
                <em>캐릭터</em>
                {/* 고른 캐릭터를 얼굴로 확인할 수 있게 아이콘을 왼쪽에 붙인다.
                    안 골랐을 때도 자리는 그대로 둔다 — 칸 높이가 들썩이지 않게. */}
                <span className="with-face">
                  <i className="face">
                    {chosenCharacter?.iconUrl && (
                      <img src={chosenCharacter.iconUrl} alt="" loading="lazy" />
                    )}
                  </i>
                  <SearchPicker
                    items={characterItems}
                    value={draft.characterId}
                    // 캐릭터를 바꾸면 체인도 그 캐릭터에 저장해 둔 값으로 따라간다 —
                    // 앞 캐릭터의 단계가 남아 엉뚱한 캐릭터에 얹히지 않게.
                    onChange={(id) =>
                      patch({ characterId: id, resonanceChain: characterChains[id] ?? 0 })
                    }
                    placeholder="캐릭터 이름 검색"
                  />
                </span>
                <small>읽은 글자: {read.characterName || "(못 읽음)"}</small>
              </label>

              <label>
                <em>캐릭터 레벨 · 공명체인</em>
                <span className="row">
                  <LevelSlider
                    value={draft.characterLevel}
                    min={1}
                    max={90}
                    onChange={(v) => patch({ characterLevel: v })}
                  />
                  <select
                    value={draft.resonanceChain}
                    onChange={(e) => patch({ resonanceChain: Number(e.target.value) })}
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        체인 {n}
                      </option>
                    ))}
                  </select>
                </span>
                <small>공명체인은 카드에 동그라미 그림으로만 있어 못 읽습니다 — 직접 고르세요.</small>
              </label>

              <label>
                <em>무기</em>
                <SearchPicker
                  items={weaponItems}
                  value={draft.weaponId}
                  onChange={(id) => patch({ weaponId: id })}
                  placeholder="무기 이름 검색"
                />
                <small>읽은 글자: {read.weaponName || "(못 읽음)"}</small>
              </label>

              <label>
                <em>무기 레벨 · 정련</em>
                <span className="row">
                  <LevelSlider
                    value={draft.weaponLevel}
                    min={1}
                    max={90}
                    onChange={(v) => patch({ weaponLevel: v })}
                  />
                  <select
                    value={draft.weaponRefine}
                    onChange={(e) => patch({ weaponRefine: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        정련 {n}
                      </option>
                    ))}
                  </select>
                </span>
                <small>정련은 카드에 별 개수로만 있어 못 읽습니다 — 직접 고르세요.</small>
              </label>
            </div>
          </section>

          <section className="panel">
            <h3>스킬 레벨</h3>
            <p className="hint">
              카드의 노드는 그림뿐이라 자리로만 구분됩니다. <b>12시에서 반시계 방향</b>으로
              읽었습니다.
            </p>
            <div className="grid5">
              {SKILL_SLOTS.map((slot, i) => (
                <label key={slot.key}>
                  <em>
                    {slot.label} <i className="where">{slot.where}</i>
                  </em>
                  <LevelSlider
                    value={draft.skillLevels[i]}
                    min={1}
                    max={10}
                    suffix="/10"
                    onChange={(level) =>
                      patch({
                        skillLevels: draft.skillLevels.map((v, n) => (n === i ? level : v)),
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <small className="hint">읽은 값: {read.skillLevels.join(" · ") || "(못 읽음)"}</small>
          </section>

          <section className="panel">
            <h3>에코 5개</h3>
            <p className="hint">
              카드에 <b>에코 이름도 화음 이름도 글자로 없습니다</b>(그림뿐입니다). 그래서
              글자 대신 <b>그림을 도감과 견줘서</b> 채웠습니다 — 코스트 왼쪽의 동그란 화음
              아이콘이 「우글글」과 「악몽 · 우글글」처럼 그림이 거의 같은 짝을 갈라 줍니다.
              미덥지 않은 자리에는 표시를 남겼으니 그것만 확인하세요. 안 고른 에코는
              등록하지 않고 넘어갑니다. 부옵션이 밀려 읽혔으면 왼쪽 손잡이(<b>⠿</b>)를
              끌어서 자리를 바꾸세요.
            </p>

            <div className="echo-drafts">
              {draft.echoes.map((e, i) => {
                const fetters = e.catalogId ? fetterNamesOf(e.catalogId) : [];
                const icon = e.catalogId ? iconUrlOf(e.catalogId) : undefined;
                return (
                  <div className="echo-draft" key={i}>
                    {/* 왼쪽 = 찾아낸 에코 그림, 오른쪽 = 위아래 두 줄로 나눈 값들 */}
                    <div className="echo-draft-icon">
                      {icon ? <img src={icon} alt="" loading="lazy" /> : <span>?</span>}
                      <em>{i + 1}번</em>
                    </div>

                    <div className="echo-draft-body">
                      <div className="echo-draft-line">
                        <label className={e.iconNote ? "wide warn" : "wide"}>
                          <em>
                            어느 에코 <i className="cost">COST {e.cost ?? "?"}</i>
                          </em>
                          <SearchPicker
                            items={echoItems}
                            value={e.catalogId}
                            // 에코가 바뀌면 화음도 다시 골라야 한다.
                            onChange={(id) =>
                              patchEcho(i, { catalogId: id, fetter: "", iconNote: "" })
                            }
                            placeholder="에코 이름 검색"
                          />
                          {e.iconNote && <small className="warn-note">{e.iconNote}</small>}
                        </label>

                        <label>
                          <em>주옵션</em>
                          <span className="row">
                            <OptionSelect
                              value={e.mainKey}
                              items={Object.keys(OPTIONS.mainOption)}
                              onChange={(v) => patchEcho(i, { mainKey: v, mainValue: "" })}
                            />
                            <OptionSelect
                              value={e.mainValue}
                              items={OPTIONS.mainOption[e.mainKey] ?? []}
                              onChange={(v) => patchEcho(i, { mainValue: v })}
                            />
                          </span>
                        </label>

                        <label>
                          <em>메인 서브옵션</em>
                          <span className="row">
                            <OptionSelect
                              value={e.subKey}
                              items={Object.keys(OPTIONS.mainSubOption)}
                              onChange={(v) => patchEcho(i, { subKey: v, subValue: "" })}
                            />
                            <OptionSelect
                              value={e.subValue}
                              items={OPTIONS.mainSubOption[e.subKey] ?? []}
                              onChange={(v) => patchEcho(i, { subValue: v })}
                            />
                          </span>
                        </label>

                        <div className={fetters.length && !e.fetter ? "fetters need" : "fetters"}>
                          <em>화음 효과</em>
                          {!e.catalogId ? (
                            <small>에코를 먼저 고르세요.</small>
                          ) : fetters.length === 0 ? (
                            <small>이 에코에는 화음이 없습니다.</small>
                          ) : (
                            fetters.map((f) => (
                              <label key={f.name} className="radio">
                                <input
                                  type="radio"
                                  name={`fetter-${i}`}
                                  checked={e.fetter === f.name}
                                  onChange={() => patchEcho(i, { fetter: f.name })}
                                />
                                {f.icon && <img src={f.icon} alt="" loading="lazy" />}
                                <span>{f.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="echo-draft-line subs">
                        {e.options.map((o, n) => {
                          const held = drag?.echo === i && drag.from === n;
                          const target = drag?.echo === i && drag.over === n && drag.from !== n;
                          return (
                            <label
                              key={n}
                              className={[o.note ? "warn" : "", held ? "held" : "", target ? "target" : ""]
                                .filter(Boolean)
                                .join(" ")}
                              // 같은 에코 안에서만 받는다. preventDefault를 해야 놓기가 열린다.
                              onDragOver={(ev) => {
                                if (drag?.echo !== i) return;
                                ev.preventDefault();
                                if (drag.over !== n) setDrag({ ...drag, over: n });
                              }}
                              onDrop={(ev) => {
                                ev.preventDefault();
                                if (drag?.echo === i) moveOption(i, drag.from, n);
                                setDrag(null);
                              }}
                            >
                              <em>
                                {/* 손잡이만 끌린다 — 칸 전체를 draggable로 두면 안의 select를
                                    건드릴 수 없다. click을 막는 것은 label이 select를 열지 않게. */}
                                <i
                                  className="grip"
                                  draggable
                                  onDragStart={() => setDrag({ echo: i, from: n, over: n })}
                                  onDragEnd={() => setDrag(null)}
                                  onClick={(ev) => ev.preventDefault()}
                                  title="끌어서 순서를 바꿉니다"
                                >
                                  ⠿
                                </i>
                                부옵션 {n + 1}
                              </em>
                              <span className="row">
                                <OptionSelect
                                  value={o.key}
                                  items={Object.keys(OPTIONS.subOption)}
                                  blank="— 없음 —"
                                  onChange={(v) =>
                                    patchEcho(i, {
                                      options: e.options.map((x, m) =>
                                        m === n ? { ...x, key: v, value: "", note: "" } : x,
                                      ),
                                    })
                                  }
                                />
                                <OptionSelect
                                  value={o.value}
                                  items={OPTIONS.subOption[o.key] ?? []}
                                  onChange={(v) =>
                                    patchEcho(i, {
                                      options: e.options.map((x, m) =>
                                        m === n ? { ...x, value: v, note: "" } : x,
                                      ),
                                    })
                                  }
                                />
                              </span>
                              {o.note && <small className="warn-note">{o.note}</small>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel apply-row">
            <button
              className="primary"
              onClick={apply}
              disabled={!chosenCharacter || missingFetter}
            >
              {!chosenCharacter
                ? "캐릭터를 먼저 고르세요"
                : missingFetter
                  ? "화음을 안 고른 에코가 있습니다"
                  : `${chosenCharacter.name}에 적용`}
            </button>
            <p className="hint">
              적용하면 캐릭터가 <b>보유 표시</b>가 되고 레벨 · 스킬 레벨이 맞춰집니다. 무기는
              보유 목록에 한 자루 담기고 그 캐릭터에게 장착됩니다. 에코도 보유 목록에 담기고 이
              캐릭터의 다섯 자리에 그대로 끼워집니다. 원래 끼워져 있던 에코는 자리에서 빠지지만
              보유 목록에서 지워지지는 않습니다.
            </p>
          </section>
        </>
      )}

      {duplicates && (
        <Dialog
          title="똑같은 에코가 이미 있습니다"
          lines={[
            `가진 것과 옵션까지 하나도 다르지 않은 에코가 ${duplicates.length}개 있습니다.`,
            duplicates
              .map((e) => RAW_ECHOES.find((c) => String(c.Id) === e.catalogId)?.Name ?? e.catalogId)
              .join(" · "),
            "그대로 담으면 목록에 같은 것이 두 벌 생깁니다.",
          ]}
          buttons={[
            { label: "중복은 빼고 담기", onClick: () => runApply(false), primary: true },
            { label: "그대로 담기", onClick: () => runApply(true) },
            { label: "취소", onClick: () => setDuplicates(null) },
          ]}
          onDismiss={() => setDuplicates(null)}
        />
      )}

      {done && (
        <Dialog
          title="적용했습니다"
          lines={done}
          buttons={[{ label: "확인", onClick: () => setDone(null), primary: true }]}
          onDismiss={() => setDone(null)}
        />
      )}
    </div>
  );
}
