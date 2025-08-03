import React, { useEffect, useState, useRef } from "react";
import { useAdminLogic } from "../../hooks/useAdminLogic";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { useConfirmationModal } from "../../context/ConfirmationModalContext/ConfirmationModalContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import {
  Settings,
  CreditCard,
  Build,
  Assessment,
  Security,
  Storage,
  AccountBalance,
  Code,
} from "@mui/icons-material";
import "./AdminPanel.css";

// Import admin section components
import SlotsManagement from "./sections/SlotsManagement";
import SubscriptionsManagement from "./sections/SubscriptionsManagement";
import CanistersManagement from "./sections/CanistersManagement";
import ActivityLogsManagement from "./sections/ActivityLogsManagement";
import AccessControlManagement from "./sections/AccessControlManagement";
import SystemManagement from "./sections/SystemManagement";
import BookManagement from "./sections/BookManagement";
import WasmUploader from "../WasmUploader/WasmUploader";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";
import { useAdmin } from "../../context/AdminContext/AdminContext";

type AdminSection =
  | "slots"
  | "subscriptions"
  | "canisters"
  | "activity-logs"
  | "access-control"
  | "system"
  | "book"
  | "wasm-uploader";

interface AdminPanelProps {}

const AdminPanel: React.FC<AdminPanelProps> = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    error,
    successMessage,
    handleClearError,
    handleClearSuccessMessage,
    currentUserRole,
    isLoadingCurrentUserRole,
    checkCurrentUserRole,
  } = useAdminLogic();
  const { isAdmin } = useAdmin();
  const { showToaster, setShowToaster, setToasterData } = useToaster();
  const { setShowModal } = useConfirmationModal();
  const { setHeaderCard } = useHeaderCard();
  const { summon, destroy } = useLoaderOverlay();
  const navigate = useNavigate();

  // Add a ref to track if admin check has been performed
  const hasCheckedAdmin = useRef(false);

  // Get the active section from URL params or default to "slots"
  const getActiveSectionFromURL = (): AdminSection => {
    const sectionParam = searchParams.get("section");
    const validSections: AdminSection[] = [
      "slots",
      "subscriptions",
      "canisters",
      "activity-logs",
      "access-control",
      "system",
      "book",
      "wasm-uploader",
    ];

    if (sectionParam && validSections.includes(sectionParam as AdminSection)) {
      return sectionParam as AdminSection;
    }
    return "slots";
  };

  const [activeSection, setActiveSection] = useState<AdminSection>(
    getActiveSectionFromURL()
  );

  // Handle section change and update URL
  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    setSearchParams({ section });
  };

  // Update active section when URL params change (e.g., on browser back/forward)
  useEffect(() => {
    const newSection = getActiveSectionFromURL();
    if (newSection !== activeSection) {
      setActiveSection(newSection);
    }
  }, [searchParams, activeSection]);

  // Check user's admin role on mount - FIXED to prevent infinite loop
  useEffect(() => {
    const checkAdminAccess = async () => {
      // Only check once and only if we haven't checked before
      if (!hasCheckedAdmin.current) {
        try {
          hasCheckedAdmin.current = true;
          // summon("Checking admin access...");
          await checkCurrentUserRole();
        } catch (error) {
          console.error("Failed to check admin access:", error);
          // Reset the flag so we can try again if needed
          hasCheckedAdmin.current = false;
          // Don't redirect on error - let the user see the error message
        } finally {
          // destroy();
        }
      }
    };

    checkAdminAccess();
  }, []); // Remove dependencies to prevent re-runs

  // Initialize URL with default section if no section is specified
  useEffect(() => {
    if (!searchParams.get("section")) {
      setSearchParams({ section: "slots" });
    }
  }, [searchParams, setSearchParams]);

  // Handle error and success messages
  React.useEffect(() => {
    if (error) {
      setShowToaster(true);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error,
        textColor: "red",
        timeout: 5000,
      });
      handleClearError();
    }
  }, [error, showToaster, handleClearError]);

  React.useEffect(() => {
    if (successMessage) {
      setShowToaster(true);
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: successMessage,
        textColor: "green",
        timeout: 3000,
      });
      handleClearSuccessMessage();
    }
  }, [successMessage, showToaster, handleClearSuccessMessage]);

  useEffect(() => {
    setHeaderCard(null);
  }, []);

  const navigationItems = [
    {
      id: "slots" as AdminSection,
      label: "Slots Management",
      icon: <Storage />,
      description: "Manage shareable canister slots and sessions",
    },
    {
      id: "subscriptions" as AdminSection,
      label: "Subscriptions",
      icon: <CreditCard />,
      description: "View and manage user subscriptions",
    },
    {
      id: "canisters" as AdminSection,
      label: "Canisters",
      icon: <Build />,
      description: "Manage deployed asset canisters",
    },
    {
      id: "activity-logs" as AdminSection,
      label: "Activity Logs",
      icon: <Assessment />,
      description: "View and manage activity logs",
    },
    {
      id: "access-control" as AdminSection,
      label: "Access Control",
      icon: <Security />,
      description: "Manage user roles and permissions",
    },
    {
      id: "system" as AdminSection,
      label: "System",
      icon: <Settings />,
      description: "System-wide operations and settings",
    },
    {
      id: "book" as AdminSection,
      label: "Book Management",
      icon: <AccountBalance />,
      description: "Manage user balances and token deposits",
    },
    {
      id: "wasm-uploader" as AdminSection,
      label: "WASM Uploader",
      icon: <Code />,
      description: "Upload and manage asset canister WASM files",
    },
  ];

  const renderActiveSection = () => {
    switch (activeSection) {
      case "slots":
        return <SlotsManagement />;
      case "subscriptions":
        return <SubscriptionsManagement />;
      case "canisters":
        return <CanistersManagement />;
      case "activity-logs":
        return <ActivityLogsManagement />;
      case "access-control":
        return <AccessControlManagement />;
      case "system":
        return <SystemManagement />;
      case "book":
        return <BookManagement />;
      case "wasm-uploader":
        return <WasmUploader />;
      default:
        return <SlotsManagement />;
    }
  };

  // Show loading state while checking admin status
  if (isLoadingCurrentUserRole) {
    return (
      <div className="admin-panel-container">
        <div className="admin-loading">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Checking Admin Access...</h2>
            <p>Please wait while we verify your permissions.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied state if user is not admin
  if (!isAdmin) {
    return (
      <div className="admin-panel-container">
        <div className="admin-access-denied">
          <div className="access-denied-content">
            <Security className="access-denied-icon" />
            <h2>Access Denied</h2>
            <p>
              You don't have permission to access the admin panel. Please
              contact an administrator if you believe this is an error.
            </p>
            <button
              className="admin-back-button"
              onClick={() => navigate("/dashboard")}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-container">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Dashboard</h1>
          <p>Manage system operations and monitor user activities</p>
        </div>
      </div>

      <div className="admin-layout">
        {/* Navigation Sidebar */}
        <div className="admin-sidebar">
          <div className="sidebar-header">
            <h3>Navigation</h3>
          </div>
          <nav className="admin-sidebar-nav">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                className={`admin-nav-item ${
                  activeSection === item.id ? "active" : ""
                }`}
                onClick={() => handleSectionChange(item.id)}
              >
                <div className="admin-nav-item-icon">{item.icon}</div>
                <div className="admin-nav-item-content">
                  <div className="admin-nav-item-label">{item.label}</div>
                  <div className="admin-nav-item-description">
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="admin-content">
          <div className="content-header">
            <h2>
              {navigationItems.find((item) => item.id === activeSection)?.label}
            </h2>
            <p>
              {
                navigationItems.find((item) => item.id === activeSection)
                  ?.description
              }
            </p>
          </div>

          <div className="content-body">{renderActiveSection()}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
