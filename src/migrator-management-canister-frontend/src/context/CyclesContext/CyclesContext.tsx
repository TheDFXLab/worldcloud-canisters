import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useIdentity } from "../IdentityContext/IdentityContext";
import CyclesApi from "../../api/cycles";
import { Principal } from "@dfinity/principal";
import { CanisterStatusResponse } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import MainApi from "../../api/main";
import { useLedger } from "../LedgerContext/LedgerContext";
import { fromE8sStable } from "../../utility/e8s";

interface CyclesContextType {
  isLoadingCycles: boolean;
  isLoadingStatus: boolean;
  cyclesAvailable: number;
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
  /*Hooks*/
  const { identity } = useIdentity();
  const { balance } = useLedger();

  /** States */
  const [isLoadingCycles, setIsLoadingCycles] = useState<boolean>(false);
  const [cyclesAvailable, setCyclesAvailable] = useState<number>(0);
  const [currentCanisterId, setCurrentCanisterId] = useState<Principal | null>(
    null
  );
  const [canisterStatus, setCanisterStatus] =
    useState<CanisterStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [cyclesStatus, setCyclesStatus] =
    useState<CanisterStatusResponse | null>(null);
  const [cyclesRate, setCyclesRate] = useState<number>(0);
  const [maxCyclesExchangeable, setMaxCyclesExchangeable] = useState<number>(0);
  const [isLoadingEstimateCycles, setIsLoadingEstimateCycles] =
    useState<boolean>(false);

  // Get maximum amount of cycles purchasable by user
  useEffect(() => {
    getCyclesToAdd();
    if (!balance) {
      return;
    }
    estimateCycles(fromE8sStable(balance));
  }, [balance]);

  const getCyclesToAdd = async (amountInIcp?: number) => {
    try {
      setIsLoadingCycles(true);
      const cyclesApi = await CyclesApi.create(identity);
      if (!cyclesApi) {
        throw new Error("Cycles API not created");
      }
      const cycles = await cyclesApi.getCyclesToAdd(amountInIcp);
      setCyclesAvailable(cycles);
      return cycles;
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoadingCycles(false);
    }
  };

  const estimateCycles = async (amountInIcp: number) => {
    try {
      if (cyclesRate) {
        return cyclesRate * amountInIcp;
      }

      setIsLoadingEstimateCycles(true);
      const cyclesApi = await CyclesApi.create(identity);
      if (!cyclesApi) {
        throw new Error("Cycles API not created");
      }
      const cycles = await cyclesApi.estimateCyclesToAdd(amountInIcp);
      setCyclesRate(cycles / amountInIcp);
      setMaxCyclesExchangeable(cycles);
      return cycles;
    } catch (error) {
      console.log(error);
      return 0;
    } finally {
      setIsLoadingEstimateCycles(false);
    }
  };

  const getStatus = async (canisterId: string) => {
    try {
      if (!canisterId) {
        console.log(`Canister ID is not set`);
        throw new Error("Canister ID is not set");
      }

      const mainApi = await MainApi.create(identity);
      if (!mainApi) {
        throw new Error("Main API not created");
      }
      console.log(`is loading true`);
      setIsLoadingCycles(true);
      setIsLoadingStatus(true);
      const result = await mainApi.getCanisterStatus(
        Principal.fromText(canisterId)
      );
      setCyclesStatus(result);
    } catch (error) {
      console.log(`Error:`, error);
    } finally {
      setIsLoadingStatus(false);
      setIsLoadingCycles(false);
      console.log(`is loading false`);
    }
  };

  return (
    <CyclesContext.Provider
      value={{
        isLoadingCycles,
        isLoadingStatus,
        cyclesAvailable,
        maxCyclesExchangeable,
        isLoadingEstimateCycles,
        currentCanisterId,
        setCurrentCanisterId,
        canisterStatus,
        estimateCycles,
        getStatus,
        cyclesStatus,
        cyclesRate,
      }}
    >
      {children}
    </CyclesContext.Provider>
  );
}
export function useCycles() {
  const context = useContext(CyclesContext);
  if (context === undefined) {
    throw new Error("useCycles must be used within a CyclesProvider");
  }
  return context;
}
