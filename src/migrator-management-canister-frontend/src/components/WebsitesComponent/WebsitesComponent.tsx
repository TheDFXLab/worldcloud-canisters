import React, { useEffect, useState } from "react";
import "./WebsitesComponent.css";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import LanguageIcon from "@mui/icons-material/Language";
import StorageIcon from "@mui/icons-material/Storage";
import UpdateIcon from "@mui/icons-material/Update";
import LinkIcon from "@mui/icons-material/Link";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import { Principal } from "@dfinity/principal";
import { getCanisterUrl } from "../../config/config";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import { useNavigate } from "react-router-dom";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import CodeIcon from "@mui/icons-material/Code";
import { Tooltip } from "@mui/material";

const ITEMS_PER_PAGE = 12;

const WebsitesComponent: React.FC = () => {
  /** Hooks */
  const { deployments } = useDeployments();
  const { setActiveTab } = useSideBar();
  const navigate = useNavigate();
  const { setActionBar } = useActionBar();

  /**State */
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(deployments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentDeployments = deployments.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

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

  const handleUpdate = (e: React.MouseEvent, canisterId: Principal) => {
    e.stopPropagation();
    navigate(`/dashboard/deploy/${canisterId}`);
  };

  useEffect(() => {
    setActiveTab("websites");
    setActionBar(null);
  }, []);

  return (
    <div className="websites-container">
      {deployments.length > 0 && (
        <div className="websites-header">
          <h2>Your Websites</h2>
          <p className="subtitle">
            Manage your deployed websites and canisters
          </p>
        </div>
      )}

      {deployments.length === 0 ? (
        <div className="no-websites">
          <LanguageIcon className="empty-icon" />
          <h3>No Websites Yet</h3>
          <p>Your deployed websites will appear here</p>
        </div>
      ) : (
        <>
          <div className="websites-grid">
            {currentDeployments.map((deployment) => (
              <div
                key={deployment.canister_id.toText()}
                className="website-card"
                onClick={() =>
                  navigate(`/dashboard/canister/${deployment.canister_id}`)
                }
              >
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
                    onClick={(e) => {
                      e.stopPropagation();
                      openCanisterUrl(deployment.canister_id);
                    }}
                    style={{ width: "85%" }}
                  >
                    Visit Website
                  </button>
                  <Tooltip title="Deploy new version" arrow>
                    <button
                      className="action-button secondary"
                      onClick={(e) => handleUpdate(e, deployment.canister_id)}
                      style={{ width: "28%" }}
                    >
                      <CodeIcon />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination">
                <button
                  className="pagination-button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  <NavigateBeforeIcon />
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="pagination-button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  <NavigateNextIcon />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WebsitesComponent;
