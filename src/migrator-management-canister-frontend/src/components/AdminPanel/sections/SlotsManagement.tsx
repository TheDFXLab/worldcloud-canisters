import React, { useState } from "react";
import { useAdmin } from "../../../context/AdminContext/AdminContext";
import { useToaster } from "../../../context/ToasterContext/ToasterContext";
import {
  Construction,
  CheckCircle,
  Lock,
  AccessTime,
  ContentCopy,
} from "@mui/icons-material";
import AdminConfirmationModal from "../AdminConfirmationModal";
import "./SlotsManagement.css";
import { useAdminLogic } from "../../../hooks/useAdminLogic";

const SlotsManagement: React.FC = () => {
  const {
    slots,
    availableSlots,
    usedSlots,
    isLoadingSlots,
    handleSetAllSlotDuration,
    handleDeleteUsageLogs,
    handleUpdateSlot,
    handleResetSlots,
    handlePurgeExpiredSessions,
    error,
    successMessage,
  } = useAdmin();

  const { handleResetQuotas } = useAdminLogic();

  const { setToasterData, setShowToaster } = useToaster();
  const [newDuration, setNewDuration] = useState("");

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => Promise<void>;
    confirmButtonVariant?: "danger" | "warning" | "primary";
  }>({
    show: false,
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    onConfirm: async () => {},
    confirmButtonVariant: "danger",
  });

  const handleSetDuration = async () => {
    const duration = parseInt(newDuration);
    if (isNaN(duration) || duration <= 0) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please enter a valid duration in milliseconds",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    try {
      await handleSetAllSlotDuration(duration);
      setNewDuration("");
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Slot duration updated to ${duration}ms`,
        textColor: "green",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error: any) {
      console.error("Failed to set slot duration:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to update slot duration",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  const handleResetAllSlots = async () => {
    try {
      await handleResetSlots();
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: "All slots have been reset successfully",
        textColor: "green",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error: any) {
      console.error("Failed to reset slots:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message ? error.message : "Failed to reset slots",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  const handlePurgeSessions = async () => {
    try {
      await handlePurgeExpiredSessions();
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: "Expired sessions have been purged successfully",
        textColor: "green",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error: any) {
      console.error("Failed to purge expired sessions:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to purge expired sessions",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  const handleDeleteLogs = async () => {
    try {
      await handleDeleteUsageLogs();
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: "Usage logs have been deleted successfully",
        textColor: "green",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error: any) {
      console.error("Failed to delete usage logs:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to delete usage logs",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  const handleConfirmResetQuotas = async () => {
    try {
      await handleResetQuotas();
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: "Reset quotas",
        textColor: "green",
        timeout: 3000,
      });

      setShowToaster(true);
      closeConfirmationModal();
      // setConfirmationModal((p) => {
      //   return { ...p, show: false };
      // });
    } catch (error) {
      console.error("Failed to reset quotas:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Failed to reset quotas",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  // Confirmation modal handlers
  const confirmResetAllSlots = () => {
    setConfirmationModal({
      show: true,
      title: "Reset All Slots",
      message:
        "Are you sure you want to reset all slots? This action cannot be undone and will clear all slot data.",
      confirmText: "Reset All Slots",
      cancelText: "Cancel",
      onConfirm: handleResetAllSlots,
      confirmButtonVariant: "danger",
    });
  };

  const confirmPurgeSessions = () => {
    setConfirmationModal({
      show: true,
      title: "Purge Expired Sessions",
      message:
        "Are you sure you want to purge all expired sessions? This will end all expired freemium sessions.",
      confirmText: "Purge Sessions",
      cancelText: "Cancel",
      onConfirm: handlePurgeSessions,
      confirmButtonVariant: "warning",
    });
  };

  const confirmDeleteLogs = () => {
    setConfirmationModal({
      show: true,
      title: "Delete Usage Logs",
      message:
        "Are you sure you want to delete all usage logs? This action cannot be undone and will permanently remove all activity logs.",
      confirmText: "Delete Logs",
      cancelText: "Cancel",
      onConfirm: handleDeleteLogs,
      confirmButtonVariant: "danger",
    });
  };

  const confirmResetQuotas = () => {
    setConfirmationModal({
      show: true,
      title: "Reset Quotas",
      message:
        "Are you sure you want to reset all quotas? This action cannot be undone and will permanently remove all quota records.",
      confirmText: "Reset",
      cancelText: "Cancel",
      onConfirm: handleConfirmResetQuotas,
      confirmButtonVariant: "danger",
    });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal((prev) => ({ ...prev, show: false }));
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: "Principal copied to clipboard",
        textColor: "green",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Failed to copy to clipboard",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  return (
    <div className="admin-slots-management">
      {/* Confirmation Modal */}
      <AdminConfirmationModal
        show={confirmationModal.show}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        cancelText={confirmationModal.cancelText}
        onConfirm={confirmationModal.onConfirm}
        onCancel={closeConfirmationModal}
        confirmButtonVariant={confirmationModal.confirmButtonVariant}
      />

      {/* Summary Cards */}
      <div className="admin-summary-cards">
        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <Construction />
          </div>
          <div className="admin-card-content">
            <h3>Total Slots</h3>
            <p className="admin-card-value">{slots.length}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <CheckCircle />
          </div>
          <div className="admin-card-content">
            <h3>Available Slots</h3>
            <p className="admin-card-value">{availableSlots.length}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <Lock />
          </div>
          <div className="admin-card-content">
            <h3>Used Slots</h3>
            <p className="admin-card-value">
              {usedSlots.filter(([_, used]) => used).length}
            </p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <AccessTime />
          </div>
          <div className="admin-card-content">
            <h3>Active Sessions</h3>
            <p className="admin-card-value">
              {slots.filter((slot) => slot.status === "occupied").length}
            </p>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="admin-actions-section">
        <div className="admin-action-card">
          <h3>Slot Duration Management</h3>
          <p>Set the duration for all freemium slots</p>
          <div className="admin-action-input">
            <input
              type="number"
              placeholder="Duration in milliseconds"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
            />
            <button onClick={handleSetDuration} disabled={!newDuration}>
              Set Duration
            </button>
          </div>
        </div>

        <div className="admin-action-card">
          <h3>System Operations</h3>
          <p>Manage system-wide slot operations</p>
          <div className="admin-action-buttons">
            <button onClick={confirmResetAllSlots} className="danger">
              Reset All Slots
            </button>
            <button onClick={confirmPurgeSessions} className="warning">
              Purge Expired Sessions
            </button>
            <button onClick={confirmDeleteLogs} className="danger">
              Delete Usage Logs
            </button>
            <button onClick={confirmResetQuotas} className="danger">
              Reset Quotas
            </button>
          </div>
        </div>
      </div>

      {/* Slots Table */}
      <div className="admin-table-section">
        <h3>Slots Overview</h3>
        {isLoadingSlots ? (
          <div className="admin-loading">Loading slots...</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Slot ID</th>
                  <th>Status</th>
                  <th>User</th>
                  <th>Canister ID</th>
                  <th>Project ID</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => {
                  try {
                    return (
                      <tr key={slot.id}>
                        <td>{slot.id}</td>
                        <td>
                          <span
                            className={`admin-status-badge ${
                              typeof slot.status === "string"
                                ? slot.status === "[object Object]"
                                  ? "unknown"
                                  : slot.status
                                : "unknown"
                            }`}
                          >
                            {typeof slot.status === "string"
                              ? slot.status === "[object Object]"
                                ? "Active" // Default status for object
                                : slot.status
                              : slot.status && typeof slot.status === "object"
                              ? "Active" // Default status for object
                              : "Unknown"}
                          </span>
                        </td>
                        <td>
                          {slot.user
                            ? typeof slot.user === "string"
                              ? slot.user.substring(0, 8) + "..."
                              : slot.user.toString
                              ? slot.user.toString().substring(0, 8) + "..."
                              : "N/A"
                            : "N/A"}
                          <button
                            className="admin-copy-btn"
                            onClick={() =>
                              handleCopyToClipboard(slot.user.toString())
                            }
                            title="Copy Principal"
                          >
                            <ContentCopy />
                          </button>
                        </td>
                        <td>
                          {slot.canister_id
                            ? typeof slot.canister_id === "string"
                              ? slot.canister_id.substring(0, 8) + "..."
                              : slot.canister_id.toString
                              ? slot.canister_id.toString().substring(0, 8) +
                                "..."
                              : "N/A"
                            : "N/A"}
                          <button
                            className="admin-copy-btn"
                            onClick={() =>
                              handleCopyToClipboard(slot.canister_id.toString())
                            }
                            title="Copy Principal"
                          >
                            <ContentCopy />
                          </button>
                        </td>
                        <td>{slot.project_id || "N/A"}</td>
                        <td>
                          {slot.start_timestamp
                            ? new Date(slot.start_timestamp).toLocaleString()
                            : "N/A"}
                        </td>
                        <td>
                          {slot.duration
                            ? `${Math.floor(slot.duration / 1000)}s`
                            : "N/A"}
                        </td>
                        <td>
                          <button className="admin-action-btn">Edit</button>
                        </td>
                      </tr>
                    );
                  } catch (error) {
                    console.error("Error rendering slot:", error, slot);
                    return (
                      <tr key={slot.id || "error"}>
                        <td colSpan={8}>Error rendering slot data</td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotsManagement;
