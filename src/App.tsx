import { AppStateProvider } from "./context/AppStateContext";
import { PartyConfigProvider } from "./context/PartyConfigContext";
import { useAppState } from "./context/AppStateContext";
import { TabNavigation, Footer } from "./components";
import { UpdateNotice } from "./components/UpdateNotice";
import { Design2 } from "./components/Design2";
import { CalculatorPage } from "./pages/CalculatorPage/CalculatorPage";
import { CalculatorPage2 } from "./pages/CalculatorPage2/CalculatorPage2";
import { useShape } from "./utils/theme";
import { CharactersPage } from "./pages/CharactersPage/CharactersPage";
import { EchoesPage } from "./pages/EchoesPage/EchoesPage";
import { WeaponsPage } from "./pages/WeaponsPage/WeaponsPage";
import { PartyPage } from "./pages/PartyPage/PartyPage";
import { ProfileImportPage } from "./pages/ProfileImportPage/ProfileImportPage";
import { CyclePage } from "./pages/CyclePage/CyclePage";
import { CycleComparePage } from "./pages/CycleComparePage/CycleComparePage";
import { MatrixPlannerPage } from "./pages/MatrixPlannerPage/MatrixPlannerPage";
import { NicknamesPage } from "./pages/NicknamesPage/NicknamesPage";
import { UpdatesPage } from "./pages/UpdatesPage/UpdatesPage";

function AppContent() {
  const { tab } = useAppState();
  const { shape } = useShape();

  return (
    // 왼쪽 사이드바는 화면에 고정되고, 본문만 스크롤된다.
    <>
      <TabNavigation />

      {/* 계산 탭은 오른쪽에 공격 루틴 기둥이 붙어서 본문 폭이 그만큼 줄어든다. */}
      <main className={tab === "calculator2" ? "app has-rail" : "app"}>
        {/* 디자인 「둥글게」면 이전 계산 화면, 「네모나게」면 대미지 계산 2. */}
        {tab === "calculator2" && (shape === "round" ? <CalculatorPage /> : <CalculatorPage2 />)}

        {/* 「○○ 2」 — 같은 페이지를 대미지 계산 2의 꼴로 감싼 것. */}
        {tab === "characters2" && (
          <Design2 title="캐릭터" sub="Characters">
            <CharactersPage />
          </Design2>
        )}
        {tab === "weapons2" && (
          <Design2 title="무기" sub="Weapons">
            <WeaponsPage />
          </Design2>
        )}
        {tab === "echoes2" && (
          <Design2 title="에코" sub="Echoes">
            <EchoesPage />
          </Design2>
        )}
        {tab === "party2" && (
          <Design2 title="파티" sub="Party">
            <PartyPage />
          </Design2>
        )}
        {tab === "cycles2" && (
          <Design2 title="사이클" sub="Cycles">
            <CyclePage />
          </Design2>
        )}
        {tab === "matrixPlanner2" && (
          <Design2 title="매트릭스" sub="Matrix">
            <MatrixPlannerPage />
          </Design2>
        )}
        {tab === "cycleCompare2" && (
          <Design2 title="사이클 대미지 비교" sub="Compare">
            <CycleComparePage />
          </Design2>
        )}
        {tab === "profileImport2" && (
          <Design2 title="디스코드 프로필 입력" sub="Profile Import">
            <ProfileImportPage />
          </Design2>
        )}
        {tab === "nicknames2" && (
          <Design2 title="별명" sub="Nicknames">
            <NicknamesPage />
          </Design2>
        )}
        {tab === "updates2" && (
          <Design2 title="업데이트 내역" sub="Updates">
            <UpdatesPage />
          </Design2>
        )}

        <Footer />
      </main>

      {/* 알림을 건 업데이트 뒤 처음 들어온 사람에게 한 번 띄운다. */}
      <UpdateNotice />
    </>
  );
}

export default function App() {
  return (
    <PartyConfigProvider>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </PartyConfigProvider>
  );
}
