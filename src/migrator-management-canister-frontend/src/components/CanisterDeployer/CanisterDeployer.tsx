import { useEffect, useState } from "react";
import { Principal } from "@dfinity/principal";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import MainApi from "../../api/main";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { useNavigate } from "react-router-dom";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import { useProgress } from "../../context/ProgressBarContext/ProgressBarContext";
import HeaderCard from "../HeaderCard/HeaderCard";
import { useSubscription } from "../../context/SubscriptionContext/SubscriptionContext";
import UnsubscribedView from "../UnsubscribedView/UnsubscribedView";
import LoadingView from "../LoadingView/LoadingView";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import LanguageIcon from "@mui/icons-material/Language";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import "./CanisterDeployer.css";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";

interface CanisterDeployerProps {}

function CanisterDeployer({}: CanisterDeployerProps) {
  /** Hooks */
  const { addDeployment, refreshDeployments } = useDeployments();
  const { identity } = useIdentity();
  const { setActionBar } = useActionBar();
  const { setToasterData, setShowToaster } = useToaster();
  const navigate = useNavigate();
  const { setActiveTab } = useSideBar();
  const { setIsLoadingProgress, setIsEnded } = useProgress();
  const { agent } = useHttpAgent();
  const {
    tiers,
    subscription,
    isLoadingSub,
    isLoadingTiers,
    getSubscription,
    validateSubscription,
  } = useSubscription();
  const { summon, destroy } = useLoaderOverlay();

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
    if (!subscription) {
      setActionBar(null);
      return;
    }

    setActionBar({
      icon: "🔨",
      text: "Ready to deploy your canister",
      buttonText: "Deploy Canister",
      onButtonClick: handleDeploy,
      isButtonDisabled: isLoading,
      isHidden: false,
    });
  }, [isLoading, subscription]);

  const handleDeploy = async () => {
    try {
      summon("Canister deployment in progress...");

      const validation = await validateSubscription(true);
      if (!validation.status) {
        setToasterData({
          headerContent: "Error",
          toastStatus: true,
          toastData: validation.message,
          textColor: "red",
          timeout: 5000,
        });

        setShowToaster(true);
        navigate("/dashboard/billing");
        return;
      }
      setIsLoadingProgress(true);
      setIsEnded(false);
      setToasterData({
        headerContent: "Deploying",
        toastStatus: true,
        toastData: "Canister is being deployed. Please wait...",
        textColor: "green",
      });
      setShowToaster(true);

      setIsLoading(true);
      if (!agent) {
        throw new Error("Agent not found");
      }

      const mainApi = await MainApi.create(identity, agent);
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
        refreshDeployments();
        setCanisterId(result?.message as string);

        getSubscription();

        // Navigate to publishing page
        navigate(`/dashboard/deploy/${result?.message as string}`);
      } else {
        setStatus(`Error: ${result?.message}`);
      }
    } catch (error) {
      setToasterData({
        headerContent: "Error",
        toastStatus: true,
        toastData: `Error: ${error}`,
        textColor: "red",
        timeout: 5000,
      });
      setShowToaster(true);
    } finally {
      setIsLoading(false);
      setIsLoadingProgress(false);
      setIsEnded(true);
      destroy();
    }
  };

  if (isLoadingSub || isLoadingTiers) {
    return <LoadingView type="deployment" />;
  }

  if (!subscription) {
    setActionBar(null);
    return <UnsubscribedView />;
  }

  if (subscription.used_slots >= subscription.max_slots) {
    return <UnsubscribedView />;
  }

  return (
    <div className="publish-flow">
      <section className="beta-test-section">
        <div className="container">
          <div className="canister-deployer">
            <HeaderCard
              title="Deploy Your Canister"
              description="Get started with Internet Computer hosting"
              // className="deployment-header"
            />

            <div className="info-grid">
              <div className="info-card">
                <span className="icon">
                  <RocketLaunchIcon />
                </span>
                <h3>Fast Deployment</h3>
                <p>
                  Deploy your website to IC in minutes with automated build
                  process
                </p>
              </div>
              <div className="info-card">
                <span className="icon">
                  <SecurityIcon />
                </span>
                <h3>Secure Hosting</h3>
                <p>Your content is distributed across the secure IC network</p>
              </div>
              <div className="info-card">
                <span className="icon">
                  <SpeedIcon />
                </span>
                <h3>High Performance</h3>
                <p>
                  Benefit from IC's distributed infrastructure for optimal speed
                </p>
              </div>
              <div className="info-card">
                <span className="icon">
                  <LanguageIcon />
                </span>
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
