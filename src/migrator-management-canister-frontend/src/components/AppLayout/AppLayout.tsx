import { useEffect, useState } from "react";
import CanisterDeployer from "../CanisterDeployer/CanisterDeployer";
import FileUploader from "../FileUploader/FileUploader";
import "./AppLayout.css";
import { migrator_management_canister_backend } from "../../../../declarations/migrator-management-canister-backend";
import { Badge, Table } from "react-bootstrap";
import { Principal } from "@dfinity/principal";

type MenuItem = "publish" | "websites";
type CanisterDeploymentStatus =
  | "uninitialized"
  | "installing"
  | "installed"
  | "failed";

interface Deployment {
  canister_id: Principal;
  date_created: string;
  date_updated: string;
  size: number;
  status: CanisterDeploymentStatus;
}

function AppLayout() {
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem>("websites");
  const [deployedCanisterId, setDeployedCanisterId] = useState<string>("");
  const [userDeployments, setUserDeployments] = useState<Deployment[]>([]);

  const handleCanisterDeployed = (canisterId: string) => {
    setDeployedCanisterId(canisterId);
  };

  useEffect(() => {
    const getUserDeployments = async () => {
      const deployments =
        await migrator_management_canister_backend.getCanisterDeployments();
      console.log(`deployments: `, deployments);
      setUserDeployments(deployments as unknown as Deployment[]);
    };
    getUserDeployments();
  }, []);

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
        {activeMenuItem === "publish" && (
          <div className="publish-flow">
            {!deployedCanisterId ? (
              <CanisterDeployer onDeploy={handleCanisterDeployed} />
            ) : (
              <FileUploader canisterId={deployedCanisterId} />
            )}
          </div>
        )}

        {activeMenuItem === "websites" && (
          <div className="websites-list">
            <h2>My Websites</h2>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Canister ID</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userDeployments.map((deployment) => (
                  <tr key={deployment.canister_id.toString()}>
                    <td>{deployment.canister_id.toText()}</td>
                    <td>
                      <Badge bg="success">Active</Badge>
                    </td>
                    <td>
                      {new Date(
                        Number(deployment.date_created) / 1000000
                      ).toLocaleString()}
                    </td>
                    <td>
                      <a
                        href={
                          process.env.REACT_APP_ENVIRONMENT === "production"
                            ? `https://${deployment.canister_id.toString()}.icp0.io`
                            : `http://${deployment.canister_id.toString()}.localhost:4943`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-primary"
                      >
                        Visit Site
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}

export default AppLayout;
