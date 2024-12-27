import React, { useState } from "react";
import { migrator_management_canister_backend } from "../../../../declarations/migrator-management-canister-backend";
import "./CanisterDeployer.css";

function CanisterDeployer() {
  const [canisterId, setCanisterId] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDeploy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("deploying canister...");
    setIsLoading(true);
    const result =
      await migrator_management_canister_backend.deployAssetCanister();
    if ("ok" in result) {
      setCanisterId(result.ok);
      setStatus(`Canister deployed with ID: ${result.ok}`);
    } else {
      setStatus(`Error: ${result.err}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="canister-deployer">
      <form onSubmit={handleDeploy}>
        <div className="form-group">
          <button type="submit" disabled={isLoading}>
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
    </div>
  );
}

export default CanisterDeployer;
