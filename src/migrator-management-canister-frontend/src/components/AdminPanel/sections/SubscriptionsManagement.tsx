import React, { useState } from "react";
import { useAdmin } from "../../../context/AdminContext/AdminContext";
import { useToaster } from "../../../context/ToasterContext/ToasterContext";
import { SerializedSubscription } from "../../../serialization/subscription";
import AdminConfirmationModal from "../AdminConfirmationModal";
import {
  CreditCard,
  CheckCircle,
  Warning,
  Cancel,
  Refresh,
  Visibility,
  TrendingUp,
  Person,
} from "@mui/icons-material";
import "./SubscriptionsManagement.css";

const SubscriptionsManagement: React.FC = () => {
  const { allSubscriptions, isLoadingSubscriptions, refreshAllSubscriptions } =
    useAdmin();
  const { setToasterData, setShowToaster } = useToaster();
  const [selectedSubscription, setSelectedSubscription] = useState<
    string | null
  >(null);

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

  // Helper function to get tier name from tier_id
  const getTierName = (tierId: number): string => {
    switch (tierId) {
      case 0:
        return "Basic";
      case 1:
        return "Pro";
      case 2:
        return "Enterprise";
      case 3:
        return "Freemium";
      default:
        return "Unknown";
    }
  };

  // Helper function to get tier price from tier_id
  const getTierPrice = (tierId: number): number => {
    switch (tierId) {
      case 0:
        return 0; // Basic is free
      case 1:
        return 5.0; // Pro tier
      case 2:
        return 25.0; // Enterprise tier
      case 3:
        return 0; // Freemium is free
      default:
        return 0;
    }
  };

  // Helper function to format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  // Calculate real statistics from actual subscription data
  const totalSubscriptions = allSubscriptions.length;
  const activeSubscriptions = allSubscriptions.filter(
    ([_, subscription]) => subscription.used_slots < subscription.max_slots
  ).length;
  const expiredSubscriptions = totalSubscriptions - activeSubscriptions;

  // Calculate total revenue based on tier_id (assuming tier_id corresponds to pricing)
  const totalRevenue = allSubscriptions.reduce((total, [_, subscription]) => {
    const tierPrice = getTierPrice(subscription.tier_id);
    return total + tierPrice;
  }, 0);

  const handleRefreshAllSubscriptions = async () => {
    try {
      await refreshAllSubscriptions();
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: "All subscriptions refreshed successfully",
        textColor: "green",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error) {
      console.error("Failed to refresh subscriptions:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Failed to refresh subscriptions",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  const handleViewSubscription = (subscriptionId: string) => {
    setSelectedSubscription(subscriptionId);
    // TODO: Implement subscription details view
    setToasterData({
      headerContent: "Info",
      toastStatus: true,
      toastData: `Viewing subscription details for ${subscriptionId.substring(
        0,
        8
      )}...`,
      textColor: "blue",
      timeout: 3000,
    });
    setShowToaster(true);
  };

  const handleRefreshSubscription = async (subscriptionId: string) => {
    try {
      // Since there's no backend method to refresh individual subscriptions,
      // we'll refresh all subscriptions
      await refreshAllSubscriptions();
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Subscription ${subscriptionId.substring(
          0,
          8
        )}... refreshed successfully`,
        textColor: "green",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error) {
      console.error("Failed to refresh subscription:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Failed to refresh subscription",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    // Since there's no backend method to cancel subscriptions,
    // we'll show a message that this feature is not implemented
    setToasterData({
      headerContent: "Info",
      toastStatus: true,
      toastData: "Subscription cancellation is not implemented in the backend",
      textColor: "blue",
      timeout: 3000,
    });
    setShowToaster(true);
  };

  const handleBatchRefresh = async () => {
    try {
      await refreshAllSubscriptions();
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: "All subscriptions refreshed successfully",
        textColor: "green",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error) {
      console.error("Failed to batch refresh subscriptions:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Failed to refresh subscriptions",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  const handleBatchCancel = async () => {
    // Since there's no backend method to cancel subscriptions,
    // we'll show a message that this feature is not implemented
    setToasterData({
      headerContent: "Info",
      toastStatus: true,
      toastData:
        "Batch subscription cancellation is not implemented in the backend",
      textColor: "blue",
      timeout: 3000,
    });
    setShowToaster(true);
  };

  const handleUpdateBillingStatus = async () => {
    // Since there's no backend method to update billing status,
    // we'll show a message that this feature is not implemented
    setToasterData({
      headerContent: "Info",
      toastStatus: true,
      toastData: "Billing status update is not implemented in the backend",
      textColor: "blue",
      timeout: 3000,
    });
    setShowToaster(true);
  };

  const handleCancelExpiredSubscriptions = async () => {
    // Since there's no backend method to cancel expired subscriptions,
    // we'll show a message that this feature is not implemented
    setToasterData({
      headerContent: "Info",
      toastStatus: true,
      toastData:
        "Expired subscription cancellation is not implemented in the backend",
      textColor: "blue",
      timeout: 3000,
    });
    setShowToaster(true);
  };

  const closeConfirmationModal = () => {
    setConfirmationModal((prev) => ({ ...prev, show: false }));
  };

  return (
    <div className="admin-subscriptions-management">
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
            <CreditCard />
          </div>
          <div className="admin-card-content">
            <h3>Total Subscriptions</h3>
            <p className="admin-card-value">{totalSubscriptions}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <CheckCircle />
          </div>
          <div className="admin-card-content">
            <h3>Active Subscriptions</h3>
            <p className="admin-card-value">{activeSubscriptions}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <Warning />
          </div>
          <div className="admin-card-content">
            <h3>Expired Subscriptions</h3>
            <p className="admin-card-value">{expiredSubscriptions}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <TrendingUp />
          </div>
          <div className="admin-card-content">
            <h3>Total Revenue</h3>
            <p className="admin-card-value">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="admin-actions-section">
        <div className="admin-action-card">
          <h3>Subscription Operations</h3>
          <p>Manage user subscriptions and billing operations</p>
          <div className="admin-action-buttons">
            <button onClick={handleRefreshAllSubscriptions} className="primary">
              <Refresh /> Refresh All Subscriptions
            </button>
            <button onClick={handleUpdateBillingStatus} className="warning">
              <CreditCard /> Update Billing Status
            </button>
            <button
              onClick={handleCancelExpiredSubscriptions}
              className="danger"
            >
              <Cancel /> Cancel Expired Subscriptions
            </button>
          </div>
        </div>

        <div className="admin-action-card">
          <h3>Bulk Operations</h3>
          <p>Perform operations on multiple subscriptions</p>
          <div className="admin-action-buttons">
            <button onClick={() => {}} className="primary">
              <Visibility /> View All Details
            </button>
            <button onClick={handleBatchRefresh} className="warning">
              <Refresh /> Batch Refresh
            </button>
            <button onClick={handleBatchCancel} className="danger">
              <Cancel /> Batch Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="admin-table-section">
        <h3>All Subscriptions</h3>
        {isLoadingSubscriptions ? (
          <div className="admin-loading">Loading subscriptions...</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Subscription ID</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Slots Used</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allSubscriptions.map(([userPrincipal, subscription]) => (
                  <tr key={userPrincipal}>
                    <td>
                      <div className="admin-user-info">
                        <Person className="admin-user-icon" />
                        <span className="admin-user-id">
                          {userPrincipal.substring(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="admin-subscription-id">
                        {userPrincipal.substring(0, 12)}...
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-status-badge ${
                          subscription.used_slots < subscription.max_slots
                            ? "active"
                            : "expired"
                        }`}
                      >
                        {subscription.used_slots < subscription.max_slots
                          ? "active"
                          : "expired"}
                      </span>
                    </td>
                    <td>{getTierName(subscription.tier_id)}</td>
                    <td>${getTierPrice(subscription.tier_id)}</td>
                    <td>
                      {subscription.used_slots}/{subscription.max_slots}
                    </td>
                    <td>{formatDate(subscription.date_created)}</td>
                    <td>{formatDate(subscription.date_updated)}</td>
                    <td>
                      <div className="admin-action-buttons-row">
                        <button
                          className="admin-action-btn primary"
                          onClick={() => handleViewSubscription(userPrincipal)}
                          title="View Details"
                        >
                          <Visibility />
                        </button>
                        <button
                          className="admin-action-btn warning"
                          onClick={() =>
                            handleRefreshSubscription(userPrincipal)
                          }
                          title="Refresh"
                        >
                          <Refresh />
                        </button>
                        <button
                          className="admin-action-btn danger"
                          onClick={() =>
                            handleCancelSubscription(userPrincipal)
                          }
                          title="Cancel"
                        >
                          <Cancel />
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

export default SubscriptionsManagement;
