import { createContext, useContext, useEffect, useState } from "react";
import { useIdentity } from "../IdentityContext/IdentityContext";
import LedgerApi from "../../api/ledger/LedgerApi";
import MainApi from "../../api/main";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";
import { useQuery } from "@tanstack/react-query";
import { e8sToIcp } from "../../utility/e8s";

interface LedgerContextType {
  balance: bigint | null | undefined;
  isLoadingBalance: boolean;
  getPendingDeposits: () => Promise<number>;
  getBalance: () => Promise<bigint | null>;
  transfer: (amount: number, to: string) => Promise<boolean>;
  setShouldRefetchBalance: (value: boolean) => void;
  isTransferring: boolean;
  pendingDeposits: number;
  error: string | null;
}

export const LedgerContext = createContext<LedgerContextType>(
  {} as LedgerContextType
);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { identity } = useIdentity();
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState<number>(0);
  const [shouldRefetchBalance, setShouldRefetchBalance] =
    useState<boolean>(true);
  const { agent } = useHttpAgent();

  /** React Queries */
  const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

  const { data: balance = BigInt(0), isLoading: isLoadingBalance } = useQuery({
    queryKey: ["balance", identity?.getPrincipal().toText()],
    queryFn: async () => {
      if (!identity || !agent) return null;
      const ledgerApi = await LedgerApi.create(identity, agent);
      if (!ledgerApi) {
        throw new Error("Ledger API not initialized");
      }
      const balance = await ledgerApi.getBalance();
      console.log(`Balance()`, balance);

      localStorage.setItem(
        "userBalance",
        JSON.stringify({
          balance: balance.toString(),
          timestamp: Date.now(),
          principal: identity.getPrincipal().toText(),
        })
      );

      setShouldRefetchBalance(false);
      return balance;
    },
    initialData: () => {
      const stored = localStorage.getItem("userBalance");

      if (!stored) {
        setShouldRefetchBalance(true);
        return null;
      }

      const { balance, timestamp, principal } = JSON.parse(stored);

      // Skip principal check if identity is not yet initialized
      if (identity && principal !== identity.getPrincipal().toText()) {
        localStorage.removeItem("userBalance");
        setShouldRefetchBalance(true);
        return null;
      }

      // Check expiration separately
      if (Date.now() - timestamp > CACHE_TIME) {
        localStorage.removeItem("userBalance");
        setShouldRefetchBalance(true);
        return null;
      }

      setShouldRefetchBalance(false);
      return BigInt(balance);
    },
    enabled: !!identity && !!agent && shouldRefetchBalance,
    staleTime: 0, // Consider data immediately stale
    refetchOnMount: true, // Fetch when component mounts
    refetchOnWindowFocus: true, // Fetch when window regains focus
    refetchInterval: CACHE_TIME, // Regular polling interval
    retry: 3, // Retry failed requests 3 times
  });

  const getPendingDeposits = async () => {
    if (!agent) {
      throw new Error("Agent not found");
    }
    const mainApi = await MainApi.create(identity, agent);
    if (!mainApi) throw new Error("MainApi not initialized.");
    const pendingDeposits = await mainApi.getPendingDeposits();
    if (pendingDeposits && pendingDeposits.e8s > 0) {
      setPendingDeposits(Number(pendingDeposits.e8s));
    }

    return e8sToIcp(pendingDeposits.e8s);
  };

  const getBalance = async () => {
    try {
      if (!identity) {
        return null;
      }
      if (!agent) {
        return null;
      }
      const ledgerApi = await LedgerApi.create(identity, agent);
      if (!ledgerApi) {
        throw new Error("Ledger API not initialized");
      }
      console.log(`Getting balance`);
      const balance = await ledgerApi.getBalance();
      console.log(`Balance`, balance);
      return balance;
    } catch (error) {
      console.error(`Error getting balance`, error);
      return null;
    }
  };

  const transfer = async (amountInIcp: number, to: string) => {
    setIsTransferring(true);
    setError(null);
    try {
      if (!agent) {
        throw new Error("Agent not found");
      }
      const ledgerApi = await LedgerApi.create(identity, agent);
      if (!ledgerApi) {
        throw new Error("Ledger API not initialized");
      }
      const result = await ledgerApi.transfer(to, amountInIcp);
      return result;
    } catch (err: any) {
      setError(err.message);
      console.error(`error transferring icp: `, err);
      return false;
    } finally {
      setIsTransferring(false);
    }
  };

  // TODO: call directly pending deposits
  useEffect(() => {
    // getPendingDeposits();
    // getBalance();
  }, []);

  return (
    <LedgerContext.Provider
      value={{
        getBalance,
        getPendingDeposits,
        transfer,
        setShouldRefetchBalance,
        isTransferring,
        isLoadingBalance,
        error,
        pendingDeposits,
        balance,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

// Hook
export const useLedger = () => useContext(LedgerContext);
