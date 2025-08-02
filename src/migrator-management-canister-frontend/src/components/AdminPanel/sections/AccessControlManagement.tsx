import React, { useEffect, useState } from "react";
import { useAdmin } from "../../../context/AdminContext/AdminContext";
import { useConfirmationModal } from "../../../context/ConfirmationModalContext/ConfirmationModalContext";
import { useToaster } from "../../../context/ToasterContext/ToasterContext";
import {
  Security,
  AdminPanelSettings,
  Person,
  Block,
  Add,
  Remove,
  Visibility,
  Edit,
  ContentCopy,
} from "@mui/icons-material";
import "./AccessControlManagement.css";
import { useAdminLogic } from "../../../hooks/useAdminLogic";

const AccessControlManagement: React.FC = () => {
  const { isLoadingAccessControl } = useAdmin();
  const { admins, handleGetAdmins } = useAdminLogic();
  const { setShowModal, call } = useConfirmationModal();
  const { setToasterData, setShowToaster } = useToaster();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [newPrincipal, setNewPrincipal] = useState("");

  // Pagination state for admins
  const [adminPage, setAdminPage] = useState(0);
  const [adminLimit, setAdminLimit] = useState(10);

  // Mock data for demonstration
  const totalUsers = 150;
  const adminUsers = admins?.length || 0;
  const regularUsers = 140;
  const blockedUsers = 5;

  useEffect(() => {
    const payload = {
      limit: adminLimit,
      page: adminPage,
    };
    handleGetAdmins(payload);
  }, [adminPage, adminLimit, handleGetAdmins]);

  const handleGrantRole = async (principal: string, role: string) => {
    try {
      // TODO: Implement grant role logic
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Role ${role} granted to ${principal}`,
        textColor: "green",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error) {
      console.error("Failed to grant role:", error);
    }
  };

  const handleRevokeRole = async (principal: string) => {
    call("default");
    setShowModal(true);
    // TODO: Implement confirmation modal for revoke role
  };

  const handleBlockUser = async (principal: string) => {
    call("default");
    setShowModal(true);
    // TODO: Implement confirmation modal for block user
  };

  const handleAddUser = async () => {
    if (!newPrincipal || !newRole) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please enter both principal and role",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    try {
      await handleGrantRole(newPrincipal, newRole);
      setNewPrincipal("");
      setNewRole("");
    } catch (error) {
      console.error("Failed to add user:", error);
    }
  };

  // Pagination handlers
  const handleAdminPageChange = (newPage: number) => {
    setAdminPage(newPage);
  };

  const handleAdminLimitChange = (newLimit: number) => {
    setAdminLimit(newLimit);
    setAdminPage(0); // Reset to first page when changing limit
  };

  // Copy to clipboard function
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

  // Mock users data
  const mockUsers = [
    {
      principal: "admin1",
      role: "admin",
      status: "active",
      lastActive: "2024-01-15",
    },
    {
      principal: "user1",
      role: "user",
      status: "active",
      lastActive: "2024-01-14",
    },
    {
      principal: "user2",
      role: "user",
      status: "blocked",
      lastActive: "2024-01-10",
    },
    {
      principal: "moderator1",
      role: "moderator",
      status: "active",
      lastActive: "2024-01-13",
    },
  ];

  return (
    <div className="access-control-management">
      {/* Summary Cards */}
      <div className="admin-summary-cards">
        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <Security />
          </div>
          <div className="admin-card-content">
            <h3>Total Users</h3>
            <p className="admin-card-value">{totalUsers}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <AdminPanelSettings />
          </div>
          <div className="admin-card-content">
            <h3>Admin Users</h3>
            <p className="admin-card-value">{adminUsers}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <Person />
          </div>
          <div className="admin-card-content">
            <h3>Regular Users</h3>
            <p className="admin-card-value">{regularUsers}</p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <Block />
          </div>
          <div className="admin-card-content">
            <h3>Blocked Users</h3>
            <p className="admin-card-value">{blockedUsers}</p>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="admin-actions-section">
        <div className="admin-action-card">
          <h3>Add New User</h3>
          <p>Grant access to new users with specific roles</p>
          <div className="admin-action-input">
            <input
              type="text"
              placeholder="Principal ID"
              value={newPrincipal}
              onChange={(e) => setNewPrincipal(e.target.value)}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="">Select Role</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="user">User</option>
            </select>
          </div>
          <button onClick={handleAddUser} disabled={!newPrincipal || !newRole}>
            <Add /> Add User
          </button>
        </div>

        <div className="admin-action-card">
          <h3>Bulk Operations</h3>
          <p>Perform operations on multiple users</p>
          <div className="admin-action-buttons">
            <button onClick={() => {}} className="primary">
              <Visibility /> View All Users
            </button>
            <button onClick={() => {}} className="warning">
              <Edit /> Batch Role Update
            </button>
            <button onClick={() => {}} className="danger">
              <Block /> Batch Block
            </button>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="admin-table-section">
        <h3>Admin Users</h3>
        {isLoadingAccessControl ? (
          <div className="admin-loading">Loading admin data...</div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Principal</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins && admins.length > 0 ? (
                    admins.map((admin, index) => (
                      <tr key={index}>
                        <td>
                          <div className="admin-principal-container">
                            <span className="admin-principal-id">
                              {admin[0].toString().substring(0, 12)}...
                            </span>
                            <button
                              className="admin-copy-btn"
                              onClick={() =>
                                handleCopyToClipboard(admin[0].toString())
                              }
                              title="Copy Principal"
                            >
                              <ContentCopy />
                            </button>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`admin-role-badge ${admin[1].toLowerCase()}`}
                          >
                            {admin[1]}
                          </span>
                        </td>
                        <td>
                          <div className="admin-action-buttons-row">
                            <button
                              className="admin-action-btn primary"
                              onClick={() =>
                                setSelectedUser(admin[0].toString())
                              }
                              title="View Details"
                            >
                              <Visibility />
                            </button>
                            <button
                              className="admin-action-btn warning"
                              onClick={() =>
                                handleRevokeRole(admin[0].toString())
                              }
                              title="Revoke Role"
                            >
                              <Remove />
                            </button>
                            <button
                              className="admin-action-btn danger"
                              onClick={() =>
                                handleBlockUser(admin[0].toString())
                              }
                              title="Block User"
                            >
                              <Block />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="admin-no-data">
                        No admin users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="admin-pagination">
              <div className="admin-pagination-info">
                <span>Showing {adminLimit} items per page</span>
                <select
                  value={adminLimit}
                  onChange={(e) =>
                    handleAdminLimitChange(Number(e.target.value))
                  }
                  className="admin-limit-select"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              <div className="admin-pagination-controls">
                <button
                  onClick={() => handleAdminPageChange(adminPage - 1)}
                  disabled={adminPage === 0}
                  className="admin-pagination-btn"
                >
                  Previous
                </button>
                <span className="admin-page-info">Page {adminPage + 1}</span>
                <button
                  onClick={() => handleAdminPageChange(adminPage + 1)}
                  disabled={admins && admins.length < adminLimit}
                  className="admin-pagination-btn"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccessControlManagement;
