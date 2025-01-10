import { Button } from "react-bootstrap";
import "./CompleteDeployment.css";

interface CompleteDeploymentProps {
  canisterId: string;
  totalSize: number;
  dateCreated: Date;
  onCloseModal: () => void;
  setCanisterId: (id: string) => void;
}

function CompleteDeployment({
  canisterId,
  totalSize,
  dateCreated,
  onCloseModal,
  setCanisterId,
}: CompleteDeploymentProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="final-step">
      <div className="success-header">
        <div className="success-icon">✓</div>
        <h2>Website Deployed</h2>
      </div>

      <div className="canister-details">
        <div className="detail-row">
          <span className="label">Canister ID:</span>
          <span className="value">
            <code>{canisterId}</code>
            <button
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(canisterId)}
              title="Copy to clipboard"
            >
              📋
            </button>
          </span>
        </div>

        <div className="detail-row">
          <span className="label">Total Size:</span>
          <span className="value">{formatBytes(totalSize)}</span>
        </div>

        <div className="detail-row">
          <span className="label">Deployed On:</span>
          <span className="value">{formatDate(dateCreated)}</span>
        </div>

        <div className="detail-row">
          <span className="label">Website URL:</span>
          <span className="value">
            <a
              href={
                process.env.REACT_APP_ENVIRONMENT === "production"
                  ? `https://${canisterId}.icp0.io`
                  : `http://${canisterId}.localhost:4943`
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {process.env.REACT_APP_ENVIRONMENT === "production"
                ? `https://${canisterId}.icp0.io`
                : `http://${canisterId}.localhost:4943`}

              <span className="external-link">↗</span>
            </a>
          </span>
        </div>
      </div>
      <div className="bottom-actions">
        <Button variant="secondary" onClick={onCloseModal}>
          Close
        </Button>
      </div>
    </div>
  );
}

export default CompleteDeployment;
