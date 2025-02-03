import { useEffect, useState } from "react";
import "./CanisterDeployer.css";
import { Principal } from "@dfinity/principal";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { ProgressBar } from "../ProgressBarTop/ProgressBarTop";
import MainApi from "../../api/main";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { useNavigate } from "react-router-dom";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";

interface CanisterDeployerProps {}

function CanisterDeployer({}: CanisterDeployerProps) {
  /** Hooks */
  const { addDeployment, refreshDeployments } = useDeployments();
  const { identity } = useIdentity();
  const { setActionBar } = useActionBar();
  const { setToasterData, setShowToaster } = useToaster();
  const navigate = useNavigate();
  const { setActiveTab } = useSideBar();

  /**State */
  const [state, setState] = useState({
    selectedFile: null,
    uploadProgress: 0,
    message: "",
  });

  const [, setCanisterId] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Set the active tab to publish
  useEffect(() => {
    setActiveTab("publish");
  }, []);

  useEffect(() => {
    console.log(`Loading barrrr`);
    setActionBar({
      icon: "🔨",
      text: "Ready to deploy your canister",
      buttonText: "Deploy Canister",
      onButtonClick: handleDeploy,
      isButtonDisabled: isLoading,
      isHidden: false,
    });
  }, [isLoading]);

  const handleDeploy = async () => {
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

        navigate(`/app/deploy/${result?.message as string}`);
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
    <div className="publish-flow">
      <section className="beta-test-section">
        <ProgressBar isLoading={isLoading} />
        <div className="container">
          <div className="canister-deployer">
            <div className="header">
              <h2>Deploy Your Canister</h2>
              <p className="subtitle">
                Get started with Internet Computer hosting
              </p>
            </div>

            <div className="info-grid">
              <div className="info-card">
                <span className="icon">🚀</span>
                <h3>Fast Deployment</h3>
                <p>
                  Deploy your website to IC in minutes with automated build
                  process
                </p>
              </div>
              <div className="info-card">
                <span className="icon">🔒</span>
                <h3>Secure Hosting</h3>
                <p>Your content is distributed across the secure IC network</p>
              </div>
              <div className="info-card">
                <span className="icon">⚡</span>
                <h3>High Performance</h3>
                <p>
                  Benefit from IC's distributed infrastructure for optimal speed
                </p>
              </div>
              <div className="info-card">
                <span className="icon">🌐</span>
                <h3>Global Access</h3>
                <p>Your site is accessible worldwide through IC's network</p>
              </div>
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
          </div>
        </div>
      </section>
    </div>
  );
}

export default CanisterDeployer;
