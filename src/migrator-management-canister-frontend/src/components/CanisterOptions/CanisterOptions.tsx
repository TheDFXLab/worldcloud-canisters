import { Modal, Button, Badge } from "react-bootstrap";
import FileUploader from "../FileUploader/FileUploader";
import "./CanisterOptions.css";
import { Deployment } from "../AppLayout/interfaces";

function CanisterOptions({
  setCanisterId,
  deployment,
  show,
  onHide,
}: {
  setCanisterId: (id: string) => void;
  deployment: Deployment;
  show: boolean;
  onHide: () => void;
}) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Modal centered show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Canister Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="canister-details">
          <div className="detail-row">
            <span className="label">Canister ID:</span>
            <span className="value">
              {deployment.canister_id.toText()}
              <Button
                variant="link"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(deployment.canister_id.toText())
                }
              >
                📋
              </Button>
            </span>
          </div>

          <div className="detail-row">
            <span className="label">Status:</span>
            <span className="value">
              <Badge
                bg={
                  deployment.status === "installed"
                    ? "success"
                    : deployment.status === "installing"
                    ? "warning"
                    : "secondary"
                }
              >
                {deployment.status}
              </Badge>
            </span>
          </div>

          <div className="detail-row">
            <span className="label">Created:</span>
            <span className="value">
              {new Date(
                Number(deployment.date_created) / 1000000
              ).toLocaleString()}
            </span>
          </div>

          <div className="detail-row">
            <span className="label">Size:</span>
            <span className="value">
              {formatBytes(Number(deployment.size))}
            </span>
          </div>

          {deployment.status === "installed" && (
            <div className="detail-row">
              <span className="label">Website URL:</span>
              <span className="value">
                <a
                  href={
                    process.env.REACT_APP_ENVIRONMENT === "production"
                      ? `https://${deployment.canister_id.toText()}.icp0.io`
                      : `http://${deployment.canister_id.toText()}.localhost:4943`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {process.env.REACT_APP_ENVIRONMENT === "production"
                    ? `https://${deployment.canister_id.toText()}.icp0.io`
                    : `http://${deployment.canister_id.toText()}.localhost:4943`}
                  <span className="external-link">↗</span>
                </a>
              </span>
            </div>
          )}
        </div>

        {deployment.status === "uninitialized" && (
          <div className="upload-section mt-4">
            <span className="label">Pending Actions:</span>
            <FileUploader
              canisterId={deployment.canister_id.toText()}
              setCanisterId={setCanisterId}
            />
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

export default CanisterOptions;
