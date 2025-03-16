import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Role } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import AdminApi from "../../api/admin/AdminApi";
import { useIdentity } from "../IdentityContext/IdentityContext";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";
import { useQuery } from "@tanstack/react-query";
import MainApi from "../../api/main";

interface AdminContextType {
  isAdmin: boolean;
  isLoadingAdminStatus: boolean;
  adminRole: Role | null;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  // const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminRole, setAdminRole] = useState<Role | null>(null);
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();

  const handleAdminStatus = async () => {
    // console.log("Checking admin status", identity, agent);
    if (!identity || !agent) return false;
    // console.log("Checking admin status");
    const adminApi = new AdminApi();
    const result = await adminApi.isAdmin(
      identity.getPrincipal().toText(),
      identity,
      agent
    );

    // save to local storage
    localStorage.setItem(
      "adminStatus",
      JSON.stringify({
        status: result,
        timestamp: Date.now(),
        principal: identity.getPrincipal().toText(),
      })
    );

    return result;
  };

  // query user role
  const VERIFICATION_INTERVAL = 10 * 60 * 1000; // 10mins
  const { data: isAdmin = false, isLoading: isLoadingAdminStatus } = useQuery({
    queryKey: ["adminStatus", identity?.getPrincipal().toText()],
    queryFn: async () => {
      const res = await handleAdminStatus();
      return res;
    },
    initialData: () => {
      const stored = localStorage.getItem("adminStatus");
      if (!stored) {
        return false;
      }

      const { status, timestamp, principal } = JSON.parse(stored);
      const isExpired = Date.now() - timestamp > VERIFICATION_INTERVAL;
      if (isExpired) {
        localStorage.removeItem("adminStatus");
        return false;
      }

      if (identity && principal !== identity.getPrincipal().toText()) {
        localStorage.removeItem("adminStatus");
        return false;
      }
      return status;
    },
    staleTime: 0,
    refetchInterval: VERIFICATION_INTERVAL,
    refetchOnMount: true,
    enabled: !!identity && !!agent,
  });

  const hasAdminRole = async () => {
    const adminApi = new AdminApi();
    if (!identity || !agent) {
      return;
    }

    const isAdmin = await adminApi.isAdmin(
      identity?.getPrincipal().toText(),
      identity,
      agent
    );

    const mainApi = await MainApi.create(identity, agent);
    const allSubscriptions = await mainApi?.get_all_subscriptions();
    console.log("All subscriptions", allSubscriptions);

    return isAdmin;
  };

  useEffect(() => {
    if (!identity || !agent) {
      console.log("No identity or agent has admin", identity, agent);
      return;
    }
    hasAdminRole();
  }, [identity, agent]);

  return (
    <AdminContext.Provider value={{ isAdmin, isLoadingAdminStatus, adminRole }}>
      {children}
    </AdminContext.Provider>
  );
}
export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within a AdminProvider");
  }
  return context;
}
