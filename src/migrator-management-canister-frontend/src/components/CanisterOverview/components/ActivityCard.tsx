import { Skeleton } from "@mui/material";
import NoDataIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import InfoIcon from "@mui/icons-material/Info";
import HistoryIcon from "@mui/icons-material/History";
import { formatDate } from "../../../utility/formatter";

interface ActivityLog {
  id: string;
  category: string;
  description: string;
  create_time: number; // Changed from string to number
}

interface ActivityCardProps {
  isLoadingActivityLogs: boolean;
  activityLogs: ActivityLog[] | undefined;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  isLoadingActivityLogs,
  activityLogs,
}) => {
  const getActivityIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "project":
        return <FolderIcon className="activity-icon" />;
      case "deployment":
        return <CloudUploadIcon className="activity-icon" />;
      case "cycles":
        return <AccountBalanceWalletIcon className="activity-icon" />;
      default:
        return <InfoIcon className="activity-icon" />;
    }
  };

  if (isLoadingActivityLogs) {
    return (
      <div className="activity-loading">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={24} width={"100%"} />
        ))}
      </div>
    );
  }

  if (!activityLogs || activityLogs.length === 0) {
    return (
      <div className="activity-empty">
        <NoDataIcon className="no-data-icon" />
        <p>No activity history</p>
        <span className="empty-hint">
          Activity details will appear here once actions are taken
        </span>
      </div>
    );
  }

  return (
    <div className="card-secondary project-details">
      <div className="detail-card-header">
        <HistoryIcon />
        <h3>Recent Activity</h3>
      </div>
      <div className="detail-card-content">
        <div className="activity-list">
          {activityLogs.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">
                {getActivityIcon(activity.category)}
              </div>
              <div className="activity-details">
                <p className="activity-description">{activity.description}</p>
                <p className="activity-time">
                  {formatDate(activity.create_time)}
                </p>
              </div>
              <div className="activity-category">{activity.category}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
