import { createContext, useContext, ReactNode } from "react";
import { Deployment } from "../../components/AppLayout/interfaces";
import { WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { useDeploymentLogic } from "../../hooks/useDeploymentLogic";
import { SerializedWorkflowRunDetail } from "../../utility/principal";

interface DeploymentsContextType {
  deployments: Deployment[];
  selectedDeployment: Deployment | null;
  setSelectedDeployment: (deployment: Deployment | null) => void;
  isLoading: boolean;
  refreshDeployments: () => Promise<void>;
  getDeployment: (canisterId: string) => Deployment | undefined;
  getWorkflowRunHistory: (
    project_id: bigint
  ) => Promise<SerializedWorkflowRunDetail[] | undefined>;
  addDeployment: (deployment: Deployment) => void;
  updateDeployment: (canisterId: string, updates: Partial<Deployment>) => void;
  isDispatched: boolean;
  setIsDispatched: (isDispatched: boolean) => void;
}

const DeploymentsContext = createContext<DeploymentsContextType | undefined>(
  undefined
);

export function DeploymentsProvider({ children }: { children: ReactNode }) {
  const {
    deployments,
    selectedDeployment,
    isLoading,
    isDispatched,
    refreshDeployments,
    getDeployment,
    getWorkflowRunHistory,
    addDeployment,
    updateDeployment,
    setSelectedDeployment,
    setIsDispatched,
  } = useDeploymentLogic();

  const value = {
    deployments,
    selectedDeployment,
    setSelectedDeployment,
    isLoading,
    refreshDeployments,
    getDeployment,
    getWorkflowRunHistory,
    addDeployment,
    updateDeployment,
    isDispatched,
    setIsDispatched,
  } as DeploymentsContextType;

  return (
    <DeploymentsContext.Provider value={value}>
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
