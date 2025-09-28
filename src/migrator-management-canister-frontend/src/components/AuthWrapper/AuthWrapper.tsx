import { useEffect, useState } from "react";
import "./AuthWrapper.css";
import plugLogo from "../../../assets//images/plug-connect.png";
import ii from "../../../assets/images/ii.png";
import appleIcon from "../../../assets/images/socials/apple-icon.svg";
import googleIcon from "../../../assets/images/socials/google-tile.svg";
import microsoftIcon from "../../../assets/images/socials/microsoft-icon.svg";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { Principal } from "@dfinity/principal";
import { internet_identity_canister_id } from "../../config/config";
import LoaderOverlay from "../LoaderOverlay/LoaderOverlay";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import { useTheme } from "../../context/ThemeContext/ThemeContext";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const {
    connectWallet,
    disconnect,
    refreshIdentity,
    identity,
    isLoadingIdentity,
    isConnected,
  } = useIdentity();
  const { summon, destroy } = useLoaderOverlay();
  const { logo } = useTheme();

  const loginII2 = async () => {
    try {
      summon("Connecting to Internet Identity 2.0...");
      const identity = await connectWallet(
        Principal.fromText(internet_identity_canister_id),
        "ii2"
      );

      if (!identity) {
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      destroy();
    }
  };
  const login = async () => {
    try {
      summon("Connecting to Internet Identity...");
      const identity = await connectWallet(
        Principal.fromText(internet_identity_canister_id),
        "ii1"
      );

      if (!identity) {
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      destroy();
    }
  };

  const loginWithPlug = async () => {};

  useEffect(() => {
    try {
      refreshIdentity();
    } catch (error) {
      setIsLoading(false);
    }
  }, []);

  if (isLoadingIdentity && !isConnected) {
    return <LoaderOverlay />;
  }

  if (!isConnected) {
    return (
      <>
        <div className="auth-container">
          <div className="auth-cards-container">
            <div className="auth-logo-section">
              <span className="auth-logo-text-parent">
                <img
                  src={logo}
                  alt="WorldCloud Logo"
                  className="auth-logo-icon"
                />
                <span>
                  <span className="auth-logo-text-child">World</span>
                  <span className="auth-logo-text-child">{"("}</span>
                  <span className="auth-logo-text-child">cloud</span>
                  <span className="auth-logo-text-child">{")"}</span>
                  <span className="auth-logo-text-child">{";"}</span>
                  <span className="auth-beta-text">{" beta"}</span>
                </span>
              </span>
            </div>
            <div className="auth-card">
              {/* <h1 className="auth-title">Welcome to WorldCloud</h1> */}

              <p className="auth-description">
                Connect your wallet to access the dashboard and start deploying
                your projects on the Internet Computer
              </p>
              <div className="auth-buttons">
                <button onClick={login} className="auth-button ii">
                  <img
                    className="auth-button-icon iiLogo"
                    src={ii}
                    alt="Internet Identity"
                  />
                  <span className="auth-button-text">
                    Continue with Internet Identity
                  </span>
                </button>

                <div className="auth-divider">
                  <span className="divider-text">OR</span>
                </div>

                <button
                  onClick={loginII2}
                  className="auth-button social-logins"
                >
                  <img className="social-icon" src={appleIcon} alt="Apple" />
                  <img className="social-icon" src={googleIcon} alt="Google" />
                  <img
                    className="social-icon"
                    src={microsoftIcon}
                    alt="Microsoft"
                  />
                </button>

                {/* <div onClick={loginWithPlug} className="auth-button-image">
                <img
                  className="auth-button-image-icon"
                  src={plugLogo}
                  alt="Plug Wallet"
                />
              </div> */}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
