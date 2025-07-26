import { useEffect, useRef, useState } from "react";
import { GithubApi, Repository } from "../../api/github/GithubApi";
import "./RepoSelector.css";
import RepoSelectorSkeleton from "./RepoSelectorSkeleton";

import { useGithub } from "../../context/GithubContext/GithubContext";
import { generateWorkflowTemplate } from "../../utility/workflowTemplate";
import FileUploadApi from "../../api/FileUpload/FileUploadApi";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import DeploymentProgress, {
  DeploymentStep,
} from "../DeploymentProgress/DeploymentProgress";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useNavigate, useParams } from "react-router-dom";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { Principal } from "@dfinity/principal";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { reverse_proxy_url } from "../../config/config";
import AuthState from "../../state/AuthState";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";
import { RedeployData } from "../CanisterOverview/CanisterOverview";

interface PackageLocation {
  path: string;
  hasPackageJson: boolean;
}

interface Branch {
  name: string;
  commit: {
    sha: string;
  };
}

interface ArtifactSummary {}

interface RepoState {
  branches: Branch[];
  selectedBranch: string;
  packageLocations: PackageLocation[];
  selectedPath: string;
  deploymentSteps: DeploymentStep[];
  currentStep: string | null;
  artifacts: ArtifactSummary[];
}

interface RepoSelectorProps {
  projectId?: string;
  canisterId?: string | null;
  redeployData?: RedeployData;
  prefilledBranch?: string;
  prefilledPath?: string;
  prefilledRepo?: Repository | null;
  autoDeploy?: boolean;
  onComplete?: () => void;
}

interface RepoSelectorState {
  selectedRepo: Repository | null;
  step: "select" | "configure" | "deploy";
}
const ITEMS_PER_PAGE = 6;

