import { Skeleton, Tooltip } from "@mui/material";
import NoDataIcon from "@mui/icons-material/Description";
import GitHubIcon from "@mui/icons-material/GitHub";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PendingIcon from "@mui/icons-material/Pending";
import StorageIcon from "@mui/icons-material/Storage";
import { WorkflowRunDetails } from "../../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { bigIntToDate } from "../../../utility/bigint";
import { SerializedWorkflowRunDetail } from "../../../utility/principal";
import { formatDate } from "../../../utility/formatter";

interface DeploymentHistoryCardProps {
  isLoading: boolean;
  workflowRunHistory: SerializedWorkflowRunDetail[] | undefined;
}

export const DeploymentHistoryCard: React.FC<DeploymentHistoryCardProps> = ({
  isLoading,
  workflowRunHistory,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleOutlineIcon className="status-icon completed" />;
      case "failed":
        return <ErrorOutlineIcon className="status-icon failed" />;
      case "pending":
        return <PendingIcon className="status-icon pending" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="deployments-loading">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={24} width={"100%"} />
        ))}
      </div>
    );
  }

  if (!workflowRunHistory || workflowRunHistory.length === 0) {
    return (
      <div className="deployments-empty">
        <NoDataIcon className="no-data-icon" />
        <p>No deployment history</p>
        <span className="empty-hint">
          Deployment details will appear here once a deployment is initiated
        </span>
      </div>
    );
  }

  return (
    <div className="detail-card deployments-section">
      <h3 style={{ paddingBottom: "10px" }}>Deployment History</h3>
      <div className="deployments-stats-container">
        {workflowRunHistory.map((deployment) => (
          <div key={Number(deployment.workflow_run_id)} className="stat-item">
            <div className="stat-label">
              <div className="deployment-meta">
                <Tooltip
                  title="Current status of the deployment workflow"
                  placement="top"
                >
                  <div className="deployment-status">
                    {getStatusIcon(deployment.status.toString())}
                    <span className={`status-badge ${deployment.status}`}>
                      {Object.keys(deployment.status)[0].toUpperCase()}
                    </span>
                  </div>
                </Tooltip>
                <div className="deployment-timestamps">
                  <Tooltip
                    title="When this deployment was initiated"
                    placement="top"
                  >
                    <span className="deployment-date">
                      <ScheduleIcon className="time-icon" />
                      Created:{" "}
                      {formatDate(
                        bigIntToDate(deployment.date_created, "nanoseconds")
                      )}
                    </span>
                  </Tooltip>
                </div>
              </div>
            </div>
            <div className="stat-value deployment-info">
              <div className="deployment-primary">
                <Tooltip
                  title="GitHub repository where this deployment originated"
                  placement="top"
                >
                  <a
                    href={`https://github.com/${
                      deployment.repo_name
                    }/actions/runs/${deployment.workflow_run_id.toString()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="repo-link"
                  >
                    <GitHubIcon className="github-icon" />
                    {deployment.repo_name}
                  </a>
                </Tooltip>
                <Tooltip title="Total size of deployed assets" placement="top">
                  <span className="deployment-size">
                    <StorageIcon className="storage-icon" />
                    {formatSize(deployment.size)}
                  </span>
                </Tooltip>
              </div>
              <div className="deployment-secondary">
                <div className="details-column">
                  {deployment.branch && (
                    <Tooltip
                      title="Git branch used for this deployment"
                      placement="top"
                    >
                      <span className="detail-item">
                        <span className="detail-label">Branch:</span>
                        {deployment.branch}
                      </span>
                    </Tooltip>
                  )}
                  {deployment.commit_hash && (
                    <Tooltip
                      title="Git commit hash of the deployed code"
                      placement="top"
                    >
                      <span className="detail-item">
                        <span className="detail-label">Commit:</span>
                        <code>{deployment.commit_hash.substring(0, 7)}</code>
                      </span>
                    </Tooltip>
                  )}
                  <Tooltip
                    title="Unique identifier for this GitHub workflow run"
                    placement="top"
                  >
                    <span className="detail-item">
                      <span className="detail-label">Run ID:</span>
                      <code>{deployment.workflow_run_id}</code>
                    </span>
                  </Tooltip>
                </div>
                {deployment.status.toString() === "failed" &&
                  deployment.error_message && (
                    <Tooltip
                      title="Detailed error information for failed deployments"
                      placement="top"
                    >
                      <span className="detail-item error">
                        <span className="detail-label">Error:</span>
                        {deployment.error_message}
                      </span>
                    </Tooltip>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
