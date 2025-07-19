import { Skeleton, Chip, CircularProgress } from "@mui/material";
import NoDataIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import InfoIcon from "@mui/icons-material/Info";
import HistoryIcon from "@mui/icons-material/History";
import { formatDate } from "../../../utility/formatter";
import "./ActivityCard.css";

interface ActivityLog {
  id: string;
  category: string;
  description: string;
  create_time: number;
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

  return (
    <div className="overview-card">
      <div className="card-header">
        <HistoryIcon />
        <h3>Recent Activity</h3>
      </div>
      <div className="card-content">
        {isLoadingActivityLogs ? (
          <CircularProgress />
        ) : !activityLogs || activityLogs.length === 0 ? (
          <div className="empty-state">
            <NoDataIcon className="no-data-icon" />
            <p>No activity history</p>
            <span className="empty-hint">
              Activity details will appear here once actions are taken
            </span>
          </div>
        ) : (
          <div className="activity-list">
            {activityLogs.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-content">
                  <div className="activity-title">
                    <Chip
                      label={activity.category}
                      size="small"
                      className="category-chip"
                    />
                    {activity.description}
                  </div>
                  <div className="activity-time-container">
                    <div className="activity-time">
                      {new Date(activity.create_time).toLocaleString()}
                    </div>
                    <div className="activity-time">
                      {formatDate(activity.create_time).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