const RepoSelector: React.FC<RepoSelectorProps> = ({
  projectId,
  canisterId,
  redeployData,
  prefilledBranch,
  prefilledPath,
  prefilledRepo,
  autoDeploy,
  onComplete,
}) => {
  /** Hooks */
  const { getGithubToken } = useGithub();
  const { identity } = useIdentity();
  const { actionBar, setActionBar } = useActionBar();
  const { toasterData, setToasterData, setShowToaster } = useToaster();
  const navigate = useNavigate();
  const { agent } = useHttpAgent();
  const { isDispatched, setIsDispatched } = useDeployments();
  const { setHeaderCard } = useHeaderCard();

  /** State */
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployStatus, setDeployStatus] = useState<
    "idle" | "deploying" | "deployed" | "failed"
  >("idle");
  const [repoStates, setRepoStates] = useState<Record<string, RepoState>>({});

  const github = GithubApi.getInstance();
  const [state, setState] = useState<RepoSelectorState>({
    selectedRepo: null,
    step: "select",
  });

  const [hideActionBar, setHideActionBar] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  // Pagingation state
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(repos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentRepos = repos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const [showPagination, setShowPagination] = useState(false);
  const hasPrefilled = useRef(false);

  useEffect(() => {
    if (state.step === "select") setShowPagination(totalPages > 1);
    // setShowPagination(totalPages > 1);
  }, [totalPages, state.step]);

  useEffect(() => {
    setHeaderCard({
      title: "Select Repository",
      description: "Choose a repository to deploy to Internet Computer",
    });
  }, []);

  const initialDeploymentSteps: DeploymentStep[] = [
    {
      id: "workflow",
      title: "Creating Workflow",
      description: "Setting up the build pipeline",
      status: "pending",
      timeEstimate: "30 seconds",
    },
    {
      id: "trigger",
      title: "Triggering Build",
      description: "Starting the build process",
      status: "pending",
      timeEstimate: "1 minute",
    },
    {
      id: "build",
      title: "Building Project",
      description: "Compiling and bundling your application",
      status: "pending",
      timeEstimate: "2-3 minutes",
    },
    {
      id: "artifact",
      title: "Processing Build",
      description: "Preparing build files for deployment",
      status: "pending",
      timeEstimate: "1 minute",
    },
    {
      id: "deploy",
      title: "Deploying to Canister",
      description: "Uploading to Internet Computer",
      status: "pending",
      timeEstimate: "1-2 minutes",
    },
  ];

  useEffect(() => {
    if (!canisterId || !projectId) {
      // navigate("/dashboard/new");
      return;
    }
  }, [canisterId, projectId]);

  useEffect(() => {
    if (
      !hasPrefilled.current &&
      prefilledRepo &&
      prefilledBranch &&
      prefilledPath
    ) {
      hasPrefilled.current = true;
      setState({ selectedRepo: prefilledRepo, step: "configure" });
      setRepoStates((prev) => ({
        ...prev,
        [prefilledRepo.full_name]: {
          ...(prev[prefilledRepo.full_name] || {}),
          selectedBranch: prefilledBranch,
          selectedPath: prefilledPath,
          branches: prev[prefilledRepo.full_name]?.branches || [],
          packageLocations:
            prev[prefilledRepo.full_name]?.packageLocations || [],
          deploymentSteps: initialDeploymentSteps,
          currentStep: "workflow",
          artifacts: [],
        },
      }));
      // Load branches and package locations if not present
      loadBranches(prefilledRepo.full_name).then(() => {
        findPackageJsonLocations(prefilledRepo.full_name, prefilledBranch);
      });
      // TODO: Investigate issue with repoState clearing when this is called
      if (autoDeploy) {
        setTimeout(async () => {
          // await handleDeploy(prefilledRepo.full_name);
        }, 10000);
      }
    }
    // eslint-disable-next-line
  }, [prefilledRepo, prefilledBranch, prefilledPath, autoDeploy]);

  useEffect(() => {
    const loadRepos = async () => {
      const repos = await github.listRepositories();
      setRepos(repos);
      // If prefilledRepo exists, do not reset state
      if (
        prefilledRepo &&
        prefilledBranch &&
        prefilledPath &&
        !hasPrefilled.current
      ) {
        // Prefill logic will handle state
        return;
      }
      // setShowPagination(totalPages > 1);
    };
    loadRepos();
    // eslint-disable-next-line
  }, []);

  const loadBranches = async (repo: string) => {
    try {
      const jwt = AuthState.getInstance().getAccessToken();
      if (!jwt) {
        throw new Error("No access token found. Please login again.");
      }
      const response = await fetch(
        `${reverse_proxy_url}/github/list_branches`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
            repo: repo,
          },
        }
      );

      const data = await response.json();
      setRepoStates((prev) => ({
        ...prev,
        [repo]: {
          ...(prev[repo] || {}), // Preserve existing state if any
          branches: data,
          // Only set selectedBranch if not already set
          selectedBranch: prev[repo]?.selectedBranch || "",
          selectedPath: prev[repo]?.selectedPath || "",
          packageLocations: prev[repo]?.packageLocations || [],
          deploymentSteps: initialDeploymentSteps,
          currentStep: "workflow",
          artifacts: [],
        },
      }));
    } catch (error) {
      console.error("Failed to load branches:", error);
    }
  };

  const findPackageJsonLocations = async (repo: string, branch: string) => {
    try {
      const jwt = AuthState.getInstance().getAccessToken();
      if (!jwt) {
        throw new Error("No access token found. Please login again.");
      }
      const response = await fetch(`${reverse_proxy_url}/github/tree`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
          repo: repo,
          branch: branch,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch tree");
      }

      const locations = await response.json();

      setRepoStates((prev) => {
        const newState = {
          ...prev,
          [repo]: {
            ...prev[repo],
            packageLocations: locations,
            // Only set selectedPath if not already set
            selectedPath:
              prev[repo]?.selectedPath ||
              (locations.length === 1 ? locations[0].path : ""),
            deploymentSteps: initialDeploymentSteps,
            currentStep: "workflow",
            artifacts: [],
          },
        };
        return newState;
      });
    } catch (error) {
      console.error("Failed to find package.json locations:", error);
      setRepoStates((prev) => ({
        ...prev,
        [repo]: {
          ...prev[repo],
          packageLocations: [{ path: ".", hasPackageJson: false }],
          deploymentSteps: initialDeploymentSteps,
          currentStep: "workflow",
          artifacts: [],
        },
      }));
    }
  };

  useEffect(() => {
    console.log(`repo`, repoStates);
  }, [repoStates]);

  const handleDeploy = async (repo: string) => {
    try {
      console.log(`repo states`, repoStates[repo]);
      if (!identity) {
        throw new Error("Please login to deploy");
      }
      if (!canisterId) {
        throw new Error("Please request a session to deploy code to a runner.");
      }
      if (!repoStates[repo].selectedPath) {
        throw new Error("Please select a source path");
      }
      if (!projectId) {
        throw new Error("Project not selected.");
      }

      setShowToaster(true);
      setToasterData({
        headerContent: "Deploying...",
        toastStatus: true,
        toastData: `Deploying ${repo}`,
        textColor: "green",
        timeout: 5000,
      });

      setHideActionBar(true);

      setRepoStates((prev) => ({
        ...prev,
        [repo]: {
          ...prev[repo],
          deploymentSteps: initialDeploymentSteps,
          currentStep: "workflow",
        },
      }));

      setIsDispatched(true);
      updateStepStatus(repo, "workflow", "in-progress");

      // // Update workflow step
      // const workflowContent = generateWorkflowTemplate(
      //   repoStates[repo].selectedPath,
      //   repoStates[repo].selectedBranch
      // );

      await github.createWorkflow(
        repo,
        repoStates[repo].selectedBranch,
        repoStates[repo].selectedPath
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));
      updateStepStatus(repo, "workflow", "completed");
      updateStepStatus(repo, "trigger", "in-progress");

      const latestRunId = await github.getLatestWorkflowRunId(repo);

      // Trigger workflow
      await github.triggerWorkflow(repo, repoStates[repo].selectedBranch);

      updateStepStatus(repo, "trigger", "completed");
      updateStepStatus(repo, "build", "in-progress");

      if (!agent) {
        throw new Error("Agent not found");
      }
      // Wait for artifact
      const pollResponse = await github.pollForArtifact(
        identity,
        agent,
        Principal.fromText(canisterId),
        repo,
        repoStates[repo].selectedBranch,
        latestRunId
      );

      const artifact = pollResponse.artifact;
      const workflowRunDetails = pollResponse.workflowRunDetails;

      updateStepStatus(repo, "build", "completed");
      updateStepStatus(repo, "artifact", "in-progress");

      // Download and process artifact
      const zipBlob = await github.downloadArtifact(
        artifact.archive_download_url
      );

      const zipFile = new File([zipBlob], "build.zip", {
        type: "application/zip",
      });

      updateStepStatus(repo, "artifact", "completed");
      updateStepStatus(repo, "deploy", "in-progress");

      // Deploy to canister
      const fileUploadApi = new FileUploadApi();
      const result = await fileUploadApi.uploadFromZip(
        zipFile,
        BigInt(projectId),
        identity,
        workflowRunDetails,
        agent
      );

      if (!result.status) {
        throw new Error(result.message);
      }

      updateStepStatus(repo, "deploy", "completed");
      // Show success toast
      setToasterData({
        headerContent: `Deployment complete!`,
        toastStatus: true,
        toastData: `Deployed ${repo}`,
        textColor: "green",
        timeout: 5000,
      });
      // Call onComplete instead of navigating
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        // Fallback to navigation if no onComplete provided
        setTimeout(() => {
          navigate(`/dashboard/canister/${projectId}`);
        }, 2000);
      }
    } catch (error) {
      console.error("Deploy failed:", error);
      // Mark current step as error
      const currentStep = repoStates[repo].currentStep;
      if (currentStep) {
        updateStepStatus(repo, currentStep, "error");
      }
      setToasterData({
        headerContent: "Deployment Failed",
        toastStatus: false,
        toastData: error instanceof Error ? error.message : "Unknown error",
        textColor: "red",
        timeout: 5000,
      });
      setShowToaster(true);
    }
  };

  const updateStepStatus = (
    repo: string,
    stepId: string,
    status: DeploymentStep["status"]
  ) => {
    setRepoStates((prev) => ({
      ...prev,
      [repo]: {
        ...prev[repo],
        currentStep: stepId,
        deploymentSteps: prev[repo].deploymentSteps.map((step) =>
          step.id === stepId ? { ...step, status } : step
        ),
      },
    }));
  };

  const handleSelectRepo = async (repo: Repository) => {
    setState((prev) => ({ ...prev, selectedRepo: repo }));

    setActionBar({
      icon: "📦",
      text: state.selectedRepo
        ? state.selectedRepo.name
        : "Select a repository to continue",
      buttonText: "Configure Deployment",
      onButtonClick: () => {
        setShowTitle(false);
        setState((prev) => ({ ...prev, step: "configure" }));
      },
      isButtonDisabled: !state.selectedRepo,
      isHidden: hideActionBar,
    });
  };

  const renderRepoGrid = () =>
    currentRepos.map((repo) => (
      <div
        key={repo.id}
        className={`repo-card ${
          state.selectedRepo?.id === repo.id ? "selected" : ""
        }`}
        onClick={() => handleSelectRepo(repo)}
      >
        <div className="repo-name">{repo.name}</div>
        <div className="repo-info">
          <span>{repo.full_name}</span>
          <span className="repo-visibility">{repo.visibility}</span>
        </div>
        <div className="repo-actions">
          <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </div>
        {repoStates[repo.full_name]?.artifacts?.length > 0 && (
          <div className="repo-artifacts">
            <h4>Recent Builds</h4>
            {/* ... artifacts list ... */}
          </div>
        )}
      </div>
    ));

  const renderConfigureStep = () => {
    if (!state.selectedRepo) {
      return null;
    }

    const repoState = repoStates[state.selectedRepo.full_name];

    return (
      <div className="deployment-configure">
        <div className="configure-header">
          {/* {isDispatched ? (
            <div></div>
          ) : (
            <button
              className="back-button"
              onClick={() => {
                setShowTitle(true);
                setState((prev) => ({ ...prev, step: "select" }));
              }}
            >
              ← Back to repositories
            </button>
          )} */}

          {/* <h2>Configure Deployment</h2>
          <p>Configure deployment settings for {state.selectedRepo.name}</p> */}
        </div>

        <div className="configure-content">
          <div className="branch-selector">
            <label>Branch:</label>
            <select
              value={repoState?.selectedBranch || ""}
              onChange={(e) => {
                const newBranch = e.target.value;
                setRepoStates((prev) => ({
                  ...prev,
                  [state.selectedRepo!.full_name]: {
                    ...prev[state.selectedRepo!.full_name],
                    selectedBranch: newBranch,
                  },
                }));
                if (newBranch) {
                  findPackageJsonLocations(
                    state.selectedRepo!.full_name,
                    newBranch
                  );
                }
              }}
              onClick={() =>
                !repoState?.branches.length &&
                loadBranches(state.selectedRepo!.full_name)
              }
            >
              <option value="">Select branch</option>
              {repoState?.branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {repoState?.selectedBranch && (
            <div className={`path-selector`}>
              <label>Source Path:</label>
              <select
                value={repoState.selectedPath}
                onChange={(e) => {
                  setRepoStates((prev) => ({
                    ...prev,
                    [state.selectedRepo!.full_name]: {
                      ...prev[state.selectedRepo!.full_name],
                      selectedPath: e.target.value,
                    },
                  }));
                }}
              >
                <option value="">Select source path</option>
                {repoState.packageLocations.map((loc) => (
                  <option key={loc.path} value={loc.path}>
                    {loc.path}{" "}
                    {loc.hasPackageJson ? "(package.json found)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="configure-step">
          {repoState?.currentStep && (
            <DeploymentProgress
              steps={repoState.deploymentSteps}
              currentStep={repoState.currentStep}
            />
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (state.step === "select") {
      setActionBar({
        icon: "📦",
        text: state.selectedRepo
          ? state.selectedRepo.name
          : "Select a repository to continue",
        buttonText: "Configure Deployment",
        onButtonClick: () => {
          setShowTitle(false);
          setState((prev) => ({ ...prev, step: "configure" }));
        },
        isButtonDisabled: !state.selectedRepo,
        isHidden: hideActionBar,
      });
    } else if (state.step === "configure") {
      setShowPagination(false);

      setActionBar({
        icon: "🚀",
        text: `Ready to deploy ${state.selectedRepo?.name}`,
        buttonText: "Deploy to Internet Computer",
        onButtonClick: () => handleDeploy(state.selectedRepo!.full_name),
        isButtonDisabled:
          // !canisterId ||
          !repoStates[state.selectedRepo!.full_name]?.selectedPath,
        isHidden: hideActionBar,
      });
      setHeaderCard({
        title: "Source Code",
        description: "Select source branch",
      });
    }
  }, [
    state.step,
    state.selectedRepo,
    hideActionBar,
    canisterId,
    repoStates,
    state,
  ]);

  if (!repos.length) {
    return (
      <RepoSelectorSkeleton
        cardCount={6}
        showPagination={true}
        showActionBar={true}
      />
    );
  }

  return (
    <div className="repo-selector">
      {state.step === "select" && (
        <div className="repo-grid-container">
          <div className="repo-grid">{renderRepoGrid()}</div>
        </div>
      )}
      {state.step === "configure" && (
        <div className="configure-container">{renderConfigureStep()}</div>
      )}

      {showPagination && totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <NavigateBeforeIcon />
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="pagination-button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              <NavigateNextIcon />
            </button>
          </div>
        </div>
      )}

      {/* {renderActionBar()} */}
    </div>
  );
};

export default RepoSelector;
