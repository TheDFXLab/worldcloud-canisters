import { useEffect, useState } from "react";
import "./AuthWrapper.css";
import plugLogo from "../../../assets//images/plug-connect.png";
import ii from "../../../assets/images/ii.png";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { Principal } from "@dfinity/principal";
import {
  internet_identity_canister_id,
  internetIdentityConfig,
} from "../../config/config";
import { AuthClient } from "@dfinity/auth-client";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { connectWallet, disconnect, identity, isConnected } = useIdentity();

  const logout = async () => {
    const isLoggedOut = await disconnect();
    if (!isLoggedOut) {
      return;
    }
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  const login = async () => {
    const identity = await connectWallet(
      Principal.fromText(internet_identity_canister_id)
    );

    if (!identity) {
      setIsLoading(false);
      setIsAuthenticated(false);
      return;
    }
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const loginWithPlug = async () => {
    console.log("Login with Plug");
  };

  useEffect(() => {
    try {
      const checkAuth = async () => {
        setIsLoading(true);
        let authClient = await AuthClient.create();
        const identity = authClient.getIdentity();
        if (!identity) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        if (
          identity.getPrincipal().toText() ===
          internetIdentityConfig.loggedOutPrincipal
        ) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setIsLoading(false);
      };
      checkAuth();
    } catch (error) {
      console.log(`error.....`, error);
      setIsLoading(false);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    setIsAuthenticated(isConnected);
  }, [isConnected]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-description">
            Connect your wallet to access the Migrator Management Dashboard
          </p>
          <div className="auth-buttons">
            <button onClick={login} className="auth-button ii">
              <img
                className="auth-button-icon iiLogo"
                src={ii}
                alt="Internet Identity"
              />
              Continue with Internet Identity
            </button>

            <div onClick={loginWithPlug} className="auth-button-image">
              <img
                className="auth-button-image-icon"
                src={plugLogo}
                alt="Plug Wallet"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
