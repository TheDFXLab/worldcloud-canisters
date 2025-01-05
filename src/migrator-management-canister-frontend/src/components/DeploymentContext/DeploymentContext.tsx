import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { migrator_management_canister_backend } from "../../../../declarations/migrator-management-canister-backend";
import { Deployment } from "../AppLayout/interfaces";
// import { Deployment } from "../AppLayout/AppLayout";

interface DeploymentsContextType {
  deployments: Deployment[];
  isLoading: boolean;
  refreshDeployments: () => Promise<void>;
  addDeployment: (deployment: Deployment) => void;
  updateDeployment: (canisterId: string, updates: Partial<Deployment>) => void;
}

const DeploymentsContext = createContext<DeploymentsContextType | undefined>(
  undefined
);

export function DeploymentsProvider({ children }: { children: ReactNode }) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDeployments = async () => {
    try {
      console.log(`refreshing((((((()))))))`);
      const result =
        await migrator_management_canister_backend.getCanisterDeployments();

      console.log(`refreshed.....`);
      const deploymentsArray = result.map((deployment) => ({
        ...deployment,
        size: Number(deployment.size),
        status: Object.keys(deployment.status)[0] as Deployment["status"],
        date_created: Number(deployment.date_created),
        date_updated: Number(deployment.date_updated),
      }));
      setDeployments(deploymentsArray);
    } catch (error) {
      console.error("Failed to fetch deployments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addDeployment = (deployment: Deployment) => {
    setDeployments((prev) => [...prev, deployment]);
  };

  const updateDeployment = (
    canisterId: string,
    updates: Partial<Deployment>
  ) => {
    setDeployments((prev) =>
      prev.map((dep) =>
        dep.canister_id.toText() === canisterId ? { ...dep, ...updates } : dep
      )
    );
  };

  useEffect(() => {
    refreshDeployments();
  }, []);

  return (
    <DeploymentsContext.Provider
      value={{
        deployments,
        isLoading,
        refreshDeployments,
        addDeployment,
        updateDeployment,
      }}
    >
      {children}
    </DeploymentsContext.Provider>
  );
}

export function useDeployments() {
  const context = useContext(DeploymentsContext);
  if (context === undefined) {
    throw new Error("useDeployments must be used within a DeploymentsProvider");
  }
  return context;
}
