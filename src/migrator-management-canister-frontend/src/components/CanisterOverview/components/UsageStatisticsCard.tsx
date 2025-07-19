import React from "react";
import UpdateIcon from "@mui/icons-material/Update";

interface UsageStatisticsCardProps {
  canisterInfo: any;
}

export const UsageStatisticsCard: React.FC<UsageStatisticsCardProps> = ({
  canisterInfo,
}) => {
  return (
    <div className="overview-card">
      <div className="card-header">
        <UpdateIcon />
        <h3>Usage Statistics</h3>
      </div>
      <div className="card-content">
        <div className="info-table">
          <div className="info-row">
            <div className="info-label">Storage Used</div>
            <div className="info-value">
              {canisterInfo?.size
                ? `${(canisterInfo.size / 1024 / 1024).toFixed(2)} MB`
                : "No data"}
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Last Updated</div>
            <div className="info-value">
              {canisterInfo?.date_updated
                ? new Date(Number(canisterInfo.date_updated)).toLocaleString()
                : "No data"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
