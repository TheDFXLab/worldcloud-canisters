import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../state/store";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { useCyclesLogic } from "../../hooks/useCyclesLogic";
import { useLedger } from "../../context/LedgerContext/LedgerContext";
import "./CanisterOverview.css";
import { CanisterInfoCard } from "./components/CanisterInfoCard";
import { CyclesCard } from "./components/CyclesCard";
import { DeploymentHistoryCard } from "./components/DeploymentHistoryCard";
import { ActivityCard } from "./components/ActivityCard";
import { ProjectInfoCard } from "./components/ProjectInfoCard";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoIcon from "@mui/icons-material/Info";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import HistoryIcon from "@mui/icons-material/History";
import TimelineIcon from "@mui/icons-material/Timeline";
import FolderIcon from "@mui/icons-material/Folder";
import { WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { SerializedWorkflowRunDetail } from "../../utility/principal";
import { useDeploymentLogic } from "../../hooks/useDeploymentLogic";
import { useProjectsLogic } from "../../hooks/useProjectsLogic";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";

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
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState<string | false>("none");
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

  // Fetch logs when component mounts or when dependencies change
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

  const handleChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
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
      <div className="canister-overview-content">
        <Accordion
          expanded={expanded === "projectInfo"}
          onChange={handleChange("projectInfo")}
          className="overview-accordion"
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            className="accordion-summary"
          >
            <div className="accordion-header">
              <FolderIcon className="accordion-icon" />
              <span className="accordion-title">Project Information</span>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <ProjectInfoCard
              project={currentProject}
              cyclesStatus={cyclesStatus}
            />
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={expanded === "activity"}
          onChange={handleChange("activity")}
          className="overview-accordion"
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            className="accordion-summary"
          >
            <div className="accordion-header">
              <TimelineIcon className="accordion-icon" />
              <span className="accordion-title">Activity</span>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <ActivityCard
              isLoadingActivityLogs={isLoadingActivityLogs}
              activityLogs={formattedActivityLogs}
            />
          </AccordionDetails>
        </Accordion>
        <Accordion
          expanded={expanded === "canisterInfo"}
          onChange={handleChange("canisterInfo")}
          className="overview-accordion"
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            className="accordion-summary"
          >
            <div className="accordion-header">
              <InfoIcon className="accordion-icon" />
              <span className="accordion-title">Canister Information</span>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <CanisterInfoCard
              canisterInfo={canisterInfo}
              canisterId={currentProject.canister_id}
              canisterStatus={canisterStatus}
            />
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === "cycles"}
          onChange={handleChange("cycles")}
          className="overview-accordion"
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            className="accordion-summary"
          >
            <div className="accordion-header">
              <AccountBalanceWalletIcon className="accordion-icon" />
              <span className="accordion-title">Cycles</span>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <CyclesCard
              isLoadingBalance={isLoadingBalance}
              balance={balance}
              isLoadingEstimateCycles={isLoadingEstimateCycles}
              maxCyclesExchangeable={maxCyclesExchangeable}
              isLoadingCycles={isLoadingCycles}
              cyclesStatus={cyclesStatus}
              onAddCycles={() => {}}
            />
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={expanded === "deploymentHistory"}
          onChange={handleChange("deploymentHistory")}
          className="overview-accordion"
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            className="accordion-summary"
          >
            <div className="accordion-header">
              <HistoryIcon className="accordion-icon" />
              <span className="accordion-title">Deployment History</span>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <DeploymentHistoryCard
              isLoading={isLoading}
              workflowRunHistory={workflowRunHistory}
            />
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  );
};
