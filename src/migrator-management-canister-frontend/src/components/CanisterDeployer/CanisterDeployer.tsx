import { useEffect, useState } from "react";
import { Principal } from "@dfinity/principal";
import MainApi from "../../api/main";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { useNavigate } from "react-router-dom";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import { useProgress } from "../../context/ProgressBarContext/ProgressBarContext";
import HeaderCard from "../HeaderCard/HeaderCard";
import UnsubscribedView from "../UnsubscribedView/UnsubscribedView";
import LoadingView from "../LoadingView/LoadingView";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import LanguageIcon from "@mui/icons-material/Language";

import "./CanisterDeployer.css";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { decodeError } from "../../utility/errors";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../state/store";
import { useSubscriptionLogic } from "../../hooks/useSubscriptionLogic";
import { deployProject } from "../../state/slices/projectsSlice";

interface CanisterDeployerProps {}

function CanisterDeployer({}: CanisterDeployerProps) {
  /** Hooks */
  const dispatch = useDispatch<AppDispatch>();
  const { identity } = useIdentity();
  const { setActionBar } = useActionBar();
  const { setToasterData, setShowToaster } = useToaster();
  const navigate = useNavigate();
  const { setActiveTab } = useSideBar();
  const { setIsLoadingProgress, setIsEnded } = useProgress();
  const { agent } = useHttpAgent();
  const {
    subscription,
    isLoading: isLoadingSub,
    validateSubscription,
  } = useSubscriptionLogic();
  const { summon, destroy } = useLoaderOverlay();

  /**State */
  const [state, setState] = useState({
    selectedFile: null,
    uploadProgress: 0,
    message: "",
  });

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

  // Create a wrapper function that matches the expected type
  const validateSubscriptionWrapper = async () => {
    const result = await validateSubscription(true);
    return {
      status: result.status,
      message: result.message,
    };
  };

  const handleDeploy = async (projectId: bigint) => {
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
      setIsLoading(true);

      setToasterData({
        headerContent: "Deploying",
        toastStatus: true,
        toastData: "Canister is being deployed. Please wait...",
        textColor: "green",
      });
      setShowToaster(true);

      if (!agent || !identity) {
        throw new Error("Agent or identity not found");
      }

      // Use Redux thunk for deployment
      const result = await dispatch(
        deployProject({
          identity,
          agent,
          projectId,
          isFreemium: false,
          validateSubscription: validateSubscriptionWrapper,
        })
      ).unwrap();

      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Canister deployed at ${result.canisterId}`,
        textColor: "green",
      });
      setShowToaster(true);

      // Navigate to publishing page
      navigate(`/dashboard/deploy/${result.canisterId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setToasterData({
        headerContent: "Error",
        toastStatus: true,
        toastData: `Error: ${errorMessage}`,
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

  if (isLoadingSub) {
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
            {/* <HeaderCard
              title="Deploy Your Canister"
              description="Get started with Internet Computer hosting"
            /> */}

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
                  Enjoy fast loading times with distributed content delivery
                </p>
              </div>
              <div className="info-card">
                <span className="icon">
                  <LanguageIcon />
                </span>
                <h3>Global Access</h3>
                <p>Your website is accessible from anywhere in the world</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default CanisterDeployer;
