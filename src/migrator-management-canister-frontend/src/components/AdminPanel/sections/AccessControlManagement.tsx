import React, { useState } from "react";
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
} from "@mui/icons-material";
import "./AccessControlManagement.css";

const AccessControlManagement: React.FC = () => {
  const { isLoadingAccessControl } = useAdmin();
  const { setShowModal, call } = useConfirmationModal();
  const { setToasterData, setShowToaster } = useToaster();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [newPrincipal, setNewPrincipal] = useState("");

  // Mock data for demonstration
  const totalUsers = 150;
  const adminUsers = 5;
  const regularUsers = 140;
  const blockedUsers = 5;

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
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">
            <Security />
          </div>
          <div className="card-content">
            <h3>Total Users</h3>
            <p className="card-value">{totalUsers}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <AdminPanelSettings />
          </div>
          <div className="access-control card-content">
            <h3>Admin Users</h3>
            <p className="card-value">{adminUsers}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <Person />
          </div>
          <div className="access-control card-content">
            <h3>Regular Users</h3>
            <p className="card-value">{regularUsers}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">
            <Block />
          </div>
          <div className="access-control card-content">
            <h3>Blocked Users</h3>
            <p className="card-value">{blockedUsers}</p>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="actions-section">
        <div className="action-card">
          <h3>Add New User</h3>
          <p>Grant access to new users with specific roles</p>
          <div className="action-input">
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
            <button
              onClick={handleAddUser}
              disabled={!newPrincipal || !newRole}
            >
              <Add /> Add User
            </button>
          </div>
        </div>

        <div className="action-card">
          <h3>Bulk Operations</h3>
          <p>Perform operations on multiple users</p>
          <div className="action-buttons">
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

      {/* Users Table */}
      <div className="table-section">
        <h3>User Access Control</h3>
        {isLoadingAccessControl ? (
          <div className="loading">Loading access control data...</div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Principal</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((user, index) => (
                  <tr key={user.principal}>
                    <td>
                      <span className="principal-id">
                        {user.principal.substring(0, 12)}...
                      </span>
                    </td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.status}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>{user.lastActive}</td>
                    <td>
                      <div className="action-buttons-row">
                        <button
                          className="action-btn primary"
                          onClick={() => setSelectedUser(user.principal)}
                          title="View Details"
                        >
                          <Visibility />
                        </button>
                        <button
                          className="action-btn warning"
                          onClick={() =>
                            handleGrantRole(user.principal, "admin")
                          }
                          title="Grant Admin"
                        >
                          <Add />
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={() => handleBlockUser(user.principal)}
                          title="Block User"
                        >
                          <Block />
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

export default AccessControlManagement;
