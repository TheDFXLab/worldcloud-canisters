import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Principal } from "@dfinity/principal";
import AuthorityApi, { CanisterStatus } from "../../api/authority";
import { decodeError } from "../../utility/errors";
import { State } from "../../App";
import { useIdentity } from "../IdentityContext/IdentityContext";
import { useParams } from "react-router-dom";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";

interface AuthorityContextType {
  status: CanisterStatus | null;
  isLoadingStatus: boolean;
  // refreshStatus: () => Promise<void>;
  handleAddController: (newController: string) => Promise<boolean>;
  handleRemoveController: (controller: string) => Promise<boolean>;
}

const AuthorityContext = createContext<AuthorityContextType | undefined>(
  undefined
);

export function AuthorityProvider({
  children,
  state,
}: {
  children: ReactNode;
  state: State;
}) {
  const [status, setStatus] = useState<CanisterStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const { identity } = useIdentity();
  const { canisterId } = useParams();
  const { agent } = useHttpAgent();

  const handleAddController = async (newController: string) => {
    try {
      if (!canisterId) {
        throw new Error("Canister ID is not set");
      }
      const authApi = new AuthorityApi(Principal.fromText(canisterId));

      setIsLoadingStatus(true);
      if (!agent) {
        throw new Error("Agent not found");
      }
      // Implement add controller logic
      const result = await authApi.addController(
        Principal.fromText(newController),
        identity,
        agent
      );
      if (Object.keys(result)[0] === "ok") {
        setIsLoadingStatus(false);
      }
      return true;
    } catch (error: any) {
      setIsLoadingStatus(false);
      return false;
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleRemoveController = async (controller: string) => {
    try {
      if (!canisterId) {
        throw new Error("Canister ID is not set");
      }
      const authApi = new AuthorityApi(Principal.fromText(canisterId));

      setIsLoadingStatus(true);
      if (!agent) {
        throw new Error("Agent not found");
      }

      const result = await authApi.removeController(
        Principal.fromText(controller),
        identity,
        agent
      );

      if (Object.keys(result)[0] === "ok") {
        setIsLoadingStatus(false);
      }
      return true;
    } catch (error: any) {
      setIsLoadingStatus(false);
      return false;
    } finally {
      setIsLoadingStatus(false);
    }
  };

  return (
    <AuthorityContext.Provider
      value={{
        status,
        isLoadingStatus,
        // refreshStatus,
        handleAddController,
        handleRemoveController,
      }}
    >
      {children}
    </AuthorityContext.Provider>
  );
}
export function useAuthority() {
  const context = useContext(AuthorityContext);
  if (context === undefined) {
    throw new Error("useAuthority must be used within a AuthorityProvider");
  }
  return context;
}
