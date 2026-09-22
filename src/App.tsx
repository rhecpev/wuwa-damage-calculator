import { AppStateProvider } from "./context/AppStateContext";
import { PartyConfigProvider } from "./context/PartyConfigContext";
import { useAppState } from "./context/AppStateContext";
import { TabNavigation, Footer } from "./components";
import { CalculatorPage } from "./pages/CalculatorPage/CalculatorPage";
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

  return (
    // 왼쪽 사이드바는 화면에 고정되고, 본문만 스크롤된다.
    <>
      <TabNavigation />

      {/* 계산 탭은 오른쪽에 공격 루틴 기둥이 붙어서 본문 폭이 그만큼 줄어든다. */}
      <main className={tab === "calculator" ? "app has-rail" : "app"}>
        {tab === "calculator" && <CalculatorPage />}
        {tab === "party" && <PartyPage />}
        {tab === "characters" && <CharactersPage />}
        {tab === "weapons" && <WeaponsPage />}
        {tab === "echoes" && <EchoesPage />}
        {tab === "cycles" && <CyclePage />}
        {tab === "cycleCompare" && <CycleComparePage />}
        {tab === "matrixPlanner" && <MatrixPlannerPage />}
        {tab === "nicknames" && <NicknamesPage />}
        {tab === "profileImport" && <ProfileImportPage />}
        {tab === "updates" && <UpdatesPage />}

        <Footer />
      </main>
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
