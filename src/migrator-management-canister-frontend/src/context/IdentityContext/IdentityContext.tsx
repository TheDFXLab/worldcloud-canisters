import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Principal } from "@dfinity/principal";
import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent } from "@dfinity/agent";

import { Identity } from "@dfinity/agent";
import {
  frontend_canister_id_url,
  http_host,
  internetIdentityConfig,
} from "../../config/config";
import { ICPLedger } from "../../class/ICPLedger/ICPLedger";

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

const IdentityContext = createContext<IdentityContextType | undefined>(
  undefined
);

export function IdentityProvider({ children }: IdentityProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(true);
  const [identifiedIcpLedgerActor, setIdentifiedIcpLedgerActor] =
    useState<any>(null);

  const refreshIdentity = async () => {
    try {
      setIsLoadingIdentity(true);
      console.log(`Refreshing identity`);
      const authClient = await AuthClient.create();
      const identity = authClient.getIdentity();
      console.log(`Identity:`, identity.getPrincipal().toText());
      if (
        identity.getPrincipal().toText() ===
        internetIdentityConfig.loggedOutPrincipal
      ) {
        setIsConnected(false);
        setIdentity(null);
        return identity;
      }
      setIdentity(identity);
      setIsConnected(true);
      return identity;
    } catch (error) {
      console.error(`Error refreshing identity`, error);
      return null;
    } finally {
      setIsLoadingIdentity(false);
    }
  };

  const disconnect = async () => {
    setIsLoadingIdentity(true);
    const authClient = await AuthClient.create();
    await authClient.logout();

    setIdentity(null);
    setIsLoadingIdentity(false);
    setIsConnected(false);
    return true;
  };

  const connectWallet = async (canisterId: Principal) => {
    try {
      console.log(`Connecting wallet`);
      // Create an auth client
      let authClient = await AuthClient.create();

      const popUpHeight = 0.42 * window.innerWidth;
      const popUpWidth = 0.35 * window.innerWidth;

      const left = window.innerWidth / 2 - popUpWidth / 2;
      const top = window.innerHeight / 2 - popUpHeight / 3;

      await new Promise((resolve, reject) => {
        //safari: http://bw4dl-smaaa-aaaaa-qaacq-cai.localhost:4943/
        //http://bw4dl-smaaa-aaaaa-qaacq-cai.127.0.0.1:4943/
        //
        authClient.login({
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

      const identity = authClient.getIdentity();
      console.log(
        `Logged in with principal:`,
        identity.getPrincipal().toText()
      );

      // Using the identity obtained from the auth client, create an agent to interact with the IC.
      const agent = await HttpAgent.create({
        identity,
        // host: `http://localhost:4943`,
        host: http_host,
      });

      await agent.fetchRootKey();

      const icpLedgerFactory = new ICPLedger(agent, canisterId);

      setIdentity(identity);
      setIdentifiedIcpLedgerActor(icpLedgerFactory.actor);

      setIsConnected(true);
      return identity;
    } catch (error) {
      console.error("Error during wallet connection:", error);
      return null;
    }
  };

  useEffect(() => {
    const refresh = async () => {
      await refreshIdentity();
    };
    refresh();
  }, []);

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
