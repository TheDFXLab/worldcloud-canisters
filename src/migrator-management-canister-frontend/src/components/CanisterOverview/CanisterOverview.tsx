import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../state/store";
import "./CanisterOverview.css";
import StorageIcon from "@mui/icons-material/Storage";
import UpdateIcon from "@mui/icons-material/Update";
import HistoryIcon from "@mui/icons-material/History";
import InfoIcon from "@mui/icons-material/Info";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Tooltip, Chip, CircularProgress } from "@mui/material";
import { shortenPrincipal } from "../../utility/formatter";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { useCyclesLogic } from "../../hooks/useCyclesLogic";
import { useLedger } from "../../context/LedgerContext/LedgerContext";
import { useProjectsLogic } from "../../hooks/useProjectsLogic";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";
import { SerializedWorkflowRunDetail } from "../../utility/principal";
import { fromE8sStable } from "../../utility/e8s";
import QuickActions from "../QuickActions/QuickActions";
import { getCanisterUrl } from "../../config/config";
import { ActivityCard } from "./components/ActivityCard";

interface Project {
  id: bigint;
  name: string;
  description: string;
  canister_id: string;
  plan: { freemium: null } | { paid: null };
  date_created: bigint;
  tags: string[];
}

interface ActivityLog {
  id: string;
  category: string;
  description: string;
  create_time: number;
}

export const CanisterOverview: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { projectId } = useParams();
  const { deployments, getDeployment, getWorkflowRunHistory } =
    useDeployments();
  const { balance, isLoadingBalance } = useLedger();
  const {
    isLoadingCycles,
    canisterStatus,
    cyclesStatus,
    maxCyclesExchangeable,
    isLoadingEstimateCycles,
  } = useCyclesLogic();
  const { handleFetchActivityLogs } = useProjectsLogic();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const { setHeaderCard } = useHeaderCard();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workflowRunHistory, setWorkflowRunHistory] = useState<
    SerializedWorkflowRunDetail[]
  >([]);
  const [canisterInfo, setCanisterInfo] = useState<any>(null);

  const { projects, activityLogs, isLoadingActivityLogs } = useSelector(
    (state: RootState) => state.projects
  );

  const currentProject = projects.find(
    (p) => projectId && p.id.toString() === projectId
  ) as Project | undefined;

  useEffect(() => {
    if (projectId !== undefined && identity && agent) {
      handleFetchActivityLogs(BigInt(projectId));
    }
  }, [dispatch, projectId, identity, agent]);

  useEffect(() => {
    setHeaderCard({
      title: "Project Overview",
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;

      try {
        setIsLoading(true);
        const runHistory = await getWorkflowRunHistory(BigInt(projectId));
        setWorkflowRunHistory(runHistory || []);
        if (currentProject?.canister_id) {
          const info = getDeployment(currentProject.canister_id);
          setCanisterInfo(info);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, currentProject?.canister_id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "visit":
        if (currentProject?.canister_id) {
          window.open(getCanisterUrl(currentProject.canister_id), "_blank");
        }
        break;
      case "deploy":
        if (currentProject?.canister_id) {
          navigate(
            `/dashboard/deploy/${currentProject.canister_id}/${currentProject.id}`
          );
        }
        break;
      case "cycles":
        // Handle cycles action
        break;
      case "delete":
        // Handle delete action
        break;
      case "clear":
        // Handle clear action
        break;
    }
  };

  if (!currentProject) {
    return <div className="empty-state">No project found</div>;
  }

  // Transform activity logs to match expected type
  const formattedActivityLogs: ActivityLog[] =
    activityLogs?.map((log) => ({
      id: log.id.toString(),
      category: log.category,
      description: log.description,
      create_time: Number(log.create_time),
    })) || [];

  return (
    <div className="canister-overview-container">
      <QuickActions onActionClick={handleQuickAction} />

      <div className="overview-grid">
        {/* Canister Information Card */}
        <div className="overview-card">
          <div className="card-header">
            <StorageIcon />
            <h3>Canister Information</h3>
          </div>
          <div className="card-content">
            <div className="info-table">
              <div className="info-row">
                <div className="info-label">Canister ID</div>
                <div className="info-value">
                  {currentProject?.canister_id ? (
                    <div className="copy-wrapper">
                      {shortenPrincipal(currentProject.canister_id)}
                      <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
                        <ContentCopyIcon
                          className="copy-icon"
                          onClick={() => handleCopy(currentProject.canister_id)}
                        />
                      </Tooltip>
                    </div>
                  ) : (
                    "Not deployed"
                  )}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Status</div>
                <div className="info-value">
                  <div className="status-indicator">
                    <span
                      className={`status-dot ${
                        canisterStatus?.status || "uninitialized"
                      }`}
                    />
                    {canisterStatus?.status || "Not Initialized"}
                  </div>
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Plan Type</div>
                <div className="info-value">
                  <Chip
                    label={
                      currentProject?.plan && "freemium" in currentProject.plan
                        ? "Freemium"
                        : "Paid"
                    }
                    color={
                      currentProject?.plan && "freemium" in currentProject.plan
                        ? "success"
                        : "primary"
                    }
                    size="small"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Details Card */}
        <div className="overview-card">
          <div className="card-header">
            <InfoIcon />
            <h3>Project Details</h3>
          </div>
          <div className="card-content">
            <div className="info-table">
              <div className="info-row">
                <div className="info-label">Project Name</div>
                <div className="info-value">{currentProject?.name}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Description</div>
                <div className="info-value">
                  {currentProject?.description || "No description"}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Created</div>
                <div className="info-value">
                  {currentProject?.date_created
                    ? new Date(
                        Number(currentProject.date_created)
                      ).toLocaleString()
                    : "N/A"}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Tags</div>
                <div className="info-value">
                  <div className="tags-container">
                    {currentProject?.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        className="tag-chip"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cycles Information */}
        <div className="overview-card">
          <div className="card-header">
            <AccountBalanceWalletIcon />
            <h3>Cycles Information</h3>
          </div>
          <div className="card-content">
            <div className="info-table">
              <div className="info-row">
                <div className="info-label">Available Balance</div>
                <div className="info-value">
                  {isLoadingBalance ? (
                    <CircularProgress size={20} />
                  ) : (
                    `${fromE8sStable(balance || 0n)} ICP`
                  )}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Current Cycles</div>
                <div className="info-value">
                  {isLoadingCycles ? (
                    <CircularProgress size={20} />
                  ) : (
                    `${cyclesStatus?.cycles || 0} T Cycles`
                  )}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Max Exchangeable</div>
                <div className="info-value">
                  {isLoadingEstimateCycles ? (
                    <CircularProgress size={20} />
                  ) : (
                    `${maxCyclesExchangeable || 0} T Cycles`
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deployment History */}
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

        {/* Activity History Card */}
        <ActivityCard
          isLoadingActivityLogs={isLoadingActivityLogs}
          activityLogs={formattedActivityLogs}
        />

        {/* Usage Statistics Card */}
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
                    ? new Date(
                        Number(canisterInfo.date_updated)
                      ).toLocaleString()
                    : "No data"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanisterOverview;
