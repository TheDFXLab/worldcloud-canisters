import { createContext, useContext, useState, ReactNode } from "react";
import { MenuItem } from "../../components/Sidebar/Sidebar";

interface SideBarContextType {
  showSideBar: boolean;
  activeTab: MenuItem | null;
  setActiveTab: (tab: MenuItem | null) => void;
  setShowSideBar: (show: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const SideBarContext = createContext<SideBarContextType | undefined>(undefined);

export function SideBarProvider({ children }: { children: ReactNode }) {
  const [showSideBar, setShowSideBar] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <SideBarContext.Provider
      value={{
        showSideBar,
        setShowSideBar,
        activeTab,
        setActiveTab,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
      }}
    >
      {children}
    </SideBarContext.Provider>
  );
}
export function useSideBar() {
  const context = useContext(SideBarContext);
  if (context === undefined) {
    throw new Error("useSideBar must be used within a SideBarProvider");
  }
  return context;
}
