import React, { useEffect, useState } from "react";
import "./HomePage.css";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { useGithub } from "../../context/GithubContext/GithubContext";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import StorageIcon from "@mui/icons-material/Storage";
import LanguageIcon from "@mui/icons-material/Language";
import GitHubIcon from "@mui/icons-material/GitHub";
import SpeedIcon from "@mui/icons-material/Speed";
import BarChartIcon from "@mui/icons-material/BarChart";
import UpdateIcon from "@mui/icons-material/Update";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import HistoryIcon from "@mui/icons-material/History";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useLedger } from "../../context/LedgerContext/LedgerContext";
import { fromE8sStable } from "../../utility/e8s";
import { useCycles } from "../../context/CyclesContext/CyclesContext";
import { Spinner } from "react-bootstrap";
import { ConfirmationModal } from "../ConfirmationPopup/ConfirmationModal";
import IconTextRowView from "../IconTextRowView/IconTextRowView";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { backend_canister_id } from "../../config/config";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import MainApi from "../../api/main";
import InfoIcon from "@mui/icons-material/Info";
import { Tooltip } from "@mui/material";
import { useConfirmationModal } from "../../context/ConfirmationModalContext/ConfirmationModalContext";
import HeaderCard from "../HeaderCard/HeaderCard";
import TruncatedTooltip from "../TruncatedTooltip/TruncatedTooltip";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { formatBytes, shortenPrincipal } from "../../utility/formatter";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { useCyclesLogic } from "../../hooks/useCyclesLogic";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";
import { useProjectsLogic } from "../../hooks/useProjectsLogic";

