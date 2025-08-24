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
import { useNavigate } from "react-router-dom";
import { HttpAgentManager } from "../../agent/http_agent";

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
  const navigate = useNavigate();

  // Function to load initial data after authentication
  const loadInitialData = useCallback(
    async (_identity: Identity, _agent: any) => {
      try {
        // Load projects
        await dispatch(
          getUserProjects({ identity: _identity, agent: _agent, silent: true })
        );
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
        return null;
      }

      // Get the identity from the auth client
      const identity = authClient.getIdentity();

      if (!identity) {
        return null;
      }

      return identity;
    } catch (error) {
      return null;
    }
  }

  const refreshIdentity = async () => {
    try {
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
      const agent = await HttpAgentManager.getInstance(null);
      agent?.clear();

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
      setIsLoadingIdentity(true);
      summon("Logging in...");
      const _authClient = await AuthClient.create({
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true,
        },
      });

      setGlobalAuthClient(_authClient);

      // Responsive popup dimensions for all devices
      const getPopupDimensions = () => {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Base dimensions for different screen sizes
        let popUpWidth: number;
        let popUpHeight: number;

        if (screenWidth <= 480) {
          // Mobile phones
          popUpWidth = Math.min(screenWidth * 0.95, 400);
          popUpHeight = Math.min(screenHeight * 0.8, 600);
        } else if (screenWidth <= 768) {
          // Tablets
          popUpWidth = Math.min(screenWidth * 0.85, 500);
          popUpHeight = Math.min(screenHeight * 0.75, 700);
        } else if (screenWidth <= 1024) {
          // Small laptops
          popUpWidth = Math.min(screenWidth * 0.6, 600);
          popUpHeight = Math.min(screenHeight * 0.7, 800);
        } else {
          // Desktop and larger screens
          popUpWidth = Math.min(screenWidth * 0.4, 700);
          popUpHeight = Math.min(screenHeight * 0.65, 900);
        }

        // Ensure minimum dimensions
        popUpWidth = Math.max(popUpWidth, 320);
        popUpHeight = Math.max(popUpHeight, 500);

        // Ensure popup doesn't exceed screen boundaries
        popUpWidth = Math.min(popUpWidth, screenWidth - 20);
        popUpHeight = Math.min(popUpHeight, screenHeight - 20);

        // Calculate position to center the popup
        const left = Math.max(0, (screenWidth - popUpWidth) / 2);
        const top = Math.max(0, (screenHeight - popUpHeight) / 2);

        // Ensure popup is fully visible on screen
        const finalLeft = Math.min(left, screenWidth - popUpWidth - 10);
        const finalTop = Math.min(top, screenHeight - popUpHeight - 10);

        return {
          popUpWidth: Math.round(popUpWidth),
          popUpHeight: Math.round(popUpHeight),
          left: Math.round(finalLeft),
          top: Math.round(finalTop),
        };
      };

      const { popUpWidth, popUpHeight, left, top } = getPopupDimensions();

      await new Promise((resolve, reject) => {
        //safari: http://bw4dl-smaaa-aaaaa-qaacq-cai.localhost:4943/
        //http://bw4dl-smaaa-aaaaa-qaacq-cai.127.0.0.1:4943/
        //
        _authClient.login({
          derivationOrigin: frontend_canister_id_url,
          identityProvider: internetIdentityConfig.identityProvider,
          windowOpenerFeatures: `toolbar=0,location=0,menubar=0,width=${popUpWidth},height=${popUpHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`,

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

      // Initialize the agent
      const agent = await fetchHttpAgent(identity);
      if (!agent) {
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
    } catch (error: any) {
      if (error.message.includes("Invalid delegation expiry")) {
        console.log(`invalid...`);
        disconnect();
        navigate("/");
      }
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
