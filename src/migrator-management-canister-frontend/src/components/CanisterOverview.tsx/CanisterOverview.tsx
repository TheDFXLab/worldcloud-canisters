import { Button } from "react-bootstrap";
import "./CanisterOverview.css";
import { Deployment } from "../AppLayout/interfaces";
import { getCanisterUrl } from "../../config/config";

interface CanisterOverviewProps {
  deployment: Deployment | null;
  canisterId: string;
  onCloseModal: () => void;
  setCanisterId: (id: string) => void;
}

export const CanisterOverview = ({
  deployment,
  canisterId,
  onCloseModal,
  setCanisterId,
}: CanisterOverviewProps) => {
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
      <div className="canister-details">
        <div className="detail-row">
          <span className="label">Canister ID:</span>
          <span className="value">
            <span className="value">
              <a
                href={getCanisterUrl(canisterId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {canisterId}
              </a>
            </span>

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
          <span className="value">{formatBytes(deployment?.size || 0)}</span>
        </div>

        <div className="detail-row">
          <span className="label">Deployed On:</span>
          <span className="value">
            {deployment?.date_created
              ? formatDate(new Date(deployment.date_created / 1000000))
              : "N/A"}
          </span>
        </div>

        <div className="detail-row">
          <span className="label">Website URL:</span>
          <span className="value">
            <a
              href={getCanisterUrl(canisterId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {getCanisterUrl(canisterId)}

              <span className="external-link">↗</span>
            </a>
          </span>
        </div>
      </div>
    </div>
  );
};
