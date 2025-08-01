import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useAdminLogic } from "../../hooks/useAdminLogic";
import { useIdentity } from "../IdentityContext/IdentityContext";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";
import AdminApi from "../../api/admin/AdminApi";
import { SerializedSubscription } from "../../serialization/subscription";

interface AdminContextType {
  // Admin status
  isAdmin: boolean;
  isLoadingAdminStatus: boolean;

  // Data
  slots: any[];
  availableSlots: number[];
  usedSlots: [number, boolean][];
  allSubscriptions: [string, SerializedSubscription][];
  deployedCanisters: string[];

  // Loading states
  isLoadingSlots: boolean;
  isLoadingSubscriptions: boolean;
  isLoadingCanisters: boolean;
  isLoadingActivityLogs: boolean;
  isLoadingAccessControl: boolean;
  isLoading: boolean;

  // Messages
  error: string | null;
  successMessage: string | null;

  // Actions
  refreshSlots: () => Promise<void>;
  refreshAvailableSlots: () => Promise<void>;
  refreshUsedSlots: () => Promise<void>;
  refreshAllSubscriptions: () => Promise<void>;
  refreshDeployedCanisters: () => Promise<void>;
  handleSetAllSlotDuration: (newDurationMs: number) => Promise<void>;
  handleDeleteUsageLogs: () => Promise<void>;
  handleUpdateSlot: (slotId: number, updatedSlot: any) => Promise<void>;
  handleDeleteProjects: () => Promise<void>;
  handleDeleteWorkflowRunHistory: () => Promise<void>;
  handleResetProjectSlot: (projectId: number) => Promise<void>;
  handleResetSlots: () => Promise<void>;
  handlePurgeExpiredSessions: () => Promise<void>;
  handleDeleteAllLogs: () => Promise<void>;
  handleGrantRole: (principal: string, role: any) => Promise<void>;
  handleRevokeRole: (principal: string) => Promise<void>;
  handleCheckRole: (principal: string) => Promise<void>;
  handleUploadAssetCanisterWasm: (wasm: number[]) => Promise<void>;
  handleClearError: () => void;
  handleClearSuccessMessage: () => void;

  // Context state
  shouldRefetchAdmin: boolean;
  setShouldRefetchAdmin: (value: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [shouldRefetchAdmin, setShouldRefetchAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAdminStatus, setIsLoadingAdminStatus] = useState(true);

  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const adminLogic = useAdminLogic();

  // Check admin status on mount and when identity changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!identity || !agent) {
        setIsAdmin(false);
        setIsLoadingAdminStatus(false);
        return;
      }

      try {
        setIsLoadingAdminStatus(true);
        const adminApi = new AdminApi();
        const principal = identity.getPrincipal().toText();
        const adminStatus = await adminApi.isAdmin(principal, identity, agent);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error("Failed to check admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoadingAdminStatus(false);
      }
    };

    checkAdminStatus();
  }, [identity, agent]);

  // Refetch data when shouldRefetchAdmin is true
  useEffect(() => {
    if (shouldRefetchAdmin) {
      adminLogic.refreshSlots();
      adminLogic.refreshAvailableSlots();
      adminLogic.refreshUsedSlots();
      adminLogic.refreshAllSubscriptions();
      adminLogic.refreshDeployedCanisters();
      setShouldRefetchAdmin(false);
    }
  }, [shouldRefetchAdmin, adminLogic]);

  const contextValue: AdminContextType = {
    ...adminLogic,
    isAdmin,
    isLoadingAdminStatus,
    shouldRefetchAdmin,
    setShouldRefetchAdmin,
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
