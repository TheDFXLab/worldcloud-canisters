import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import IconTextRowView from "../IconTextRowView/IconTextRowView";
import HomeIcon from "@mui/icons-material/Home";
import LanguageIcon from "@mui/icons-material/Language";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import { CreditCard } from "@mui/icons-material";
import MenuIcon from "@mui/icons-material/Menu";

import { useNavigate } from "react-router-dom";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";

import "./Sidebar.css";
import { useEffect } from "react";
import { useAdmin } from "../../context/AdminContext/AdminContext";

export type MenuItem =
  | "publish"
  | "websites"
  | "admin"
  | "logout"
  | "settings"
  | "billing"
  | "home";

function Sidebar() {
  const { isAdmin } = useAdmin();
  const { disconnect } = useIdentity();
  const { activeTab, isMobileMenuOpen, setIsMobileMenuOpen, setActiveTab } =
    useSideBar();
  const navigate = useNavigate();

  const handleMenuClick = (menuItem: MenuItem) => {
    switch (menuItem) {
      case "billing":
        navigate("/app/billing");
        break;
      case "settings":
        navigate("/app/settings");
        break;
      case "home":
        navigate("/app");
        break;
      case "publish":
        navigate("/app/new");
        break;
      case "websites":
        navigate("/app/websites");
        break;
      case "admin":
        if (isAdmin) {
          navigate("/app/admin");
        }
        break;
    }
    setActiveTab(menuItem);
  };

  return (
    <div>
      <button
        className={`mobile-menu-button ${isMobileMenuOpen ? "hidden" : ""}`}
        onClick={() => setIsMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>
      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? "show" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside className={`sidebar ${isMobileMenuOpen ? "open" : ""}`}>
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
              onClickIcon={() => disconnect()}
            />
          </div>
        </nav>
      </aside>
    </div>
  );
}

export default Sidebar;
