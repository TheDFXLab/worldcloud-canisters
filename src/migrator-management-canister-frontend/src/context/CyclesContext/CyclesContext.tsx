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
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";

export interface CreditsResponse {
  total_credits: number;
  equivalent_cycles: number;
}

interface CyclesContextType {
  isLoadingCycles: boolean;
  isLoadingStatus: boolean;
  isLoadingCredits: boolean;
  cyclesAvailable: number;
  totalCredits: CreditsResponse;
  maxCyclesExchangeable: number;
  isLoadingEstimateCycles: boolean;
  currentCanisterId: Principal | null;
  setCurrentCanisterId: (canisterId: Principal) => void;
  canisterStatus: CanisterStatusResponse | null;
  estimateCycles: (amountInIcp: number) => Promise<number>;
  getStatus: (canisterId: string) => Promise<void>;
  getCreditsAvailable: () => Promise<void>;
  cyclesStatus: CanisterStatusResponse | null;
  cyclesRate: number;
}

const CyclesContext = createContext<CyclesContextType | undefined>(undefined);

export function CyclesProvider({ children }: { children: ReactNode }) {
  /*Hooks*/
  const { identity } = useIdentity();
  const { balance } = useLedger();
  const { agent } = useHttpAgent();

  /** States */
  const [isLoadingCycles, setIsLoadingCycles] = useState<boolean>(false);
  const [isLoadingCredits, setIsLoadingCredits] = useState<boolean>(false);
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
  const [totalCredits, setTotalCredits] = useState<CreditsResponse>({
    total_credits: 0,
    equivalent_cycles: 0,
  });

  useEffect(() => {
    if (!agent) {
      return;
    }
    getCreditsAvailable();
  }, [balance, agent]);

  // Get maximum amount of cycles purchasable by user
  useEffect(() => {
    getCyclesToAdd();
    if (!balance || !agent) {
      return;
    }
    estimateCycles(fromE8sStable(balance));
  }, [balance, agent]);

  const getCreditsAvailable = async () => {
    try {
      setIsLoadingCredits(true);
      if (!agent) {
        return;
      }
      const mainApi = await MainApi.create(identity, agent);
      if (!mainApi) {
        throw new Error(`Error creating main API`);
      }
      const credits = await mainApi.getCreditsAvailable();

      if (!credits && credits !== BigInt(0)) {
        throw new Error(`Error getting credits available`);
      }

      const equivalentCycles = await estimateCycles(fromE8sStable(credits));
      setTotalCredits({
        total_credits: fromE8sStable(credits),
        equivalent_cycles: fromE8sStable(
          BigInt(Math.floor(equivalentCycles)),
          12
        ),
      });
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  const getCyclesToAdd = async (amountInIcp?: number) => {
    try {
      setIsLoadingCycles(true);
      if (!agent) {
        return;
      }
      const cyclesApi = await CyclesApi.create(identity, agent);
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
      if (!agent) {
        return 0;
      }
      const cyclesApi = await CyclesApi.create(identity, agent);
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
        throw new Error("Canister ID is not set");
      }

      if (!agent) {
        throw new Error("Agent not found");
      }
      const mainApi = await MainApi.create(identity, agent);
      if (!mainApi) {
        throw new Error("Main API not created");
      }
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
    }
  };

  return (
    <CyclesContext.Provider
      value={{
        isLoadingCycles,
        isLoadingStatus,
        isLoadingCredits,
        cyclesAvailable,
        totalCredits,
        maxCyclesExchangeable,
        isLoadingEstimateCycles,
        currentCanisterId,
        setCurrentCanisterId,
        canisterStatus,
        estimateCycles,
        getStatus,
        getCreditsAvailable,
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
