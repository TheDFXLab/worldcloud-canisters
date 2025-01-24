import React from "react";
import { CanisterAsset } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { formatFileSize, getTypeBadgeColor } from "../../utility/formatter";
import "./DirectoryView.css";
import FileCard from "./FileCard/FileCard";
import { Identity } from "@dfinity/agent";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
interface DirectoryViewProps {
  assets: CanisterAsset[];
  canisterId: string;
  identity: Identity | null;
  onDownload: (path: string) => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  assets,
  canisterId,
  identity,
  onDownload,
}) => {
  return (
    <div className="directory-view">
      <div className="files-grid">
        {assets.map((asset) => (
          <div key={asset.key} className="file-card">
            <div className="file-icon">
              {asset.content_type.startsWith("image/") ? (
                <FileCard
                  asset={asset}
                  canisterId={canisterId}
                  identity={identity}
                />
              ) : (
                // <img
                //   src={`data:${asset.content_type};base64,${btoa(
                //     String.fromCharCode(...asset.encodings[0].content_encoding)
                //   )}`}
                //   alt={asset.key}
                //   className="file-preview"
                // />
                // <i
                //   className={`file-type-icon ${
                //     asset.content_type.split("/")[0]
                //   }`}
                // />
                <InsertDriveFileIcon fontSize="large" />
              )}
            </div>
            <div className="file-info">
              <div className="file-name">{asset.key.split("/").pop()}</div>
              <div className="file-meta">
                <span
                  className={`file-type ${getTypeBadgeColor(
                    asset.content_type
                  )}`}
                >
                  {asset.content_type.split("/")[1].toUpperCase()}
                </span>
                <span className="file-size">
                  {formatFileSize(Number(asset.encodings[0]?.length || 0))}
                </span>
              </div>
            </div>
            <button
              className="download-button"
              onClick={() => onDownload(asset.key)}
              title="Download file"
            >
              ↓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
