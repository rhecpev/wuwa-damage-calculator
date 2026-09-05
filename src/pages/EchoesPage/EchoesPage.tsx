import { useMemo, useState } from "react";
import type { Echo } from "../../types/game";
import { characters } from "../../data/sampleData";
import { loadMyEchoes, nextPk, saveMyEchoes } from "../../data/echoStore";
import { useAppState } from "../../context/AppStateContext";
import { EchoSearchDialog } from "./components/EchoSearchDialog";
import { EchoDetailModal } from "./components/EchoDetailModal";
import echoOptionData from "../../data/echoOption.json";
import echoData from "../../data/echo.json";
import { isExcludedEcho } from "../../data/echoExcludes";
import { normKey, readEchoCard, type ReadEcho } from "../../utils/ocr";
import { ProgressBar, type Progress } from "../../components/Feedback";

/**
 * 옵션 표를 **이름으로 찾아 쓰기 위한** 얇은 형.
 * JSON을 그대로 쓰면 키가 「크리티컬 피해(%)」 같은 고정 이름으로 굳어서
 * 변수로 색인할 수가 없다.
 */
const OPTION_TABLE = echoOptionData as unknown as {
  mainOption: Record<string, string[]>;
  mainSubOption: Record<string, string[]>;
  subOption: Record<string, string[]>;
};

/**
 * 고를 수 있는 에코 목록.
 *
 * 「목록에서 뺀 에코」는 화면에서 손으로 바뀔 수 있어서 모듈이 뜰 때 한 번 만들면 안 된다
 * — 뺀 직후 바로 사라지도록 부를 때마다 새로 만든다(호출부에서 useMemo로 묶는다).
 */
const buildEchoes = (): Echo[] => Array.from(
  new Map(
    ((echoData as any).Echo || [])
      // 목록에서 빼기로 한 에코(새알심 · 「이상」 중복)는 고를 수 없게 한다.
      .filter((e: any) => !isExcludedEcho(e.Id))
      .map((e: any) => ({
        id: String(e.Id),
        name: e.Name,
        cost: e.PhantomType || 1,
        stats: {},
        effects: e.FetterGroups?.[0]?.Name ? [e.FetterGroups[0].Name] : [],
        iconUrl: e.Icon,
        fetterGroups: e.FetterGroups?.map((fg: any) => ({ name: fg.Name, icon: fg.Icon })) || [],
      }))
      .map((echo: Echo) => [echo.id, echo])
  ).values()
) as Echo[];

