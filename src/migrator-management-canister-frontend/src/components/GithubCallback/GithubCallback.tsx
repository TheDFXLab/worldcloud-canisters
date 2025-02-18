import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GithubApi } from "../../api/github/GithubApi";
import {
  cors_sh_api_key,
  environment,
  githubClientId,
  reverse_proxy_url,
} from "../../config/config";
import GitHubIcon from "@mui/icons-material/GitHub";
import { useGithub } from "../../context/GithubContext/GithubContext";

import "./GithubCallback.css";

const GitHubCallback: React.FC = () => {
  /** Hooks */
  const navigate = useNavigate();
  const { refreshGithubUser } = useGithub();

  /** State */
  const [error, setError] = useState<string | null>(null);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const initialized = useRef(false);
  const pollTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitiatingRef = useRef(false);

  useEffect(() => {
    const pollForToken = async (deviceCode: string, interval: number) => {
      try {
        const data = await GithubApi.getInstance().requestAccessToken(
          deviceCode
        );

        if (data.error === "authorization_pending") {
          // Continue polling
          pollTimeoutRef.current = setTimeout(
            () => pollForToken(deviceCode, interval),
            interval * 1000
          );
        } else if (data.access_token) {
          // Success! Store the token and redirect
          const github = GithubApi.getInstance();
          github.setAccessToken(data.access_token);

          await refreshGithubUser();
          navigate("/app/settings", { replace: true });
        } else {
          setError("Authentication failed");
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to complete authentication"
        );
      }
    };

    const initiateDeviceFlow = async () => {
      if (initialized.current || isInitiatingRef.current) return;
      isInitiatingRef.current = true;

      try {
        const data = await GithubApi.getInstance().requestCode();
        initialized.current = true;
        setDeviceCode(data.device_code);
        setUserCode(data.user_code);
        setVerificationUri(data.verification_uri);

        pollForToken(data.device_code, data.interval || 5);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initiate device flow"
        );
      } finally {
        isInitiatingRef.current = false;
      }
    };

    initiateDeviceFlow();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (userCode && verificationUri) {
    return (
      <div className="device-flow-container">
        <div className="device-flow-instructions">
          <div className="header">
            <h2>Complete GitHub Authentication</h2>
            <p className="subtitle">
              Follow these steps to connect your GitHub account
            </p>
          </div>

          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Visit GitHub Device Activation</h3>
                <a
                  href={verificationUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="verification-link"
                >
                  {verificationUri}
                </a>
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Enter Verification Code</h3>
                <div className="user-code">{userCode}</div>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Waiting for Authorization</h3>
                <p className="waiting-text">
                  Verifying authentication
                  <span className="loading-dots">...</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="device-flow-container">
      <div className="device-flow-instructions">
        <div className="header">
          <h2>GitHub Authentication</h2>
          <p className="subtitle">Initializing secure connection</p>
        </div>

        <div className="github-spinner">
          <GitHubIcon className="github-icon" />
        </div>

        <p className="waiting-text">
          Please wait
          <span className="loading-dots"></span>
        </p>
      </div>
    </div>
  );
};

export default GitHubCallback;
