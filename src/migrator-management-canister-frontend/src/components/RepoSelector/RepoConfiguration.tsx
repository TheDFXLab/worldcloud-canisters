import React from "react";
import DeploymentProgress from "../DeploymentProgress/DeploymentProgress";
import InfoIcon from "@mui/icons-material/Info";
import { Tooltip } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import FolderIcon from "@mui/icons-material/Folder";
import CodeIcon from "@mui/icons-material/Code";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import BuildIcon from "@mui/icons-material/Build";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import "./RepoConfiguration.css";

interface Branch {
  name: string;
}

interface PackageLocation {
  path: string;
  hasPackageJson: boolean;
}

interface RepoConfigurationProps {
  repoState: any;
  state: any;
  setRepoStates: (updater: (prev: any) => any) => void;
  loadBranches: (repoName: string) => void;
  findPackageJsonLocations: (repoName: string, branch: string) => void;
}

const RepoConfiguration: React.FC<RepoConfigurationProps> = ({
  repoState,
  state,
  setRepoStates,
  loadBranches,
  findPackageJsonLocations,
}) => {
  return (
    <div className="repo-configuration-container">
      {/* Header Section */}
      <div className="config-header">
        <div className="header-content">
          <h2>Configure Deployment</h2>
          <p>Set up your deployment settings for {state.selectedRepo?.name}</p>
        </div>
        <div className="header-icon">
          <GitHubIcon />
        </div>
      </div>

      <div className="config-layout">
        {/* Main Configuration Section */}
        <div className="config-main-section">
          <div className="config-card">
            <div className="card-header">
              <h3>Source Configuration</h3>
              <p>Configure your source code settings</p>
            </div>

            <div className="config-content">
              <div className="config-field">
                <div className="field-header">
                  <label>Branch</label>
                  <Tooltip
                    title="Select the Git branch that contains the code you want to deploy. The main branch is typically used for production deployments."
                    arrow
                  >
                    <InfoIcon className="info-icon" />
                  </Tooltip>
                </div>
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
                  className="config-select"
                >
                  <option value="">Select branch</option>
                  {repoState?.branches.map((branch: Branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <div className="field-hint">
                  <LightbulbIcon className="hint-icon" />
                  <span>Choose the branch containing your latest code</span>
                </div>
              </div>

              {repoState?.selectedBranch && (
                <div className="config-field">
                  <div className="field-header">
                    <label>Source Path</label>
                    <Tooltip
                      title="Select the directory containing your project files. We automatically detect package.json files to identify valid project locations."
                      arrow
                    >
                      <InfoIcon className="info-icon" />
                    </Tooltip>
                  </div>
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
                    className="config-select"
                  >
                    <option value="">Select source path</option>
                    {repoState.packageLocations.map((loc: PackageLocation) => (
                      <option key={loc.path} value={loc.path}>
                        {loc.path}{" "}
                        {loc.hasPackageJson ? "(package.json found)" : ""}
                      </option>
                    ))}
                  </select>
                  <div className="field-hint">
                    <FolderIcon className="hint-icon" />
                    <span>
                      Select the directory containing your project files
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deployment Progress Section */}
          {repoState?.currentStep && (
            <div className="config-card">
              <div className="card-header">
                <h3>Deployment Progress</h3>
                <p>Track your deployment status</p>
              </div>
              <div className="progress-container">
                <DeploymentProgress
                  steps={repoState.deploymentSteps}
                  currentStep={repoState.currentStep}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar with Tips and Information */}
        <div className="config-sidebar">
          <div className="info-card">
            <div className="info-card-header">
              <h4>
                <LightbulbIcon className="header-icon-small" />
                Quick Tips
              </h4>
            </div>
            <div className="info-content">
              <div className="tip-item">
                <div className="tip-icon">
                  <CodeIcon />
                </div>
                <div className="tip-content">
                  <h5>Branch Selection</h5>
                  <p>
                    Choose the branch that contains your latest changes. The
                    main branch is recommended for production deployments.
                  </p>
                </div>
              </div>

              <div className="tip-item">
                <div className="tip-icon">
                  <AutoAwesomeIcon />
                </div>
                <div className="tip-content">
                  <h5>Auto-Detection</h5>
                  <p>
                    We automatically scan for package.json files to identify
                    valid project locations in your repository.
                  </p>
                </div>
              </div>

              <div className="tip-item">
                <div className="tip-icon">
                  <FlashOnIcon />
                </div>
                <div className="tip-content">
                  <h5>Fast Deployment</h5>
                  <p>
                    Your code will be automatically built and deployed to the
                    Internet Computer using GitHub Actions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="info-card">
            <div className="info-card-header">
              <h4>
                <BuildIcon className="header-icon-small" />
                What Happens Next
              </h4>
            </div>
            <div className="info-content">
              <div className="process-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h5>Workflow Creation</h5>
                  <p>
                    We'll create a GitHub Actions workflow file in your
                    repository
                  </p>
                </div>
              </div>

              <div className="process-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h5>Build Process</h5>
                  <p>Your code will be built and optimized for deployment</p>
                </div>
              </div>

              <div className="process-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h5>Deployment</h5>
                  <p>Your app will be deployed to the Internet Computer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepoConfiguration;
