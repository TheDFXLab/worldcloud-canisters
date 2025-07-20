import React, { useEffect, useState } from "react";
import { Tooltip, Chip } from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { shortenPrincipal } from "../../../utility/formatter";

interface CanisterInfoCardProps {
  currentProject: any;
  canisterStatus: any;
}

export const CanisterInfoCard: React.FC<CanisterInfoCardProps> = ({
  currentProject,
  canisterStatus,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overview-card">
      <div className="card-header">
        <StorageIcon />
        <h3>Runner Information</h3>
      </div>
      <div className="card-content">
        <div className="info-table">
          <div className="info-row">
            <div className="info-label">Canister ID</div>
            <div className="info-value">
              {currentProject?.canister_id ? (
                <div className="copy-wrapper">
                  {shortenPrincipal(currentProject.canister_id)}
                  <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
                    <ContentCopyIcon
                      className="copy-icon"
                      onClick={() => handleCopy(currentProject.canister_id)}
                    />
                  </Tooltip>
                </div>
              ) : (
                "Not deployed"
              )}
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Status</div>
            <div className="info-value">
              <div className="status-indicator">
                <span
                  className={`status-dot ${
                    canisterStatus?.status || "uninitialized"
                  }`}
                />
                {canisterStatus?.status || "Not Initialized"}
              </div>
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Plan Type</div>
            <div className="info-value">
              <Chip
                label={
                  currentProject?.plan && "freemium" in currentProject.plan
                    ? "Freemium"
                    : "Paid"
                }
                color={
                  currentProject?.plan && "freemium" in currentProject.plan
                    ? "success"
                    : "primary"
                }
                size="small"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
