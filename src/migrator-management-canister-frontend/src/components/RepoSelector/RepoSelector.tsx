import { useEffect, useState } from "react";
import { GithubApi, Repository } from "../../api/github/GithubApi";
import "./RepoSelector.css";

import { useGithub } from "../../context/GithubContext/GithubContext";
import { generateWorkflowTemplate } from "../../utility/workflowTemplate";
import FileUploadApi from "../../api/FileUpload/FileUploadApi";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { ToasterData } from "../Toast/Toaster";
import { getCanisterUrl } from "../../config/config";

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

interface RepoState {
  branches: Branch[];
  selectedBranch: string;
  packageLocations: PackageLocation[];
  selectedPath: string;
}

interface RepoSelectorProps {
  canisterId: string | null;
  setShowToaster: (show: boolean) => void;
  setToasterData: (data: ToasterData) => void;
}

const RepoSelector: React.FC<RepoSelectorProps> = ({
  canisterId,
  setShowToaster,
  setToasterData,
}) => {
  /** Hooks */
  const { getGithubToken } = useGithub();
  const { identity } = useIdentity();

  /** State */
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployStatus, setDeployStatus] = useState<
    "idle" | "deploying" | "deployed" | "failed"
  >("idle");
  const [repoStates, setRepoStates] = useState<Record<string, RepoState>>({});
  const github = GithubApi.getInstance();

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
          ...prev[repo],
          branches: response,
          selectedBranch: "",
          selectedPath: "",
          packageLocations: [],
        },
      }));
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

      setRepoStates((prev) => ({
        ...prev,
        [repo]: {
          ...prev[repo],
          packageLocations: locations,
          selectedPath: locations.length === 1 ? locations[0].path : "",
        },
      }));
    } catch (error) {
      console.error("Failed to find package.json locations:", error);
      setRepoStates((prev) => ({
        ...prev,
        [repo]: {
          ...prev[repo],
          packageLocations: [{ path: ".", hasPackageJson: false }],
        },
      }));
    }
  };

  const handleDeploy = async (repo: string) => {
    try {
      if (!canisterId) {
        throw new Error("Please select a canister");
      }
      if (!repoStates[repo].selectedPath) {
        throw new Error("Please select a source path");
      }

      console.log(
        `Deploying ${repo} from path: ${repoStates[repo].selectedPath}`
      );
      setShowToaster(true);
      setToasterData({
        headerContent: "Deploying",
        toastStatus: true,
        toastData: `Deploying ${repo}`,
        textColor: "green",
        timeout: 2000,
      });
      setDeployStatus("deploying");

      // Generate workflow with selected path
      const workflowContent = generateWorkflowTemplate(
        repoStates[repo].selectedPath,
        repoStates[repo].selectedBranch
      );

      setShowToaster(true);
      setToasterData({
        headerContent: "Creating workflow",
        toastStatus: true,
        toastData: `Creating workflow for ${repo}`,
        textColor: "green",
        timeout: 2000,
      });

      // 1. Create/update workflow
      await github.createWorkflow(
        repo,
        workflowContent,
        repoStates[repo].selectedBranch
      );

      // Add delay to ensure workflow is committed
      console.log("Waiting for workflow to be committed...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setShowToaster(true);
      setToasterData({
        headerContent: "Triggering workflow",
        toastStatus: true,
        toastData: `Triggering workflow for ${repo}`,
        textColor: "green",
        timeout: 3000,
      });

      // 2. Trigger workflow
      await github.triggerWorkflow(repo, repoStates[repo].selectedBranch);

      // 3. Wait for artifact
      const artifact = await github.pollForArtifact(
        repo,
        repoStates[repo].selectedBranch
      );

      console.log("Artifact found:", artifact);
      console.log(`Downloading artifact.`);
      setShowToaster(true);
      setToasterData({
        headerContent: "Downloading artifact",
        toastStatus: true,
        toastData: `Downloading artifact for ${repo}`,
        textColor: "green",
        timeout: 3000,
      });
      // 4. Download artifact
      const zipBlob = await github.downloadArtifact(
        artifact.archive_download_url
      );

      console.log(`Downloaded artifact.`, zipBlob);
      const zipFile = new File([zipBlob], "build.zip", {
        type: "application/zip",
      });

      console.log(`Zip file ${zipFile.name} with size: ${zipFile.size}`);
      // 5. Use existing FileUploader
      setShowToaster(true);
      setToasterData({
        headerContent: "Uploading build files to canister",
        toastStatus: true,
        toastData: `Uploading build files to canister`,
        textColor: "green",
        timeout: 3000,
      });

      const fileUploadApi = new FileUploadApi();
      const result = await fileUploadApi.uploadFromZip(
        zipFile,
        canisterId,
        identity
      );
      console.log(`Upload result: `, result);
      if (!result.status) {
        throw new Error(result.message);
      }
      setShowToaster(true);
      setToasterData({
        headerContent: `Deployment complete. Visit page ${getCanisterUrl(
          canisterId
        )}`,
        toastStatus: true,
        toastData: `Deployed ${repo}`,
        textColor: "green",
        timeout: 10000,
      });
    } catch (error) {
      console.error("Deploy failed:", error);
      setDeployStatus("failed");
    }
  };

  return (
    <div className="repo-selector">
      <div className="repo-header">
        <h2>Select Repository</h2>
        <p>Choose a repository to deploy to Internet Computer</p>
      </div>

      <div className="repo-grid">
        {repos.map((repo) => {
          const repoState = repoStates[repo.full_name] || {
            branches: [],
            selectedBranch: "",
            packageLocations: [],
            selectedPath: "",
          };

          return (
            <div key={repo.id} className="repo-card">
              <div className="repo-name">{repo.name}</div>
              <div className="repo-info">
                <span>{repo.full_name}</span>
                <span className="repo-visibility">{repo.visibility}</span>
              </div>
              {deployStatus === "idle" && (
                <>
                  <div className="branch-selector">
                    <label>Branch:</label>
                    <select
                      value={repoState.selectedBranch}
                      onChange={(e) => {
                        const newBranch = e.target.value;
                        setRepoStates((prev) => ({
                          ...prev,
                          [repo.full_name]: {
                            ...prev[repo.full_name],
                            selectedBranch: newBranch,
                          },
                        }));
                        if (newBranch) {
                          findPackageJsonLocations(repo.full_name, newBranch);
                        }
                      }}
                      onClick={() =>
                        !repoState.branches.length &&
                        loadBranches(repo.full_name)
                      }
                    >
                      <option value="">Select branch</option>
                      {repoState.branches.map((branch) => (
                        <option key={branch.name} value={branch.name}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {repoState.selectedBranch && (
                    <div className="path-selector">
                      <label>Source Path:</label>
                      <select
                        value={repoState.selectedPath}
                        onChange={(e) => {
                          console.log(`selected path:`, e.target.value);
                          setRepoStates((prev) => ({
                            ...prev,
                            [repo.full_name]: {
                              ...prev[repo.full_name],
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
                </>
              )}
              <div className="repo-actions">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
                <button
                  className="deploy-button"
                  onClick={() => handleDeploy(repo.full_name)}
                  disabled={
                    deployStatus === "deploying" ||
                    !repoState.selectedBranch ||
                    !repoState.selectedPath
                  }
                >
                  {deployStatus === "deploying" ? (
                    <div className="loading-indicator">
                      <div className="spinner" />
                      Deploying...
                    </div>
                  ) : (
                    "Deploy"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RepoSelector;
