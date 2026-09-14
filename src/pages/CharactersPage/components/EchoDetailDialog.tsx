import { useEffect } from "react";
import { characters } from "../../../data/sampleData";
import { echoAbility, echoesById, fetterEffects } from "../../../data/echoes";

interface EchoDetailDialogProps {
  /** 보유 에코 한 개(loadMyEchoes의 줄). */
  echo: any;
  /** 이 에코를 끼고 있는 캐릭터 id. 없으면 미장착. */
  ownerId?: string;
  /** 그 캐릭터의 몇 번째 슬롯인지(0 = 메인). */
  slotIndex?: number;
  onClose: () => void;
}

/**
 * 에코 한 개의 모든 정보를 한 자리에 모아 보여준다.
 * 도감 정보(희귀도 · 속성 · 고를 수 있는 화음) · 내 옵션(메인 · 부옵션) ·
 * 에코 어빌리티 · 화음 세트 효과 순서다. 보여주기 전용이라 고치는 기능은 없다.
 */
export function EchoDetailDialog({ echo, ownerId, slotIndex, onClose }: EchoDetailDialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const entry = echoesById.get(String(echo.id));
  const ability = echoAbility(String(echo.id));
  const owner = ownerId ? characters.find((c) => c.id === ownerId) : undefined;
  const options = echo.options ?? {};
  const selectedFetter: string = options.selectedFetter ?? "";
  const groups: { name: string; icon: string | null }[] =
    entry?.fetterGroups ?? echo.fetterGroups ?? [];
  const subs: [string, string][] = (options.mainSelects ?? [])
    .map((key: string, i: number) => [key, options.subSelects?.[i] ?? ""] as [string, string])
    .filter(([key]: [string, string]) => key);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog echo-detail" onClick={(e) => e.stopPropagation()}>
        <div className="echo-detail-head">
          <span className="echo-detail-icon">
            {(echo.iconUrl ?? entry?.icon) && (
              <img src={echo.iconUrl ?? entry?.icon ?? ""} alt="" loading="lazy" />
            )}
          </span>
          <div>
            <h3>{echo.name}</h3>
            <span className="echo-detail-tags">
              {entry && <em>★{entry.rarity + 1}</em>}
              {echo.cost !== undefined && <em>COST {echo.cost}</em>}
              {entry?.elementName && (
                <em>
                  {entry.elementIcon && <img src={entry.elementIcon} alt="" loading="lazy" />}
                  {entry.elementName}
                </em>
              )}
              <em>도감 #{echo.id}</em>
            </span>
          </div>
          <button className="formula-close" onClick={onClose}>
            ×
          </button>
        </div>

        <h4 className="echo-heading">장착</h4>
        <p className="echo-detail-line">
          {owner ? (
            <>
              {owner.name} · {slotIndex === 0 ? "메인 슬롯" : `${(slotIndex ?? 0) + 1}번 슬롯`}
            </>
          ) : (
            "미장착"
          )}
        </p>

        <h4 className="echo-heading">옵션</h4>
        <table className="echo-detail-table">
          <tbody>
            <tr>
              <th>메인</th>
              <td>{options.mainOption?.type || "—"}</td>
              <td>{options.mainOption?.value ?? ""}</td>
            </tr>
            {options.mainSubOption?.type && (
              <tr>
                <th>고정</th>
                <td>{options.mainSubOption.type}</td>
                <td>{options.mainSubOption.value}</td>
              </tr>
            )}
            {subs.map(([key, value], i) => (
              <tr key={i}>
                <th>부옵션 {i + 1}</th>
                <td>{key}</td>
                <td>{value}</td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr>
                <th>부옵션</th>
                <td colSpan={2}>없음</td>
              </tr>
            )}
          </tbody>
        </table>

        <h4 className="echo-heading">에코 어빌리티</h4>
        {ability ? (
          <div className="echo-ability">
            {ability.cooldown ? <b><em>쿨타임 {ability.cooldown}초</em></b> : null}
            <p>{ability.skill}</p>
          </div>
        ) : (
          <p className="echo-note">어빌리티 데이터가 없습니다.</p>
        )}

        <h4 className="echo-heading">화음</h4>
        {groups.length === 0 ? (
          <p className="echo-note">화음 데이터가 없습니다.</p>
        ) : (
          <ul className="echo-fetters">
            {groups.map((group) => {
              const chosen = group.name === selectedFetter;
              return fetterEffects(group.name, chosen ? 5 : 0).map((effect) => (
                <li key={`${group.name}-${effect.key}`} className={chosen ? "on" : ""}>
                  <span className="echo-check">{chosen ? "✓" : "·"}</span>
                  <span>
                    <b>
                      {group.icon && <img src={group.icon} alt="" loading="lazy" />}
                      {group.name}
                      <em>{effect.key}세트{chosen ? " · 선택됨" : ""}</em>
                    </b>
                    <small>{effect.description}</small>
                  </span>
                </li>
              ));
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
