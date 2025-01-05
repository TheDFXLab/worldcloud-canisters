import React, { useState } from "react";
import { migrator_management_canister_backend } from "../../../../declarations/migrator-management-canister-backend";
import "./CanisterDeployer.css";
import { Principal } from "@dfinity/principal";
import ProgressBar from "../ProgressBar/ProgressBar";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";

function CanisterDeployer({
  onDeploy,
}: {
  onDeploy: (canisterId: string) => void;
}) {
  const { addDeployment, refreshDeployments } = useDeployments();
  const [state, setState] = useState({
    selectedFile: null,
    uploadProgress: 0,
    message: "",
  });

  const [canisterId, setCanisterId] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDeploy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Update progress
    setState((prev) => ({
      ...prev,
      uploadProgress: 0 / 100,
      message: `Deploying Canister: 0%`,
    }));

    console.log("deploying canister...");
    setIsLoading(true);
    const result =
      await migrator_management_canister_backend.deployAssetCanister();
    if ("ok" in result) {
      const newDeployment = {
        canister_id: Principal.fromText(result.ok),
        status: "uninitialized" as const,
        date_created: Date.now(),
        date_updated: Date.now(),
        size: 0,
      };
      addDeployment(newDeployment);
      await refreshDeployments();
      setCanisterId(result.ok);
      onDeploy(result.ok);
    } else {
      setStatus(`Error: ${result.err}`);
    }
    setIsLoading(false);

    // Update progress
    setState((prev) => ({
      ...prev,
      uploadProgress: 100,
      message: `Deployed: 100%`,
    }));
  };

  return (
    <section className="beta-test-section">
      <h2> Canister Deployment</h2>
      <div className="container">
        <div className="canister-deployer">
          {/* <p className="step-title">1. Canister Deployment </p> */}

          <p className="step-title">
            Deploying your private canister is essential for hosting your
            website on the Internet Computer network.
          </p>

          <form onSubmit={handleDeploy}>
            <div className="form-group">
              <button type="submit" disabled={isLoading} className="cta-button">
                {isLoading ? "Deploying..." : "Deploy Canister"}
              </button>
            </div>
            {status && (
              <div
                className={`status ${
                  status.includes("Error") ? "error" : "success"
                }`}
              >
                {status}
              </div>
            )}
          </form>
          <ProgressBar
            progress={state.uploadProgress}
            status={state.message}
            isLoading={isLoading}
            isError={false}
          />
          {/* <div className="progress">
            {state.uploadProgress > 0 && (
              <progress value={state.uploadProgress} max="100" />
            )}
          </div> */}
          {/* <div className="message">{state.message}</div> */}
        </div>
      </div>
    </section>
  );
}

export default CanisterDeployer;
