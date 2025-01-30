import { useEffect, useState } from "react";
import CanisterDeployer from "../CanisterDeployer/CanisterDeployer";
import FileUploader from "../FileUploader/FileUploader";
import "./AppLayout.css";
import { Badge, Table } from "react-bootstrap";
import { CiEdit } from "react-icons/ci";
import CanisterOptions from "../CanisterOptions/CanisterOptions";

import { Deployment } from "./interfaces";
import { CanisterManagement } from "../CanisterManagement/CanisterManagement";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { ProgressBar } from "../ProgressBarTop/ProgressBarTop";
import Toaster, { ToasterData } from "../Toast/Toaster";
import WasmUploader from "../WasmUploader/WasmUploader";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import LogoutIcon from "@mui/icons-material/Logout";
import IconTextRowView from "../IconTextRowView/IconTextRowView";
import StorageIcon from "@mui/icons-material/Storage";
import AddIcon from "@mui/icons-material/Add";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import { useAuthority } from "../../context/AuthorityContext/AuthorityContext";
import { State } from "../../App";
import AssetApi from "../../api/assets/AssetApi";
import ProjectDeployment from "../ProjectDeployment/ProjectDeployment";
import MainApi from "../../api/main";
import { environment, reverse_proxy_url } from "../../config/config";

type MenuItem = "publish" | "websites" | "admin" | "logout";

enum BadgeColor {
  "uninitialized" = "secondary",
  "installing" = "warning",
  "installed" = "success",
  "failed" = "danger",
}
interface AppLayoutProps {
  state: State;
  setState: (state: State) => void;
  selectedDeployment: Deployment | null;
  setSelectedDeployment: (deployment: Deployment | null) => void;
  showToaster: boolean;
  toasterData: ToasterData;
  setShowToaster: (show: boolean) => void;
  setToasterData: (data: ToasterData) => void;
}

