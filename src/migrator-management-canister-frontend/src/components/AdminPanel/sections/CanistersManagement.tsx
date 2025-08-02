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
} from "@mui/icons-material";
import "./CanistersManagement.css";
import { formatBytes } from "../../../utility/formatter";

const CanistersManagement: React.FC = () => {
  const {
    deployedCanisters,
    isLoadingCanisters,
    canisterDeployments,
    isLoadingCanisterDeployments,
    refreshCanisterDeploymentsAll,
    refreshDeployedCanisters,
  } = useAdminLogic();
  const { setShowModal, call } = useConfirmationModal();
  const { setToasterData, setShowToaster } = useToaster();
  const [selectedCanister, setSelectedCanister] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationPayload>({
    limit: 20,
    page: 0,
  });

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
