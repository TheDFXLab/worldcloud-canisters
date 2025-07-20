import React from "react";
import { CircularProgress, Tooltip } from "@mui/material";
import TimelineIcon from "@mui/icons-material/Timeline";
import GitHubIcon from "@mui/icons-material/GitHub";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CommitIcon from "@mui/icons-material/Commit";
import StorageIcon from "@mui/icons-material/Storage";
import ErrorIcon from "@mui/icons-material/Error";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import InfoIcon from "@mui/icons-material/Info";
import "./DeploymentHistoryCard.css";
import { SerializedWorkflowRunDetail } from "../../../utility/principal";
import { formatDate } from "../../../utility/formatter";

interface DeploymentHistoryCardProps {
  isLoading: boolean;
  workflowRunHistory: SerializedWorkflowRunDetail[];
}

export const DeploymentHistoryCard: React.FC<DeploymentHistoryCardProps> = ({
  isLoading,
  workflowRunHistory,
}) => {
  // const formatDate = (timestamp: number) => {
  //   return new Date(timestamp).toLocaleString();
  // };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "success":
        return "installed";
      case "failed":
      case "error":
        return "failed";
      case "pending":
      case "running":
        return "installing";
      default:
        return "uninitialized";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "success":
        return <PlayArrowIcon className="status-icon success" />;
      case "failed":
      case "error":
        return <ErrorIcon className="status-icon error" />;
      case "pending":
      case "running":
        return <AccessTimeIcon className="status-icon pending" />;
      default:
        return <InfoIcon className="status-icon unknown" />;
    }
  };

  const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  };

  const shortenHash = (hash: string) => {
    return hash.length > 8 ? `${hash.substring(0, 8)}...` : hash;
  };

  const handleClickWorkflowRun = (run: SerializedWorkflowRunDetail) => {
    // Construct GitHub workflow run URL
    const githubUrl = `https://github.com/${run.repo_name}/actions/runs/${run.workflow_run_id}`;
    window.open(githubUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="overview-card deployment-history-card">
      <div className="card-header">
        <TimelineIcon />
        <h3>Deployment History</h3>
      </div>
      <div className="card-content">
        {isLoading ? (
          <div className="activity-loading">
            <CircularProgress />
          </div>
        ) : workflowRunHistory.length > 0 ? (
          <div className="activity-list">
            {workflowRunHistory.map((run) => (
              <div className="activity-item">
                <div className="activity-content">
                  <div className="activity-title">
                    <div className="status-indicator">
                      <span
                        className={`status-dot ${getStatusColor(run.status)}`}
                      />
                      {/* {getStatusIcon(run.status)} */}
                      <span className="status-text">
                        {run.status || "Unknown"}
                      </span>
                    </div>
                    <div className="deployment-metrics">
                      <Tooltip title={"Total artifacts size"}>
                        <span className="deployment-size">
                          {formatSize(run.size)}
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="activity-details">
                    <Tooltip title={"Github repository name"}>
                      <div className="detail-row">
                        <span className="detail-label lowercase">
                          <GitHubIcon className="detail-icon" />
                          {run.repo_name}
                        </span>
                      </div>
                    </Tooltip>

                    <Tooltip title={"Source branch"}>
                      <div className="detail-row">
                        <span className="detail-label">
                          <AccountTreeIcon className="detail-icon" />
                          Branch:
                        </span>
                        <span className="detail-value">{run.branch}</span>
                      </div>
                    </Tooltip>
                    <div className="detail-row">
                      <span className="detail-label">
                        <CommitIcon className="detail-icon" />
                        Commit:
                      </span>
                      <span className="detail-value">
                        {shortenHash(run.commit_hash)}
                      </span>
                    </div>
                    {run.error_message && (
                      <div className="detail-row error">
                        <span className="detail-label">
                          <ErrorIcon className="detail-icon" />
                          Error:
                        </span>
                        <span className="detail-value error">
                          {run.error_message}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="activity-time-container">
                    <div
                      className="activity-time clickable"
                      onClick={() => handleClickWorkflowRun(run)}
                    >
                      <AccessTimeIcon className="time-icon" />
                      Run ID: {run.workflow_run_id}
                    </div>
                    <Tooltip title={`${new Date(run.date_created)}`}>
                      <div className="activity-time">
                        {formatDate(run.date_created)}
                      </div>
                    </Tooltip>
                  </div>
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
