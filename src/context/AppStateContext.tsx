import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { usePersistedState } from "../utils/usePersistedState";

export type TabType =
  | "calculator"
  | "party"
  | "characters"
  | "echoes"
  | "characterBuffs"
  | "characterAttacks"
  | "attackTriggers"
  | "cycles"
  | "weapons"
  | "profileImport";

interface AppStateContextType {
  tab: TabType;
  setTab: (tab: TabType) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedCharacterId: string | null;
  setSelectedCharacterId: (id: string | null) => void;
  showEchoSearch: boolean;
  setShowEchoSearch: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<TabType>("calculator");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 보던 캐릭터는 브라우저에 남긴다 — 탭을 옮겼다 돌아오거나 새로고침해도 그대로 이어 본다.
  const [selectedCharacterId, setSelectedCharacterId] = usePersistedState<string | null>(
    "selectedCharacter",
    null,
  );
  const [showEchoSearch, setShowEchoSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const value: AppStateContextType = {
    tab,
    setTab,
    selectedId,
    setSelectedId,
    selectedCharacterId,
    setSelectedCharacterId,
    showEchoSearch,
    setShowEchoSearch,
    searchQuery,
    setSearchQuery,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
