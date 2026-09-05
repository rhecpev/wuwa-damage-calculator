import { AppStateProvider } from "./context/AppStateContext";
import { PartyConfigProvider } from "./context/PartyConfigContext";
import { useAppState } from "./context/AppStateContext";
import { TabNavigation, Footer } from "./components";
import { StorageBar } from "./components/StorageBar";
import { CalculatorPage } from "./pages/CalculatorPage/CalculatorPage";
import { CharactersPage } from "./pages/CharactersPage/CharactersPage";
import { EchoesPage } from "./pages/EchoesPage/EchoesPage";
import { WeaponsPage } from "./pages/WeaponsPage/WeaponsPage";
import { PartyPage } from "./pages/PartyPage/PartyPage";
import { ProfileImportPage } from "./pages/ProfileImportPage/ProfileImportPage";
import { CharacterBuffPage } from "./pages/CharacterBuffPage/CharacterBuffPage";
import { CharacterAttackPage } from "./pages/CharacterAttackPage/CharacterAttackPage";
import { AttackTriggerPage } from "./pages/AttackTriggerPage/AttackTriggerPage";
import { CyclePage } from "./pages/CyclePage/CyclePage";

function AppContent() {
  const { tab } = useAppState();

  return (
    // 왼쪽 사이드바는 화면에 고정되고, 본문만 스크롤된다.
    <>
      <TabNavigation />

      {/* 계산 탭은 오른쪽에 공격 루틴 기둥이 붙어서 본문 폭이 그만큼 줄어든다. */}
      <main className={tab === "calculator" ? "app has-rail" : "app"}>
        {/* 어디에 저장되고 있는지 늘 보이게 — 서버가 없으면 탭을 닫는 순간 사라진다. */}
        <StorageBar />

        {tab === "calculator" && <CalculatorPage />}
        {tab === "party" && <PartyPage />}
        {tab === "characters" && <CharactersPage />}
        {tab === "weapons" && <WeaponsPage />}
        {tab === "echoes" && <EchoesPage />}
        {tab === "characterBuffs" && <CharacterBuffPage />}
        {tab === "characterAttacks" && <CharacterAttackPage />}
        {tab === "attackTriggers" && <AttackTriggerPage />}
        {tab === "cycles" && <CyclePage />}
        {tab === "profileImport" && <ProfileImportPage />}

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
