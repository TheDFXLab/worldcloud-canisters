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

interface ProjectDeploymentProps {}

const ProjectDeployment: React.FC<ProjectDeploymentProps> = ({}) => {
  /** Hooks */
  const { actionBar, setActionBar } = useActionBar();
  const { canisterId, projectId } = useParams();
  const { toasterData, setToasterData, setShowToaster } = useToaster();
  const navigate = useNavigate();
  const { isDispatched, setIsDispatched } = useDeployments();
  const { isGithubConnected } = useGithub();
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
    // Redirect to new page if no canister ID provided
    if (!canisterId || !projectId) {
      navigate("/dashboard/projects");
    }
  }, [canisterId, projectId, navigate]);

  useEffect(() => {
    if (!selectedMethod) {
      setHeaderCard({
        description: "Choose Deployment Method",
        title:
          "Select how you want to deploy your project to Internet Computer",
        className: "deployment-header",
      });
    }
  }, []);

  if (!canisterId || !projectId) {
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
          {/* <HeaderCard
            title={"Choose Deployment Method"}
            description="Select how you want to deploy your project to Internet Computer"
            className="deployment-header"
          /> */}

          <div className="deployment-methods">
            <Tooltip
              title={
                isGithubConnected
                  ? ""
                  : "Connect Github account to use this feature"
              }
            >
              <div>
                <Card
                  className={`method-card ${
                    !isGithubConnected ? "disabled" : ""
                  }`}
                  onClick={() => setSelectedMethod("github")}
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
              </div>
            </Tooltip>
            <Card
              className="method-card"
              onClick={() => setSelectedMethod("upload")}
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
            <RepoSelector />
          ) : (
            <FileUploader project_id={BigInt(projectId)} />
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectDeployment;

/*

*/
