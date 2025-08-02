import { createContext, useContext, useState, ReactNode } from "react";
import { useProjectsLogic } from "../../hooks/useProjectsLogic";
import { useSubscriptionLogic } from "../../hooks/useSubscriptionLogic";
import { useDeploymentLogic } from "../../hooks/useDeploymentLogic";
import { useCyclesLogic } from "../../hooks/useCyclesLogic";

interface LoadBarContextType {
  showLoadBar: boolean;
  setShowLoadBar: (show: boolean) => void;
  completeLoadBar: boolean;
  setCompleteLoadBar: (complete: boolean) => void;
}

const LoadBarContext = createContext<LoadBarContextType | undefined>(undefined);

export function LoadBarProvider({ children }: { children: ReactNode }) {
  // const { isLoading: isLoadingProjects } = useProjectsLogic();
  // const { isLoadingSub, isLoadingTiers } = useSubscriptionLogic();
  // const { isLoading: isLoadingDeployments } = useDeploymentLogic();
  // const {
  //   isLoadingCredits,
  //   isLoadingCycles,
  //   isLoadingStatus,
  //   isLoadingEstimateCycles,
  // } = useCyclesLogic();

  const [showLoadBar, setShowLoadBar] = useState(false);
  const [completeLoadBar, setCompleteLoadBar] = useState(false);

  return (
    <LoadBarContext.Provider
      value={{
        showLoadBar,
        setShowLoadBar,
        completeLoadBar,
        setCompleteLoadBar,
      }}
    >
      {children}
    </LoadBarContext.Provider>
  );
}
export function useLoadBar() {
  const context = useContext(LoadBarContext);
  if (context === undefined) {
    throw new Error("userLoadBar must be used within a LoadBarProvider");
  }
  return context;
}
