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

  if (!state.canister_id) return;
  const authApi = new AuthorityApi(Principal.fromText(state.canister_id));

  const refreshStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const result = await authApi.getCanisterStatus(authApi.canisterId);
      setStatus(result);
    } catch (error) {
      setIsLoadingStatus(false);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleAddController = async (newController: string) => {
    try {
      setIsLoadingStatus(true);
      // Implement add controller logic
      const result = await authApi.addController(
        Principal.fromText(newController)
      );
      if (Object.keys(result)[0] === "ok") {
        setIsLoadingStatus(false);

        console.log(`Controller added successfully`);
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
      setIsLoadingStatus(true);
      // Implement remove controller logic
      const result = await authApi.removeController(
        Principal.fromText(controller)
      );

      if (Object.keys(result)[0] === "ok") {
        setIsLoadingStatus(false);
        console.log(`Controller removed successfully`);
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
