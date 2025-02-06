import { useEffect, useState } from "react";
import "./AppLayout.css";
import CanisterOptions from "../CanisterOptions/CanisterOptions";

import { Deployment } from "./interfaces";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import Toaster from "../Toast/Toaster";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import IconTextRowView from "../IconTextRowView/IconTextRowView";
import AddIcon from "@mui/icons-material/Add";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import { useAuthority } from "../../context/AuthorityContext/AuthorityContext";
import { State } from "../../App";
import AssetApi from "../../api/assets/AssetApi";
import MainApi from "../../api/main";
import { useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import LanguageIcon from "@mui/icons-material/Language";
import MenuIcon from "@mui/icons-material/Menu";
import ActionBar from "../ActionBar/ActionBar";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { ProgressBar } from "../ProgressBarTop/ProgressBarTop";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import { useTheme } from "../../context/ThemeContext/ThemeContext";
import ThemeToggle from "../ThemeToggle/ThemeToggle";

export type MenuItem =
  | "publish"
  | "websites"
  | "admin"
  | "logout"
  | "settings"
  | "home";

interface AppLayoutProps {
  state: State;
  setState: (state: State) => void;
  children: React.ReactNode;
}

function AppLayout({ state, setState, children }: AppLayoutProps) {
  /** Hooks */
  const { disconnect, refreshIdentity, identity } = useIdentity();
  const { isLoadingStatus } = useAuthority();
  const {
    deployments,
    refreshDeployments,
    isLoading,
    selectedDeployment,
    setSelectedDeployment,
  } = useDeployments();
  const navigate = useNavigate();
  const { actionBar, setActionBar } = useActionBar();
  const { toasterData, showToaster, setToasterData, setShowToaster } =
    useToaster();
  const { activeTab, setActiveTab } = useSideBar();
  const { isDarkMode, toggleTheme } = useTheme();

  /** State */
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem>("home");
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);

  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [showLoadbar, setShowLoadbar] = useState<boolean>(false);
  const [completeLoadbar, setCompleteLoadbar] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /** Functions */
  useEffect(() => {
    const fetchWasmModule = async () => {
      const mainApi = await MainApi.create(identity);
      const wasmModule = await mainApi?.actor?.getWasmModule();
      console.log(`Wasm Module:`, wasmModule);
    };
    fetchWasmModule();
  }, []);

  useEffect(() => {
    console.log(`refreshIdentity`);
    refreshIdentity();
  }, [activeMenuItem]);

  useEffect(() => {
    if (!deployments.length) {
      return;
    }
    const selectedDeploymentUpdated = deployments.find(
      (deployment) =>
        deployment.canister_id.toText() ===
        selectedDeployment?.canister_id.toText()
    );
    if (selectedDeploymentUpdated) {
      setSelectedDeployment(selectedDeploymentUpdated);
      setState({
        canister_id: selectedDeploymentUpdated.canister_id.toText(),
      });
    }
  }, [deployments]);

  useEffect(() => {
    const get = async () => {
      if (!deployments.length) {
        return;
      }
      const assetApi = new AssetApi();
    };
    get();
  }, [deployments]);

  useEffect(() => {
    refreshDeployments();
  }, []);

  const handleHideOptionsModal = () => {
    setShowOptionsModal(false);
    setSelectedDeployment(null);
    setState({ canister_id: "" });
  };

  useEffect(() => {}, [selectedDeployment]);

  const handleSelectDeployment = (deployment: Deployment) => {
    setShowDetails(true);
    setSelectedDeployment(deployment);
    setState({ canister_id: deployment.canister_id.toText() });
  };

  if (showOptionsModal && selectedDeployment) {
    return (
      <CanisterOptions
        deployment={selectedDeployment}
        show={showOptionsModal}
        onHide={handleHideOptionsModal}
      />
    );
  }

  const handleMenuClick = (menuItem: MenuItem) => {
    switch (menuItem) {
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
        navigate("/app/admin");
        break;
    }
    setActiveTab(menuItem);
  };

  return (
    <div className="app-layout">
      <ThemeToggle />
      <ProgressBar />
      {showToaster && toasterData && (
        <Toaster
          headerContent={toasterData.headerContent}
          toastStatus={toasterData.toastStatus}
          toastData={toasterData.toastData}
          textColor={toasterData.textColor}
          show={showToaster}
          onHide={() => setShowToaster(false)}
          timeout={toasterData.timeout ? toasterData.timeout : 3000}
          link=""
          overrideTextStyle=""
        />
      )}

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
            <IconTextRowView
              className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
              text="Admin"
              IconComponent={SupervisorAccountIcon}
              onClickIcon={() => handleMenuClick("admin")}
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

      <main className="main-content" onClick={() => setIsMobileMenuOpen(false)}>
        {children}

        {actionBar && <ActionBar {...actionBar} />}
      </main>
    </div>
  );
}

export default AppLayout;
