import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Deployment } from "../../components/AppLayout/interfaces";
import MainApi from "../../api/main";
import { useIdentity } from "../IdentityContext/IdentityContext";

interface DeploymentsContextType {
  deployments: Deployment[];
  selectedDeployment: Deployment | null;
  setSelectedDeployment: (deployment: Deployment | null) => void;
  isLoading: boolean;
  refreshDeployments: () => Promise<void>;
  getDeployment: (canisterId: string) => Deployment | undefined;
  addDeployment: (deployment: Deployment) => void;
  updateDeployment: (canisterId: string, updates: Partial<Deployment>) => void;
}

const DeploymentsContext = createContext<DeploymentsContextType | undefined>(
  undefined
);

export function DeploymentsProvider({ children }: { children: ReactNode }) {
  const { identity } = useIdentity();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedDeployment, setSelectedDeployment] =
    useState<Deployment | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const getDeployment = (canisterId: string) => {
    console.log(`all deps:`, deployments);
    console.log(`can:`, canisterId);
    return deployments.find(
      (deployment) => deployment.canister_id.toText() === canisterId
    );
  };

  const refreshDeployments = async () => {
    try {
      if (!identity) {
        throw new Error("Identity not found");
      }

      const mainApi = await MainApi.create(identity);
      const result = await mainApi?.getCanisterDeployments();

      if (!result) {
        throw new Error("No deployments found");
      }

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
  }, [identity]);

  return (
    <DeploymentsContext.Provider
      value={{
        deployments,
        selectedDeployment,
        setSelectedDeployment,
        getDeployment,
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
