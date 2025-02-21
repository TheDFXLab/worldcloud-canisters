import { useEffect, useState } from "react";
import "./AuthWrapper.css";
import plugLogo from "../../../assets//images/plug-connect.png";
import ii from "../../../assets/images/ii.png";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { Principal } from "@dfinity/principal";
import { internet_identity_canister_id } from "../../config/config";
import LoaderOverlay from "../LoaderOverlay/LoaderOverlay";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { summon, destroy } = useLoaderOverlay();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const {
    connectWallet,
    disconnect,
    refreshIdentity,
    identity,
    isLoadingIdentity,
    isConnected,
  } = useIdentity();

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
      refreshIdentity();
    } catch (error) {
      console.log(`error.....`, error);
      setIsLoading(false);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    setIsAuthenticated(isConnected);
  }, [isConnected]);

  useEffect(() => {
    if (isLoadingIdentity) {
      summon("Loading...");
    } else {
      destroy();
    }
  }, [isLoadingIdentity]);

  if (isLoadingIdentity && !isConnected) {
    return <LoaderOverlay />;
  }

  if (!isConnected) {
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
