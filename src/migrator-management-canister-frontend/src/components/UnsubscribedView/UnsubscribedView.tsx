import React, { useEffect, useState } from "react";
import "./UnsubscribedView.css";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import { useNavigate } from "react-router-dom";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import MainApi from "../../api/main";
import HeaderCard from "../HeaderCard/HeaderCard";
import { Spinner } from "react-bootstrap";

// Icons
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import GitHubIcon from "@mui/icons-material/GitHub";
import ScheduleIcon from "@mui/icons-material/Schedule";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import { Tooltip } from "@mui/material";
import { useLoadBar } from "../../context/LoadBarContext/LoadBarContext";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import { useFreemiumLogic } from "../../hooks/useFreemiumLogic";
import { useSubscriptionLogic } from "../../hooks/useSubscriptionLogic";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../state/store";
import { createSubscription } from "../../state/slices/subscriptionSlice";

const UnsubscribedView: React.FC = () => {
  /** Hooks */
  const dispatch = useDispatch<AppDispatch>();
  const { setActiveTab } = useSideBar();
  const navigate = useNavigate();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const { setToasterData, setShowToaster } = useToaster();
  const { summon, destroy } = useLoaderOverlay();
  const { usageData, isLoading: isLoadingUsageData } = useFreemiumLogic();

  /** State variables */
  const { setShowLoadBar } = useLoadBar();
  const [isRequestingFreemium, setIsRequestingFreemium] = useState(false);

  useEffect(() => {
    setActiveTab("publish");
  }, []);

  const handleNavigateToBilling = () => {
    navigate("/dashboard/billing");
  };

  const handleSubscribeFreemium = async () => {
    if (!identity || !agent) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please connect your wallet first",
        textColor: "white",
      });
      setShowToaster(true);
      return;
    }

    try {
      setShowLoadBar(true);
      summon("Subscribing...");

      const result = await dispatch(
        createSubscription({
          identity,
          agent,
          tierId: 3,
        })
      ).unwrap();

      if (!result) {
        throw new Error("Failed to create subscription");
      }

      setToasterData({
        headerContent: "Subscription Created",
        toastStatus: true,
        toastData: `Subscribed to plan`,
        timeout: 2000,
      });
      setShowToaster(true);
      navigate("/dashboard/new");
    } catch (error) {
      console.error("Error subscribing to freemium:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to subscribe. Please try again.";
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: errorMessage,
        textColor: "white",
      });
      setShowToaster(true);
    } finally {
      setShowLoadBar(false);
      destroy();
    }
  };

  return (
    <div className="unsubscribed-container">
      <HeaderCard
        title="Deploy Your Website"
        description="Choose how you want to get started with Internet Computer hosting"
        className="unsubscribed-header header-card-layout-column"
      />

      {/* Main Action Cards */}
      <div className="action-cards-grid">
        {/* Freemium Card */}
        <div className="action-card freemium-card">
          <div className="card-header">
            <div className="card-icon freemium-icon">
              <RocketLaunchIcon />
            </div>
            <div className="card-badge">Free</div>
          </div>

          <div className="card-content">
            <h3>Try Freemium</h3>
            <p className="card-description">
              Deploy your website instantly with our freemium plan. Perfect for
              testing and quick demos.
            </p>

            <div className="freemium-features">
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>Deploy from GitHub in minutes</span>
              </div>
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>Live preview for 4 hours</span>
              </div>
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>Up to 3 deployments per day</span>
              </div>
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>No credit card required</span>
              </div>
            </div>

            <div className="usage-info">
              <div className="usage-item">
                <ScheduleIcon className="usage-icon" />
                <span>4-hour sessions</span>
              </div>
              <div className="usage-item">
                <GitHubIcon className="usage-icon" />
                <span>GitHub integration</span>
              </div>
            </div>
          </div>

          <div className="card-actions">
            <button
              className="primary-action-btn"
              onClick={handleSubscribeFreemium}
              disabled={isRequestingFreemium}
            >
              {isRequestingFreemium ? (
                <>
                  <Spinner size="sm" />
                  Creating Session...
                </>
              ) : (
                <>
                  <PlayArrowIcon />
                  Subscribe Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="action-card subscription-card">
          <div className="card-header">
            <div className="card-icon subscription-icon">
              <WorkspacePremiumIcon />
            </div>
            <div className="card-badge premium">Premium</div>
          </div>

          <div className="card-content">
            <h3>Upgrade to Premium</h3>
            <p className="card-description">
              Get unlimited deployments, custom domains, and advanced features
              for your production projects.
            </p>

            <div className="subscription-features">
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>Unlimited deployments</span>
              </div>
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>Custom domains</span>
              </div>
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>Advanced analytics</span>
              </div>
              <div className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span>Priority support</span>
              </div>
            </div>

            <div className="pricing-preview">
              <div className="price-item">
                <span className="price-label">Starting at</span>
                <span className="price-value">0.5 ICP</span>
              </div>
              <div className="price-item">
                <span className="price-label">One-time payment</span>
                <span className="price-value">No recurring fees</span>
              </div>
            </div>
          </div>

          <div className="card-actions">
            <button
              className="secondary-action-btn"
              onClick={handleNavigateToBilling}
            >
              <ArrowForwardIcon />
              View All Plans
            </button>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="benefits-section">
        <h3>Why Choose Internet Computer?</h3>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">
              <SpeedIcon />
            </div>
            <h4>Lightning Fast</h4>
            <p>
              Deploy globally distributed applications with sub-second response
              times
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">
              <SecurityIcon />
            </div>
            <h4>Secure by Design</h4>
            <p>
              Built-in security with tamper-proof canisters and decentralized
              hosting
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">
              <AccountBalanceWalletIcon />
            </div>
            <h4>Cost Effective</h4>
            <p>
              Pay only for what you use with transparent pricing and no hidden
              fees
            </p>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="help-section">
        <div className="help-content">
          <div className="help-text">
            <h4>Need Help Getting Started?</h4>
            <p>Check out our documentation or reach out to our support team</p>
          </div>
          <div className="help-actions">
            <button className="help-btn">
              <InfoIcon />
              View Documentation
            </button>
            <button className="help-btn">
              <GitHubIcon />
              GitHub Examples
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnsubscribedView;
