import { createContext, useContext, ReactNode } from "react";
import { Principal } from "@dfinity/principal";
import { CanisterStatusResponse } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { useCyclesLogic } from "../../hooks/useCyclesLogic";
import { CreditsResponse } from "../../state/slices/cyclesSlice";

interface CyclesContextType {
  isLoadingCycles: boolean;
  isLoadingStatus: boolean;
  isLoadingCredits: boolean;
  cyclesAvailable: number;
  totalCredits: CreditsResponse | null;
  maxCyclesExchangeable: number;
  isLoadingEstimateCycles: boolean;
  currentCanisterId: Principal | null;
  setCurrentCanisterId: (canisterId: Principal) => void;
  canisterStatus: CanisterStatusResponse | null;
  estimateCycles: (amountInIcp: number) => Promise<number>;
  getStatus: (canisterId: string) => Promise<void>;
  cyclesStatus: CanisterStatusResponse | null;
  cyclesRate: number;
}

const CyclesContext = createContext<CyclesContextType | undefined>(undefined);

export function CyclesProvider({ children }: { children: ReactNode }) {
  const {
    cyclesAvailable,
    totalCredits,
    maxCyclesExchangeable,
    currentCanisterId,
    canisterStatus,
    cyclesStatus,
    cyclesRate,
    isLoadingCycles,
    isLoadingStatus,
    isLoadingCredits,
    isLoadingEstimateCycles,
    estimateCycles,
    getStatus,
    setCurrentCanisterId,
  } = useCyclesLogic();

  const value = {
    cyclesAvailable,
    totalCredits,
    maxCyclesExchangeable,
    currentCanisterId,
    canisterStatus,
    cyclesStatus,
    cyclesRate,
    isLoadingCycles,
    isLoadingStatus,
    isLoadingCredits,
    isLoadingEstimateCycles,
    estimateCycles,
    getStatus,
    setCurrentCanisterId,
  };

  return (
    <CyclesContext.Provider value={value}>{children}</CyclesContext.Provider>
  );
}

export function useCycles() {
  const context = useContext(CyclesContext);
  if (context === undefined) {
    throw new Error("useCycles must be used within a CyclesProvider");
  }
  return context;
}
