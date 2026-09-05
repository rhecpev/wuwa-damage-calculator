import type { Echo } from "../../../types/game";
import { useState, useEffect } from "react";
import echoOptionData from "../../../data/echoOption.json";

interface EchoDetailModalProps {
  echo: Echo & { iconUrl?: string; fetterGroups?: Array<{ name: string; icon: string }>; options?: { mainOption: { type: string; value: string }; mainSubOption: { type: string; value: string }; mainSelects: string[]; subSelects: string[]; selectedFetter: string } };
  isEditing?: boolean;
  onSave: (data: { mainOption: { type: string; value: string }; mainSubOption: { type: string; value: string }; mainSelects: string[]; subSelects: string[]; selectedFetter: string }) => void;
  onUpdate?: (data: { mainOption: { type: string; value: string }; mainSubOption: { type: string; value: string }; mainSelects: string[]; subSelects: string[]; selectedFetter: string }) => void;
  onCancel: () => void;
}

const buildOptionsData = (): { main: string[]; sub: Record<string, (string | number)[]> } => {
  const mainOptions: string[] = ["선택", ...Object.keys(echoOptionData.subOption || {})];
  const subOptions: Record<string, (string | number)[]> = { 선택: [] };

  Object.entries(echoOptionData.subOption || {}).forEach(([key, values]) => {
    subOptions[key] = values as (string | number)[];
  });

  return {
    main: mainOptions,
    sub: subOptions
  };
};

const optionsData = buildOptionsData();

const MAIN_OPTIONS = Object.keys(echoOptionData.mainOption || {});

const formatValue = (val: number | string): string => {
  const num = Number(val);
  if (Number.isInteger(num) && !String(val).includes('.')) {
    return num.toFixed(1);
  }
  return String(val);
};

