import React, { useState, useEffect } from "react";
import { Tabs, Tab, Box, Paper, Tooltip } from "@mui/material";
import CreateProjectForm from "../WebsitesComponent/CreateProjectForm";
import ProjectDeployment from "../ProjectDeployment/ProjectDeployment";
import RepoSelector from "../RepoSelector/RepoSelector";
import "./ProjectCreationFlow.css";
import { useNavigate, useParams } from "react-router-dom";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";
import { mapHeaderContent } from "../../utility/headerCard";
import { SerializedProject, serializeProject } from "../../utility/bigint";
import { useProjects } from "../../context/ProjectContext/ProjectContext";
import { useProjectsLogic } from "../../hooks/useProjectsLogic";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-creation-tabpanel-${index}`}
      aria-labelledby={`project-creation-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

interface ProjectCreationFlowProps {}

const ProjectCreationFlow: React.FC<ProjectCreationFlowProps> = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [projectData, setProjectData] = useState<SerializedProject | null>(
    null
  );
  const [canProceed, setCanProceed] = useState(false);
  const navigate = useNavigate();
  //   const { projectId, canisterId } = useParams();
  const { setHeaderCard } = useHeaderCard();
  const { handleInstallCode, projects } = useProjectsLogic();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Only allow moving forward if we have the necessary data
    if (newValue > activeTab && !canProceed) {
      return;
    }
    setActiveTab(newValue);
  };

  const handleProjectCreated = async (e: any, data: SerializedProject) => {
    setCanProceed(true);
    const res = await handleInstallCode(
      e,
      false,
      BigInt(data.id),
      null,
      "freemium" in data.plan,
      identity,
      agent
    );

    if (!res) return;
    setProjectData(res.project);
    setActiveTab(1); // Move to deployment method selection
  };

  const handleDeploymentMethodSelected = () => {
    setActiveTab(2); // Move to repo selection
  };

  useEffect(() => {
    setHeaderCard(mapHeaderContent("publish"));
  }, []);

  // Reset flow when unmounting
  useEffect(() => {
    return () => {
      setActiveTab(0);
      setProjectData(null);
      setCanProceed(false);
    };
  }, []);

  const renderTab = (label: string, index: number, disabled: boolean) => {
    const tab = (
      <Tab
        label={label}
        disabled={disabled}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
          }
        }}
      />
    );

    if (disabled) {
      return (
        <Tooltip title="Complete the previous step first" arrow placement="top">
          {tab}
        </Tooltip>
      );
    }

    return tab;
  };

  return (
    <div className="project-creation-flow">
      <div className="creation-tabs-container">
        <Paper className="creation-tabs" elevation={0}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            {renderTab("Project Details", 0, false)}
            {renderTab("Deployment Method", 1, !canProceed)}
            {renderTab("Repository Setup", 2, !canProceed || activeTab < 2)}
          </Tabs>
        </Paper>
      </div>

      <div className="tab-content">
        <TabPanel value={activeTab} index={0}>
          <CreateProjectForm onProjectCreated={handleProjectCreated} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <ProjectDeployment
            onMethodSelected={handleDeploymentMethodSelected}
            projectData={projectData}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <RepoSelector
            projectId={projectData?.id}
            canisterId={projectData?.canister_id}
          />
        </TabPanel>
      </div>
    </div>
  );
};

export default ProjectCreationFlow;
