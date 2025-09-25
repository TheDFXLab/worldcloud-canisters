import { useEffect, useState } from "react";
import "./AppLayout.css";
import CanisterOptions from "../CanisterOptions/CanisterOptions";

import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import Toaster from "../Toast/Toaster";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { State } from "../../App";
import AssetApi from "../../api/assets/AssetApi";
import MainApi from "../../api/main";
import { useNavigate, useLocation } from "react-router-dom";
import ActionBar from "../ActionBar/ActionBar";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { ProgressBar } from "../ProgressBarTop/ProgressBarTop";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { useLedger } from "../../context/LedgerContext/LedgerContext";
import LoaderOverlay from "../LoaderOverlay/LoaderOverlay";
import Sidebar from "../Sidebar/Sidebar";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import HeaderCard from "../HeaderCard/HeaderCard";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";
import { serializeDeployment } from "../../utility/principal";
import ErrorDisplay from "../ErrorDisplay/ErrorDisplay";
import { useError } from "../../context/ErrorContext/ErrorContext";

interface AppLayoutProps {
  state: State;
  setState: (state: State) => void;
  children: React.ReactNode;
}

function AppLayout({ state, setState, children }: AppLayoutProps) {
  /** Hooks */
  const { refreshIdentity, identity, isLoadingIdentity } = useIdentity();
  const { getBalance } = useLedger();
  const { deployments, selectedDeployment, setSelectedDeployment } =
    useDeployments();
  const { actionBar } = useActionBar();
  const {
    activeTab,
    isSidebarCollapsed,
    isMobile,
    setIsMobileMenuOpen,
    setIsSidebarCollapsed,
    handleClose,
  } = useSideBar();
  const { agent } = useHttpAgent();
  const { headerCard } = useHeaderCard();
  const { toasterData, showToaster, setShowToaster } = useToaster();
  const { error, isErrorVisible, hideError } = useError();
  const location = useLocation();

  /** State */
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);

  /** Functions */
  useEffect(() => {
    const fetchWasmModule = async () => {
      if (!identity || !agent) {
        return;
      }
      const mainApi = await MainApi.create(identity, agent);
      const wasmModule = await mainApi?.actor?.getWasmModule();
    };
    fetchWasmModule();
  }, [identity, agent]);

  // Scroll to top when route changes
  useEffect(() => {
    const scrollToTop = () => {
      // Scroll the main content container to top
      const mainContent = document.querySelector(
        ".app-layout-children-container"
      );
      if (mainContent) {
        mainContent.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    };

    scrollToTop();
  }, [location.pathname]);

  useEffect(() => {
    const get = async () => {
      if (!deployments.length) {
        return;
      }
    };
    get();
  }, [deployments]);

  const handleHideOptionsModal = () => {
    setShowOptionsModal(false);
    setSelectedDeployment(null);
    setState({ canister_id: "" });
  };

  useEffect(() => {}, [selectedDeployment]);

  if (showOptionsModal && selectedDeployment) {
    return (
      <CanisterOptions
        deployment={selectedDeployment}
        show={showOptionsModal}
        onHide={handleHideOptionsModal}
      />
    );
  }
  return (
    <div className="app-layout" style={{ display: "flex", height: "100vh" }}>
      <LoaderOverlay />
      {toasterData && (
        <Toaster
          headerContent={toasterData.headerContent}
          toastStatus={toasterData.toastStatus}
          toastData={toasterData.toastData}
          textColor={toasterData.textColor || "white"}
          show={showToaster}
          onHide={() => setShowToaster(false)}
          timeout={toasterData.timeout || 3000}
          link=""
          overrideTextStyle=""
        />
      )}

      {/* Error Display Overlay */}
      {isErrorVisible && error && (
        <div
          className="error-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            zIndex: 300000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
          }}
          onClick={hideError}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ErrorDisplay {...error} onRetry={error.onRetry || hideError} />
          </div>
        </div>
      )}

      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />
      <main
        className="main-content"
        style={{
          flex: 1,
          transition: "margin 0.2s",
          marginLeft: isMobile ? 0 : isSidebarCollapsed ? 0 : 260,
          minWidth: 0,
        }}
        onClick={() => handleClose()}
      >
        {headerCard && (
          <div className="app-layout-header-wrapper">
            <div className="app-layout-header">
              <HeaderCard
                title={headerCard.title}
                description={headerCard.description}
                className={headerCard.className}
              />
            </div>
          </div>
        )}

        <div className="app-layout-children-container">{children}</div>
        {actionBar && <ActionBar {...actionBar} />}
      </main>
    </div>
  );
}

export default AppLayout;
