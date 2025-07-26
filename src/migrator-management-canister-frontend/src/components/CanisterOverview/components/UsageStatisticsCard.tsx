import React from "react";
import UpdateIcon from "@mui/icons-material/Update";
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
        <div className="info-row">
          <div className="info-label">Current Quota:</div>
          <div className="info-value">{userUsage?.quota.consumed}</div>
        </div>
        <div className="info-row">
          <div className="info-label">Max uses:</div>
          <div className="info-value">
            {userUsage?.quota.total} per{" "}
            {userUsage?.rate_limit_window
              ? userUsage.rate_limit_window / 1000 / 60 / 60
              : " 24"}{" "}
            hrs
          </div>
        </div>
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
