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
import { useQuery } from "@tanstack/react-query";

export interface CreditsResponse {
  total_credits: number;
  equivalent_cycles: number;
}

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
  getCreditsAvailable: () => Promise<CreditsResponse | undefined>;
  setShouldRefetchCredits: (shouldRefetch: boolean) => void;
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
  // const [isLoadingCredits, setIsLoadingCredits] = useState<boolean>(false);
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
  // const [totalCredits, setTotalCredits] = useState<CreditsResponse>({
  //   total_credits: 0,
  //   equivalent_cycles: 0,
  // });

  const [shouldRefetchCredits, setShouldRefetchCredits] = useState(true);

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

  /** React Queries */
  const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

  const { data: totalCredits, isLoading: isLoadingCredits } = useQuery({
    queryKey: ["totalCredits", identity?.getPrincipal().toText()],
    queryFn: async () => {
      if (!identity || !agent) return null;
      const credits = await getCreditsAvailable();

      if (!credits) return null;

      localStorage.setItem(
        "totalCredits",
        JSON.stringify({
          totalCredits: credits,
          timestamp: Date.now(),
          principal: identity.getPrincipal().toText(),
        })
      );

      setShouldRefetchCredits(false);
      return credits;
    },
    initialData: () => {
      const stored = localStorage.getItem("totalCredits");

      if (!stored) {
        setShouldRefetchCredits(true);
        return null;
      }

      const { totalCredits, timestamp, principal } = JSON.parse(stored);

      // Skip principal check if identity is not yet initialized
      if (identity && principal !== identity.getPrincipal().toText()) {
        localStorage.removeItem("totalCredits");
        setShouldRefetchCredits(true);
        return null;
      }

      // Check expiration separately
      if (Date.now() - timestamp > CACHE_TIME) {
        localStorage.removeItem("totalCredits");
        setShouldRefetchCredits(true);
        return null;
      }

      setShouldRefetchCredits(false);
      return totalCredits as CreditsResponse;
    },
    enabled: !!identity && !!agent && shouldRefetchCredits,
    staleTime: 0, // Consider data immediately stale
    refetchOnMount: true, // Fetch when component mounts
    refetchOnWindowFocus: true, // Fetch when window regains focus
    refetchInterval: CACHE_TIME, // Regular polling interval
    retry: 3, // Retry failed requests 3 times
  });

  const getCreditsAvailable = async () => {
    try {
      // setIsLoadingCredits(true);
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
      return {
        total_credits: fromE8sStable(credits),
        equivalent_cycles: fromE8sStable(
          BigInt(Math.floor(equivalentCycles)),
          12
        ),
      } as CreditsResponse;
      // setTotalCredits({
      //   total_credits: fromE8sStable(credits),
      //   equivalent_cycles: fromE8sStable(
      //     BigInt(Math.floor(equivalentCycles)),
      //     12
      //   ),
      // });
    } catch (error) {
      console.log(error);
    } finally {
      // setIsLoadingCredits(false);
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
        setShouldRefetchCredits,
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
