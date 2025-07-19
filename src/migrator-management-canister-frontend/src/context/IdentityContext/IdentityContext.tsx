import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

import { Principal } from "@dfinity/principal";
import { AuthClient, IdbStorage } from "@dfinity/auth-client";

import { Identity } from "@dfinity/agent";
import {
  frontend_canister_id_url,
  internetIdentityConfig,
} from "../../config/config";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";
import { clearUserData } from "../../utility/cleanup";
import { useQueryClient } from "@tanstack/react-query";
import { isLoggedOutPrincipal } from "../../utility/identity";
import AuthApi from "../../api/auth/AuthApi";
import { useLoaderOverlay } from "../LoaderOverlayContext/LoaderOverlayContext";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../state/store";
import { getUserProjects } from "../../state/slices/projectsSlice";
import { fetchFreemiumUsage } from "../../state/slices/freemiumSlice";
import {
  fetchSubscription,
  fetchTiers,
} from "../../state/slices/subscriptionSlice";

interface IdentityProviderProps {
  children: ReactNode;
}

interface IdentityContextType {
  isConnected: boolean;
  identity: Identity | null;
  isLoadingIdentity: boolean;
  refreshIdentity: () => Promise<Identity | null>;
  connectWallet: (principal?: Principal) => Promise<Identity | null>;
  disconnect: () => Promise<boolean>;
}

let globalAuthClient: AuthClient | null = null;
let isInitializing: boolean = false;

const IdentityContext = createContext<IdentityContextType | undefined>(
  undefined
);

const setGlobalAuthClient = (authClient: AuthClient) => {
  globalAuthClient = authClient;
};

const getGlobalAuthClient = async () => {
  try {
    if (!globalAuthClient) {
      if (isInitializing) {
        return null;
      }
      console.log("Creating AuthClient");
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
  const { fetchHttpAgent, clearHttpAgent, agent } = useHttpAgent();
  const queryClient = useQueryClient();
  const dispatch = useDispatch<AppDispatch>();
  const { setMessage, summon, destroy } = useLoaderOverlay();

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

  // Function to load initial data after authentication
  const loadInitialData = useCallback(
    async (_identity: Identity, _agent: any) => {
      try {
        console.log(`(((LOADING INITIAL DATA)))`);
        // Load projects
        await dispatch(
          getUserProjects({ identity: _identity, agent: _agent, silent: true })
        );
        console.log(`DISPATCHING FETCH FREMIUM USAGE`);
        // Load freemium usage
        await dispatch(
          fetchFreemiumUsage({
            identity: _identity,
            agent: _agent,
            silent: true,
          })
        );

        // Load subscription data
        await dispatch(
          fetchSubscription({
            identity: _identity,
            agent: _agent,
            silent: true,
          })
        );
        await dispatch(
          fetchTiers({ identity: _identity, agent: _agent, silent: true })
        );
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    },
    [dispatch]
  );

  async function getIdentity() {
    try {
      // Create a new auth client
      const authClient = await getGlobalAuthClient();

      if (!authClient) {
        console.log("No auth client found");
        return null;
      }

      // Get the identity from the auth client
      const identity = authClient.getIdentity();

      if (!identity) {
        console.log("No identity found");
        return null;
      }

      return identity;
    } catch (error) {
      console.error("Error getting identity:", error);
      return null;
    }
  }

  const refreshIdentity = async () => {
    try {
      // if (!identity) return null;

      console.log("refreshIdentity");
      setIsLoadingIdentity(true);

      let _identity = await getIdentity();
      if (!_identity) {
        return null;
      }

      if (isLoggedOutPrincipal(_identity.getPrincipal())) {
        await disconnect();
        return null;
      }

      const _agent = await fetchHttpAgent(_identity);
      setIdentity(_identity);
      setIsConnected(true);

      // Store connection status
      localStorage.setItem(
        "connectionStatus",
        JSON.stringify({
          status: true,
          timestamp: Date.now(),
          principal: _identity.getPrincipal().toText(),
        })
      );

      // Load initial data after successful authentication
      if (_agent) {
        loadInitialData(_identity, _agent);
      }

      return _identity;
    } catch (error) {
      console.error(`Error refreshing identity`, error);
      return null;
    } finally {
      setIsLoadingIdentity(false);
    }
  };

  const disconnect = async () => {
    try {
      // Delete jwt token
      const authApi = new AuthApi();
      await authApi.signOut();

      // Clear IDB storage
      const storage = new IdbStorage();
      await Promise.all([
        storage.remove("identity"),
        storage.remove("delegation"),
      ]);

      queryClient.clear();

      setIdentity(null);
      setIsConnected(false);

      // Clear all stored data
      clearUserData();

      return true;
    } catch (error) {
      console.error("Error during disconnect:", error);
      return false;
    }
  };

  const connectWallet = async () => {
    try {
      console.log(`Connecting wallet`);
      setIsLoadingIdentity(true);
      summon("Logging in...");
      const _authClient = await AuthClient.create({
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true,
        },
      });

      console.log("Auth client created");
      setGlobalAuthClient(_authClient);

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

      // Store connection status
      localStorage.setItem(
        "connectionStatus",
        JSON.stringify({
          status: true,
          timestamp: Date.now(),
          principal: identity.getPrincipal().toText(),
        })
      );

      const authApi = new AuthApi();
      summon("Requesting challenge message to sign...");
      await authApi.signIn(identity, agent, summon);
      setIdentity(identity);
      setIsConnected(true);

      // Load initial data after successful authentication
      loadInitialData(identity, agent);

      return identity;
    } catch (error) {
      console.error("Error during wallet connection:", error);
      return null;
    } finally {
      setIsLoadingIdentity(false);
      destroy();
    }
  };

  useEffect(() => {
    const refresh = async () => {
      await refreshIdentity();
    };

    if (!authClient || !identity || !agent) {
      return;
    }
    refresh();
  }, [authClient, identity]);

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
