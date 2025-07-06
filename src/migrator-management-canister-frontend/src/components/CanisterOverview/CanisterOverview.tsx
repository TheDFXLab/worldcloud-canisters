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
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { Tooltip } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useConfirmationModal } from "../../context/ConfirmationModalContext/ConfirmationModalContext";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import BatteryAlertIcon from "@mui/icons-material/BatteryAlert";
import Battery20Icon from "@mui/icons-material/Battery20";
import Battery30Icon from "@mui/icons-material/Battery30";
import Battery50Icon from "@mui/icons-material/Battery50";
import Battery60Icon from "@mui/icons-material/Battery60";
import Battery80Icon from "@mui/icons-material/Battery80";
import Battery90Icon from "@mui/icons-material/Battery90";
import BatteryFullIcon from "@mui/icons-material/BatteryFull";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../state/store";
import { fetchUserUsage } from "../../state/slices/projectsSlice";
import { fetchFreemiumUsage } from "../../state/slices/freemiumSlice";
import { formatDate } from "../../utility/formatter";
import IconTextRowView from "../IconTextRowView/IconTextRowView";
import { bigIntToDate, bigIntToNumber } from "../../utility/bigint";
import HeaderCard from "../HeaderCard/HeaderCard";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";
import HistoryIcon from "@mui/icons-material/History";
import { CanisterStatus } from "../../api/authority";
import { useCyclesLogic } from "../../hooks/useCyclesLogic";

const useAppDispatch = () => useDispatch<AppDispatch>();

interface Project {
  name: string;
  description: string;
  canister_id: string;
  plan: { freemium: null } | { paid: null };
  date_created: bigint;
  tags: string[];
}

