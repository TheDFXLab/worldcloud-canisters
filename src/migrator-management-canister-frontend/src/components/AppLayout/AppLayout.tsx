import { useEffect, useState } from "react";
import "./AppLayout.css";
import CanisterOptions from "../CanisterOptions/CanisterOptions";

import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import Toaster from "../Toast/Toaster";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { State } from "../../App";
import AssetApi from "../../api/assets/AssetApi";
import MainApi from "../../api/main";
import { useNavigate } from "react-router-dom";
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

interface AppLayoutProps {
  state: State;
  setState: (state: State) => void;
  children: React.ReactNode;
}

function AppLayout({ state, setState, children }: AppLayoutProps) {
  /** Hooks */
  const { refreshIdentity, identity, isLoadingIdentity } = useIdentity();
  const { getBalance } = useLedger();
  const {
    deployments,
    refreshDeployments,
    isLoading,
    selectedDeployment,
    setSelectedDeployment,
  } = useDeployments();
  const { actionBar } = useActionBar();
  const { activeTab, setIsMobileMenuOpen } = useSideBar();
  const { agent } = useHttpAgent();
  /** State */
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 768 ? true : false
  );

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

  useEffect(() => {
    console.log(`refreshIdentity`);

    refreshIdentity();
  }, [activeTab]);

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
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        mobileControl={[isMobile, setIsMobile]}
      />
      <main
        className="main-content"
        style={{
          flex: 1,
          transition: "margin 0.2s",
          marginLeft: isMobile ? 0 : isSidebarCollapsed ? 0 : 260,
          minWidth: 0,
        }}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        {children}
        {actionBar && <ActionBar {...actionBar} />}
      </main>
    </div>
  );
}

export default AppLayout;
