import React from "react";
import { CircularProgress } from "@mui/material";
import TimelineIcon from "@mui/icons-material/Timeline";

interface DeploymentHistoryCardProps {
  isLoading: boolean;
  workflowRunHistory: any[];
}

export const DeploymentHistoryCard: React.FC<DeploymentHistoryCardProps> = ({
  isLoading,
  workflowRunHistory,
}) => {
  return (
    <div className="overview-card">
      <div className="card-header">
        <TimelineIcon />
        <h3>Deployment History</h3>
      </div>
      <div className="card-content">
        {isLoading ? (
          <CircularProgress />
        ) : workflowRunHistory.length > 0 ? (
          <div className="deployment-list">
            {workflowRunHistory.map((run) => (
              <div key={run.workflow_run_id} className="deployment-item">
                <div className="deployment-header">
                  <span className="deployment-status">
                    <span className={`status-dot ${run.status}`} />
                    {run.status}
                  </span>
                  <span className="deployment-date">
                    {new Date(run.date_created).toLocaleString()}
                  </span>
                </div>
                <div className="deployment-details">
                  <div>Size: {(run.size / 1024 / 1024).toFixed(2)} MB</div>
                  <div>Run ID: {run.workflow_run_id}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No deployment history</div>
        )}
      </div>
    </div>
  );
};
