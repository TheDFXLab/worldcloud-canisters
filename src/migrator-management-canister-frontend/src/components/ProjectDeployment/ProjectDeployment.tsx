import React, { useState } from "react";
import { Card } from "react-bootstrap";
import { FaGithub, FaFileArchive } from "react-icons/fa";

import FileUploader from "../FileUploader/FileUploader";
import "./ProjectDeployment.css";
import RepoSelector from "../RepoSelector/RepoSelector";

interface ProjectDeploymentProps {
  canisterId: string;
  setCanisterId: (id: string) => void;
  setToasterData: (data: any) => void;
  setShowToaster: (show: boolean) => void;
}

const ProjectDeployment: React.FC<ProjectDeploymentProps> = ({
  canisterId,
  setCanisterId,
  setToasterData,
  setShowToaster,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<
    "github" | "upload" | null
  >(null);

  return (
    <div className="project-deployment">
      {!selectedMethod ? (
        <>
          <div className="deployment-header">
            <h2>Choose Deployment Method</h2>
            <p>
              Select how you want to deploy your project to Internet Computer
            </p>
          </div>

          <div className="deployment-methods">
            <Card
              className="method-card"
              onClick={() => setSelectedMethod("github")}
            >
              <Card.Body>
                <div className="method-icon">
                  <FaGithub size={48} />
                </div>
                <Card.Title>Deploy from GitHub</Card.Title>
                <Card.Text>
                  Connect your GitHub repository and deploy directly from your
                  source code.
                </Card.Text>
              </Card.Body>
            </Card>

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
          <button
            className="back-button"
            onClick={() => setSelectedMethod(null)}
          >
            ← Back to methods
          </button>

          {selectedMethod === "github" ? (
            <RepoSelector
              canisterId={canisterId}
              setShowToaster={setShowToaster}
              setToasterData={setToasterData}
            />
          ) : (
            <FileUploader
              canisterId={canisterId}
              setCanisterId={setCanisterId}
              setToasterData={setToasterData}
              setShowToaster={setShowToaster}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectDeployment;
