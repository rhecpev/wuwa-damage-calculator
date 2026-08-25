import { useMemo, useState } from "react";
import { calculateDamage } from "./calculator/damage";
import { calculateFinalStats } from "./calculator/stats";
import { buffs, characters, echoes, enemies, templates, weapons } from "./data/sampleData";
import type { PartyConfig } from "./types/game";

const mainCharacter = characters.find((c) => c.id === "main-dps")!;

function findAttack(id: string) {
  return mainCharacter.skills.flatMap((s) => s.attacks).find((a) => a.id === id);
}

type Result = {
  item: PartyConfig["rotation"][number];
  attack: NonNullable<ReturnType<typeof findAttack>>;
  activeBuffs: typeof buffs;
  stats: ReturnType<typeof calculateFinalStats>;
  damage: ReturnType<typeof calculateDamage>;
};

export default function App() {
  const [config, setConfig] = useState<PartyConfig>(templates[0].config);
  const [selectedId, setSelectedId] = useState<string | null>(
    config.rotation[0]?.id ?? null,
  );

  const weapon = weapons.find((w) => w.id === config.mainDps.weaponId)!;

  const mainEchoes = config.mainDps.echoIds
    .map((id) => echoes.find((e) => e.id === id))
    .filter((e): e is (typeof echoes)[number] => e !== undefined);

  const results = useMemo<Result[]>(() => {
    const output: Result[] = [];
    const enemy = enemies.find((e) => e.id === config.enemyId);
    if (!enemy) return output;

    for (const item of config.rotation) {
      const attack = findAttack(item.attackId);
      if (!attack) continue;

      const activeBuffs = item.activeBuffIds
        .map((id) => buffs.find((b) => b.id === id))
        .filter((b): b is (typeof buffs)[number] => b !== undefined);

      const stats = calculateFinalStats(
        mainCharacter,
        weapon,
        mainEchoes,
        activeBuffs,
        config.mainDps.resonanceChain ?? 0,
      );

      output.push({
        item,
        attack,
        activeBuffs,
        stats,
        damage: calculateDamage(attack, mainCharacter, stats, activeBuffs, enemy),
      });
    }

    return output;
  }, [config, weapon, mainEchoes]);

  const total = results.reduce(
    (sum, result) => sum + result.damage.expectedDamage,
    0,
  );

  const selected = results.find((result) => result.item.id === selectedId) ?? null;

  function addAttack(attackId: string) {
    const item = {
      id: crypto.randomUUID(),
      attackId,
      activeBuffIds: [],
    };

    setConfig((current) => ({
      ...current,
      rotation: [...current.rotation, item],
    }));
    setSelectedId(item.id);
  }

  function toggleBuff(rotationId: string, buffId: string) {
    setConfig((current) => ({
      ...current,
      rotation: current.rotation.map((item) => {
        if (item.id !== rotationId) return item;

        const active = item.activeBuffIds.includes(buffId);

        return {
          ...item,
          activeBuffIds: active
            ? item.activeBuffIds.filter((id) => id !== buffId)
            : [...item.activeBuffIds, buffId],
        };
      }),
    }));
  }

  function removeAttack(id: string) {
    setConfig((current) => ({
      ...current,
      rotation: current.rotation.filter((item) => item.id !== id),
    }));

    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  function setMainResonanceChain(chain: number) {
    setConfig((current) => ({
      ...current,
      mainDps: { ...current.mainDps, resonanceChain: chain },
    }));
  }

  function loadTemplate(id: string) {
    const template = templates.find((t) => t.id === id);
    if (!template) return;

    const next = structuredClone(template.config);
    setConfig(next);
    setSelectedId(next.rotation[0]?.id ?? null);
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <small>WUTHERING WAVES</small>
          <h1>명조 피해량 계산기</h1>
          <p>파티 → 버프 → 공격 루틴 → 타격별 피해량</p>
        </div>

        <select defaultValue="" onChange={(e) => loadTemplate(e.target.value)}>
          <option value="" disabled>
            기본 템플릿 불러오기
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </header>

      <section className="party">
        {[
          ["메인 딜러", config.mainDps.characterId, true],
          ["서브 딜러", config.subDps.characterId, false],
          ["서포터", config.support.characterId, false],
        ].map(([role, id, isMain]) => {
          const character = characters.find((c) => c.id === id);
          if (!character) return null;

          return (
            <article key={role as string}>
              <small>{role}</small>
              {character.iconUrl && (
                <img
                  src={character.iconUrl}
                  alt={character.name}
                  width={56}
                  height={56}
                  style={{ borderRadius: "50%" }}
                />
              )}
              <strong>{character.name}</strong>
              <span>
                {character.element} · {character.weaponType}
              </span>
              {isMain && (
                <label>
                  <small>공명체인</small>
                  <select
                    value={config.mainDps.resonanceChain ?? 0}
                    onChange={(e) =>
                      setMainResonanceChain(Number(e.target.value))
                    }
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? "미보유" : `${n}체인`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </article>
          );
        })}
      </section>

      <section className="panel">
        <small>ATTACK PALETTE</small>
        <h2>공격 추가</h2>

        <div className="palette">
          {mainCharacter.skills.flatMap((s) => s.attacks).map((attack) => (
            <button key={attack.id} onClick={() => addAttack(attack.id)}>
              {attack.name}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="row">
          <div>
            <small>ROTATION</small>
            <h2>공격 루틴</h2>
          </div>
          <strong>
            기대 총 피해량 {Math.round(total).toLocaleString()}
          </strong>
        </div>

        <div className="scroll">
          <div className="rotation">
            {results.map((result, index) => (
              <div className="item" key={result.item.id}>
                <button
                  className={`card ${
                    selectedId === result.item.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedId(result.item.id)}
                >
                  <span>
                    {index + 1}. {result.attack.name}
                  </span>
                  <b>
                    {Math.round(result.damage.expectedDamage).toLocaleString()}
                  </b>
                  <small>
                    치명타{" "}
                    {Math.round(result.damage.criticalDamage).toLocaleString()}
                  </small>
                </button>

                <button
                  className="x"
                  onClick={() => removeAttack(result.item.id)}
                >
                  ×
                </button>

                {index < results.length - 1 && <em>→</em>}
              </div>
            ))}

            {results.length === 0 && (
              <div className="empty">
                위의 공격을 클릭해서 딜사이클을 만들어보세요.
              </div>
            )}
          </div>
        </div>
      </section>

      {selected && (
        <section className="details">
          <article className="panel">
            <small>SELECTED ATTACK</small>
            <h2>{selected.attack.name}</h2>

            <div className="stats">
              <div>
                <small>스킬 계수 (합산 · {selected.attack.hits.length}히트)</small>
                <b>
                  {(
                    selected.attack.hits.reduce(
                      (sum, levels) =>
                        sum +
                        (levels[selected.attack.skillLevel - 1] ??
                          levels.at(-1) ??
                          0),
                      0,
                    ) * 100
                  ).toFixed(2)}
                  %
                </b>
              </div>
              <div>
                <small>공격력</small>
                <b>{Math.round(selected.stats.atk).toLocaleString()}</b>
              </div>
              <div>
                <small>일반 피해</small>
                <b>
                  {Math.round(selected.damage.normalDamage).toLocaleString()}
                </b>
              </div>
              <div>
                <small>치명타 피해</small>
                <b>
                  {Math.round(selected.damage.criticalDamage).toLocaleString()}
                </b>
              </div>
              <div>
                <small>기대 피해</small>
                <b>
                  {Math.round(selected.damage.expectedDamage).toLocaleString()}
                </b>
              </div>
              <div>
                <small>치명타 확률</small>
                <b>{(selected.stats.critRate * 100).toFixed(1)}%</b>
              </div>
            </div>
          </article>

          <article className="panel">
            <small>BUFFS</small>
            <h2>이 공격에 적용할 버프</h2>

            <div className="buffs">
              {buffs.map((buff) => {
                const checked = selected.item.activeBuffIds.includes(buff.id);

                return (
                  <label key={buff.id} className={checked ? "on" : ""}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleBuff(selected.item.id, buff.id)
                      }
                    />
                    <span>
                      <b>{buff.name}</b>
                      <small>
                        {buff.source} · {buff.description}
                      </small>
                    </span>
                  </label>
                );
              })}
            </div>
          </article>
        </section>
      )}

      <footer>
        현재는 구조 검증용 샘플 데이터입니다. 실제 게임 데이터는 src/data에
        입력하면 됩니다.
      </footer>
    </main>
  );
}
