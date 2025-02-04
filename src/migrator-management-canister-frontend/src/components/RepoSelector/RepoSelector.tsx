import { useEffect, useState } from "react";
import { GithubApi, Repository } from "../../api/github/GithubApi";
import "./RepoSelector.css";

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

interface RepoSelectorProps {}

interface RepoSelectorState {
  selectedRepo: Repository | null;
  step: "select" | "configure" | "deploy";
}

const RepoSelector: React.FC<RepoSelectorProps> = () => {
  /** Hooks */
  const { getGithubToken } = useGithub();
  const { identity } = useIdentity();
  const { actionBar, setActionBar } = useActionBar();
  const { canisterId } = useParams();
  const { toasterData, setToasterData, setShowToaster } = useToaster();
  const navigate = useNavigate();

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
    if (!canisterId) {
      navigate("/app/new");
      return;
    }
  }, [canisterId]);

  useEffect(() => {
    const loadRepos = async () => {
      const token = getGithubToken();
      if (!token) {
        console.log(`Not authenticated.`);
        await github.authenticate();
      }
      const repos = await github.listRepositories();
      setRepos(repos);
    };
    loadRepos();
  }, []);

  const loadBranches = async (repo: string) => {
    try {
      const response = await github.request(`/repos/${repo}/branches`);

      setRepoStates((prev) => ({
        ...prev,
        [repo]: {
          ...(prev[repo] || {}), // Preserve existing state if any
          branches: response,
          selectedBranch: "",
          selectedPath: "",
          packageLocations: [],
          deploymentSteps: initialDeploymentSteps,
          currentStep: "workflow",
          artifacts: [],
        },
      }));
      console.log(`loaded branches for ${repo}`);
    } catch (error) {
      console.error("Failed to load branches:", error);
    }
  };

  const findPackageJsonLocations = async (repo: string, branch: string) => {
    try {
      const response = await github.request(
        `/repos/${repo}/git/trees/${branch}?recursive=1`
      );
      const locations = response.tree
        .filter((item: any) => item.path.endsWith("package.json"))
        .map((item: any) => {
          const path = item.path.replace("/package.json", "");
          // If package.json is in root, use "." as the path
          return {
            path: path === "package.json" ? "." : path,
            hasPackageJson: true,
          };
        });

      console.log(
        `locations length:`,
        locations.length === 1 ? locations[0].path : ""
      );
      console.log(`locations:`, locations, repoStates);
      setRepoStates((prev) => {
        const newState = {
          ...prev,
          [repo]: {
            ...prev[repo],
            packageLocations: locations,
            selectedPath: locations.length === 1 ? locations[0].path : "",
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

  const handleDeploy = async (repo: string) => {
    try {
      if (!identity) {
        throw new Error("Please login to deploy");
      }
      if (!canisterId) {
        throw new Error("Please select a canister");
      }
      if (!repoStates[repo].selectedPath) {
        throw new Error("Please select a source path");
      }

      setShowToaster(true);
      setToasterData({
        headerContent: "Deploying...",
        toastStatus: true,
        toastData: `Deploying ${repo}`,
        textColor: "green",
        timeout: 5000,
      });

      console.log(`Hiding action bar`);
      setHideActionBar(true);

      setRepoStates((prev) => ({
        ...prev,
        [repo]: {
          ...prev[repo],
          deploymentSteps: initialDeploymentSteps,
          currentStep: "workflow",
        },
      }));

      // Update workflow step
      const workflowContent = generateWorkflowTemplate(
        repoStates[repo].selectedPath,
        repoStates[repo].selectedBranch
      );

      await github.createWorkflow(
        repo,
        workflowContent,
        repoStates[repo].selectedBranch
      );

      updateStepStatus(repo, "workflow", "completed");
      updateStepStatus(repo, "trigger", "in-progress");

      const latestRun = await github.getLatestWorkflowRun(repo);

      // Trigger workflow
      await github.triggerWorkflow(repo, repoStates[repo].selectedBranch);

      updateStepStatus(repo, "trigger", "completed");
      updateStepStatus(repo, "build", "in-progress");

      // Wait for artifact
      const pollResponse = await github.pollForArtifact(
        identity,
        Principal.fromText(canisterId),
        repo,
        repoStates[repo].selectedBranch,
        latestRun.id
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
        canisterId,
        identity,
        workflowRunDetails
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

      // Navigate to canister after a short delay
      setTimeout(() => {
        navigate(`/app/canister/${canisterId}`); // navigate to canister page
      }, 2000);
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
    console.log(`Updated step status:`, repoStates);
  };

  const handleSelectRepo = async (repo: Repository) => {
    setState((prev) => ({ ...prev, selectedRepo: repo }));
    console.log(`Selected repo:`, repo);
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

    // const githubApi = GithubApi.getInstance();
    // const runs = await githubApi.getWorkflowRuns(repo.full_name);
    // const workflows = await githubApi.getWorkflows(repo.full_name,);
    // console.log(`Workflow runs:`, runs);
    // console.log(`Workflows:`, workflows);
  };

  const renderRepoGrid = () => (
    <div className="repo-grid">
      {repos.map((repo) => (
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
      ))}
    </div>
  );

  const renderConfigureStep = () => {
    if (!state.selectedRepo) {
      console.log(`no repo selected`);
      return null;
    }

    const repoState = repoStates[state.selectedRepo.full_name];

    return (
      <div className="deployment-configure">
        <div className="configure-header">
          <button
            className="back-button"
            onClick={() => {
              setShowTitle(true);
              setState((prev) => ({ ...prev, step: "select" }));
            }}
          >
            ← Back to repositories
          </button>
          <h2>Configure Deployment</h2>
          <p>Configure deployment settings for {state.selectedRepo.name}</p>
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
            <div className="path-selector">
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

        {repoState?.currentStep && (
          <DeploymentProgress
            steps={repoState.deploymentSteps}
            currentStep={repoState.currentStep}
          />
        )}
      </div>
    );
  };

  useEffect(() => {
    console.log(`selected step changed:`, state);
    console.log(`Canister`, canisterId);
    // console.log(
    //   `WEveal`,
    //   !canisterId || !repoStates[state.selectedRepo!.full_name]?.selectedPath
    // );
  }, [state.step]);

  useEffect(() => {
    if (state.step === "select") {
      console.log(`Setting action bar`, state);
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
      console.log(`Setting action bar`, {
        canisterId,
        state: state,
        repoStates: repoStates[state.selectedRepo!.full_name],
        selectedPath: repoStates[state.selectedRepo!.full_name]?.selectedPath,
      });
      setActionBar({
        icon: "🚀",
        text: `Ready to deploy ${state.selectedRepo?.name}`,
        buttonText: "Deploy to Internet Computer",
        onButtonClick: () => handleDeploy(state.selectedRepo!.full_name),
        isButtonDisabled:
          !canisterId ||
          !repoStates[state.selectedRepo!.full_name]?.selectedPath,
        isHidden: hideActionBar,
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

  useEffect(() => {
    console.log(`state changes`, state);
  }, [state]);

  if (!repos.length) {
    return <div>Loading...</div>;
  }

  return (
    <div className="repo-selector">
      {showTitle && (
        <div className="repo-header">
          <h2>Select Repository</h2>
          <p>Choose a repository to deploy to Internet Computer</p>
        </div>
      )}

      <div className="repo-grid-container">
        <div className="repo-grid">
          {state.step === "select" && renderRepoGrid()}
          {state.step === "configure" && renderConfigureStep()}
        </div>
      </div>

      {/* {renderActionBar()} */}
    </div>
  );
};

export default RepoSelector;
