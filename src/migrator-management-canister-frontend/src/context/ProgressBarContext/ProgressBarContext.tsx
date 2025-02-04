import { createContext, useContext, useState, ReactNode } from "react";
import { ToasterData } from "../../components/Toast/Toaster";

interface ProgressBarContextType {
  isLoadingProgress: boolean;
  setIsLoadingProgress: (isLoading: boolean) => void;
  isEnded: boolean;
  setIsEnded: (isEnded: boolean) => void;
}

const ProgressBarContext = createContext<ProgressBarContextType | undefined>(
  undefined
);

export function ProgressBarProvider({ children }: { children: ReactNode }) {
  const [isLoadingProgress, setIsLoadingProgress] = useState<boolean>(false);
  const [isEnded, setIsEnded] = useState<boolean>(false);

  return (
    <ProgressBarContext.Provider
      value={{
        isLoadingProgress,
        setIsLoadingProgress,
        isEnded,
        setIsEnded,
      }}
    >
      {children}
    </ProgressBarContext.Provider>
  );
}
export function useProgress() {
  const context = useContext(ProgressBarContext);
  if (context === undefined) {
    throw new Error("useProgress must be used within a ProgressBarContext");
  }
  return context;
}
