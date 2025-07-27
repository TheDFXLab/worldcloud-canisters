import React, { useEffect, useState } from "react";
import { Card } from "react-bootstrap";
import { Tooltip } from "@mui/material";
import { FaGithub, FaFileArchive } from "react-icons/fa";

import FileUploader from "../FileUploader/FileUploader";
import "./ProjectDeployment.css";
import RepoSelector from "../RepoSelector/RepoSelector";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useNavigate, useParams } from "react-router-dom";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import HeaderCard from "../HeaderCard/HeaderCard";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { useGithub } from "../../context/GithubContext/GithubContext";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";
import { GithubApi } from "../../api/github/GithubApi";

interface ProjectDeploymentProps {
  onMethodSelected?: () => void;
  projectData?: any;
}

const ProjectDeployment: React.FC<ProjectDeploymentProps> = ({
  onMethodSelected,
  projectData,
}) => {
  /** Hooks */
  const { actionBar, setActionBar } = useActionBar();
  const { canisterId, projectId } = useParams();
  const { toasterData, setToasterData, setShowToaster } = useToaster();
  const navigate = useNavigate();
  const { isDispatched, setIsDispatched } = useDeployments();
  const { isGithubConnected, handleGithubConnect } = useGithub();
  const { setHeaderCard } = useHeaderCard();

  /** State */
  const [selectedMethod, setSelectedMethod] = useState<
    "github" | "upload" | null
  >(null);

  useEffect(() => {
    setActionBar((prev: any) => ({
      ...prev,
      isHidden: true,
    }));
  }, []);

  useEffect(() => {
    // Only check for canisterId if we're not in the new flow
    if (!onMethodSelected && (!canisterId || !projectId)) {
      navigate("/dashboard/projects");
    }
  }, [canisterId, projectId, navigate, onMethodSelected]);

  useEffect(() => {
    if (!selectedMethod) {
      setHeaderCard({
        description: "Choose Deployment Method",
        title: "Code Deployment",
        // className: "deployment-header",
      });
    }
  }, []);

  const handleMethodSelect = (method: "github" | "upload") => {
    setSelectedMethod(method);
    if (onMethodSelected && method === "github") {
      onMethodSelected();
    }
  };

  const handleGithubConnectFlow = async () => {
    await handleGithubConnect();
  };

  if (!onMethodSelected && (!canisterId || !projectId)) {
    return (
      <div className="project-deployment-container">
        <div className="deployment-header">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="project-deployment">
      {!selectedMethod ? (
        <>
          <div className="deployment-methods">
            <Tooltip
              title={
                isGithubConnected
                  ? "Use this feature to automatically build and deploy your web application. World Cloud bootstraps your repo with an auto-generated Actions workflow configuration file."
                  : "Connect Github account to use this feature. -- Use this feature to automatically build and deploy your web application. World Cloud bootstraps your repo with an auto-generated Actions workflow configuration file."
              }
            >
              <div className="method-card-wrapper">
                <Card
                  className={`method-card ${
                    !isGithubConnected ? "disabled" : ""
                  }`}
                  onClick={() => handleMethodSelect("github")}
                >
                  <Card.Body>
                    <div className="method-icon">
                      <FaGithub size={48} />
                    </div>
                    <Card.Title>Deploy from GitHub</Card.Title>
                    <Card.Text>
                      Link your GitHub repository and deploy directly from your
                      source code.
                    </Card.Text>
                  </Card.Body>
                </Card>
                {!isGithubConnected && (
                  <div className="github-connect-info">
                    <p>
                      GitHub connection required.{" "}
                      <button
                        className="connect-github-link"
                        onClick={handleGithubConnectFlow}
                      >
                        Connect GitHub account
                      </button>{" "}
                      to enable this deployment method and then refresh this
                      page.
                    </p>
                  </div>
                )}
              </div>
            </Tooltip>
            <Tooltip
              title={
                "Upload a zip file containing your static files to your web application. This will upload the files to the project's assets and serve your web application."
              }
            >
              <div className="method-card-wrapper">
                <Card
                  className="method-card"
                  onClick={() => handleMethodSelect("upload")}
                >
                  <Card.Body>
                    <div className="method-icon">
                      <FaFileArchive size={48} />
                    </div>
                    <Card.Title>Upload Build Files</Card.Title>
                    <Card.Text>
                      Upload a ZIP file containing your built static files.
                    </Card.Text>
                  </Card.Body>
                </Card>
              </div>
            </Tooltip>
          </div>
        </>
      ) : (
        <div className="deployment-content">
          {isDispatched ? (
            <div></div>
          ) : (
            <button
              className="back-button"
              onClick={() => {
                setSelectedMethod(null);
                setActionBar(undefined);
              }}
            >
              ← Back to methods
            </button>
          )}

          {selectedMethod === "github" ? (
            <RepoSelector projectId={projectId} canisterId={canisterId} />
          ) : (
            <FileUploader
              project_id={BigInt(projectId || projectData?.newProject?.id)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectDeployment;
