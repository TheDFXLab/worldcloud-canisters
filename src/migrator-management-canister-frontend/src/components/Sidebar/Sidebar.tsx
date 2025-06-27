import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import IconTextRowView from "../IconTextRowView/IconTextRowView";
import HomeIcon from "@mui/icons-material/Home";
import LanguageIcon from "@mui/icons-material/Language";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import MemoryIcon from "@mui/icons-material/Memory";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import { CreditCard } from "@mui/icons-material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { useNavigate } from "react-router-dom";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";

import "./Sidebar.css";
import { useEffect, useState } from "react";
import { useAdmin } from "../../context/AdminContext/AdminContext";
import { useGithub } from "../../context/GithubContext/GithubContext";

export type MenuItem =
  | "publish"
  | "websites"
  | "projects"
  | "admin"
  | "logout"
  | "settings"
  | "billing"
  | "home";

interface SidebarProps {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileControl: any;
}

function Sidebar({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  mobileControl,
}: SidebarProps) {
  const { isAdmin } = useAdmin();
  const { disconnect } = useIdentity();
  const { setGithubUser } = useGithub();
  const { activeTab, isMobileMenuOpen, setIsMobileMenuOpen, setActiveTab } =
    useSideBar();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = mobileControl;

  useEffect(() => {
    if (isMobile) {
      setIsSidebarCollapsed(window.innerWidth <= 768 ? true : false);
    }
  }, []);

  useEffect(() => {
    const resize = () =>
      window.innerWidth <= 768 ? setIsMobile(true) : setIsMobile(false);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const handleTabClick = () => {
    if (isMobile) {
      setIsSidebarCollapsed((p) => !p);
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsSidebarCollapsed((v) => !v);
    }
  };

  const handleClose = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
    setIsSidebarCollapsed(true);
  };

  const handleMenuClick = (menuItem: MenuItem) => {
    switch (menuItem) {
      case "billing":
        navigate("/dashboard/billing");
        break;
      case "settings":
        navigate("/dashboard/settings");
        break;
      case "home":
        navigate("/dashboard");
        break;
      case "publish":
        navigate("/dashboard/new");
        break;
      case "websites":
        navigate("/dashboard/websites");
        break;
      case "projects":
        navigate("/dashboard/projects");
        break;
      case "admin":
        if (isAdmin) {
          navigate("/dashboard/admin");
        }
        break;
    }
    setActiveTab(menuItem);
  };

  const handleLogout = () => {
    disconnect();
    setGithubUser(null);
  };

  return (
    <div>
      <button
        className={`sidebar-collapse-tab${
          isSidebarCollapsed ? " collapsed" : ""
        }`}
        onClick={() => handleTabClick()}
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          position: isSidebarCollapsed ? "fixed" : "absolute",
          left: 0,
          top: isSidebarCollapsed ? "2rem" : "0.75rem",
          zIndex: 2001,
          border: "none",
          background: "var(--background-secondary)",
          borderTopRightRadius: "1.5rem",
          borderBottomRightRadius: "1.5rem",
          width: "2.5rem",
          height: "2.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "left 0.2s, background 0.2s",
        }}
      >
        {isSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </button>
      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? "show" : ""}`}
        onClick={() => handleClose()}
      />
      <aside
        className={`sidebar${isSidebarCollapsed ? " collapsed" : ""} 
          `}
      >
        <nav className="sidebar-nav">
          <IconTextRowView
            className={`nav-item ${activeTab === "home" ? "active" : ""}`}
            text="Home"
            IconComponent={HomeIcon}
            onClickIcon={() => handleMenuClick("home")}
          />
          <IconTextRowView
            className={`nav-item ${activeTab === "websites" ? "active" : ""}`}
            text="Websites"
            IconComponent={LanguageIcon}
            onClickIcon={() => handleMenuClick("websites")}
          />
          <IconTextRowView
            className={`nav-item ${activeTab === "projects" ? "active" : ""}`}
            text="Projects"
            IconComponent={MemoryIcon}
            onClickIcon={() => handleMenuClick("projects")}
          />

          <IconTextRowView
            className={`nav-item ${activeTab === "publish" ? "active" : ""}`}
            text="New"
            IconComponent={AddIcon}
            onClickIcon={() => handleMenuClick("publish")}
          />
          <div className="bottom-nav-group">
            {isAdmin && (
              <IconTextRowView
                className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
                text="Admin"
                IconComponent={SupervisorAccountIcon}
                onClickIcon={() => handleMenuClick("admin")}
              />
            )}

            <IconTextRowView
              className={`nav-item ${activeTab === "billing" ? "active" : ""}`}
              text="Billing"
              IconComponent={CreditCard}
              onClickIcon={() => handleMenuClick("billing")}
            />
            <IconTextRowView
              className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
              text="Settings"
              IconComponent={SettingsIcon}
              onClickIcon={() => handleMenuClick("settings")}
            />
            <IconTextRowView
              className="nav-item logout"
              text="Logout"
              IconComponent={LogoutIcon}
              onClickIcon={() => handleLogout()}
            />
          </div>
        </nav>
      </aside>
    </div>
  );
}

export default Sidebar;
