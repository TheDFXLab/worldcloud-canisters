import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { MenuItem } from "../../components/Sidebar/Sidebar";
import { mapRouteToKey } from "../../utility/navigation";

interface SideBarContextType {
  showSideBar: boolean;
  activeTab: MenuItem | null;
  setActiveTab: (tab: MenuItem | null) => void;
  setShowSideBar: (show: boolean) => void;
  isMobileMenuOpen: boolean;
  isSidebarCollapsed: boolean;
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsSidebarCollapsed: (isCollapsed: boolean) => void;
  handleClose: () => void;
}

const SideBarContext = createContext<SideBarContextType | undefined>(undefined);

export function SideBarProvider({ children }: { children: ReactNode }) {
  const [showSideBar, setShowSideBar] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 768 ? true : false
  );

  // Detect current route and set active tab on mount and route changes
  useEffect(() => {
    const updateActiveTab = () => {
      const currentPath = window.location.pathname;
      const currentTab = mapRouteToKey(currentPath) as MenuItem;
      setActiveTab(currentTab);
    };

    // Set initial active tab
    updateActiveTab();

    // Listen for route changes
    const handleRouteChange = () => {
      updateActiveTab();
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  useEffect(() => {
    // if (isMobile) {
    // setIsMobileMenuOpen(true);
    // setIsSidebarCollapsed(false);
    // }
  }, [isMobile]);

  const handleClose = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
      setIsSidebarCollapsed(true);
    }
  };

  return (
    <SideBarContext.Provider
      value={{
        showSideBar,
        setShowSideBar,
        activeTab,
        setActiveTab,
        isMobileMenuOpen,
        isSidebarCollapsed,
        isMobile,
        setIsMobileMenuOpen,
        setIsSidebarCollapsed,
        setIsMobile,
        handleClose,
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
