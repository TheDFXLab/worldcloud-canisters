import { createContext, ReactNode, useContext } from "react";
import { FreemiumUsageData } from "../../state/slices/freemiumSlice";
import { useFreemiumLogic } from "../../hooks/useFreemiumLogic";

interface FreemiumValidation {
  status: boolean;
  message: string;
  max: number;
  current: number;
}

interface FreemiumContextType {
  usageData: FreemiumUsageData | null;
  isLoading: boolean;
  error: string | null;
  fetchUsage: () => void;
  // validateSubscription: (
  //   refreshSubscription: boolean
  // ) => Promise<FreemiumValidation>;
}

export const FreemiumContext = createContext<FreemiumContextType | undefined>(
  undefined
);

export function FreemiumProvider({ children }: { children: ReactNode }) {
  const { usageData, isLoading, error, fetchUsage } = useFreemiumLogic();

  const value = {
    usageData,
    isLoading,
    error,
    fetchUsage,
  };

  return (
    <FreemiumContext.Provider value={value}>
      {children}
    </FreemiumContext.Provider>
  );
}

export function useFreemium() {
  const context = useContext(FreemiumContext);
  if (context === undefined) {
    throw new Error("useFreemium must be used within a FreemiumProvider");
  }
  return context;
}
