import { useState } from "react";
import CanisterDeployer from "../CanisterDeployer/CanisterDeployer";
import FileUploader from "../FileUploader/FileUploader";
import "./AppLayout.css";

type MenuItem = "publish" | "websites";

function AppLayout() {
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem>("websites");
  const [deployedCanisterId, setDeployedCanisterId] = useState<string>("");

  const handleCanisterDeployed = (canisterId: string) => {
    setDeployedCanisterId(canisterId);
  };

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
            <table className="websites-table">
              <thead>
                <tr>
                  <th>Canister ID</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>{/* We'll populate this later */}</tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default AppLayout;