export const CanisterOverview: React.FC = () => {
  /** Hooks */
  const { projectId } = useParams();
  const { deployments, getDeployment, getWorkflowRunHistory } =
    useDeployments();
  const navigate = useNavigate();
  const { status: authorityStatus, refreshStatus } = useAuthority();
  const {
    balance,
    isLoadingBalance,
    transfer,
    getBalance,
    setShouldRefetchBalance,
  } = useLedger();
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
  } = useCyclesLogic();
  const { setShowModal } = useConfirmationModal();
  const { summon, destroy } = useLoaderOverlay();
  const { agent } = useHttpAgent();
  const dispatch = useAppDispatch();
  const { setHeaderCard } = useHeaderCard();

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

  const [canisterDetails, setCanisterDetails] = useState<
    CanisterStatus | undefined
  >({
    status: "stopped",
    cycles: BigInt(0),
    controllers: [],
  });

  const { projects, userUsage, isLoadingUsage } = useSelector(
    (state: RootState) => state.projects
  );

  const {
    usageData,
    hasActiveSlot,
    isLoading: isLoadingFreemium,
  } = useSelector((state: RootState) => state.freemium);

  // Find the current project
  const currentProject = projects.find((p) => p.id === projectId) as
    | Project
    | undefined;
  const isFreemium = currentProject && "freemium" in currentProject.plan;

  useEffect(() => {
    const getCanisterStatus = async () => {
      const canisterId = currentProject?.canister_id;
      if (!canisterId) {
        return;
      }
      const status = await getStatus(canisterId);
      console.log(`STATUs:`, status);
      setCanisterDetails(status);
    };
    getCanisterStatus();
  }, []);

  useEffect(() => {
    const getCanisterInfo = async () => {
      const canisterId = currentProject?.canister_id;
      if (!canisterId) return;
      const info = getDeployment(canisterId);
      if (info) {
        setCanisterInfo(info);
      }
    };
    getCanisterInfo();
  }, [currentProject?.canister_id, deployments]);

  // TODO: Get project deployments once records are available in backend
  useEffect(() => {
    const fetchDeploymentDetails = async () => {
      try {
        const canisterId = currentProject?.canister_id;
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

  useEffect(() => {
    if (identity && agent) {
      dispatch(fetchUserUsage({ identity, agent }));
      dispatch(fetchFreemiumUsage({ identity, agent, silent: true }));
    }
  }, [dispatch, identity, agent]);

  // Get canisters status if project has a canister
  useEffect(() => {
    if (usageData && currentProject?.canister_id) {
      getStatus(currentProject?.canister_id);
    }
  }, [dispatch, identity, agent, usageData, currentProject?.canister_id]);

  useEffect(() => {
    console.log(`setting header card...`);
    setHeaderCard({
      title: "Project Details",
      description:
        "View and manage your project's details and deployment status.",
    });
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleAddCycles = useCallback(async () => {
    setShowLoadBar(true);

    // Prevent concurrent executions
    if (isTransferringRef.current) return;
    isTransferringRef.current = true;

    try {
      const canisterId = currentProject?.canister_id;
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

      refreshStatus(); // Reload canister details
      setShouldRefetchBalance(true); // Reload wallet icp balance
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
  }, [
    identity,
    currentProject?.canister_id,
    icpToDeposit,
    setToasterData,
    setShowToaster,
  ]);

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

  const renderCyclesIcon = () => {
    const recommendedMaxTCycles = 1; // 1T

    const icons = {
      0: <BatteryAlertIcon className="info-icon" />,
      20: <Battery20Icon className="info-icon" />,
      30: <Battery30Icon className="info-icon" />,
      50: <Battery50Icon className="info-icon" />,
      60: <Battery60Icon className="info-icon" />,
      80: <Battery80Icon className="info-icon" />,
      90: <Battery90Icon className="info-icon" />,
      100: <BatteryFullIcon className="info-icon" />,
    };
    if (cyclesStatus?.cycles) {
      const tCyclesInCanister = fromE8sStable(cyclesStatus?.cycles, 12);
      if (tCyclesInCanister >= recommendedMaxTCycles) {
        return {
          Component: <BatteryFullIcon className="info-icon" />,
          tooltipMessage: "Cycles above recommended values.",
        };
      } else if (tCyclesInCanister >= 0.9 * recommendedMaxTCycles) {
        return {
          Component: <Battery90Icon className="info-icon" />,
          tooltipMessage: `Cycles above 90% recommended values.`,
        };
      } else if (tCyclesInCanister >= 0.8 * recommendedMaxTCycles) {
        return {
          Component: <Battery80Icon className="info-icon" />,
          tooltipMessage: `Cycles above 80% recommended values.`,
        };
      } else if (tCyclesInCanister >= 0.6 * recommendedMaxTCycles) {
        return {
          Component: <Battery60Icon className="info-icon" />,
          tooltipMessage: `Cycles above 60% recommended values.`,
        };
      } else if (tCyclesInCanister >= 0.5 * recommendedMaxTCycles) {
        return {
          Component: <Battery50Icon className="info-icon" />,
          tooltipMessage: `Cycles above 50% recommended values.`,
        };
      } else if (tCyclesInCanister >= 0.3 * recommendedMaxTCycles) {
        return {
          Component: <Battery30Icon className="info-icon" />,
          tooltipMessage: `Cycles above 30% recommended values.`,
        };
      } else if (tCyclesInCanister >= 0.2 * recommendedMaxTCycles) {
        return {
          Component: <Battery20Icon className="info-icon" />,
          tooltipMessage: `Cycles above 20% recommended values.`,
        };
      }
    }
    return {
      Component: <BatteryAlertIcon className="info-icon" />,
      tooltipMessage: `Cycles level is below recommended values. Top up cycles to avoid downtime on your website.`,
    };
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
              title={renderCyclesIcon().tooltipMessage}
              arrow
              placement="top"
            >
              {renderCyclesIcon().Component}
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
                  {bigIntToDate(deployment.date_created / BigInt(1000000))}
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

  const calculateTimeRemaining = () => {
    if (!usageData) return null;
    const endTime =
      bigIntToNumber(usageData.start_timestamp)! +
      bigIntToNumber(usageData.duration)!;
    const now = Date.now();
    const remaining = endTime - now;

    if (remaining <= 0) return "Expired";

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (!currentProject) {
    return <div>Project not found</div>;
  }

  const getPlanDisplay = (plan: Project["plan"]) => {
    return "freemium" in plan ? "Freemium" : "Paid";
  };

  return (
    <div className="canister-overview">
      {/* <div className="back-button-container">
        <button
          className="back-button-ff"
          onClick={() => navigate("/dashboard/projects")}
        >
          <ArrowBackIcon />{" "}
          <span className="back-button-text">Back to Projects</span>
        </button>
      </div> */}

      {/* <div className="overview-header"> */}
      {/* <span className="overview-header-title">Project Details</span> */}
      {/* <HeaderCard title="Project Details" className="overview-header-title" /> */}
      {/* </div> */}

      <div className="details-grid">
        {!isFreemium && currentProject.canister_id && (
          <>
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
                      href={getCanisterUrl(currentProject.canister_id || "")}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {currentProject.canister_id}
                    </a>
                    <button
                      className="copy-button"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          currentProject.canister_id || ""
                        )
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
                      ? formatDate(bigIntToDate(canisterInfo.date_created))
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
          </>
        )}
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
      />

      {status === "uninitialized" && (
        <div className="upload-section">
          <h3>Pending Actions</h3>
          <p>You have pending actions. Please upload your website files.</p>
          <ProjectDeployment />
        </div>
      )}

      <div className="grid-container">
        {/* Project Details Card */}
        <div className="card project-details">
          <span className="card-title">Project Information</span>
          <div className="content">
            <div className="detail-row">
              <span className="label">Name:</span>
              <span className="value">{currentProject.name}</span>
            </div>
            <div className="detail-row">
              <span className="label">Description:</span>
              <span className="value">{currentProject.description}</span>
            </div>

            {currentProject.canister_id && (
              <div className="detail-row">
                <span className="label">Canister ID:</span>
                <span className="value">{currentProject.canister_id}</span>
              </div>
            )}

            {cyclesStatus && (
              <div className="detail-row">
                <span className="label">Cycles Available:</span>
                <span className="value">{cyclesStatus.cycles.toString()}</span>
              </div>
            )}

            <div className="detail-row">
              <span className="label">Plan:</span>
              <span className="value">
                {getPlanDisplay(currentProject.plan)}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Created:</span>
              <span className="value">
                {formatDate(bigIntToDate(currentProject.date_created))}
              </span>
            </div>
            <div className="tags">
              {currentProject.tags.map((tag: string, index: number) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="project-details">
          {canisterStatus && (
            <div className="detail-row">
              <span className="label">Canister cycles</span>
              <span className="value">{canisterStatus.cycles.toString()}</span>
            </div>
          )}
          <div className="card-secondary project-details">
            <div className="detail-card-header">
              <HistoryIcon />
              <h3>Recent Activity</h3>
            </div>
            <div className="detail-card-content">
              {deployments.slice(0, 5).map((deployment) => (
                <div
                  key={deployment.canister_id.toText()}
                  className="activity-item"
                >
                  <div className="activity-icon">
                    <div className={`status-dot ${deployment.status}`} />
                  </div>
                  <div className="activity-details">
                    <p className="activity-title">
                      {deployment.canister_id.toText()}
                    </p>
                    <p className="activity-time">
                      {new Date(
                        Number(deployment.date_updated) / 1000000
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="activity-status">{deployment.status}</div>
                </div>
              ))}
              {deployments.length === 0 && (
                <p className="no-data">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {canisterStatus && (
          <div className="card project-details">
            <span className="card-title">Deployment Status</span>
            <div className="content">
              <div className="detail-row">
                <span className="label">Name:</span>
                <span className="value">{currentProject.name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Description:</span>
                <span className="value">{currentProject.description}</span>
              </div>
            </div>
          </div>
        )}

        <div className="card project-details">
          <span className="card-title">Quick Actions</span>
          <div className="content">
            <div className="detail-row">
              <span className="label">Name:</span>
              <span className="value">{currentProject.name}</span>
            </div>
            <div className="detail-row">
              <span className="label">Description:</span>
              <span className="value">{currentProject.description}</span>
            </div>
          </div>
        </div>

        {/* Freemium Session Card */}
        {isFreemium && hasActiveSlot && (
          <div className="card freemium-session">
            <h2>Active Freemium Session</h2>
            <div className="content">
              <div className="detail-row">
                <span className="label">Status:</span>
                <span className="value status-active">Active</span>
              </div>
              <div className="detail-row">
                <span className="label">Time Remaining:</span>
                <span className="value countdown">
                  {calculateTimeRemaining()}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Started:</span>
                <span className="value">
                  {formatDate(bigIntToDate(usageData?.start_timestamp))}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Expires:</span>
                <span className="value">
                  {formatDate(
                    usageData
                      ? bigIntToDate(
                          usageData.start_timestamp + usageData.duration
                        )
                      : undefined
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Usage Statistics Card */}
        {!isLoadingUsage && userUsage && (
          <div className="card usage-stats">
            <h2>Usage Statistics</h2>
            <div className="content">
              <div className="detail-row">
                <span className="label">Total Usage Count:</span>
                <span className="value">{userUsage.usage_count}</span>
              </div>
              <div className="detail-row">
                <span className="label">Last Used:</span>
                <span className="value">
                  {formatDate(bigIntToDate(userUsage.last_used))}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Rate Limit Window:</span>
                <span className="value">
                  {bigIntToNumber(userUsage.rate_limit_window)! / (60 * 60)}{" "}
                  hours
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Max Uses:</span>
                <span className="value">{userUsage.max_uses_threshold}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