export function EchoesPage() {
  // 제외 목록이 고정이라 한 번만 만들면 된다.
  const echoes = useMemo(() => buildEchoes(), []);

  const { selectedCharacterId } = useAppState();
  const [showEchoSearch, setShowEchoSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEcho, setSelectedEcho] = useState<Echo | null>(null);
  // 보유 에코는 브라우저에 저장한다(src/data/echoStore.ts). 서버는 쓰지 않는다.
  const [myEchoes, setMyEchoes] = useState(loadMyEchoes);

  /** 목록을 바꾸고 곧바로 저장한다. 화면 상태와 저장본이 어긋나지 않게 한 군데로 모은다. */
  const commitEchoes = (next: ReturnType<typeof loadMyEchoes>) => {
    setMyEchoes(next);
    saveMyEchoes(next);
  };
  const [isSaving, setIsSaving] = useState(false);
  const [batchEchos, setBatchEchos] = useState<any[]>([]);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  /** 사진을 읽는 동안 어디까지 왔는지. 한 장에 몇 초 걸려서 알려 주지 않으면 멈춘 줄 안다. */
  const [batchProgress, setBatchProgress] = useState<Progress | null>(null);
  const [multipleEchoDialog, setMultipleEchoDialog] = useState<any>(null);
  const [echoSearchForBatch, setEchoSearchForBatch] = useState<any>(null);
  const [selectedFetterFilter, setSelectedFetterFilter] = useState<string>("");

  function toggleEcho(characterId: string, echoId: string) {
    const character = characters.find((c) => c.id === characterId);
    if (!character) return;
    const current = character.echoIds ?? [];
    const updated = current.includes(echoId)
      ? current.filter((id) => id !== echoId)
      : current.length < 5
        ? [...current, echoId]
        : current;
    const idx = characters.indexOf(character);
    characters[idx].echoIds = updated;
  }

  const handleUpdateEcho = async (echoOptions: any) => {
    if (!selectedEcho || isSaving) return;
    setIsSaving(true);
    const selectedPk = (selectedEcho as any).pk;
    try {
      commitEchoes(
        myEchoes.map((echo) =>
          echo.pk === selectedPk ? { ...echo, options: echoOptions } : echo,
        ),
      );
      setSelectedEcho(null);
    } catch (err) {
      console.error("에코 수정 실패:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const findKeyLike = (inputText: string, keysList: string[]): { key: string; isFound: boolean } => {
    // 공백 완전 제거
    const trimmedInput = inputText.replace(/\s/g, '').toLowerCase();

    if (!trimmedInput) return { key: inputText, isFound: false };

    // Like 검색 - 입력값이 키에 포함되거나 키가 입력값에 포함되는 경우
    for (const key of keysList) {
      const trimmedKey = key.replace(/\s/g, '').toLowerCase();
      if (trimmedKey.includes(trimmedInput) || trimmedInput.includes(trimmedKey)) {
        return { key, isFound: true };
      }
    }

    // 매칭 실패
    return { key: inputText, isFound: false };
  };

  /** 화면에 그대로 찍는 값. 문자열로만 다루므로 손댈 것이 없다. */
  const formatValue = (val: number | string): string => String(val);

  /**
   * 스크린샷 한 장을 읽어 에코 등록에 쓸 값으로 바꾼다.
   *
   * 읽는 규칙은 전부 src/utils/ocr.ts에 있다(실제 사진으로 맞춰 본 내용이 거기 적혀 있다).
   * 여기서는 읽은 결과를 이 화면이 쓰는 모양으로 옮기기만 한다.
   */
  const processImageFile = async (
    file: File,
    onProgress?: (step: string, done: number, total: number) => void,
  ): Promise<any | null> => {
    try {
      const read = await readEchoCard(file, onProgress);
      // 도감 원본이 아니라 이 화면의 목록에서 찾는다 — 목록에서 뺀 에코는 고를 수 없어야 한다.
      const byName = (name: string) =>
        echoes.find((e) => normKey(e.name) === normKey(name));

      const echo = read.match.echo && byName(read.match.echo.Name);
      if (!echo) {
        // 못 정하면 사람이 고르게 한다. 후보는 이름이 가까운 순이다.
        const results = read.match.candidates
          .map((c) => byName(c.Name))
          .filter((e): e is Echo => !!e);
        return { error: results.length ? "multiple" : "not_found", results, extracted: read };
      }
      return buildEchoResult(echo, read);
    } catch (err) {
      console.error("이미지 처리 실패:", err);
      return null;
    }
  };

  const handleBatchImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setBatchProcessing(true);
    const results: any[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const result = await processImageFile(files[i], (step, done, total) =>
        setBatchProgress({
          label: `${files.length}장 중 ${i + 1}번째 — ${step}`,
          done: i * total + done,
          total: files.length * total,
        }),
      );
      if (result) results.push(result);
    }
    setBatchEchos(results);
    setShowBatchDialog(true);
    setBatchProcessing(false);
    setBatchProgress(null);
    event.currentTarget.value = "";
  };

  const handleSelectEchoForBatch = (batchIndex: number, selectedEchoItem: any) => {
    const next = [...batchEchos];
    next[batchIndex] = buildEchoResult(selectedEchoItem, batchEchos[batchIndex].extracted);
    setBatchEchos(next);
    setMultipleEchoDialog(null);
  };

  /**
   * 읽은 값을 저장 형식으로 옮긴다.
   *
   * 값은 OCR이 읽은 숫자가 아니라 **표에서 되찾은 값**이다. 특히 주옵션·메인 서브옵션은
   * COST가 값을 완전히 정하므로, OCR이 150을 120으로 읽어도 150이 들어간다.
   * 확신이 없는 칸은 isMatched를 내려 화면에서 눈에 띄게 한다.
   */
  const buildEchoResult = (echo: any, read: ReadEcho) => ({
    success: true,
    echo,
    // 읽은 원본을 들고 다닌다 — 다른 에코로 고쳐 고를 때 다시 쓴다.
    extracted: read,
    ocr: read,
    options: {
      mainOption: {
        type: read.mainOption.key ?? "",
        value: read.mainOption.value,
        isMatched: read.mainOption.state === "정확",
      },
      mainSubOption: {
        type: read.mainSubOption.key ?? "",
        value: read.mainSubOption.value,
        isMatched: read.mainSubOption.state === "정확",
      },
      // 부옵션은 언제나 다섯 줄이다. 못 읽은 자리는 빈 줄로 남겨야 사람이 채울 수 있다.
      mainSelects: Array.from({ length: 5 }, (_, i) => read.subOptions[i]?.key ?? ""),
      subSelects: Array.from({ length: 5 }, (_, i) => read.subOptions[i]?.value ?? ""),
      selectedFetter: "",
    },
  });


  const handleBatchSave = async (echoList: any[]) => {
    setIsSaving(true);
    try {
      if (!Array.isArray(echoList)) {
        console.error("Invalid echoList received:", echoList, "type:", typeof echoList);
        throw new Error(`저장할 에코 목록이 유효하지 않습니다 (타입: ${typeof echoList})`);
      }

      const successfulEchos = echoList.filter(item => item && item.success);
      if (successfulEchos.length === 0) {
        alert("저장할 준비가 된 에코가 없습니다");
        setIsSaving(false);
        return;
      }

      // 세트 검증
      for (const item of successfulEchos) {
        if (item.echo.fetterGroups && item.echo.fetterGroups.length > 0 && !item.options?.selectedFetter) {
          alert(`${item.echo.name}: 세트를 선택해주세요.`);
          setIsSaving(false);
          return;
        }
      }

      const savedEchos: any[] = [];
      let maxPk = Math.max(...myEchoes.map(e => e.pk), 0);

      for (const item of successfulEchos) {
        const echoData = {
          id: item.echo.id,
          name: item.echo.name,
          iconUrl: (item.echo as any).iconUrl,
          fetterGroups: (item.echo as any).fetterGroups,
          options: item.options
        };

        maxPk++;
        savedEchos.push({ pk: maxPk, ...echoData });
      }

      if (savedEchos.length > 0) {
        commitEchoes([...myEchoes, ...savedEchos]);
        alert(`${savedEchos.length}개의 에코가 저장되었습니다`);
        setShowBatchDialog(false);
        setBatchEchos([]);
      } else {
        alert("저장된 에코가 없습니다");
      }
    } catch (err) {
      console.error("에코 저장 실패:", err);
      alert("저장 중 오류가 발생했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEcho = async (pk: number) => {
    try {
      commitEchoes(myEchoes.filter((echo) => echo.pk !== pk));
    } catch (err) {
      console.error("에코 삭제 실패:", err);
    }
  };

  const handleSaveEcho = async (echoOptions: any) => {
    if (!selectedEcho || isSaving) return;
    setIsSaving(true);
    if (selectedCharacterId) toggleEcho(selectedCharacterId, selectedEcho.id);

    const echoData = {
      id: selectedEcho.id,
      name: selectedEcho.name,
      iconUrl: (selectedEcho as any).iconUrl,
      fetterGroups: (selectedEcho as any).fetterGroups,
      options: echoOptions
    };

    try {
      commitEchoes([...myEchoes, { pk: nextPk(myEchoes), ...echoData }]);
      setSelectedEcho(null);
      setIsSaving(false);
    } catch (err) {
      console.error("에코 저장 실패:", err);
      setIsSaving(false);
    }
  };

  return (
    <section className="panel">
      <small>ECHO LIST</small>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>내 에코 목록 ({myEchoes.length}개)</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowEchoSearch(true)}
            style={{
              padding: "8px 16px",
              background: "#4a9eff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            + 에코 추가
          </button>
          <button
            disabled={batchProcessing}
            onClick={() => document.getElementById("singleImageUpload")?.click()}
            style={{
              padding: "8px 16px",
              background: "#6a7aef",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            그림으로 등록
          </button>
          <button
            onClick={() => document.getElementById("batchImageUpload")?.click()}
            disabled={batchProcessing}
            style={{
              padding: "8px 16px",
              background: batchProcessing ? "#727272" : "#f0ad4e",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: batchProcessing ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            {batchProcessing ? "처리 중..." : "📸 여러 장 일괄등록"}
          </button>
          <input
            id="singleImageUpload"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              const inputElement = e.currentTarget;
              if (file) {
                setBatchProcessing(true);
                processImageFile(file, (step, done, total) =>
                  setBatchProgress({ label: step, done, total }),
                ).then(result => {
                  if (result) {
                    setBatchEchos([result]);
                    setShowBatchDialog(true);
                  }
                  setBatchProcessing(false);
                  setBatchProgress(null);
                  inputElement.value = "";
                }).catch(err => {
                  console.error("이미지 처리 실패:", err);
                  setBatchProcessing(false);
                  setBatchProgress(null);
                  inputElement.value = "";
                });
              }
            }}
          />
          <input
            id="batchImageUpload"
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleBatchImageUpload}
          />
        </div>
        {batchProgress && <ProgressBar progress={batchProgress} />}
      </div>

      <EchoSearchDialog
        isOpen={showEchoSearch}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClose={() => setShowEchoSearch(false)}
        onSelectEcho={(echo) => {
          setSelectedEcho(echo as any);
          setShowEchoSearch(false);
        }}
      />

      {echoSearchForBatch && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1001,
        }}>
          <div style={{
            background: "#434343",
            padding: "20px",
            borderRadius: "8px",
            width: "90%",
            maxWidth: "500px",
            maxHeight: "80vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, color: "#fff" }}>에코 검색</h3>
              <button
                onClick={() => setEchoSearchForBatch(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#ccc" }}
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="에코 이름으로 검색..."
              value={echoSearchForBatch.searchQuery || ""}
              onChange={(e) => setEchoSearchForBatch({ ...echoSearchForBatch, searchQuery: e.target.value })}
              autoFocus
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "0",
                border: "1px solid #585858",
                borderTopLeftRadius: "4px",
                borderTopRightRadius: "4px",
                boxSizing: "border-box",
                fontSize: "14px",
                background: "#505050",
                color: "#fff",
              }}
            />

            <div
              style={{
                border: "1px solid #585858",
                borderTop: "none",
                borderBottomLeftRadius: "4px",
                borderBottomRightRadius: "4px",
                maxHeight: "300px",
                overflowY: "auto",
                background: "#4a4a4a",
              }}
            >
              {echoes
                .filter((echo) => echo.name.toLowerCase().includes((echoSearchForBatch.searchQuery || "").toLowerCase()))
                .map((echo) => (
                  <div
                    key={echo.id}
                    onClick={() => {
                      const rawEcho = (echoData as any).Echo.find((e: any) => String(e.Id) === echo.id);
                      if (rawEcho) {
                        const fetterGroups = rawEcho.FetterGroups?.map((fg: any) => ({name: fg.Name, icon: fg.Icon})) || [];
                        const newBatchEchos = [...batchEchos];
                        newBatchEchos[echoSearchForBatch.batchIndex] = {
                          success: true,
                          echo: {
                            ...echo,
                            iconUrl: rawEcho.Icon,
                            fetterGroups: fetterGroups,
                          },
                          options: {
                            mainOption: { type: "", value: "" },
                            mainSubOption: { type: "", value: "" },
                            mainSelects: [],
                            subSelects: [],
                            selectedFetter: fetterGroups.length > 0 ? fetterGroups[0].name : ""
                          }
                        };
                        setBatchEchos(newBatchEchos);
                        setEchoSearchForBatch(null);
                      }
                    }}
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #585858",
                      cursor: "pointer",
                      transition: "background 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#505050")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#4a4a4a")}
                  >
                    {echo.iconUrl && (
                      <img
                        src={echo.iconUrl}
                        alt={echo.name}
                        style={{ width: "32px", height: "32px", flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: "#fff" }}>{echo.name}</strong>
                      {(() => {
                        const rawEcho = (echoData as any).Echo.find((e: any) => String(e.Id) === echo.id);
                        const fetterGroups = rawEcho?.FetterGroups?.map((fg: any) => ({name: fg.Name, icon: fg.Icon})) || [];
                        return fetterGroups.length > 0 ? (
                          <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                            {fetterGroups.map((fg: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  background: "#585858",
                                  padding: "4px 8px",
                                  borderRadius: "3px",
                                  fontSize: "12px",
                                }}
                              >
                                {fg.icon && (
                                  <img src={fg.icon} alt="" style={{ width: "16px", height: "16px" }} />
                                )}
                                <span style={{ color: "#ccc" }}>{fg.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                ))}
              {echoes.filter((echo) => echo.name.toLowerCase().includes((echoSearchForBatch.searchQuery || "").toLowerCase())).length === 0 && (
                <div style={{ padding: "12px", color: "#727272", textAlign: "center" }}>
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {multipleEchoDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1001,
        }}>
          <div style={{
            background: "#2d3a52",
            borderRadius: "8px",
            border: "1px solid #4a5266",
            padding: "24px",
            width: "min(820px, 92vw)",
            maxHeight: "min(680px, 90vh)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#4a9eff" }}>
              에코 선택
            </div>
            <div style={{ fontSize: "14px", color: "#9a9a9a" }}>
              "{multipleEchoDialog.extracted?.name || '알 수 없음'}"과 일치하는 에코를 고르세요.
              왼쪽은 이미지에서 추린 후보, 오른쪽은 전체 목록입니다.
            </div>

            {(() => {
              const query = (multipleEchoDialog.searchQuery || "").trim().toLowerCase();
              const candidates = (multipleEchoDialog.results ?? []) as any[];
              const all = query
                ? echoes.filter((e) => e.name.toLowerCase().includes(query))
                : echoes;

              /** 두 목록이 같은 모양으로 보이도록 한 줄을 함께 그린다. */
              const row = (echo: any, highlight: boolean) => (
                <button
                  key={echo.id}
                  onClick={() => handleSelectEchoForBatch(multipleEchoDialog.batchIndex, echo)}
                  style={{
                    padding: "8px 10px",
                    background: highlight ? "#3f4d68" : "#3c455c",
                    border: `1px solid ${highlight ? "#4a9eff" : "#4a5266"}`,
                    borderRadius: "4px",
                    color: "#4a9eff",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#4a5266";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#4a9eff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = highlight
                      ? "#3f4d68"
                      : "#3c455c";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = highlight
                      ? "#4a9eff"
                      : "#4a5266";
                  }}
                >
                  {echo.iconUrl && (
                    <img
                      src={echo.iconUrl}
                      alt=""
                      style={{ width: "30px", height: "30px", flexShrink: 0 }}
                    />
                  )}
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {echo.name}
                  </span>
                </button>
              );

              const listBox = {
                display: "flex",
                flexDirection: "column" as const,
                gap: "6px",
                maxHeight: "340px",
                overflowY: "auto" as const,
                paddingRight: "4px",
              };
              const head = { fontSize: "12px", color: "#808080", fontWeight: 700 as const };

              return (
                <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "16px" }}>
                  {/* 왼쪽 — 이미지에서 추린 후보 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
                    <div style={head}>후보 {candidates.length}개</div>
                    <div style={listBox}>
                      {candidates.map((echo) => row(echo, true))}
                      {candidates.length === 0 && (
                        <div style={{ padding: "12px", color: "#808080", fontSize: "12px" }}>
                          추린 후보가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽 — 전체 목록에서 직접 찾기 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
                    <input
                      type="text"
                      placeholder="전체 목록에서 이름으로 검색..."
                      value={multipleEchoDialog.searchQuery || ""}
                      onChange={(e) =>
                        setMultipleEchoDialog({
                          ...multipleEchoDialog,
                          searchQuery: e.target.value,
                        })
                      }
                      style={{
                        padding: "9px 12px",
                        background: "#3c455c",
                        border: "1px solid #4a5266",
                        borderRadius: "4px",
                        color: "#fff",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={head}>
                      전체 {all.length}개{query ? " (검색 결과)" : ""}
                    </div>
                    <div style={listBox}>
                      {all.map((echo: any) => row(echo, false))}
                      {all.length === 0 && (
                        <div style={{ padding: "12px", color: "#808080", fontSize: "12px" }}>
                          찾는 에코가 없습니다. 이름 일부만 입력해 보세요.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => setMultipleEchoDialog(null)}
              style={{
                padding: "10px 16px",
                background: "#4a5266",
                border: "1px solid #585f72",
                borderRadius: "4px",
                color: "#ccc",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

{showBatchDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#2d3a52",
            borderRadius: "8px",
            border: "1px solid #4a5266",
            padding: "24px",
            maxWidth: "95vw",
            maxHeight: "90vh",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: "#4a9eff", margin: 0 }}>에코 일괄 등록 ({batchEchos.filter(b => b.success).length}개)</h3>
              <button
                onClick={() => { setShowBatchDialog(false); setBatchEchos([]); }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#ccc"
                }}
              >
                ✕
              </button>
            </div>

            {/* 카드는 가로로 늘어서고, 부옵션이 많아 세로로 넘치면 각 카드가 스스로 스크롤한다.
                줄 전체를 세로로 굴리면 카드 머리(에코 이름)까지 같이 올라가 버려서 이렇게 뒀다. */}
            <div style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",
              gap: "16px",
              maxHeight: "calc(90vh - 150px)",
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: "8px"
            }}>
              {batchEchos.map((item, idx) => (
                <div key={idx} style={{
                  padding: "16px",
                  border: "1px solid #4a5266",
                  borderRadius: "6px",
                  background: item.success ? "#3c455c" : "#603b3b",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  width: "380px",
                  flexShrink: 0,
                  // 내용이 길면 이 카드 안에서 세로로 굴린다.
                  overflowY: "auto",
                  overflowX: "hidden"
                }}>
                  {item.success ? (
                    <>
                      <div style={{ color: "#7fc3ff", fontWeight: "bold", fontSize: "16px" }}>
                        {item.echo.name}
                      </div>

                      {item.echo.iconUrl && (
                        <img
                          src={item.echo.iconUrl}
                          alt={item.echo.name}
                          style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "4px",
                            border: "1px solid #4a5266"
                          }}
                        />
                      )}

                      {/* 세트 선택 */}
                      {item.echo.fetterGroups && item.echo.fetterGroups.length > 0 && (
                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "#9a9a9a", marginBottom: "8px" }}>
                            세트
                          </label>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {item.echo.fetterGroups.map((fg: any, fgIdx: number) => (
                              <label
                                key={fgIdx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: item.options?.selectedFetter === fg.name ? "#476176" : "#3c455c",
                                  padding: "8px 12px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  border: item.options?.selectedFetter === fg.name ? "1px solid #4a9eff" : "1px solid #4a5266",
                                  transition: "all 0.2s"
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`fetter-${idx}`}
                                  value={fg.name}
                                  checked={item.options?.selectedFetter === fg.name}
                                  onChange={(e) => {
                                    const newBatchEchos = [...batchEchos];
                                    newBatchEchos[idx].options.selectedFetter = e.target.value;
                                    setBatchEchos(newBatchEchos);
                                  }}
                                  style={{ display: "none" }}
                                />
                                {fg.icon && (
                                  <img src={fg.icon} alt="" style={{ width: "16px", height: "16px" }} />
                                )}
                                <span style={{ fontSize: "12px", color: item.options?.selectedFetter === fg.name ? "#fff" : "#ccc" }}>{fg.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 주옵션 선택 */}
                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#9a9a9a", marginBottom: "6px" }}>
                          주옵션
                        </label>
                        <select
                          value={item.options?.mainOption?.type || ""}
                          onChange={(e) => {
                            const selectedType = e.target.value;
                            const mainOptionValues = (echoOptionData.mainOption as Record<string, string[]>)?.[selectedType] || [];
                            console.log("🔍 [배치 주옵션 선택]", {
                              선택값: selectedType,
                              가능한값: mainOptionValues,
                              첫번째값: mainOptionValues[0]
                            });
                            const newBatchEchos = [...batchEchos];
                            newBatchEchos[idx].options.mainOption = {
                              type: selectedType,
                              value: formatValue(mainOptionValues[0]) || "",
                              isMatched: true
                            };
                            setBatchEchos(newBatchEchos);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px",
                            background: "#2d3a52",
                            border: !item.options?.mainOption?.isMatched ? "2px solid #ff6b6b" : "1px solid #4a5266",
                            borderRadius: "4px",
                            color: "#7fc3ff",
                            fontSize: "12px"
                          }}
                        >
                          <option value="">선택</option>
                          {Object.keys(echoOptionData.mainOption || {}).map(key => (
                            <option key={key} value={key}>{key}</option>
                          ))}
                        </select>
                        {!item.options?.mainOption?.isMatched && (
                          <div style={{
                            marginTop: "6px",
                            fontSize: "12px",
                            color: "#ff6b6b",
                            fontWeight: "600"
                          }}>
                            ⚠️ 수동입력이 필요합니다
                          </div>
                        )}
                      </div>

                      {/* 주옵션 값 선택 */}
                      {/* 확신이 없을 때야말로 사람이 골라야 한다 — isMatched로 숨기지 않는다. */}
                      {item.options?.mainOption?.type && (
                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "#9a9a9a", marginBottom: "6px" }}>
                            {item.options.mainOption.type} 값
                          </label>
                          <select
                            key={`mainopt-val-${idx}-${item.options?.mainOption?.type}`}
                            value={item.options?.mainOption?.value || ""}
                            onChange={(e) => {
                              const newBatchEchos = [...batchEchos];
                              newBatchEchos[idx].options.mainOption.value = e.target.value;
                              setBatchEchos(newBatchEchos);
                            }}
                            style={{
                              width: "100%",
                              padding: "8px",
                              background: "#2d3a52",
                              border: "1px solid #4a5266",
                              borderRadius: "4px",
                              color: "#7fc3ff",
                              fontSize: "12px"
                            }}
                          >
                            {!(OPTION_TABLE.mainOption[item.options.mainOption.type] ?? [])
                              .map(formatValue)
                              .includes(item.options.mainOption.value) && (
                              <option value={item.options.mainOption.value}>— 고르세요 —</option>
                            )}
                            {((echoOptionData.mainOption as Record<string, string[]>)?.[item.options.mainOption.type] || []).map(val => (
                              <option key={val} value={formatValue(val)}>{formatValue(val)}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* 메인 서브옵션 */}
                      <div>
                        <label style={{ display: "block", fontSize: "12px", color: "#9a9a9a", marginBottom: "6px" }}>
                          메인 서브옵션
                        </label>
                        <select
                          value={item.options?.mainSubOption?.type || ""}
                          onChange={(e) => {
                            const selectedType = e.target.value;
                            const mainSubOptionValues = (echoOptionData.mainSubOption as Record<string, string[]>)?.[selectedType] || [];
                            console.log("🔍 [배치 메인서브옵션 선택]", {
                              선택값: selectedType,
                              가능한값: mainSubOptionValues,
                              첫번째값: mainSubOptionValues[0]
                            });
                            const newBatchEchos = [...batchEchos];
                            newBatchEchos[idx].options.mainSubOption = {
                              type: selectedType,
                              value: formatValue(mainSubOptionValues[0]) || "",
                              isMatched: true
                            };
                            setBatchEchos(newBatchEchos);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px",
                            background: "#2d3a52",
                            border: !item.options?.mainSubOption?.isMatched ? "2px solid #ff6b6b" : "1px solid #4a5266",
                            borderRadius: "4px",
                            color: "#7fc3ff",
                            fontSize: "12px"
                          }}
                        >
                          <option value="">선택</option>
                          {Object.keys(echoOptionData.mainSubOption || {}).map(key => (
                            <option key={key} value={key}>{key}</option>
                          ))}
                        </select>
                        {!item.options?.mainSubOption?.isMatched && (
                          <div style={{
                            marginTop: "6px",
                            fontSize: "12px",
                            color: "#ff6b6b",
                            fontWeight: "600"
                          }}>
                            ⚠️ 수동입력이 필요합니다
                          </div>
                        )}
                      </div>

                      {/* 메인 서브옵션 값 */}
                      {item.options?.mainSubOption?.type && (
                        <div>
                          <label style={{ display: "block", fontSize: "12px", color: "#9a9a9a", marginBottom: "6px" }}>
                            {item.options.mainSubOption.type} 값
                          </label>
                          <select
                            key={`mainsubopt-val-${idx}-${item.options?.mainSubOption?.type}`}
                            value={item.options?.mainSubOption?.value || ""}
                            onChange={(e) => {
                              const newBatchEchos = [...batchEchos];
                              newBatchEchos[idx].options.mainSubOption.value = e.target.value;
                              setBatchEchos(newBatchEchos);
                            }}
                            style={{
                              width: "100%",
                              padding: "8px",
                              background: "#2d3a52",
                              border: "1px solid #4a5266",
                              borderRadius: "4px",
                              color: "#7fc3ff",
                              fontSize: "12px"
                            }}
                          >
                            {!(OPTION_TABLE.mainSubOption[item.options.mainSubOption.type] ?? [])
                              .map(formatValue)
                              .includes(item.options.mainSubOption.value) && (
                              <option value={item.options.mainSubOption.value}>— 고르세요 —</option>
                            )}
                            {((echoOptionData.mainSubOption as Record<string, string[]>)?.[item.options.mainSubOption.type] || []).map(val => (
                              <option key={val} value={formatValue(val)}>{formatValue(val)}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* 부옵션 */}
                      <div style={{ borderTop: "1px solid #4a5266", paddingTop: "12px" }}>
                        <label style={{ display: "block", fontSize: "12px", color: "#9a9a9a", marginBottom: "8px", fontWeight: "bold" }}>
                          부옵션 (최대 5개)
                        </label>
                        {[0, 1, 2, 3, 4].map(subIdx => (
                          <div key={subIdx} style={{ marginBottom: "8px", display: "flex", gap: "4px" }}>
                            <select
                              value={item.options?.mainSelects?.[subIdx] || ""}
                              onChange={(e) => {
                                const selectedType = e.target.value;
                                const subOptionValues = (echoOptionData.subOption as Record<string, string[]>)?.[selectedType] || [];
                                console.log(`🔍 [배치 부옵션 ${subIdx + 1} 선택]`, {
                                  선택값: selectedType,
                                  가능한값: subOptionValues
                                });
                                const newBatchEchos = [...batchEchos];
                                const mainSelects = [...(newBatchEchos[idx].options.mainSelects || [])];
                                mainSelects[subIdx] = selectedType;
                                newBatchEchos[idx].options.mainSelects = mainSelects;

                                // 부옵션 이름 변경 시 값 초기화
                                const subSelects = [...(newBatchEchos[idx].options.subSelects || [])];
                                subSelects[subIdx] = "";
                                newBatchEchos[idx].options.subSelects = subSelects;

                                setBatchEchos(newBatchEchos);
                              }}
                              style={{
                                flex: 2,
                                padding: "6px",
                                background: "#2d3a52",
                                border: "1px solid #4a5266",
                                borderRadius: "4px",
                                color: "#7fc3ff",
                                fontSize: "11px"
                              }}
                            >
                              <option value="">선택</option>
                              {Object.keys(echoOptionData.subOption || {}).map(key => (
                                <option key={key} value={key}>{key}</option>
                              ))}
                            </select>
                            <select
                              key={`subopt-val-${subIdx}-${item.options?.mainSelects?.[subIdx]}`}
                              value={item.options?.subSelects?.[subIdx] || ""}
                              onChange={(e) => {
                                const newBatchEchos = [...batchEchos];
                                const subSelects = [...(newBatchEchos[idx].options.subSelects || [])];
                                subSelects[subIdx] = e.target.value;
                                newBatchEchos[idx].options.subSelects = subSelects;
                                setBatchEchos(newBatchEchos);
                              }}
                              disabled={!item.options?.mainSelects?.[subIdx]}
                              style={{
                                flex: 1,
                                padding: "6px",
                                background: !item.options?.mainSelects?.[subIdx] ? "#4a4a4a" : "#2d3a52",
                                border: "1px solid #4a5266",
                                borderRadius: "4px",
                                color: "#7fc3ff",
                                fontSize: "11px",
                                cursor: !item.options?.mainSelects?.[subIdx] ? "not-allowed" : "pointer"
                              }}
                            >
                              <option value="">값</option>
                              {((echoOptionData.subOption as Record<string, string[]>)?.[item.options?.mainSelects?.[subIdx]] || []).map(val => (
                                <option key={val} value={formatValue(val)}>{formatValue(val)}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div style={{
                        padding: "8px",
                        background: "#2d3a52",
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#9a9a9a",
                        textAlign: "center"
                      }}>
                        ✅ 준비됨
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "#ff6b6b", textAlign: "center", padding: "20px 0" }}>
                      <div style={{ marginBottom: "8px" }}>
                        ❌ {item.error === "not_found" ? "에코를 찾지 못했습니다" : "복수 에코 발견 - 클릭해서 선택"}
                      </div>
                      {item.extracted?.name && (
                        <div style={{ fontSize: "12px", color: "#9a9a9a" }}>{item.extracted.name}</div>
                      )}
                      {item.error === "multiple" && (
                        <button
                          onClick={() => {
                            setMultipleEchoDialog({
                              results: item.results,
                              extracted: item.extracted,
                              batchIndex: idx
                            });
                          }}
                          style={{
                            marginTop: "8px",
                            padding: "6px 12px",
                            background: "#4a5266",
                            color: "#4a9eff",
                            border: "1px solid #4a5266",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          선택하기
                        </button>
                      )}
                      {item.error === "not_found" && (
                        <button
                          onClick={() => {
                            setEchoSearchForBatch({
                              batchIndex: idx,
                              searchQuery: ""
                            });
                          }}
                          style={{
                            marginTop: "8px",
                            padding: "6px 12px",
                            background: "#4a5266",
                            color: "#4a9eff",
                            border: "1px solid #4a5266",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          에코 검색
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => handleBatchSave(batchEchos)}
                disabled={isSaving || batchEchos.filter(b => b.success).length === 0}
                style={{
                  padding: "10px 20px",
                  background: isSaving || batchEchos.filter(b => b.success).length === 0 ? "#727272" : "#4a9eff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isSaving ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                }}
              >
                {isSaving ? "저장 중..." : `저장 (${batchEchos.filter(b => b.success).length}개)`}
              </button>
              <button
                onClick={() => { setShowBatchDialog(false); setBatchEchos([]); }}
                style={{
                  padding: "10px 20px",
                  background: "#4a5266",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEcho && (
        <EchoDetailModal
          echo={selectedEcho as any}
          isEditing={(selectedEcho as any).pk !== undefined && myEchoes.some(e => e.pk === (selectedEcho as any).pk)}
          onSave={handleSaveEcho}
          onUpdate={handleUpdateEcho}
          onCancel={() => setSelectedEcho(null)}
        />
      )}

      {!selectedEcho && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginTop: "16px",
        }}>
          {(() => {
            const allFettersWithIcons = Array.from(
              myEchoes.flatMap(echo =>
                echo.options?.selectedFetter && echo.fetterGroups
                  ? echo.fetterGroups.filter(fg => fg.name === echo.options.selectedFetter).map(fg => ({ name: fg.name, icon: fg.icon }))
                  : []
              ).reduce((map, fetter) => map.set(fetter.name, fetter), new Map()).values()
            );
            return allFettersWithIcons.length > 0 ? (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: selectedFetterFilter === "" ? "#476176" : "#3c455c",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: selectedFetterFilter === "" ? "1px solid #4a9eff" : "1px solid #4a5266",
                    transition: "all 0.2s"
                  }}
                >
                  <input
                    type="radio"
                    name="fetter-filter"
                    value=""
                    checked={selectedFetterFilter === ""}
                    onChange={(e) => setSelectedFetterFilter(e.target.value)}
                    style={{ display: "none" }}
                  />
                  <span style={{ fontSize: "12px", color: selectedFetterFilter === "" ? "#fff" : "#9a9a9a" }}>전체</span>
                </label>
                {Array.from(allFettersWithIcons).map((fetter, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: selectedFetterFilter === fetter.name ? "#476176" : "#3c455c",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      border: selectedFetterFilter === fetter.name ? "1px solid #4a9eff" : "1px solid #4a5266",
                      transition: "all 0.2s"
                    }}
                  >
                    <input
                      type="radio"
                      name="fetter-filter"
                      value={fetter.name}
                      checked={selectedFetterFilter === fetter.name}
                      onChange={(e) => setSelectedFetterFilter(e.target.value)}
                      style={{ display: "none" }}
                    />
                    {fetter.icon && (
                      <img src={fetter.icon} alt="" style={{ width: "16px", height: "16px" }} />
                    )}
                    <span style={{ fontSize: "12px", color: selectedFetterFilter === fetter.name ? "#fff" : "#ccc" }}>{fetter.name}</span>
                  </label>
                ))}
              </div>
            ) : null;
          })()}
          {myEchoes
            .filter((echo: any) => !selectedFetterFilter || echo.options?.selectedFetter === selectedFetterFilter)
            .map((echo: any) => (
            <div
              key={echo.pk}
              style={{
                padding: "12px 16px",
                border: "1px solid #4a5266",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                background: "linear-gradient(135deg, #344059 0%, #2d3a52 100%)",
                color: "#fff",
              }}
            >
              <div style={{ flex: 5, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {echo.iconUrl && (
                  <img
                    src={echo.iconUrl}
                    alt={echo.name}
                    style={{
                      width: "40px",
                      height: "40px",
                      objectFit: "cover",
                      borderRadius: "4px",
                      border: "1px solid #4a5266",
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 10, minWidth: 0, display: "flex", alignItems: "center" }}>
                {echo.options?.selectedFetter && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                    {(() => {
                      const selectedGroup = echo.fetterGroups?.find((g: any) => g.name === echo.options.selectedFetter);
                      return selectedGroup?.icon ? (
                        <img src={selectedGroup.icon} alt="" style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                      ) : null;
                    })()}
                    <span style={{ fontSize: "12px", color: "#8d8d8d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{echo.options.selectedFetter}</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 10, minWidth: 0 }}>
                <strong style={{ color: "#4a9eff", fontSize: "14px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{echo.name}</strong>
                {echo.options?.mainOption?.type && (
                  <div style={{ fontSize: "12px", color: "#9a9a9a", marginTop: "4px" }}>
                    {echo.options.mainOption.type}: <span style={{ color: "#7fc3ff" }}>{echo.options.mainOption.value}</span>
                  </div>
                )}
                {/* 메인 서브 옵션 — 코스트로 정해지는 고정 옵션(4코스트 공격력 150 · 1코스트 HP 2280).
                    스탯에 그대로 더해지는 값이라 목록에서도 보여야 어떤 에코인지 가늠할 수 있다. */}
                {echo.options?.mainSubOption?.type && (
                  <div style={{ fontSize: "12px", color: "#9a9a9a", marginTop: "2px" }}>
                    {echo.options.mainSubOption.type}:{" "}
                    <span style={{ color: "#7fc3ff" }}>{echo.options.mainSubOption.value}</span>
                  </div>
                )}
              </div>
              {echo.options?.mainSelects && echo.options.mainSelects.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flex: 60, justifyContent: "space-around" }}>
                  {echo.options.mainSelects.map((opt: string, idx: number) => (
                    opt ? (
                      <div key={idx} style={{ fontSize: "12px", color: "#aaa", textAlign: "center", flex: 1 }}>
                        <div style={{ color: "#7fc3ff", fontWeight: "500", fontSize: "11px" }}>{opt}</div>
                        <div style={{ fontSize: "11px" }}>{echo.options.subSelects?.[idx]}</div>
                      </div>
                    ) : null
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", flex: 10 }}>
                <button
                  onClick={() => setSelectedEcho(echo as any)}
                  style={{
                    padding: "6px 12px",
                    background: "#4a9eff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  수정
                </button>
                <button
                  onClick={() => handleDeleteEcho(echo.pk)}
                  style={{
                    padding: "6px 12px",
                    background: "#ff4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
