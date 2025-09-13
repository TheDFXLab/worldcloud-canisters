import { createContext, useContext, ReactNode } from "react";
import { Principal } from "@dfinity/principal";
// import { CanisterStatusResponse } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { useCyclesLogic } from "../../hooks/useCyclesLogic";
import { CreditsResponse } from "../../state/slices/cyclesSlice";
import { CanisterStatus } from "../../api/authority";
import { canister_status_result } from "@dfinity/agent/lib/cjs/canisters/management_service";

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
  canisterStatus: canister_status_result | null;
  estimateCycles: (amountInIcp: number) => Promise<number>;
  getStatus: (projectId: number) => Promise<CanisterStatus | undefined>;
  cyclesStatus: canister_status_result | null;
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
  } as CyclesContextType;

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
