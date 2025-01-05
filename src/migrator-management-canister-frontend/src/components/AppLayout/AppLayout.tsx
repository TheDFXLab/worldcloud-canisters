import { useEffect, useState } from "react";
import CanisterDeployer from "../CanisterDeployer/CanisterDeployer";
import FileUploader from "../FileUploader/FileUploader";
import "./AppLayout.css";
import { migrator_management_canister_backend } from "../../../../declarations/migrator-management-canister-backend";
import { Badge, Modal, Table } from "react-bootstrap";
import { Principal } from "@dfinity/principal";
import { CiEdit } from "react-icons/ci";
import CanisterOptions from "../CanisterOptions/CanisterOptions";
import { useDeployments } from "../DeploymentContext/DeploymentContext";
import { Deployment } from "./interfaces";

type MenuItem = "publish" | "websites";

enum BadgeColor {
  "uninitialized" = "secondary",
  "installing" = "warning",
  "installed" = "success",
  "failed" = "danger",
}

function AppLayout() {
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem>("websites");
  // const { deployments, isLoading } = useDeployments();
  const [deployedCanisterId, setDeployedCanisterId] = useState<string>("");
  const [userDeployments, setUserDeployments] = useState<Deployment[]>([]);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const [selectedDeployment, setSelectedDeployment] =
    useState<Deployment | null>(null);

  const { deployments, refreshDeployments } = useDeployments();

  const handleCanisterDeployed = (canisterId: string) => {
    setDeployedCanisterId(canisterId);
  };

  useEffect(() => {
    console.log(`userDeployments changed: `, userDeployments);
    console.log(
      `deployedCanisterId changed: `,
      deployedCanisterId,
      selectedDeployment?.canister_id.toText()
    );
    const selectedDeploymentUpdated = userDeployments.find(
      (deployment) =>
        deployment.canister_id.toText() ===
        selectedDeployment?.canister_id.toText()
    );
    console.log(`selectedDeploymentUpdated: `, selectedDeploymentUpdated);
    if (selectedDeploymentUpdated) {
      setSelectedDeployment(selectedDeploymentUpdated);
    }
  }, [userDeployments, deployedCanisterId]);

  useEffect(() => {
    console.log(`deployments changed: `, deployments.length, deployments);
    setUserDeployments(deployments);
  }, [deployments]);

  useEffect(() => {
    console.log(`deployedCanisterId changed: `, deployedCanisterId);
  }, [deployedCanisterId]);

  useEffect(() => {
    refreshDeployments();
  }, []);

  const handleOptionsModal = (deployment: Deployment) => {
    setShowOptionsModal(true);
    setSelectedDeployment(deployment);
  };

  const handleHideOptionsModal = () => {
    setShowOptionsModal(false);
    setSelectedDeployment(null);
  };

  if (showOptionsModal && selectedDeployment) {
    return (
      <CanisterOptions
        deployment={selectedDeployment}
        show={showOptionsModal}
        onHide={handleHideOptionsModal}
        setCanisterId={setDeployedCanisterId}
      />
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${
              activeMenuItem === "publish" ? "active" : ""
            }`}
            onClick={() => setActiveMenuItem("publish")}
          >
            Publish New Website
          </button>
          <button
            className={`nav-item ${
              activeMenuItem === "websites" ? "active" : ""
            }`}
            onClick={() => setActiveMenuItem("websites")}
          >
            My Websites
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {
          <div
            className="publish-flow"
            style={{ display: activeMenuItem === "publish" ? "block" : "none" }}
          >
            {!deployedCanisterId ? (
              <CanisterDeployer onDeploy={handleCanisterDeployed} />
            ) : (
              <FileUploader
                canisterId={deployedCanisterId}
                setCanisterId={setDeployedCanisterId}
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
                    <td>{deployment.canister_id.toText()}</td>
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
          </div>
        }
      </main>
    </div>
  );
}

export default AppLayout;
