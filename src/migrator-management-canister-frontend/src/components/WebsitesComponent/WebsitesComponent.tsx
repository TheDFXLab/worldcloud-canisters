import React from "react";
import "./WebsitesComponent.css";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import LanguageIcon from "@mui/icons-material/Language";
import StorageIcon from "@mui/icons-material/Storage";
import UpdateIcon from "@mui/icons-material/Update";
import LinkIcon from "@mui/icons-material/Link";
import { Principal } from "@dfinity/principal";
import { getCanisterUrl } from "../../config/config";

const WebsitesComponent: React.FC = () => {
  const { deployments } = useDeployments();

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1000000).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "installed":
        return "success";
      case "installing":
        return "warning";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const openCanisterUrl = (canisterId: Principal) => {
    let url = getCanisterUrl(canisterId.toText());
    window.open(url, "_blank");
  };

  return (
    <div className="websites-container">
      <div className="websites-header">
        <h2>Your Websites</h2>
        <p className="subtitle">Manage your deployed websites and canisters</p>
      </div>

      {deployments.length === 0 ? (
        <div className="no-websites">
          <LanguageIcon className="empty-icon" />
          <h3>No Websites Yet</h3>
          <p>Your deployed websites will appear here</p>
        </div>
      ) : (
        <div className="websites-grid">
          {deployments.map((deployment) => (
            <div key={deployment.canister_id.toText()} className="website-card">
              <div className="website-header">
                <LanguageIcon />
                <div className="status-badge">
                  <span
                    className={`status-dot ${getStatusColor(
                      deployment.status
                    )}`}
                  />
                  {deployment.status}
                </div>
              </div>

              <div className="website-content">
                <h3
                  className="website-title"
                  onClick={() => openCanisterUrl(deployment.canister_id)}
                >
                  <LinkIcon className="link-icon" />
                  {deployment.canister_id.toText()}.icp0.io
                </h3>

                <div className="website-details">
                  <div className="detail-item">
                    <StorageIcon />
                    <div className="detail-content">
                      <span className="detail-label">Canister ID</span>
                      <span className="detail-value">
                        {deployment.canister_id.toText()}
                      </span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <UpdateIcon />
                    <div className="detail-content">
                      <span className="detail-label">Last Updated</span>
                      <span className="detail-value">
                        {formatDate(BigInt(deployment.date_updated))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="website-actions">
                <button
                  className="action-button primary"
                  onClick={() => openCanisterUrl(deployment.canister_id)}
                >
                  Visit Website
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebsitesComponent;
