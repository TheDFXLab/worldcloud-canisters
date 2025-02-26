import React, { useEffect } from "react";
import "./AdminPanel.css";
import WasmUploader from "../WasmUploader/WasmUploader";
import SettingsIcon from "@mui/icons-material/Settings";
import CodeIcon from "@mui/icons-material/Code";
import SecurityIcon from "@mui/icons-material/Security";
import { useNavigate } from "react-router-dom";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useAdmin } from "../../context/AdminContext/AdminContext";

export const AdminPanel = () => {
  const navigate = useNavigate();
  const { identity } = useIdentity();
  const { setActionBar } = useActionBar();
  const { isAdmin, isLoadingAdminStatus } = useAdmin();

  // List of admin functions/cards
  const adminFunctions = [
    {
      title: "Canister WASM Management",
      description: "Upload and manage the asset canister WASM file",
      icon: <CodeIcon />,
      component: <WasmUploader />,
    },
  ];

  // TODO: Implement actual admin check
  // Check if user is admin
  // const isAdmin = true;

  useEffect(() => {
    setActionBar(null);
  }, []);

  if (!isAdmin) {
    return (
      <div className="admin-unauthorized">
        <SecurityIcon className="unauthorized-icon" />
        <h2>Unauthorized Access</h2>
        <p>You don't have permission to access the admin panel.</p>
        <button onClick={() => navigate("/app")}>Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <SettingsIcon className="header-icon" />
        <h2>Admin Panel</h2>
        <p className="subtitle">Manage system configurations and settings</p>
      </div>

      <div className="admin-content">
        {adminFunctions.map((func, index) => (
          <div key={index} className="admin-card">
            <div className="card-header">
              {func.icon}
              <h3>{func.title}</h3>
            </div>
            <div className="card-description">
              <p>{func.description}</p>
            </div>
            <div className="card-content">{func.component}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
