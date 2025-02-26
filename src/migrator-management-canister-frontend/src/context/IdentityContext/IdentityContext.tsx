import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { Principal } from "@dfinity/principal";
import { AuthClient } from "@dfinity/auth-client";

import { Identity } from "@dfinity/agent";
import {
  environment,
  frontend_canister_id_url,
  internetIdentityConfig,
} from "../../config/config";
import { useNavigate } from "react-router-dom";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";
import { clearUserData } from "../../utility/cleanup";

interface IdentityProviderProps {
  children: ReactNode;
}

interface IdentityContextType {
  isConnected: boolean;
  identity: Identity | null;
  isLoadingIdentity: boolean;
  refreshIdentity: () => Promise<Identity | null>;
  connectWallet: (canisterId: Principal) => Promise<Identity | null>;
  disconnect: () => Promise<boolean>;
}

let globalAuthClient: AuthClient | null = null;
let isInitializing: boolean = false;

const IdentityContext = createContext<IdentityContextType | undefined>(
  undefined
);

const getGlobalAuthClient = async () => {
  try {
    if (!globalAuthClient) {
      if (isInitializing) {
        return null;
      }
      isInitializing = true;
      globalAuthClient = await AuthClient.create({
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true,
        },
      });
    }

    return globalAuthClient;
  } catch (error) {
    console.error("Error creating AuthClient", error);
    return null;
  } finally {
    isInitializing = false;
  }
};

export function IdentityProvider({ children }: IdentityProviderProps) {
  const navigate = useNavigate();
  const { fetchHttpAgent, clearHttpAgent, agent } = useHttpAgent();

  const [isConnected, setIsConnected] = useState(() => {
    // Check if user was previously connected
    const stored = localStorage.getItem("connectionStatus");
    if (!stored) return false;

    const { status, timestamp } = JSON.parse(stored);
    // Invalidate after 24 hours
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem("connectionStatus");
      return false;
    }
    return status;
  });

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(true);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);

  const refreshIdentity = async () => {
    try {
      setIsLoadingIdentity(true);
      let _authClient = await getGlobalAuthClient();
      if (!_authClient) return null;

      const isAuthenticated = await _authClient.isAuthenticated();
      if (!isAuthenticated) {
        setIsConnected(false);
        localStorage.removeItem("connectionStatus");
        clearUserData();
        return null;
      }

      const identity = _authClient.getIdentity();
      await fetchHttpAgent(identity);
      setIdentity(identity);
      setIsConnected(true);

      // Store connection status
      localStorage.setItem(
        "connectionStatus",
        JSON.stringify({
          status: true,
          timestamp: Date.now(),
          principal: identity.getPrincipal().toText(),
        })
      );

      return identity;
    } catch (error) {
      console.error(`Error refreshing identity`, error);
      return null;
    } finally {
      setIsLoadingIdentity(false);
    }
  };

  const disconnect = async () => {
    try {
      if (!globalAuthClient) return false;

      await globalAuthClient.logout();
      setIdentity(null);
      setIsConnected(false);

      // Clear all stored data
      clearUserData();
      clearHttpAgent();

      return true;
    } catch (error) {
      console.error("Error during disconnect:", error);
      return false;
    }
  };

  const connectWallet = async (canisterId: Principal) => {
    try {
      console.log(`Connecting wallet`);
      setIsLoadingIdentity(true);
      let _authClient = await getGlobalAuthClient();
      if (!_authClient) {
        console.log(`No auth client found while connecting wallet`);
        return null;
      }

      const isAuthenticated = await _authClient.isAuthenticated();
      if (isAuthenticated) {
        const id = _authClient.getIdentity();
        console.log(
          `Authenticated already with id`,
          id.getPrincipal().toText()
        );

        setIdentity(id);
        setIsConnected(true);
        return id;
      }

      const popUpHeight = 0.42 * window.innerWidth;
      const popUpWidth = 0.35 * window.innerWidth;

      const left = window.innerWidth / 2 - popUpWidth / 2;
      const top = window.innerHeight / 2 - popUpHeight / 3;

      await new Promise((resolve, reject) => {
        //safari: http://bw4dl-smaaa-aaaaa-qaacq-cai.localhost:4943/
        //http://bw4dl-smaaa-aaaaa-qaacq-cai.127.0.0.1:4943/
        //
        _authClient.login({
          derivationOrigin: frontend_canister_id_url,
          identityProvider: internetIdentityConfig.identityProvider,
          windowOpenerFeatures: `toolbar=0,location=0,menubar=0,width=${popUpWidth},height=${popUpHeight},left=${left},top=${top}`,

          maxTimeToLive: BigInt(
            internetIdentityConfig.loginExpiryInHours *
              60 *
              60 *
              1000 *
              1000 *
              1000
          ),
          onSuccess: resolve,
          onError: reject,
        });
      });

      const identity = _authClient.getIdentity();
      console.log(
        `Logged in with principal:`,
        identity.getPrincipal().toText()
      );

      // Initialize the agent
      const agent = await fetchHttpAgent(identity);
      if (!agent) {
        console.log("IdentityContext: No agent found");
        return null;
      }

      setIdentity(identity);
      setIsConnected(true);
      return identity;
    } catch (error) {
      console.error("Error during wallet connection:", error);
      return null;
    } finally {
      setIsLoadingIdentity(false);
    }
  };

  useEffect(() => {
    const refresh = async () => {
      await refreshIdentity();
    };

    if (!authClient) {
      return;
    }
    refresh();
  }, [authClient]);

  return (
    <IdentityContext.Provider
      value={{
        isConnected,
        identity,
        isLoadingIdentity,
        refreshIdentity,
        connectWallet,
        disconnect,
      }}
    >
      {children}
    </IdentityContext.Provider>
  );
}
export function useIdentity() {
  const context = useContext(IdentityContext);
  if (context === undefined) {
    throw new Error("useIdentity must be used within a IdentityProvider");
  }
  return context;
}