export function EchoDetailModal({ echo, isEditing = false, onSave, onUpdate, onCancel }: EchoDetailModalProps) {
  const [mainOption, setMainOption] = useState<string>(
    echo.options?.mainOption?.type || ""
  );
  const [mainOptionValue, setMainOptionValue] = useState<string>(
    echo.options?.mainOption?.value || ""
  );
  const [mainSubOption, setMainSubOption] = useState<string>(
    echo.options?.mainSubOption?.type || ""
  );
  const [mainSubOptionValue, setMainSubOptionValue] = useState<string>(
    echo.options?.mainSubOption?.value || ""
  );
  const [mainSelects, setMainSelects] = useState<string[]>(
    echo.options?.mainSelects || Array(5).fill("")
  );
  const [subSelects, setSubSelects] = useState<string[]>(
    echo.options?.subSelects || Array(5).fill("")
  );
  const [selectedFetter, setSelectedFetter] = useState<string>(
    echo.options?.selectedFetter || ""
  );
  const [error, setError] = useState<string>("");
  const [isMainOptionApproximate, setIsMainOptionApproximate] = useState<boolean>(
    (echo.options?.mainOption as any)?.isApproximate || false
  );
  const [isMainSubOptionApproximate, setIsMainSubOptionApproximate] = useState<boolean>(
    (echo.options?.mainSubOption as any)?.isApproximate || false
  );
  const [isSubApproximate, setIsSubApproximate] = useState<boolean[]>(
    (echo.options as any)?.isSubApproximate || Array(5).fill(false)
  );

  // echo prop이 변경될 때마다 state 업데이트
  useEffect(() => {
    console.log("EchoDetailModal echo prop 업데이트:", echo);
    console.log("echo.options:", echo.options);

    setMainOption(echo.options?.mainOption?.type || "");
    setMainOptionValue(echo.options?.mainOption?.value || "");
    setMainSubOption(echo.options?.mainSubOption?.type || "");
    setMainSubOptionValue(echo.options?.mainSubOption?.value || "");
    setMainSelects(echo.options?.mainSelects || Array(5).fill(""));
    setSubSelects(echo.options?.subSelects || Array(5).fill(""));
    setSelectedFetter(echo.options?.selectedFetter || "");
    setIsMainOptionApproximate((echo.options?.mainOption as any)?.isApproximate || false);
    setIsMainSubOptionApproximate((echo.options?.mainSubOption as any)?.isApproximate || false);
    setIsSubApproximate((echo.options as any)?.isSubApproximate || Array(5).fill(false));
  }, [echo]);

  const handleMainSelectChange = (rowIdx: number, value: string) => {
    const newMainSelects = [...mainSelects];
    newMainSelects[rowIdx] = value;
    setMainSelects(newMainSelects);

    const newSubSelects = [...subSelects];
    const firstSubValue = (optionsData.sub as Record<string, (string | number)[]>)[value]?.[0];
    newSubSelects[rowIdx] = firstSubValue ? String(firstSubValue) : "";
    setSubSelects(newSubSelects);
    setError("");
  };

  const handleSubSelectChange = (rowIdx: number, value: string) => {
    const newSubSelects = [...subSelects];
    newSubSelects[rowIdx] = value;
    setSubSelects(newSubSelects);
    setError("");
  };

  const validateAndSave = () => {
    if (!mainOption) {
      setError("주옵션을 선택해주세요.");
      return;
    }

    if (!mainOptionValue) {
      setError("주옵션 수치를 선택해주세요.");
      return;
    }

    if (!mainSubOption) {
      setError("메인 서브옵션을 선택해주세요.");
      return;
    }

    if (!mainSubOptionValue) {
      setError("메인 서브옵션 값을 선택해주세요.");
      return;
    }

    const hasEmptySubOption = subSelects.some(sub => sub === "");
    if (hasEmptySubOption) {
      setError("모든 부옵션을 선택해주세요.");
      return;
    }

    const hasFetterGroups = echo.fetterGroups && echo.fetterGroups.length > 0;
    if (hasFetterGroups && !selectedFetter) {
      setError("세트 효과를 선택해주세요.");
      return;
    }

    const data = {
      mainOption: { type: mainOption, value: mainOptionValue },
      mainSubOption: { type: mainSubOption, value: mainSubOptionValue },
      mainSelects,
      subSelects,
      selectedFetter
    };
    if (isEditing && onUpdate) {
      onUpdate(data);
    } else {
      onSave(data);
    }
  };

  const getMainOptions = (rowIdx: number): string[] => {
    const selectedMainsInOtherRows = mainSelects
      .map((val, idx) => idx !== rowIdx ? val : "")
      .filter(val => val !== "" && val !== "선택");

    return optionsData.main.filter(
      main => !selectedMainsInOtherRows.includes(main)
    );
  };

  const getSubOptions = (rowIdx: number): string[] => {
    const mainValue = mainSelects[rowIdx];
    if (!mainValue || mainValue === "선택") return [];
    const subs = (optionsData.sub as Record<string, (string | number)[]>)[mainValue] || [];
    return subs.map(String);
  };

  return (
    <section className="panel" style={{ maxWidth: "900px", margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}>에코 저장</h2>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#ccc" }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        {/* 왼쪽: 이미지 */}
        <div style={{ flex: "0 0 250px" }}>
          {echo.iconUrl && (
            <img
              src={echo.iconUrl}
              alt={echo.name}
              style={{
                width: "100%",
                height: "250px",
                borderRadius: "8px",
                objectFit: "cover",
                border: "1px solid #3b4457",
              }}
            />
          )}
        </div>

        {/* 오른쪽: 정보 */}
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: "24px", display: "block", marginBottom: "12px" }}>
            {echo.name}
          </strong>

          {/* 세트 효과 */}
          {echo.fetterGroups && echo.fetterGroups.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <small style={{ color: "#9a9a9a", display: "block", marginBottom: "8px" }}>세트 효과</small>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {echo.fetterGroups.map((fg: any, idx: number) => (
                  <label
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: selectedFetter === fg.name ? "#476176" : "#3c455c",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      border: selectedFetter === fg.name ? "1px solid #4a9eff" : "1px solid #4a5266",
                      transition: "all 0.2s"
                    }}
                  >
                    <input
                      type="radio"
                      name="fetter"
                      value={fg.name}
                      checked={selectedFetter === fg.name}
                      onChange={(e) => setSelectedFetter(e.target.value)}
                      style={{ display: "none" }}
                    />
                    {fg.icon && (
                      <img src={fg.icon} alt="" style={{ width: "20px", height: "20px" }} />
                    )}
                    <span style={{ color: "#ccc" }}>{fg.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 주옵션 */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#9a9a9a" }}>
                주옵션
              </label>
              <select
                value={mainOption}
                onChange={(e) => {
                  setMainOption(e.target.value);
                  const firstValue = (echoOptionData.mainOption as Record<string, string[]>)[e.target.value]?.[0];
                  setMainOptionValue(firstValue ? String(firstValue) : "");
                  setError("");
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "#3c455c",
                  color: "#fff",
                  border: "1px solid #4a5266",
                  borderRadius: "4px",
                  fontSize: "13px",
                }}
              >
                <option value="">선택</option>
                {MAIN_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {mainOption && (
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#9a9a9a" }}>
                  수치
                </label>
                <select
                  value={mainOptionValue}
                  onChange={(e) => {
                    setMainOptionValue(e.target.value);
                    setError("");
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#3c455c",
                    color: "#fff",
                    border: "1px solid #4a5266",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                >
                  <option value="">선택</option>
                  {mainOption && (echoOptionData.mainOption as Record<string, string[]>)[mainOption]?.map((val) => (
                    <option key={val} value={formatValue(val)}>
                      {formatValue(val)}
                    </option>
                  ))}
                </select>
                {isMainOptionApproximate && (
                  <div style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "#ff6b6b",
                    fontWeight: "600"
                  }}>
                    ⚠️ 수치를 확인해주세요
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 메인 서브옵션 */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#9a9a9a" }}>
                메인 서브옵션
              </label>
              <select
                value={mainSubOption}
                onChange={(e) => {
                  setMainSubOption(e.target.value);
                  const firstValue = (echoOptionData.mainSubOption as Record<string, string[]>)[e.target.value]?.[0];
                  setMainSubOptionValue(firstValue ? String(firstValue) : "");
                  setError("");
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "#3c455c",
                  color: "#fff",
                  border: "1px solid #4a5266",
                  borderRadius: "4px",
                  fontSize: "13px",
                }}
              >
                <option value="">선택</option>
                {Object.keys(echoOptionData.mainSubOption || {}).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
            {mainSubOption && (
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#9a9a9a" }}>
                  값
                </label>
                <select
                  value={mainSubOptionValue}
                  onChange={(e) => {
                    setMainSubOptionValue(e.target.value);
                    setError("");
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#3c455c",
                    color: "#fff",
                    border: "1px solid #4a5266",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                >
                  <option value="">선택</option>
                  {mainSubOption && (echoOptionData.mainSubOption as Record<string, string[]>)[mainSubOption]?.map((val) => (
                    <option key={val} value={formatValue(val)}>
                      {formatValue(val)}
                    </option>
                  ))}
                </select>
                {isMainSubOptionApproximate && (
                  <div style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "#ff6b6b",
                    fontWeight: "600"
                  }}>
                    ⚠️ 수치를 확인해주세요
                  </div>
                )}
              </div>
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #4a5266", margin: "16px 0" }} />

          {/* 셀렉트박스 2개씩 5개 (메인옵션 + 부옵션) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {Array.from({ length: 5 }).map((_, rowIdx) => (
              <div key={`row-${rowIdx}`} style={{ display: "contents" }}>
                {/* 메인옵션 */}
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#9a9a9a" }}>
                    부옵션 {rowIdx + 1}
                  </label>
                  <select
                    value={mainSelects[rowIdx]}
                    onChange={(e) => handleMainSelectChange(rowIdx, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "#3c455c",
                      color: "#fff",
                      border: "1px solid #4a5266",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                  >
                    {getMainOptions(rowIdx).map((opt: string) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 부옵션 */}
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "transparent" }}>
                    &nbsp;
                  </label>
                  <select
                    value={subSelects[rowIdx]}
                    onChange={(e) => handleSubSelectChange(rowIdx, e.target.value)}
                    disabled={!mainSelects[rowIdx] || mainSelects[rowIdx] === "선택"}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "#3c455c",
                      color: "#fff",
                      border: "1px solid #4a5266",
                      borderRadius: "4px",
                      fontSize: "14px",
                      opacity: !mainSelects[rowIdx] || mainSelects[rowIdx] === "선택" ? 0.5 : 1,
                    }}
                  >
                    <option value="">선택</option>
                    {getSubOptions(rowIdx).map((sub: string) => (
                      <option key={sub} value={formatValue(sub)}>
                        {formatValue(sub)}
                      </option>
                    ))}
                  </select>
                  {isSubApproximate[rowIdx] && (
                    <div style={{
                      marginTop: "4px",
                      fontSize: "11px",
                      color: "#ff6b6b",
                      fontWeight: "600"
                    }}>
                      ⚠️ 수치를 확인해주세요
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: "12px",
          marginBottom: "12px",
          background: "#553e3e",
          border: "1px solid #966262",
          borderRadius: "6px",
          color: "#ff6b6b",
          fontSize: "14px",
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={validateAndSave}
          style={{
            flex: 1,
            padding: "14px",
            background: "#4a9eff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          {isEditing ? "수정" : "저장"}
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "14px",
            background: "#3c455c",
            color: "#ccc",
            border: "1px solid #4a5266",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          취소
        </button>
      </div>
    </section>
  );
}
