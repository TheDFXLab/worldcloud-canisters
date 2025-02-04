import React, { useEffect } from "react";
import "./HomePage.css";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { useGithub } from "../../context/GithubContext/GithubContext";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import StorageIcon from "@mui/icons-material/Storage";
import LanguageIcon from "@mui/icons-material/Language";
import GitHubIcon from "@mui/icons-material/GitHub";
import SpeedIcon from "@mui/icons-material/Speed";
import BarChartIcon from "@mui/icons-material/BarChart";
import UpdateIcon from "@mui/icons-material/Update";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import HistoryIcon from "@mui/icons-material/History";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";

const HomePage: React.FC = () => {
  const { deployments } = useDeployments();
  const { githubUser } = useGithub();
  const { identity } = useIdentity();
  const { setActiveTab } = useSideBar();
  const { setActionBar } = useActionBar();

  // Calculate metrics
  const totalCanisters = deployments.length;
  const activeCanisters = deployments.filter(
    (d) => d.status === "installed"
  ).length;
  const lastDeployment = deployments[0]?.date_updated
    ? new Date(Number(deployments[0].date_updated) / 1000000).toLocaleString()
    : "No deployments yet";

  // Set the active tab to home
  useEffect(() => {
    setActiveTab("home");
    setActionBar(null);
  }, []);

  return (
    <div className="home-container">
      <div className="home-header">
        <h2>Dashboard</h2>
        <p className="subtitle">
          Welcome back{githubUser ? `, ${githubUser.login}` : ""}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <StorageIcon />
          <div className="stat-content">
            <h3>Total Canisters</h3>
            <p className="stat-value">{totalCanisters}</p>
          </div>
        </div>

        <div className="stat-card">
          <LanguageIcon />
          <div className="stat-content">
            <h3>Active Websites</h3>
            <p className="stat-value">{activeCanisters}</p>
          </div>
        </div>

        <div className="stat-card">
          <SpeedIcon />
          <div className="stat-content">
            <h3>Total Storage Used</h3>
            <p className="stat-value">Coming Soon</p>
          </div>
        </div>

        <div className="stat-card">
          <UpdateIcon />
          <div className="stat-content">
            <h3>Last Deployment</h3>
            <p className="stat-value small">{lastDeployment}</p>
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="details-grid-homepage">
        {/* Recent Activity */}
        <div className="detail-card-homepage">
          <div className="detail-card-header">
            <HistoryIcon />
            <h3>Recent Activity</h3>
          </div>
          <div className="detail-card-content">
            {deployments.slice(0, 5).map((deployment) => (
              <div
                key={deployment.canister_id.toText()}
                className="activity-item"
              >
                <div className="activity-icon">
                  <div className={`status-dot ${deployment.status}`} />
                </div>
                <div className="activity-details">
                  <p className="activity-title">
                    {deployment.canister_id.toText()}
                  </p>
                  <p className="activity-time">
                    {new Date(
                      Number(deployment.date_updated) / 1000000
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="activity-status">{deployment.status}</div>
              </div>
            ))}
            {deployments.length === 0 && (
              <p className="no-data">No recent activity</p>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="detail-card-homepage">
          <div className="detail-card-header">
            <AccountBoxIcon />
            <h3>Account Information</h3>
          </div>
          <div className="detail-card-content">
            <div className="info-row">
              <span className="info-label">Principal ID</span>
              <span className="info-value">
                {identity?.getPrincipal().toText()}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">GitHub Status</span>
              <span className="info-value">
                <span
                  className={`status-dot ${
                    githubUser ? "connected" : "disconnected"
                  }`}
                />
                {githubUser ? "Connected" : "Not Connected"}
              </span>
            </div>
            {githubUser && (
              <div className="info-row">
                <span className="info-label">GitHub User</span>
                <span className="info-value">{githubUser.login}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