function AppLayout({
  state,
  setState,
  selectedDeployment,
  setSelectedDeployment,
  showToaster,
  toasterData,
  setShowToaster,
  setToasterData,
}: AppLayoutProps) {
  /** Hooks */
  const { disconnect, refreshIdentity, identity } = useIdentity();
  const { isLoadingStatus } = useAuthority();
  const { deployments, refreshDeployments, isLoading } = useDeployments();

  /** State */
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem>("websites");
  const [deployedCanisterId, setDeployedCanisterId] = useState<string>("");
  const [userDeployments, setUserDeployments] = useState<Deployment[]>([]);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);

  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [showLoadbar, setShowLoadbar] = useState<boolean>(false);
  const [completeLoadbar, setCompleteLoadbar] = useState<boolean>(false);

  /** Functions */
  const handleCanisterDeployed = (canisterId: string) => {
    setDeployedCanisterId(canisterId);
  };

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
    const checkRateLimit = async () => {
      try {
        const response = await fetch(
          `${
            environment === "production" ? "" : reverse_proxy_url
          }/https://api.github.com/rate_limit`,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        console.log("GitHub Rate Limit Status:", {
          core: data.resources.core,
          search: data.resources.search,
          graphql: data.resources.graphql,
          integration_manifest: data.resources.integration_manifest,
          source_import: data.resources.source_import,
        });
      } catch (err) {
        console.error("Failed to check rate limit:", err);
      }
    };

    checkRateLimit();
  }, []);

  useEffect(() => {
    const selectedDeploymentUpdated = userDeployments.find(
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
  }, [userDeployments, deployedCanisterId]);

  useEffect(() => {
    setUserDeployments(deployments);
  }, [deployments]);

  useEffect(() => {}, [deployedCanisterId]);

  useEffect(() => {
    const get = async () => {
      if (!deployments.length) {
        return;
      }
      const assetApi = new AssetApi();
    };
    get();
  }, [deployedCanisterId, deployments]);

  useEffect(() => {
    refreshDeployments();
  }, []);

  const handleOptionsModal = (deployment: Deployment) => {
    setShowOptionsModal(true);
    setSelectedDeployment(deployment);
    setState({ canister_id: deployment.canister_id.toText() });
  };

  const handleHideOptionsModal = () => {
    setShowOptionsModal(false);
    setSelectedDeployment(null);
    setState({ canister_id: "" });
  };

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
        setCanisterId={setDeployedCanisterId}
        setToasterData={setToasterData}
        setShowToaster={setShowToaster}
      />
    );
  }

  return (
    <div className="app-layout">
      {showToaster && (
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
      <ProgressBar
        isLoading={isLoading || showLoadbar || isLoadingStatus}
        isEnded={completeLoadbar}
      />

      <aside className="sidebar">
        <nav className="sidebar-nav">
          <IconTextRowView
            className={`nav-item ${activeMenuItem === "admin" ? "active" : ""}`}
            text="Admin"
            IconComponent={SupervisorAccountIcon}
            onClickIcon={() => setActiveMenuItem("admin")}
            iconColor="black"
          />
          <IconTextRowView
            className={`nav-item ${
              activeMenuItem === "publish" ? "active" : ""
            }`}
            text="New"
            IconComponent={AddIcon}
            onClickIcon={() => setActiveMenuItem("publish")}
            iconColor="black"
          />

          <IconTextRowView
            className={`nav-item ${
              activeMenuItem === "websites" ? "active" : ""
            }`}
            text="My Cloud"
            IconComponent={StorageIcon}
            onClickIcon={() => setActiveMenuItem("websites")}
            iconColor="black"
          />

          <IconTextRowView
            className={`nav-item logout ${
              activeMenuItem === "logout" ? "active" : ""
            }`}
            text="Logout"
            IconComponent={LogoutIcon}
            onClickIcon={() => disconnect()}
            iconColor="red"
          />
        </nav>
      </aside>

      <main className="main-content">
        {
          <div
            className="admin-flow"
            style={{ display: activeMenuItem === "admin" ? "block" : "none" }}
          >
            <div>
              <WasmUploader onClick={() => setShowLoadbar(true)} />
            </div>
          </div>
        }
        {
          <div
            className="publish-flow"
            style={{
              display: activeMenuItem === "publish" ? "block" : "none",
            }}
          >
            {!deployedCanisterId ? (
              <CanisterDeployer
                onDeploy={handleCanisterDeployed}
                setShowToaster={setShowToaster}
                setToasterData={setToasterData}
              />
            ) : (
              <ProjectDeployment
                canisterId={deployedCanisterId}
                setCanisterId={setDeployedCanisterId}
                setToasterData={setToasterData}
                setShowToaster={setShowToaster}
              />
            )}
          </div>
        }

        {
          <div
            className="websites-list"
            style={{
              display: activeMenuItem === "websites" ? "block" : "none",
            }}
          >
            {showDetails ? (
              <CanisterManagement
                deployment={selectedDeployment}
                setShowDetails={setShowDetails}
                setShowToaster={setShowToaster}
                setToasterData={setToasterData}
                setShowLoadBar={setShowLoadbar}
                setCompleteLoadbar={setCompleteLoadbar}
                state={state}
              />
            ) : (
              <>
                <h2>My Websites</h2>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Canister ID</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Updated At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDeployments.map((deployment) => (
                      <tr key={deployment.canister_id.toString()}>
                        <td
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSelectDeployment(deployment)}
                        >
                          {" "}
                          {deployment.canister_id.toText()}
                        </td>
                        <td>
                          <Badge bg={BadgeColor[deployment.status]}>
                            {deployment.status}
                          </Badge>
                        </td>
                        <td>
                          {new Date(
                            Number(deployment.date_created) / 1000000
                          ).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                          })}
                        </td>
                        <td>
                          {new Date(
                            Number(deployment.date_updated) / 1000000
                          ).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                          })}
                        </td>
                        <td>
                          <CiEdit
                            style={{ cursor: "pointer" }}
                            onClick={() => handleOptionsModal(deployment)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </div>
        }
      </main>
    </div>
  );
}

export default AppLayout;
