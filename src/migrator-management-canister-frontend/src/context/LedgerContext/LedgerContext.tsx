import { createContext, useContext, useEffect, useState } from "react";
import { useIdentity } from "../IdentityContext/IdentityContext";
import LedgerApi from "../../api/ledger/LedgerApi";
import MainApi from "../../api/main";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";

interface LedgerContextType {
  balance: bigint | null;
  isLoadingBalance: boolean;
  getBalance: () => Promise<void>;
  transfer: (amount: number, to: string) => Promise<boolean>;
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
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const { agent } = useHttpAgent();

  const getPendingDeposits = async () => {
    if (!agent) {
      throw new Error("Agent not found");
    }
    const mainApi = await MainApi.create(identity, agent);
    const pendingDeposits = await mainApi?.getPendingDeposits();
    if (pendingDeposits && pendingDeposits.e8s > 0) {
      setPendingDeposits(Number(pendingDeposits.e8s));
    }
  };

  const getBalance = async () => {
    try {
      if (!identity) {
        return;
      }
      if (!agent) {
        return;
      }
      const ledgerApi = await LedgerApi.create(identity, agent);
      if (!ledgerApi) {
        throw new Error("Ledger API not initialized");
      }
      setIsLoadingBalance(true);
      const balance = await ledgerApi.getBalance();
      setBalance(balance);
    } catch (error) {
      console.error(`Error getting balance`, error);
    } finally {
      setIsLoadingBalance(false);
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
        transfer,
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
