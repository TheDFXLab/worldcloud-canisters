import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useParams } from "react-router-dom";
import { useSideBar } from "../SideBarContext/SideBarContext";
import { useAdmin } from "../AdminContext/AdminContext";
import { useGithub } from "../GithubContext/GithubContext";
import { mapHeaderContent } from "../../utility/headerCard";

export interface HeaderCardData {
  title: string;
  description?: string;
  className?: string;
}

interface HeaderCardContextType {
  headerCard: HeaderCardData | null;
  setHeaderCard: (action: HeaderCardData | null) => void;
}

const HeaderCardContext = createContext<HeaderCardContextType | undefined>(
  undefined
);

export function HeaderCardProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const { activeTab } = useSideBar();
  const { isAdmin } = useAdmin();
  const { githubUser } = useGithub();
  const [headerCard, setHeaderCard] = useState<HeaderCardData | null>({
    title: "",
    description: "",
    className: "",
  });

  useEffect(() => {
    console.log(`Params `, params);
    console.log(`ative tabe `, activeTab);
    setHeaderCard(mapHeaderContent(activeTab ? activeTab : "home"));
  }, [activeTab]);

  return (
    <HeaderCardContext.Provider
      value={{
        headerCard,
        setHeaderCard,
      }}
    >
      {children}
    </HeaderCardContext.Provider>
  );
}
export function useHeaderCard() {
  const context = useContext(HeaderCardContext);
  if (context === undefined) {
    throw new Error("useHeaderCard must be used within a HeaderCardProvider");
  }
  return context;
}
