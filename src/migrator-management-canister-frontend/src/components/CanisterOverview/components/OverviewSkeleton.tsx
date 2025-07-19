import React from "react";
import { Skeleton } from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import UpdateIcon from "@mui/icons-material/Update";
import HistoryIcon from "@mui/icons-material/History";
import InfoIcon from "@mui/icons-material/Info";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TimelineIcon from "@mui/icons-material/Timeline";
import "./OverviewSkeleton.css";

interface OverviewSkeletonProps {
  loadingStates?: {
    project?: boolean;
    canister?: boolean;
    cycles?: boolean;
    activity?: boolean;
    deployment?: boolean;
    usage?: boolean;
  };
}

const OverviewSkeleton: React.FC<OverviewSkeletonProps> = ({
  loadingStates = {},
}) => {
  // Default all to true if no specific states provided
  const {
    project = true,
    canister = true,
    cycles = true,
    activity = true,
    deployment = true,
    usage = true,
  } = loadingStates;

  const CardSkeleton: React.FC<{
    title: string;
    icon: React.ReactNode;
    rows?: number;
    loading: boolean;
  }> = ({ title, icon, rows = 3, loading }) => {
    if (!loading) return null;

    return (
      <div className="skeleton-card">
        <div className="skeleton-header">
          {icon}
          <h3>{title}</h3>
        </div>
        <div className="skeleton-content">
          {Array(rows)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton-label">
                  <Skeleton width={100} />
                </div>
                <div className="skeleton-value">
                  <Skeleton width="100%" />
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  const QuickActionsSkeleton = () => (
    <div className="skeleton-quick-actions">
      <h3>Common Actions</h3>
      <div className="skeleton-quick-actions-grid">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="skeleton-quick-action-item">
              <Skeleton variant="circular" width={24} height={24} />
              <div style={{ flex: 1 }}>
                <Skeleton width="80%" />
              </div>
            </div>
          ))}
      </div>
      <h3>Danger Zone</h3>
      <div className="skeleton-quick-actions-grid">
        {Array(2)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="skeleton-quick-action-item dangerous">
              <Skeleton variant="circular" width={24} height={24} />
              <div style={{ flex: 1 }}>
                <Skeleton width="80%" />
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  const ActivitySkeleton = () => (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <HistoryIcon />
        <h3>Recent Activity</h3>
      </div>
      <div className="skeleton-content">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="skeleton-activity-item">
              <div className="skeleton-activity-content">
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Skeleton width={80} height={24} />
                  <Skeleton width="60%" />
                </div>
                <Skeleton width={120} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="">
        <QuickActionsSkeleton />
      </div>
      <div className="overview-grid">
        <CardSkeleton
          title="Canister Information"
          icon={<StorageIcon />}
          loading={canister}
        />
        <CardSkeleton
          title="Project Details"
          icon={<InfoIcon />}
          rows={4}
          loading={project}
        />
        <CardSkeleton
          title="Cycles Information"
          icon={<AccountBalanceWalletIcon />}
          loading={cycles}
        />
        {activity && <ActivitySkeleton />}
        <CardSkeleton
          title="Deployment History"
          icon={<TimelineIcon />}
          rows={2}
          loading={deployment}
        />
        <CardSkeleton
          title="Usage Statistics"
          icon={<UpdateIcon />}
          rows={2}
          loading={usage}
        />
      </div>
    </>
  );
};

export default OverviewSkeleton;
