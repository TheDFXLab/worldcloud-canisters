import { Spinner } from "react-bootstrap";
import "./CanisterOverview.css";
import { Deployment } from "../AppLayout/interfaces";
import { backend_canister_id, getCanisterUrl } from "../../config/config";
import { useAuthority } from "../../context/AuthorityContext/AuthorityContext";
import { cyclesToTerra } from "../../utility/e8s";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import IconTextRowView from "../IconTextRowView/IconTextRowView";
import CyclesApi from "../../api/cycles";
import { Principal } from "@dfinity/principal";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLedger } from "../../context/LedgerContext/LedgerContext";
import { ConfirmationModal } from "../ConfirmationPopup/ConfirmationModal";
import MainApi from "../../api/main";
import ProjectDeployment from "../ProjectDeployment/ProjectDeployment";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { useParams, useNavigate } from "react-router-dom";
import { useLoadBar } from "../../context/LoadBarContext/LoadBarContext";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  DeploymentDetails,
  useDeployments,
} from "../../context/DeploymentContext/DeploymentContext";
import ReplayIcon from "@mui/icons-material/Replay";
import GitHubIcon from "@mui/icons-material/GitHub";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PendingIcon from "@mui/icons-material/Pending";
import Skeleton from "@mui/material/Skeleton";
import NoDataIcon from "@mui/icons-material/Description";

