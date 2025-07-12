import { Tooltip } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { getCanisterUrl } from "../../../config/config";
import { formatDate } from "../../../utility/formatter";
import { bigIntToDate } from "../../../utility/bigint";
import { formatBytes } from "../../../utility/formatter";

interface CanisterInfoCardProps {
  canisterInfo: any;
  canisterId: string;
  canisterStatus: any;
}

export const CanisterInfoCard: React.FC<CanisterInfoCardProps> = ({
  canisterInfo,
  canisterId,
  canisterStatus,
}) => {
  return (
    <div className="detail-card">
      <h3>Canister Information</h3>
      <div className="canister-stats-container">
        <div className="stat-item">
          <div className="stat-label">
            Canister ID
            <Tooltip
              title="Unique identifier for this canister"
              arrow
              placement="top"
            >
              <InfoIcon className="info-icon" />
            </Tooltip>
          </div>
          <div className="stat-value with-copy">
            <a
              href={getCanisterUrl(canisterId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {canisterId}
            </a>
            <button
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(canisterId)}
              title="Copy to clipboard"
            >
              <ContentCopyIcon />
            </button>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">
            Status
            <Tooltip
              title="Current operational status of the canister"
              arrow
              placement="top"
            >
              <InfoIcon className="info-icon" />
            </Tooltip>
          </div>
          {canisterInfo?.status && (
            <span className={`status-badge ${canisterStatus?.status}`}>
              {canisterInfo?.status}
            </span>
          )}
        </div>

        <div className="stat-item">
          <div className="stat-label">
            Total Size
            <Tooltip
              title="Total storage space used by the canister"
              arrow
              placement="top"
            >
              <InfoIcon className="info-icon" />
            </Tooltip>
          </div>
          <div className="stat-value">
            {canisterInfo?.size
              ? formatBytes(Number(canisterInfo.size))
              : "N/A"}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">
            Created On
            <Tooltip
              title="Date when this canister was created"
              arrow
              placement="top"
            >
              <InfoIcon className="info-icon" />
            </Tooltip>
          </div>
          <div className="stat-value">
            {canisterInfo?.date_created
              ? formatDate(bigIntToDate(canisterInfo.date_created))
              : "N/A"}
          </div>
        </div>
      </div>
    </div>
  );
};
