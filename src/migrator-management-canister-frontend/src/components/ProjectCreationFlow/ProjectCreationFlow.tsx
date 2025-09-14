import React, { useState, useEffect } from "react";
import { Tabs, Tab, Box, Paper, Tooltip, Skeleton } from "@mui/material";
import CreateProjectForm from "../WebsitesComponent/CreateProjectForm";
import ProjectDeployment from "../ProjectDeployment/ProjectDeployment";
import RepoSelector from "../RepoSelector/RepoSelector";
import "./ProjectCreationFlow.css";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";
import { mapHeaderContent } from "../../utility/headerCard";
import { SerializedProject, serializeProject } from "../../utility/bigint";
import { useProjects } from "../../context/ProjectContext/ProjectContext";
import { useProjectsLogic } from "../../hooks/useProjectsLogic";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

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
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setHeaderCard } = useHeaderCard();
  const { handleInstallCode, projects, isLoading } = useProjectsLogic();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const { setToasterData, setShowToaster } = useToaster();

  // Extract project data from URL parameters
  const projectId = searchParams.get("projectId");
  const canisterId = searchParams.get("canisterId");
  const step = searchParams.get("step");

  // Initialize state from URL parameters on component mount
  useEffect(() => {
    const initializeFromUrl = async () => {
      if (projectId && canisterId) {
        // Find the project in the projects list
        const project = projects.find((p) => p.id.toString() === projectId);
        if (project) {
          // Convert DeserializedProject to SerializedProject
          const serializedProject: SerializedProject = {
            ...project,
            id: project.id.toString(),
            canister_id: project.canister_id || null,
            date_created: project.date_created || 0,
            date_updated: project.date_updated || 0,
          };
          setProjectData(serializedProject);
          setCanProceed(true);

          // Set the active tab based on URL parameter
          const tabIndex = step ? parseInt(step) : 0;
          setActiveTab(tabIndex);
        }
      }
      // Mark initialization as complete
      setIsInitializing(false);
    };

    initializeFromUrl();
  }, [projectId, canisterId, step, projects]);

  const updateUrlParams = (
    newProjectData?: SerializedProject,
    newTab?: number
  ) => {
    const params = new URLSearchParams();

    if (newProjectData || projectData) {
      const data = newProjectData || projectData;
      if (data) {
        params.set("projectId", data.id.toString());
        params.set("canisterId", data.canister_id || "");
      }
    }

    if (newTab !== undefined) {
      params.set("step", newTab.toString());
    } else if (activeTab !== undefined) {
      params.set("step", activeTab.toString());
    }

    setSearchParams(params);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Only allow moving forward if we have the necessary data
    if (newValue > activeTab && !canProceed) {
      return;
    }
    setActiveTab(newValue);
    updateUrlParams(projectData || undefined, newValue);
  };

  const handleProjectCreated = async (e: any, data: SerializedProject) => {
    setCanProceed(true);
    try {
      const res = await handleInstallCode(
        e,
        false,
        BigInt(data.id),
        null,
        data.plan === "freemium",
        identity,
        agent
      );

      if (!res) return;
      setProjectData(res.project);
      setActiveTab(1); // Move to deployment method selection
      updateUrlParams(res.project, 1);
    } catch (error: any) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to create new project.",
        timeout: 3000,
      });
      setShowToaster(true);
      if (error.message.includes("subscription")) {
        navigate("/dashboard/billing");
      }
    }
  };

  const handleDeploymentMethodSelected = () => {
    setActiveTab(2); // Move to repo selection
    updateUrlParams(projectData || undefined, 2);
  };

  useEffect(() => {
    setHeaderCard(mapHeaderContent("publish"));
  }, []);

  // Reset flow when unmounting (but keep URL params for refresh handling)
  useEffect(() => {
    return () => {
      // Don't reset everything on unmount to preserve URL state
      // Only reset if we're not in the middle of a flow
      if (!projectId && !canisterId) {
        setActiveTab(0);
        setProjectData(null);
        setCanProceed(false);
      }
    };
  }, [projectId, canisterId]);

  const renderTab = (label: string, index: number, disabled: boolean) => {
    const tab = { label, disabled };

    return (
      <Tab
        label={
          tab.disabled ? (
            <Tooltip
              title={
                tab.disabled ? "Complete the previous step to unlock." : ""
              }
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {tab.label}
                <LockOutlinedIcon style={{ fontSize: 16, marginLeft: 4 }} />
              </span>
            </Tooltip>
          ) : (
            tab.label
          )
        }
        disabled={tab.disabled}
        onClick={(e) => {
          if (tab.disabled) {
            e.preventDefault();
          }
        }}
      />
    );
  };

  // Show skeleton loading state while initializing from URL parameters
  if (isInitializing || isLoading) {
    return (
      <div className="project-creation-flow">
        <div className="creation-tabs-container">
          <Paper className="creation-tabs" elevation={0}>
            <Tabs
              value={0}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
            >
              {renderTab("Project Details", 0, false)}
              {renderTab("Deployment Method", 1, true)}
              {renderTab("Repository Setup", 2, true)}
            </Tabs>
          </Paper>
        </div>
        <div className="tab-content">
          <div style={{ padding: "2rem" }}>
            {/* Skeleton for form content */}
            <div style={{ marginBottom: "2rem" }}>
              <Skeleton
                variant="text"
                width="60%"
                height={32}
                style={{ marginBottom: "1rem" }}
              />
              <Skeleton
                variant="text"
                width="40%"
                height={24}
                style={{ marginBottom: "2rem" }}
              />

              {/* Form fields skeleton */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                }}
              >
                <div>
                  <Skeleton
                    variant="text"
                    width="20%"
                    height={20}
                    style={{ marginBottom: "0.5rem" }}
                  />
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={48}
                    style={{ borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <Skeleton
                    variant="text"
                    width="25%"
                    height={20}
                    style={{ marginBottom: "0.5rem" }}
                  />
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={80}
                    style={{ borderRadius: "8px" }}
                  />
                </div>
                <div>
                  <Skeleton
                    variant="text"
                    width="15%"
                    height={20}
                    style={{ marginBottom: "0.5rem" }}
                  />
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={48}
                    style={{ borderRadius: "8px" }}
                  />
                </div>
              </div>

              {/* Button skeleton */}
              <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
                <Skeleton
                  variant="rectangular"
                  width={120}
                  height={40}
                  style={{ borderRadius: "8px" }}
                />
                <Skeleton
                  variant="rectangular"
                  width={100}
                  height={40}
                  style={{ borderRadius: "8px" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            projectData={projectData || undefined}
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
