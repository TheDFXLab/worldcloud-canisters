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
import OverviewSkeleton from "./components/OverviewSkeleton";
import { CanisterInfoCard } from "./components/CanisterInfoCard";
import { ProjectInfoCard } from "./components/ProjectInfoCard";
import { CyclesCard } from "./components/CyclesCard";
import { DeploymentHistoryCard } from "./components/DeploymentHistoryCard";
import { UsageStatisticsCard } from "./components/UsageStatisticsCard";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import { SerializedProject } from "../../utility/bigint";
import { useFreemiumLogic } from "../../hooks/useFreemiumLogic";
import RepoSelector from "../RepoSelector/RepoSelector";
import { Repository } from "../../api/github/GithubApi";
import { useConfirmationModal } from "../../context/ConfirmationModalContext/ConfirmationModalContext";
import { ConfirmationModal } from "../ConfirmationPopup/ConfirmationModal";

interface ActivityLog {
  id: string;
  category: string;
  description: string;
  create_time: number;
}
export interface RedeployData {
  repo: Repository | null;
  branchName: string;
  path: string;
  autoDeploy: boolean;
}

export const CanisterOverview: React.FC = () => {
  /** START STATE */
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workflowRunHistory, setWorkflowRunHistory] = useState<
    SerializedWorkflowRunDetail[]
  >([]);
  const [cyclesAmount, setCyclesAmount] = useState("0");
  const [canisterInfo, setCanisterInfo] = useState<any>(null);
  const [isRedeploying, setIsRedeploying] = useState(false);
  const [redeployData, setRedeployData] = useState<RedeployData>({
    repo: null,
    branchName: "",
    path: "",
    autoDeploy: false,
  });
  /** END STATE */

  /** START HOOKS */

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { projectId } = useParams();
  const {
    deployments,
    selectedDeployment,
    getDeployment,
    getWorkflowRunHistory,
    refreshDeployments,
  } = useDeployments();
  const { setToasterData, setShowToaster } = useToaster();
  const { balance, isLoadingBalance } = useLedger();
  const {
    isLoadingCycles,
    canisterStatus,
    cyclesStatus,
    maxCyclesExchangeable,
    isLoadingEstimateCycles,
    getStatus,
    handleAddCycles,
  } = useCyclesLogic();

  const {
    handleFetchActivityLogs,
    handleClearProjectAssets,
    handleDeleteProject,
    handleFetchUserUsage,
    handleInstallCode,
  } = useProjectsLogic();

  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const { setHeaderCard } = useHeaderCard();

  const { summon, destroy } = useLoaderOverlay();
  const { showModal, setShowModal } = useConfirmationModal();

  const { projects, activityLogs, isLoadingActivityLogs } = useSelector(
    (state: RootState) => state.projects
  );

  /**END HOOKS */

  const currentProject = projects.find(
    (p) => projectId && p.id === projectId
  ) as SerializedProject | undefined;

  useEffect(() => {
    if (projectId !== undefined && identity && agent) {
      handleFetchActivityLogs(BigInt(projectId));
      handleFetchUserUsage(parseInt(projectId));
      getStatus(parseInt(projectId));
    }
  }, [dispatch, projectId, identity, agent]);

  useEffect(() => {
    setHeaderCard({
      title: "Project Overview",
    });
  }, []);
  useEffect(() => {
    const t = async () => {
      if (projectId !== null && projectId !== undefined && identity && agent) {
        await refreshDeployments(Number(projectId));
        getStatus(parseInt(projectId));
      }
    };
    t();
  }, [projectId, identity, agent]);

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

  const handleQuickAction = async (action: string) => {
    if (!currentProject) return;

    switch (action) {
      case "visit":
        if (currentProject.canister_id) {
          window.open(getCanisterUrl(currentProject.canister_id), "_blank");
        } else {
          setToasterData({
            headerContent: "Failed",
            toastStatus: false,
            toastData: "Runner not attached.",
            timeout: 2000,
          });
          setShowToaster(true);
        }
        break;
      case "deploy":
        if (currentProject.canister_id) {
          navigate(
            `/dashboard/deploy/${currentProject.canister_id}/${currentProject.id}`
          );
        } else {
          setToasterData({
            headerContent: "Failed",
            toastStatus: false,
            toastData: "Runner not attached.",
            timeout: 2000,
          });
          setShowToaster(true);
        }
        break;
      case "requestRunner":
        try {
          summon("Setting up canister...");
          const result = await handleInstallCode(
            new MouseEvent("click") as any,
            !!currentProject.canister_id,
            BigInt(currentProject.id),
            currentProject.canister_id,
            "freemium" in currentProject.plan,
            identity,
            agent
          );

          if (result) {
            console.log(`Canister deployed successfully: ${result.canisterId}`);
            setToasterData({
              headerContent: "Success",
              toastStatus: true,
              toastData: `Attached runner: ${result.canisterId}`,
              textColor: "green",
              timeout: 3000,
            });
            setShowToaster(true);
          }
        } catch (error: any) {
          console.error("Failed to deploy canister:", error.message);
          setToasterData({
            headerContent: "Error",
            toastStatus: false,
            toastData: error.message || "Failed to attach runner.",
            textColor: "red",
            timeout: 5000,
          });
          setShowToaster(true);
          // Handle subscription-related errors
          if (error.message.includes("subscription")) {
            navigate("/dashboard/billing");
          }
        } finally {
          destroy();
        }
        break;
      case "cycles":
        // Handle Cycles action
        setShowModal(true);
        break;
      case "delete":
        // Handle delete action
        try {
          const result = await handleDeleteProject(parseInt(currentProject.id));
        } catch (error: any) {
          console.error("Failed to delete project:", error.message);
          setToasterData({
            headerContent: "Error",
            toastStatus: false,
            toastData: error.message || "Failed to delete project.",
            textColor: "red",
            timeout: 4000,
          });
          setShowToaster(true);
        }
        break;
      case "clear":
        // Handle clear action
        try {
          const result = await handleClearProjectAssets(
            parseInt(currentProject.id)
          );
        } catch (error: any) {
          console.error("Failed to clear assets:", error.message);
          setToasterData({
            headerContent: "Error",
            toastStatus: false,
            toastData: error.message || "Failed to clear assets.",
            textColor: "red",
            timeout: 4000,
          });
          setShowToaster(true);
        }
        break;
    }
  };

  const handleClickRedeploy = (run: SerializedWorkflowRunDetail) => {
    setIsRedeploying(true);
    setRedeployData({
      branchName: run.branch,
      path: ".",
      repo: {
        id: 1,
        name: "",
        full_name: run.repo_name,
        html_url: "",
        default_branch: run.branch,
        visibility: "",
      },
      autoDeploy: true,
    });
  };

  // Loading states for different sections
  // const loadingStates = {
  //   project: !currentProject,
  //   canister: !currentProject || !canisterInfo,
  //   cycles:
  //     !currentProject ||
  //     isLoadingCycles ||
  //     isLoadingBalance ||
  //     isLoadingEstimateCycles,
  //   activity: !currentProject || isLoadingActivityLogs,
  //   deployment: !currentProject || isLoading,
  //   usage: !currentProject || !canisterInfo,
  // };

  const loadingStates = {
    project: !currentProject,
    canister: !currentProject,
    cycles: !currentProject,
    activity: !currentProject,
    deployment: !currentProject,
    usage: !currentProject,
  };

  // const loadingStates = {
  //   project: true,
  //   canister: true,
  //   cycles: true,
  //   activity: true,
  //   deployment: true,
  //   usage: true,
  // };

  // Check if any section is still loading
  const isAnyLoading = Object.values(loadingStates).some((state) => state);

  if (isAnyLoading) {
    return (
      <div className="canister-overview-container">
        <OverviewSkeleton loadingStates={loadingStates} />
      </div>
    );
  }

  // if (currentProject) {
  //   return (
  //     <div className="canister-overview-container">
  //       <OverviewSkeleton loadingStates={loadingStates} />
  //     </div>
  //   );
  // }

  if (!currentProject) {
    return (
      <div className="canister-overview-container">
        <div className="empty-state">No project found</div>
      </div>
    );
  }

  if (isRedeploying && currentProject.canister_id) {
    return (
      <RepoSelector
        projectId={projectId}
        canisterId={currentProject.canister_id}
        prefilledBranch={redeployData.branchName}
        prefilledPath={redeployData.path}
        prefilledRepo={redeployData.repo}
        autoDeploy={redeployData.autoDeploy}
        onComplete={() => setIsRedeploying(false)}
      />
    );
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
      {showModal && (
        <ConfirmationModal
          amountState={[cyclesAmount, setCyclesAmount]}
          onHide={() => setShowModal(false)}
          onConfirm={async () => {
            await handleAddCycles(
              parseInt(currentProject.id),
              parseFloat(cyclesAmount)
            );
          }}
          type="cycles"
          customConfig={{
            title: "Add Cycles",
            message: "Enter amount of cycles to top up canister.",
          }}
        />
      )}

      {currentProject && (
        <QuickActions
          onActionClick={handleQuickAction}
          project={currentProject}
          hasCanister={!!currentProject.canister_id}
          isFreemium={"freemium" in (currentProject.plan || {})}
          deploymentStatus={selectedDeployment?.status}
        />
      )}

      <div className="overview-grid">
        <ProjectInfoCard currentProject={currentProject} />

        <CanisterInfoCard
          currentProject={currentProject}
          canisterStatus={selectedDeployment}
        />

        <CyclesCard
          isFreemium={"freemium" in currentProject.plan}
          isLoadingBalance={isLoadingBalance}
          balance={balance}
          isLoadingCycles={isLoadingCycles}
          cyclesStatus={cyclesStatus}
          isLoadingEstimateCycles={isLoadingEstimateCycles}
          maxCyclesExchangeable={maxCyclesExchangeable}
        />

        <DeploymentHistoryCard
          isLoading={isLoading}
          workflowRunHistory={workflowRunHistory}
          onRedeploy={handleClickRedeploy}
        />

        <UsageStatisticsCard
          deployment={selectedDeployment}
          hasCanister={!!currentProject.canister_id}
          isFreemium={"freemium" in currentProject.plan}
        />
        <ActivityCard
          isLoadingActivityLogs={isLoadingActivityLogs}
          activityLogs={formattedActivityLogs}
        />
      </div>
    </div>
  );
};

export default CanisterOverview;
