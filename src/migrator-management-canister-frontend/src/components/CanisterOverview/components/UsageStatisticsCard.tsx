import React from "react";
import UpdateIcon from "@mui/icons-material/Update";
import { LinearProgress, Tooltip } from "@mui/material";
import { DeserializedDeployment } from "../../AppLayout/interfaces";
import { useProjectsLogic } from "../../../hooks/useProjectsLogic";
import { formatDate } from "../../../utility/formatter";

interface UsageStatisticsCardProps {
  deployment: DeserializedDeployment | null;
  hasCanister: boolean;
  isFreemium: boolean;
}

export const UsageStatisticsCard: React.FC<UsageStatisticsCardProps> = ({
  deployment,
  hasCanister,
  isFreemium,
}) => {
  const { isLoadingUsage, userUsage } = useProjectsLogic();

  const getStatusColor = (status: boolean) => {
    switch (status) {
      case true:
        return "installed";
      case false:
        return "installing";
      default:
        return "uninitialized";
    }
  };

  const renderQuotaProgressBar = () => {
    if (!userUsage?.quota) return null;

    const consumed = userUsage.quota.consumed || 0;
    const total = userUsage.quota.total || 1;
    const usagePercentage = Math.min((consumed / total) * 100, 100);
    const isWarning = usagePercentage > 80;
    const isFull = usagePercentage >= 100;

    return (
      <div className="quota-progress-section">
        <div className="quota-header">
          <span className="quota-label">Usage Quota</span>
          <span className="quota-count">
            {consumed} / {total}
          </span>
        </div>
        <Tooltip title={`${consumed} out of ${total} uses consumed`} arrow>
          <div className="quota-progress-container">
            <LinearProgress
              variant="determinate"
              value={usagePercentage}
              className={`quota-progress ${
                isFull ? "full" : isWarning ? "warning" : ""
              }`}
            />
            {isWarning && (
              <div className="quota-warning">
                {isFull ? "Quota limit reached!" : "Approaching quota limit"}
              </div>
            )}
            <div className="quota-reset-info">
              Consumption resets every 24 hours UTC
            </div>
          </div>
        </Tooltip>
      </div>
    );
  };

  const renderFreemiumRows = () => {
    return (
      <>
        <div className="info-row">
          <div className="info-label">Status:</div>
          <div className="info-value">
            <span
              className={`status-dot ${getStatusColor(
                userUsage?.is_active ? userUsage.is_active : false
              )}`}
            />
            {userUsage?.is_active ? "Active" : "Inactive"}
          </div>
        </div>
        <div className="info-row">
          <div className="info-label">Total usage:</div>
          <div className="info-value">{userUsage?.usage_count}</div>
        </div>
        {renderQuotaProgressBar()}
        <div className="info-row">
          <div className="info-label">Session duration:</div>
          <div className="info-value">{} </div>
        </div>
        <div className="info-row">
          <div className="info-label">Last Used:</div>
          <div className="info-value">{formatDate(userUsage?.last_used)}</div>
        </div>
      </>
    );
  };

  return (
    <div className="overview-card">
      <div className="card-header">
        <UpdateIcon />
        <h3>Usage Statistics</h3>
      </div>
      <div className="card-content">
        <div className="info-table">
          {isFreemium && renderFreemiumRows()}

          <div className="info-row">
            <div className="info-label">Storage Used</div>
            <div className="info-value">
              {deployment?.size
                ? `${(deployment.size / 1024 / 1024).toFixed(2)} MB`
                : "No data"}
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Last Updated</div>
            <div className="info-value">
              {deployment?.date_updated
                ? new Date(Number(deployment.date_updated)).toLocaleString()
                : "No data"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
