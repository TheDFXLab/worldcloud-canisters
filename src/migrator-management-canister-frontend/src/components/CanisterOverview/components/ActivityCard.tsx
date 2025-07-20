import React, { useState } from "react";
import { CircularProgress, Chip, Tooltip } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import "./ActivityCard.css";
import { formatDate } from "../../../utility/formatter";

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
  const [expanded, setExpanded] = useState(false);
  const MAX_VISIBLE_LOGS = 5;

  const sortedLogs = activityLogs?.sort(
    (a, b) => b.create_time - a.create_time
  );
  const visibleLogs = expanded
    ? sortedLogs
    : sortedLogs?.slice(0, MAX_VISIBLE_LOGS);
  const hasMoreLogs = (sortedLogs?.length || 0) > MAX_VISIBLE_LOGS;

  return (
    <div className="overview-card activity-card">
      <div className="card-header">
        <HistoryIcon />
        <h3>Recent Activity</h3>
      </div>
      <div className="card-content">
        {isLoadingActivityLogs ? (
          <div className="activity-loading">
            <CircularProgress />
          </div>
        ) : !visibleLogs || visibleLogs.length === 0 ? (
          <div className="empty-state">No recent activity</div>
        ) : (
          <>
            <div className="activity-list">
              {visibleLogs.map((log) => (
                <div key={log.id} className="activity-item">
                  <div className="activity-content">
                    <div className="activity-title">
                      <Chip
                        label={log.category}
                        size="small"
                        className="category-chip"
                      />
                      {log.description}
                    </div>
                    <div className="activity-time-container">
                      <div className="activity-time">
                        {new Date(log.create_time).toLocaleString()}
                      </div>
                      <Tooltip title={`${new Date(log.create_time)}`}>
                        <div className="activity-time">
                          {formatDate(log.create_time)}
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {hasMoreLogs && (
              <button
                className="show-more-button"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ExpandLessIcon />
                    Show Less
                  </>
                ) : (
                  <>
                    <ExpandMoreIcon />
                    Show More ({sortedLogs!.length - MAX_VISIBLE_LOGS} more)
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
