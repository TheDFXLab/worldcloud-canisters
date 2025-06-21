import React, { useEffect } from "react";
import "./Settings.css";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import GitHubIcon from "@mui/icons-material/GitHub";
import SecurityIcon from "@mui/icons-material/Security";
import LogoutIcon from "@mui/icons-material/Logout";
import { useGithub } from "../../context/GithubContext/GithubContext";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { GithubApi } from "../../api/github/GithubApi";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { Spinner } from "react-bootstrap";
import AuthState from "../../state/AuthState";
import ShimmerAnimationForGithubCard from "../ShimmerAnimationForGithubCard/ShimmerAnimationForGithubCard";

const Settings: React.FC = () => {
  const { githubUser, isLoadingGithubUser, isAuthenticated, setGithubUser } =
    useGithub();
  const { identity, isLoadingIdentity } = useIdentity();
  const { agent } = useHttpAgent();
  const { setActiveTab } = useSideBar();
  const { setActionBar } = useActionBar();

  const handleGithubConnect = async () => {
    console.log(`IDENITTY IN BEFORE`, identity);
    console.log(`SAGENT BEFORE`, agent);

    const github = GithubApi.getInstance();
    await github.authenticate();
  };

  const handleGithubDisconnect = async () => {
    const github = GithubApi.getInstance();
    await github.logout();
    setGithubUser(null);
  };

  // Set the active tab to settings
  useEffect(() => {
    setActiveTab("settings");
    setActionBar(null);
  }, []);

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Account Settings</h2>
        <p className="subtitle">
          Manage your account preferences and connections
        </p>
      </div>

      <div className="settings-grid">
        {/* Internet Identity Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <AccountCircleIcon />
            <h3>Internet Identity</h3>
          </div>
          <div className="settings-card-content">
            <div className="settings-row">
              <span className="label">Principal ID</span>
              <span className="value">{identity?.getPrincipal().toText()}</span>
            </div>
          </div>
        </div>

        {/* GitHub Connection Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <GitHubIcon />
            <h3>GitHub Connection</h3>
          </div>
          <div className="settings-card-content">
            <div className="settings-row">
              <span className="label">Status</span>
              <span className="value status">
                <span
                  className={`status-dot ${
                    githubUser ? "connected" : "disconnected"
                  }`}
                ></span>
                {githubUser ? "Connected" : "Disconnected"}
              </span>
            </div>
            {githubUser ? (
              <>
                <div className="settings-row">
                  <span className="label">Username</span>
                  <span className="value">{githubUser.login}</span>
                </div>
                <div className="settings-row">
                  <span className="label">Email</span>
                  <span className="value">
                    {githubUser.email || "Not available"}
                  </span>
                </div>
                <button
                  className="disconnect-button"
                  onClick={handleGithubDisconnect}
                >
                  {(isLoadingIdentity && isAuthenticated) ||
                  isLoadingGithubUser ? (
                    <Spinner />
                  ) : (
                    <>
                      <LogoutIcon />
                      Disconnect GitHub
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {isAuthenticated && isLoadingGithubUser ? (
                  <>
                    <ShimmerAnimationForGithubCard />
                  </>
                ) : (
                  <>
                    <button
                      className="connect-button"
                      onClick={handleGithubConnect}
                    >
                      <GitHubIcon />
                      Connect GitHub
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Security Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <SecurityIcon />
            <h3>Security</h3>
          </div>
          <div className="settings-card-content">
            <div className="settings-row">
              <span className="label">Two-Factor Auth</span>
              <span className="value status">
                <span className="status-dot disconnected"></span>
                Not Enabled
              </span>
            </div>
            <div className="settings-row">
              <span className="label">Last Login</span>
              <span className="value">
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