const HomePage: React.FC = () => {
  const { deployments } = useDeployments();
  const { projects } = useProjectsLogic();
  const { githubUser } = useGithub();
  const { identity } = useIdentity();
  const { setActiveTab } = useSideBar();
  const { setActionBar } = useActionBar();
  const { setHeaderCard } = useHeaderCard();
  const { totalCredits, isLoadingCredits } = useCycles();
  const { fetchCredits } = useCyclesLogic();
  const { balance, transfer, setShouldRefetchBalance } = useLedger();
  const { setToasterData, setShowToaster } = useToaster();
  const { agent } = useHttpAgent();
  const { setShowModal } = useConfirmationModal();

  /**State */
  const [icpToDeposit, setIcpToDeposit] = useState<string>("0");
  const [copied, setCopied] = useState(false);

  // Calculate metrics
  const totalCanisters = projects.length;
  const totalSize =
    deployments?.length > 0
      ? deployments?.map((d) => d.size).reduce((d) => d)
      : 0;
  const activeCanisters = projects.filter(
    (p) => p.canister_id !== null && p.canister_id !== undefined
  ).length;
  const lastDeployment = deployments[0]?.date_updated
    ? new Date(Number(deployments[0].date_updated)).toLocaleString()
    : "No deployments yet";

  // Set the active tab to home and header card
  useEffect(() => {
    setActiveTab("home");
    setActionBar(null);
    setHeaderCard({
      title: "Dashboard",
      description: `Welcome back${
        githubUser?.login ? `, ${githubUser.login}` : ``
      }`,
    });
  }, [githubUser?.login]);

  const onConfirmTopUp = async () => {
    try {
      if (!icpToDeposit) return;
      const isTransferred = await transfer(
        parseFloat(icpToDeposit),
        backend_canister_id
      );
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

      if (!agent) {
        throw new Error("Agent not found");
      }
      const mainApi = await MainApi.create(identity, agent);
      if (!mainApi) {
        throw new Error("Failed to create main api.");
      }

      const isDeposited = await mainApi.deposit();
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

      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Successfully deposited ICP.`,
        textColor: "white",
      });
      setShowToaster(true);
      // getCreditsAvailable();
      fetchCredits(); // refresh credits
      setShouldRefetchBalance(true);
    } catch (error) {
      console.error(`Error depositing ICP:`, error);
    } finally {
      setShowModal(false);
    }
  };

  return (
    <div className="home-container">
      <ConfirmationModal
        type={"topup"}
        amountState={[icpToDeposit, setIcpToDeposit]}
        onHide={() => setShowModal(false)}
        onConfirm={onConfirmTopUp}
        customConfig={{
          totalPrice: parseFloat(icpToDeposit),
          showTotalPrice: true,
          showEstimatedCycles: true,
        }}
      />

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <StorageIcon />
          <div className="stat-content">
            <h3>Total Projects</h3>
            <p className="stat-value">{totalCanisters}</p>
          </div>
        </div>

        <div className="stat-card">
          <LanguageIcon />
          <div className="stat-content">
            <h3>Active Websites</h3>
            <p className="stat-value">{activeCanisters}</p>
          </div>
        </div>

        <div className="stat-card">
          <SpeedIcon />
          <div className="stat-content">
            <h3>Total Storage Used</h3>
            <p className="stat-value">{formatBytes(totalSize)}</p>
          </div>
        </div>

        <div className="stat-card">
          <UpdateIcon />
          <div className="stat-content">
            <h3>Last Deployment</h3>
            <TruncatedTooltip text={lastDeployment} className="stat-value" />
            {/* <p className="stat-value small">{lastDeployment}</p> */}
          </div>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="details-grid-homepage">
        {/* Recent Activity */}
        <div className="detail-card-homepage">
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
                    {new Date(Number(deployment.date_updated)).toLocaleString()}
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

        {/* Account Info */}
        <div className="detail-card-homepage">
          <div className="account-cards">
            <div className="account-section">
              <div className="detail-card-header">
                <AccountBoxIcon />
                <h3>Account Information</h3>
              </div>
              <div className="detail-card-content">
                <div className="info-row">
                  <span className="info-label">Principal ID</span>
                  <span className="info-value copy-wrapper">
                    {shortenPrincipal(identity?.getPrincipal().toText() || "")}
                    <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
                      <ContentCopyIcon
                        className="copy-icon"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            identity?.getPrincipal().toText() || ""
                          );
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      />
                    </Tooltip>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">GitHub Status</span>
                  <span className="info-value">
                    <span
                      className={`status-dot ${
                        githubUser ? "connected" : "disconnected"
                      }`}
                    />
                    {githubUser ? "Connected" : "Not Connected"}
                  </span>
                </div>
                {githubUser && (
                  <div className="info-row">
                    <span className="info-label">GitHub User</span>
                    <span className="info-value">{githubUser.login}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="account-section">
              <div className="detail-card-header">
                <AccountBalanceWalletIcon />
                <h3>Wallet Information</h3>
              </div>
              <div className="detail-card-content">
                <div className="info-row">
                  <span className="info-label">
                    ICP Balance{" "}
                    <Tooltip title="Total ICP in your wallet." placement="top">
                      <InfoIcon className="info-icon" />
                    </Tooltip>
                  </span>

                  <span className="info-value">
                    {balance !== null && balance !== undefined ? (
                      fromE8sStable(balance).toFixed(2)
                    ) : (
                      <Spinner size="sm" />
                    )}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">
                    Total Credits{" "}
                    <Tooltip
                      title="Total ICP deposited in your account."
                      placement="top"
                    >
                      <InfoIcon className="info-icon" />
                    </Tooltip>
                  </span>

                  <span className="info-value">
                    {isLoadingCredits ? (
                      <Spinner size="sm" />
                    ) : (
                      <div onClick={() => setShowModal(true)}>
                        {totalCredits ? (
                          <IconTextRowView
                            onClickIcon={() => setShowModal(true)}
                            IconComponent={AddCircleOutlineIcon}
                            iconColor="green"
                            text={
                              <>
                                {`${totalCredits.total_credits} ICP`}
                                <span className="estimated-value">
                                  ≈ {totalCredits.equivalent_cycles.toFixed(2)}{" "}
                                  T Cycles
                                </span>
                              </>
                            }
                          />
                        ) : (
                          <span className="estimated-value">
                            ≈ {0} T Cycles
                          </span>
                        )}
                      </div>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