export const CanisterOverview = () => {
  const { canisterId } = useParams();
  const { getDeployment, getDeploymentDetails } = useDeployments();
  const navigate = useNavigate();
  const { status: authorityStatus, refreshStatus } = useAuthority();
  const { transfer } = useLedger();
  const { identity } = useIdentity();
  const [icpToDeposit, setIcpToDeposit] = useState<string>("0");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { showLoadBar, setShowLoadBar, setCompleteLoadBar } = useLoadBar();
  const { setToasterData, setShowToaster } = useToaster();
  const isTransferringRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deploymentDetails, setDeploymentDetails] = useState<
    DeploymentDetails[] | undefined
  >(undefined);
  const [canisterInfo, setCanisterInfo] = useState<Deployment | undefined>(
    undefined
  );

  useEffect(() => {
    const getCanisterInfo = async () => {
      if (!canisterId) return;
      const info = getDeployment(canisterId);
      if (info) {
        setCanisterInfo(info);
      }
    };
    getCanisterInfo();
  }, [canisterId]);

  useEffect(() => {
    const fetchDeploymentDetails = async () => {
      try {
        setIsLoading(true);
        // Replace with actual API call
        const mockData: DeploymentDetails[] = [
          {
            workflow_run_id: 12345678,
            repo_name: "username/repo-name",
            date_created: Date.now(),
            status: "pending",
            branch: "main",
            commit_hash: "8d4e9f2",
          },
          {
            workflow_run_id: 12345677,
            repo_name: "username/repo-name",
            date_created: Date.now() - 86400000, // 1 day ago
            status: "completed",
            branch: "main",
            commit_hash: "7c3e8d1",
          },
          {
            workflow_run_id: 12345676,
            repo_name: "username/repo-name",
            date_created: Date.now() - 172800000, // 2 days ago
            status: "failed",
            branch: "feature/new-ui",
            commit_hash: "9b2a5f4",
            error_message: "Deployment failed due to insufficient memory",
          },
        ];

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setDeploymentDetails(mockData);
      } catch (error) {
        console.error("Failed to fetch deployment details:", error);
        setDeploymentDetails(undefined);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeploymentDetails();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAddCycles = useCallback(async () => {
    setShowLoadBar(true);

    // Prevent concurrent executions
    if (isTransferringRef.current) return;
    isTransferringRef.current = true;

    try {
      if (!canisterId) {
        console.log("canisterId not found");
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Canister ID not found",
          textColor: "white",
        });
        setShowToaster(true);
        return;
      }

      if (!identity) {
        console.log("identity not found");
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Identity not found",
          textColor: "white",
        });
        setShowToaster(true);
        return;
      }

      /** Transfer icp from user to backend canister */
      const amountInIcp = Number(icpToDeposit);
      const destination = backend_canister_id;
      const isTransferred = await transfer(amountInIcp, destination);

      if (!isTransferred) {
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Transfer failed",
          textColor: "white",
        });
        setShowToaster(true);
        return;
      }

      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Successfully transferred ${amountInIcp} ICP.`,
        textColor: "white",
      });
      setShowToaster(true);

      const mainApi = await MainApi.create(identity);
      const isDeposited = await mainApi?.deposit();

      if (!isDeposited) {
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Deposit failed",
          textColor: "white",
        });
        setShowToaster(true);
        return;
      }

      /** Trigger add cycles for user's canister id*/
      const cyclesApi = new CyclesApi(Principal.fromText(canisterId), identity);

      await cyclesApi.addCycles(Principal.fromText(canisterId));
      setCompleteLoadBar(true);

      refreshStatus();
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: "Cycles added successfully",
        textColor: "white",
      });
      setShowToaster(true);
      setCompleteLoadBar(true);
    } catch (error: any) {
      console.log("error adding cycles", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message,
        textColor: "white",
      });
      setShowToaster(true);
    } finally {
      isTransferringRef.current = false;
    }
  }, [identity, canisterId, setToasterData, setShowToaster]);

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

  const handleRetryDeployment = async (workflow_run_id: number) => {
    // Implement retry logic here
    console.log("Retrying deployment...", workflow_run_id);
  };

  const renderDeploymentsList = () => {
    if (isLoading) {
      return (
        <div className="deployments-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="deployment-item-skeleton">
              <Skeleton variant="rectangular" height={24} width={120} />
              <Skeleton
                variant="rectangular"
                height={48}
                style={{ marginTop: "1rem" }}
              />
              <Skeleton
                variant="rectangular"
                height={32}
                style={{ marginTop: "1rem" }}
              />
            </div>
          ))}
        </div>
      );
    }

    if (!deploymentDetails || deploymentDetails.length === 0) {
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
      <div className="deployments-list">
        {deploymentDetails.map((deployment, index) => (
          <div key={deployment.workflow_run_id} className="deployment-item">
            <div className="deployment-header">
              <div className="deployment-status-header">
                {getStatusIcon(deployment.status)}
                <span className={`deployment-status ${deployment.status}`}>
                  {deployment.status.charAt(0).toUpperCase() +
                    deployment.status.slice(1)}
                </span>
              </div>
              <span className="deployment-date">
                <ScheduleIcon className="time-icon" />
                {formatDate(new Date(deployment.date_created))}
              </span>
            </div>

            <div className="deployment-content">
              <div className="detail-row">
                <span className="label">Repository:</span>
                <div className="value-with-copy">
                  <a
                    href={`https://github.com/${deployment.repo_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="repo-link"
                  >
                    <GitHubIcon className="github-icon" />
                    {deployment.repo_name}
                  </a>
                </div>
              </div>

              <div className="detail-row">
                <span className="label">Workflow Run:</span>
                <div className="value-with-copy">
                  <a
                    href={`https://github.com/${deployment.repo_name}/actions/runs/${deployment.workflow_run_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    #{deployment.workflow_run_id}
                  </a>
                </div>
              </div>

              {deployment.branch && (
                <div className="detail-row">
                  <span className="label">Branch:</span>
                  <span className="value">{deployment.branch}</span>
                </div>
              )}

              {deployment.commit_hash && (
                <div className="detail-row">
                  <span className="label">Commit:</span>
                  <span className="value">{deployment.commit_hash}</span>
                </div>
              )}

              {deployment.status === "failed" && deployment.error_message && (
                <div className="deployment-error">
                  <p className="error-message">{deployment.error_message}</p>
                  <button
                    className="retry-button"
                    onClick={() =>
                      handleRetryDeployment(deployment.workflow_run_id)
                    }
                  >
                    <ReplayIcon /> Retry Deployment
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="canister-overview">
      <div className="overview-header">
        <button
          className="back-button"
          onClick={() => navigate("/app/websites")}
        >
          <ArrowBackIcon /> Back to Websites
        </button>
        <h1>Canister Details</h1>
      </div>

      <div className="details-grid">
        <div className="detail-card">
          <h3>Canister Information</h3>
          <div className="detail-row">
            <span className="label">Canister ID:</span>
            <div className="value-with-copy">
              <a
                href={getCanisterUrl(canisterId || "")}
                target="_blank"
                rel="noopener noreferrer"
              >
                {canisterId}
              </a>
              <button
                className="copy-button"
                onClick={() => navigator.clipboard.writeText(canisterId || "")}
                title="Copy to clipboard"
              >
                <ContentCopyIcon />
              </button>
            </div>
          </div>

          <div className="detail-row">
            <span className="label">Status:</span>
            <span className={`status-badge ${status?.toLowerCase()}`}>
              {status}
            </span>
          </div>

          <div className="detail-row">
            <span className="label">Total Size:</span>
            <span className="value">
              {canisterInfo?.size
                ? formatBytes(Number(canisterInfo.size))
                : "N/A"}
            </span>
          </div>

          <div className="detail-row">
            <span className="label">Created On:</span>
            <span className="value">
              {canisterInfo?.date_created
                ? formatDate(
                    new Date(Number(canisterInfo.date_created) / 1000000)
                  )
                : "N/A"}
            </span>
          </div>

          <div className="detail-row">
            <span className="label">Available Cycles:</span>
            <span className="value">
              {authorityStatus?.cycles ? (
                <div onClick={() => setShowConfirmation(true)}>
                  <IconTextRowView
                    onClickIcon={() => setShowConfirmation(true)}
                    IconComponent={AddCircleOutlineIcon}
                    iconColor="green"
                    text={`${cyclesToTerra(
                      authorityStatus?.cycles || 0
                    ).toFixed(2)} T cycles`}
                  />
                </div>
              ) : (
                <Spinner animation="border" variant="primary" />
              )}
            </span>
          </div>
        </div>

        <div className="detail-card deployments-section">
          <h3>Deployment History</h3>
          {renderDeploymentsList()}
        </div>
      </div>

      <ConfirmationModal
        show={showConfirmation}
        amountState={[icpToDeposit, setIcpToDeposit]}
        onHide={() => setShowConfirmation(false)}
        onConfirm={() => {
          handleAddCycles();
          setShowConfirmation(false);
        }}
        title="Add Cycles"
        message="Are you sure you want to add cycles to this canister? This will transfer ICP to cycles."
      />

      {status === "uninitialized" && (
        <div className="upload-section">
          <h3>Pending Actions</h3>
          <p>You have pending actions. Please upload your website files.</p>
          <ProjectDeployment />
        </div>
      )}
    </div>
  );
};
