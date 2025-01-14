import React, { useState } from "react";
import "./CanisterDeployer.css";
import { Principal } from "@dfinity/principal";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { ProgressBar } from "../ProgressBarTop/ProgressBarTop";
import { ToasterData } from "../Toast/Toaster";
import MainApi from "../../api/main";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";

interface CanisterDeployerProps {
  onDeploy: (canisterId: string) => void;
  setToasterData: (data: ToasterData) => void;
  setShowToaster: (show: boolean) => void;
}

function CanisterDeployer({
  onDeploy,
  setToasterData,
  setShowToaster,
}: CanisterDeployerProps) {
  const { addDeployment, refreshDeployments } = useDeployments();
  const { identity } = useIdentity();

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

    try {
      setToasterData({
        headerContent: "Deploying",
        toastStatus: true,
        toastData: "Canister is being deployed. Please wait...",
        textColor: "green",
      });
      setShowToaster(true);

      // Update progress
      setState((prev) => ({
        ...prev,
        uploadProgress: 0 / 100,
        message: `Deploying Canister: 0%`,
      }));

      setIsLoading(true);

      const mainApi = await MainApi.create(identity);
      const result = await mainApi?.deployAssetCanister();
      console.log(`Result:`, result);

      if (result && result.status) {
        const newDeployment = {
          canister_id: Principal.fromText(result?.message as string),
          status: "uninitialized" as const,
          date_created: Date.now(),
          date_updated: Date.now(),
          size: 0,
        };
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: `Canister deployed at ${result?.message}`,
          textColor: "green",
        });
        setShowToaster(true);
        addDeployment(newDeployment);
        await refreshDeployments();
        setCanisterId(result?.message as string);
        onDeploy(result?.message as string);
      } else {
        setStatus(`Error: ${result?.message}`);
      }
      setIsLoading(false);

      // Update progress
      setState((prev) => ({
        ...prev,
        uploadProgress: 100,
        message: `Deployed: 100%`,
      }));
    } catch (error) {
      setToasterData({
        headerContent: "Error",
        toastStatus: true,
        toastData: `Error: ${error}`,
        textColor: "red",
        timeout: 5000,
      });
      setShowToaster(true);
    }
  };

  return (
    <section className="beta-test-section">
      <ProgressBar isLoading={isLoading} />
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
          {/* <ProgressBar
            progress={state.uploadProgress}
            status={state.message}
            isLoading={isLoading}
            isError={false}
          /> */}
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
