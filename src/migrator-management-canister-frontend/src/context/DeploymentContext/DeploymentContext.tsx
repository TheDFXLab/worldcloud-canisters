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
import { Principal } from "@dfinity/principal";
import { WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { useProgress } from "../ProgressBarContext/ProgressBarContext";

export interface DeploymentDetails {
  workflow_run_id: number;
  repo_name: string;
  date_created: number;
  status: "pending" | "completed" | "failed";
  branch?: string;
  commit_hash?: string;
  error_message?: string;
  size?: number;
}

interface DeploymentsContextType {
  deployments: Deployment[];
  selectedDeployment: Deployment | null;
  setSelectedDeployment: (deployment: Deployment | null) => void;
  isLoading: boolean;
  refreshDeployments: () => Promise<void>;
  getDeployment: (canisterId: string) => Deployment | undefined;
  getWorkflowRunHistory: (
    canisterId: string
  ) => Promise<WorkflowRunDetails[] | undefined>;
  addDeployment: (deployment: Deployment) => void;
  updateDeployment: (canisterId: string, updates: Partial<Deployment>) => void;
  isDispatched: boolean;
  setIsDispatched: (isDispatched: boolean) => void;
}

const DeploymentsContext = createContext<DeploymentsContextType | undefined>(
  undefined
);

export function DeploymentsProvider({ children }: { children: ReactNode }) {
  /** Hooks */
  const { identity } = useIdentity();
  const { setIsLoadingProgress, setIsEnded } = useProgress();

  /** State */
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedDeployment, setSelectedDeployment] =
    useState<Deployment | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDispatched, setIsDispatched] = useState(false);

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

      setIsLoadingProgress(true);
      setIsEnded(false);
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
      setIsLoadingProgress(false);
      setIsEnded(true);
    }
  };

  const addDeployment = (deployment: Deployment) => {
    setDeployments((prev) => [...prev, deployment]);
  };

  const getWorkflowRunHistory = async (canisterId: string) => {
    const mainApi = await MainApi.create(identity);
    if (!mainApi) {
      throw new Error(`Failed to create main api instance.`);
    }
    const runsHistory = await mainApi.getWorkflowHistory(
      Principal.fromText(canisterId)
    );

    return runsHistory;
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
        getWorkflowRunHistory,
        isLoading,
        refreshDeployments,
        addDeployment,
        updateDeployment,
        isDispatched,
        setIsDispatched,
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
