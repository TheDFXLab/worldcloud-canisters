import { Spinner } from "react-bootstrap";
import "./CanisterOverview.css";
import { Deployment } from "../AppLayout/interfaces";
import { backend_canister_id, getCanisterUrl } from "../../config/config";
import { useAuthority } from "../../context/AuthorityContext/AuthorityContext";
import { cyclesToTerra, fromE8sStable } from "../../utility/e8s";
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
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import GitHubIcon from "@mui/icons-material/GitHub";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PendingIcon from "@mui/icons-material/Pending";
import Skeleton from "@mui/material/Skeleton";
import NoDataIcon from "@mui/icons-material/Description";
import { WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { useCycles } from "../../context/CyclesContext/CyclesContext";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MemoryIcon from "@mui/icons-material/Memory";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { Tooltip } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import IconTextRowView from "../IconTextRowView/IconTextRowView";
import { useConfirmationModal } from "../../context/ConfirmationModalContext/ConfirmationModalContext";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";

export const CanisterOverview = () => {
  /** Hooks */
  const { canisterId } = useParams();
  const { deployments, getDeployment, getWorkflowRunHistory } =
    useDeployments();
  const navigate = useNavigate();
  const { status: authorityStatus, refreshStatus } = useAuthority();
  const { balance, isLoadingBalance, transfer, getBalance } = useLedger();
  const { identity } = useIdentity();
  const {
    isLoadingCycles,
    isLoadingStatus,
    canisterStatus,
    cyclesAvailable,
    getStatus,
    cyclesStatus,
    maxCyclesExchangeable,
    isLoadingEstimateCycles,
  } = useCycles();
  const { setShowModal } = useConfirmationModal();
  const { summon, destroy } = useLoaderOverlay();
  const { agent } = useHttpAgent();

  /** States */
  const [icpToDeposit, setIcpToDeposit] = useState<string>("0");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { setShowLoadBar, setCompleteLoadBar } = useLoadBar();
  const { setToasterData, setShowToaster } = useToaster();
  const isTransferringRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workflowRunHistory, setWorkfowRunHistory] = useState<
    WorkflowRunDetails[] | undefined
  >(undefined);
  const [canisterInfo, setCanisterInfo] = useState<Deployment | undefined>(
    undefined
  );

  useEffect(() => {
    const getCanisterStatus = async () => {
      if (!canisterId) {
        return;
      }
      await getStatus(canisterId);
    };
    getCanisterStatus();
  }, []);

  useEffect(() => {
    const getCanisterInfo = async () => {
      if (!canisterId) return;
      const info = getDeployment(canisterId);
      if (info) {
        setCanisterInfo(info);
      }
    };
    getCanisterInfo();
  }, [canisterId, deployments]);

  useEffect(() => {
    const fetchDeploymentDetails = async () => {
      try {
        setIsLoading(true);
        if (!canisterId) {
          throw new Error("Canister ID not found");
        }
        const runHistory = await getWorkflowRunHistory(canisterId);

        setWorkfowRunHistory(runHistory);
      } catch (error) {
        console.error("Failed to fetch deployment details:", error);
        setWorkfowRunHistory(undefined);
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

      if (!agent) {
        throw new Error("Agent not found");
      }
      const mainApi = await MainApi.create(identity, agent);
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
      if (!agent) {
        throw new Error("Agent not found");
      }

      /** Trigger add cycles for user's canister id*/
      const cyclesApi = await CyclesApi.create(identity, agent);
      if (!cyclesApi) {
        throw new Error("Cycles API not created");
      }
      await cyclesApi.addCycles(Principal.fromText(canisterId), amountInIcp);
      setCompleteLoadBar(true);

      refreshStatus(); //Reload canister details
      getBalance(); // Reload wallet icp balance
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
  }, [identity, canisterId, icpToDeposit, setToasterData, setShowToaster]);

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

  const onConfirmTopUp = async () => {
    try {
      summon("Adding Cycles...");
      await handleAddCycles();
      setShowModal(false);
    } catch (error) {
      console.log(`Error adding cycles`, error);
    } finally {
      destroy();
    }
  };

  const handleRetryDeployment = async (workflow_run_id: number) => {
    // TODO: Implement retry logic here
    console.log("Retrying deployment...", workflow_run_id);
  };

  const renderCyclesList = () => {
    if (isLoadingBalance) {
      return (
        <div className="cycles-loading">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={24}
              width={"100%"}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="cycles-stats-container">
        <div className="stat-item">
          <div className="stat-label">
            Wallet Balance
            <Tooltip title="Your current ICP balance" arrow placement="top">
              <AccountBalanceWalletIcon className="info-icon" />
            </Tooltip>
          </div>
          <div className="stat-value">
            {balance && balance !== BigInt(0) ? (
              `${fromE8sStable(balance).toFixed(2)} ICP`
            ) : (
              <Spinner size="sm" />
            )}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">
            Convertible to Cycles
            <Tooltip
              title="Total cycles exchangeable for your ICP balance"
              arrow
              placement="top"
            >
              <SwapHorizIcon className="info-icon" />
            </Tooltip>
          </div>
          <div className="stat-value">
            {!isLoadingEstimateCycles ? (
              `${fromE8sStable(
                BigInt(Math.floor(maxCyclesExchangeable)),
                12
              ).toFixed(2)} T Cycles`
            ) : (
              <Spinner size="sm" />
            )}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">
            Cycles in Canister
            <Tooltip
              title="Amount of cycles currently in the website canister"
              arrow
              placement="top"
            >
              <SwapHorizIcon className="info-icon" />
            </Tooltip>
          </div>
          <span className="stat-value">
            {isLoadingCycles ? (
              <Spinner animation="border" variant="primary" />
            ) : (
              <div onClick={() => setShowModal(true)}>
                <IconTextRowView
                  onClickIcon={() => setShowModal(true)}
                  IconComponent={AddCircleOutlineIcon}
                  iconColor="green"
                  text={`${
                    cyclesStatus?.cycles
                      ? fromE8sStable(cyclesStatus?.cycles, 12).toFixed(2)
                      : 0
                  } T cycles`}
                />
              </div>
            )}
          </span>
        </div>
      </div>
    );
  };

  const renderDeploymentsList = () => {
    if (isLoading) {
      return (
        <div className="deployments-loading">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={24}
              width={"100%"}
            />
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
      <div className="deployments-stats-container">
        {workflowRunHistory.map((deployment) => (
          <div key={deployment.workflow_run_id} className="stat-item">
            <div className="stat-label">
              <div className="deployment-meta">
                <div className="deployment-status">
                  {getStatusIcon(deployment.status.toString())}
                  <span className={`status-badge ${deployment.status}`}>
                    {Object.keys(deployment.status)[0].toUpperCase()}
                  </span>
                </div>
                <span className="deployment-date">
                  <ScheduleIcon className="time-icon" />
                  {formatDate(
                    new Date(Number(deployment.date_created) / 1000000)
                  )}
                </span>
              </div>
            </div>
            <div className="stat-value deployment-info">
              <div className="deployment-primary">
                <a
                  href={`https://github.com/${deployment.repo_name}/actions/runs/${deployment.workflow_run_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="repo-link"
                >
                  <GitHubIcon className="github-icon" />
                  {deployment.repo_name}
                </a>
              </div>
              <div className="deployment-secondary">
                <div className="details-column">
                  {deployment.branch && (
                    <span className="detail-item">
                      <span className="detail-label">Branch:</span>
                      {deployment.branch}
                    </span>
                  )}
                  {deployment.commit_hash && (
                    <span className="detail-item">
                      <span className="detail-label">Commit:</span>
                      <code>{deployment.commit_hash[0]?.substring(0, 7)}</code>
                    </span>
                  )}
                </div>
                {deployment.status.toString() === "failed" &&
                  deployment.error_message && (
                    <span className="detail-item error">
                      <span className="detail-label">Error:</span>
                      {deployment.error_message}
                    </span>
                  )}
              </div>
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
          <div className="canister-stats-container">
            <div className="stat-item">
              <div className="stat-label">
                Canister ID
                <Tooltip
                  title="Unique identifier for this canister"
                  arrow
                  placement="top"
                >
                  <InfoIcon className="info-icon" />
                </Tooltip>
              </div>
              <div className="stat-value with-copy">
                <a
                  href={getCanisterUrl(canisterId || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {canisterId}
                </a>
                <button
                  className="copy-button"
                  onClick={() =>
                    navigator.clipboard.writeText(canisterId || "")
                  }
                  title="Copy to clipboard"
                >
                  <ContentCopyIcon />
                </button>
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">
                Status
                <Tooltip
                  title="Current operational status of the canister"
                  arrow
                  placement="top"
                >
                  <InfoIcon className="info-icon" />
                </Tooltip>
              </div>
              {canisterInfo?.status && (
                <span className={`status-badge ${canisterStatus?.status}`}>
                  {canisterInfo?.status}
                </span>
              )}
            </div>

            <div className="stat-item">
              <div className="stat-label">
                Total Size
                <Tooltip
                  title="Total storage space used by the canister"
                  arrow
                  placement="top"
                >
                  <InfoIcon className="info-icon" />
                </Tooltip>
              </div>
              <div className="stat-value">
                {canisterInfo?.size
                  ? formatBytes(Number(canisterInfo.size))
                  : "N/A"}
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">
                Created On
                <Tooltip
                  title="Date when this canister was created"
                  arrow
                  placement="top"
                >
                  <InfoIcon className="info-icon" />
                </Tooltip>
              </div>
              <div className="stat-value">
                {canisterInfo?.date_created
                  ? formatDate(
                      new Date(Number(canisterInfo.date_created) / 1000000)
                    )
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>

        <div className="detail-card deployments-section">
          <h3 style={{ paddingBottom: "10px" }}>Cycles</h3>
          {renderCyclesList()}
        </div>

        <div className="detail-card deployments-section">
          <h3 style={{ paddingBottom: "10px" }}>Deployment History</h3>
          {renderDeploymentsList()}
        </div>
      </div>

      <ConfirmationModal
        amountState={[icpToDeposit, setIcpToDeposit]}
        onHide={() => setShowModal(false)}
        onConfirm={onConfirmTopUp}
        type={"cycles"}
        customConfig={{
          totalPrice: parseFloat(icpToDeposit),
          showTotalPrice: false,
        }}
        // title="Add Cycles"
        // message="Are you sure you want to add cycles to this canister?"
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
