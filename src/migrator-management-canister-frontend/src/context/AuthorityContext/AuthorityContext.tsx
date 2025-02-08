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

interface AuthorityContextType {
  status: CanisterStatus | null;
  isLoadingStatus: boolean;
  refreshStatus: () => Promise<void>;
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

  const refreshStatus = async () => {
    try {
      if (!canisterId) {
        console.log(`Canister ID is not set`);
        throw new Error("Canister ID is not set");
      }
      const authApi = new AuthorityApi(Principal.fromText(canisterId));

      setIsLoadingStatus(true);
      const result = await authApi.getCanisterStatus(
        authApi.canisterId,
        identity
      );
      setStatus(result);
    } catch (error) {
      console.log(`Error:`, error);
      setIsLoadingStatus(false);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleAddController = async (newController: string) => {
    try {
      if (!canisterId) {
        throw new Error("Canister ID is not set");
      }
      const authApi = new AuthorityApi(Principal.fromText(canisterId));

      setIsLoadingStatus(true);
      // Implement add controller logic
      const result = await authApi.addController(
        Principal.fromText(newController),
        identity
      );
      if (Object.keys(result)[0] === "ok") {
        setIsLoadingStatus(false);
      }
      return true;
    } catch (error: any) {
      console.log(`error:`, decodeError(error.toString()));

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

      const result = await authApi.removeController(
        Principal.fromText(controller),
        identity
      );

      if (Object.keys(result)[0] === "ok") {
        setIsLoadingStatus(false);
      }
      return true;
    } catch (error: any) {
      console.log(`Error:`, decodeError(error.toString()));
      setIsLoadingStatus(false);
      return false;
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // TODO: remove this and propagate changes in project
  useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <AuthorityContext.Provider
      value={{
        status,
        isLoadingStatus,
        refreshStatus,
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
