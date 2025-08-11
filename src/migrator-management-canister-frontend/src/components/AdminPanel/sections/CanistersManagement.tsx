import React, { useState, useEffect } from "react";
import { useAdminLogic } from "../../../hooks/useAdminLogic";
import { useConfirmationModal } from "../../../context/ConfirmationModalContext/ConfirmationModalContext";
import { useToaster } from "../../../context/ToasterContext/ToasterContext";
import { PaginationPayload } from "../../../serialization/admin";
import {
  Storage,
  CheckCircle,
  Warning,
  Delete,
  Refresh,
  Visibility,
  Language,
} from "@mui/icons-material";
import "./CanistersManagement.css";
import { formatBytes } from "../../../utility/formatter";
import { StaticFile } from "../../../utility/compression";

const CanistersManagement: React.FC = () => {
  const {
    deployedCanisters,
    isLoadingCanisters,
    canisterDeployments,
    isLoadingCanisterDeployments,
    refreshCanisterDeploymentsAll,
    refreshDeployedCanisters,
    handleSetIcDomains,
    isLoadingEditIcDomains,
  } = useAdminLogic();
  const { setShowModal, call } = useConfirmationModal();
  const { setToasterData, setShowToaster } = useToaster();
  const [selectedCanister, setSelectedCanister] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationPayload>({
    limit: 20,
    page: 0,
  });
  const [icDomainsMessage, setIcDomainsMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    refreshCanisterDeploymentsAll(pagination);
    refreshDeployedCanisters();
  }, [pagination, refreshCanisterDeploymentsAll, refreshDeployedCanisters]);

  // Calculate real data from canisterDeployments
  const totalCanisters = canisterDeployments.length;
  const activeCanisters = canisterDeployments.filter(
    ([, deployment]) =>
      deployment.status === "installing" || deployment.status === "installed"
  ).length;
  const inactiveCanisters = totalCanisters - activeCanisters;
  const totalSize = canisterDeployments.reduce(
    (sum, [, deployment]) => sum + deployment.size,
    0
  );

  const handleDeleteCanister = async (canisterId: string) => {
    call("default");
    setShowModal(true);
    // TODO: Implement confirmation modal for delete canister
  };

  const handleRefreshCanister = async (canisterId: string) => {
    try {
      // TODO: Implement refresh canister logic
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Canister ${canisterId} refreshed successfully`,
        textColor: "green",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error) {
      console.error("Failed to refresh canister:", error);
    }
  };

  const handleViewCanister = (canisterId: string) => {
    setSelectedCanister(canisterId);
    // TODO: Implement canister details view
  };

  const handleIcDomainsUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    canisterId: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIcDomainsMessage(null);

      // Convert file to StaticFile format
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Determine content type - prefer file type, fallback to text/plain for files without extensions
      let contentType = file.type;
      if (!contentType || contentType === "application/octet-stream") {
        // If no type or generic binary type, check file extension or default to text/plain
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith(".json") || fileName.endsWith(".json5")) {
          contentType = "application/json";
        } else if (fileName.endsWith(".txt")) {
          contentType = "application/octet-stream";
        } else {
          contentType = "application/octet-stream"; // Default for files without extension
        }
      }

      const staticFile: StaticFile = {
        path: "/.well-known/ic-domains",
        content_type: contentType,
        content_encoding: [],
        content: uint8Array,
        is_chunked: false,
        chunk_id: 0n,
        batch_id: 0n,
        is_last_chunk: true,
      };
      debugger;
      const result = await handleSetIcDomains(canisterId, staticFile);

      if (result.status) {
        setIcDomainsMessage({ type: "success", text: result.message });
        // Clear the file input
        event.target.value = "";

        // Show success toast
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: `IC domains set successfully for canister ${canisterId}`,
          textColor: "green",
          timeout: 3000,
        });
        setShowToaster(true);
      } else {
        setIcDomainsMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      console.error("Failed to set IC domains:", error);
      setIcDomainsMessage({
        type: "error",
        text: "Failed to set IC domains. Please try again.",
      });
    }
  };

  const clearIcDomainsMessage = () => {
    setIcDomainsMessage(null);
  };

  const IcDomainsSection = () => (
    <div className="admin-ic-domains-section">
      <div className="admin-action-card">
        <h3>
          <Language /> IC Domains Management
        </h3>
        <p>Upload IC domain configuration files for canisters</p>

        {icDomainsMessage && (
          <div
            className={`admin-alert admin-alert-${
              icDomainsMessage.type === "success" ? "success" : "danger"
            }`}
          >
            {icDomainsMessage.text}
            <button
              type="button"
              className="admin-alert-close"
              onClick={clearIcDomainsMessage}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}

        <div className="ic-domains-upload-area">
          <h4>Upload IC Domains File</h4>
          <p>
            Select a canister and upload a file containing IC domain
            configurations
          </p>

          <div className="ic-domains-file-input">
            <input
              type="file"
              id="ic-domains-file"
              onChange={(e) => {
                const canisterId = prompt(
                  "Enter the canister ID for IC domains:"
                );
                if (canisterId) {
                  handleIcDomainsUpload(e, canisterId);
                }
              }}
              disabled={isLoadingEditIcDomains}
            />
            <label
              htmlFor="ic-domains-file"
              className="ic-domains-upload-label"
            >
              <button className="primary" disabled={isLoadingEditIcDomains}>
                {isLoadingEditIcDomains ? "Uploading..." : "Choose File"}
              </button>
            </label>
          </div>

          <div className="ic-domains-info">
            <h5>Supported File Formats:</h5>
            <ul>
              <li>
                <strong>Text file (.txt):</strong> One domain per line
              </li>
              <li>
                <strong>JSON file (.json):</strong> Array of domain strings
              </li>
              <li>
                <strong>JSON5 file (.json5):</strong> Array of domain strings
              </li>
              <li>
                <strong>Files without extension:</strong> Treated as text files
              </li>
            </ul>

            <h5>Example Content:</h5>
            <pre className="ic-domains-example">
              {`# Text file example:
canister1.worldcloud.app
canister2.worldcloud.app

# JSON file example:
["canister1.worldcloud.app", "canister2.worldcloud.app"]`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-canisters-management">
      {/* Summary Cards */}
      <div className="admin-summary-cards">
        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <Storage />
          </div>
          <div className="admin-card-content">
            <h3>Total Canisters</h3>
            <p className="admin-card-value">{totalCanisters}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <CheckCircle />
          </div>
          <div className="admin-card-content">
            <h3>Active Canisters</h3>
            <p className="admin-card-value">{activeCanisters}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <Warning />
          </div>
          <div className="admin-card-content">
            <h3>Inactive Canisters</h3>
            <p className="admin-card-value">{inactiveCanisters}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <Storage />
          </div>
          <div className="admin-card-content">
            <h3>Total Size</h3>
            <p className="admin-card-value">{formatBytes(totalSize)} MB</p>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="admin-actions-section">
        <div className="admin-action-card">
          <h3>Canister Operations</h3>
          <p>Manage deployed canisters and their operations</p>
          <div className="admin-action-buttons">
            <button onClick={() => {}} className="primary">
              <Refresh /> Refresh All Canisters
            </button>
            <button onClick={() => {}} className="warning">
              <Storage /> Update Canister Status
            </button>
            <button onClick={() => {}} className="danger">
              <Delete /> Cleanup Inactive Canisters
            </button>
          </div>
        </div>

        <div className="admin-action-card">
          <h3>Bulk Operations</h3>
          <p>Perform operations on multiple canisters</p>
          <div className="admin-action-buttons">
            <button onClick={() => {}} className="primary">
              <Visibility /> View All Details
            </button>
            <button onClick={() => {}} className="warning">
              <Refresh /> Batch Refresh
            </button>
            <button onClick={() => {}} className="danger">
              <Delete /> Batch Delete
            </button>
          </div>
        </div>
      </div>

      {/* IC Domains Section */}
      <IcDomainsSection />

      {/* Canisters Table */}
      <div className="admin-table-section">
        <h3>Deployed Canisters</h3>
        {isLoadingCanisterDeployments ? (
          <div className="admin-loading">Loading canisters...</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Canister ID</th>
                  <th>Status</th>
                  <th>Size (MB)</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {canisterDeployments.map(([principal, deployment]) => (
                  <tr key={principal}>
                    <td>
                      <span className="admin-canister-id">
                        {principal.substring(0, 8)}...
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-status-badge ${
                          deployment.status === "installing" ||
                          deployment.status === "installed"
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {deployment.status}
                      </span>
                    </td>
                    <td>{formatBytes(deployment.size)}</td>
                    <td>
                      {new Date(deployment.date_created).toLocaleDateString()}
                    </td>
                    <td>
                      {new Date(deployment.date_updated).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="admin-action-buttons-row">
                        <button
                          className="admin-action-btn primary"
                          onClick={() => handleViewCanister(principal)}
                          title="View Details"
                        >
                          <Visibility />
                        </button>
                        <button
                          className="admin-action-btn warning"
                          onClick={() => handleRefreshCanister(principal)}
                          title="Refresh"
                        >
                          <Refresh />
                        </button>
                        <button
                          className="admin-action-btn danger"
                          onClick={() => handleDeleteCanister(principal)}
                          title="Delete"
                        >
                          <Delete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanistersManagement;
