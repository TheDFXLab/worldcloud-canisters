import React, { useEffect } from "react";
import "./UnsubscribedView.css";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import { useNavigate } from "react-router-dom";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import SavingsIcon from "@mui/icons-material/Savings";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HeaderCard from "../HeaderCard/HeaderCard";

const UnsubscribedView: React.FC = () => {
  const { setActiveTab } = useSideBar();
  const navigate = useNavigate();

  useEffect(() => {
    setActiveTab("publish");
  }, []);

  const handleNavigateToBilling = () => {
    navigate("/app/billing");
  };

  return (
    <div className="beta-test-section">
      <div className="container">
        <div className="canister-deployer">
          <HeaderCard
            title="Start Your Deployment Journey"
            description="Choose a subscription plan to begin deploying on the Internet Computer"
            className="deployment-header"
          />

          <div className="info-grid">
            <div className="info-card">
              <span className="icon">
                <RocketLaunchIcon />
              </span>
              <h3>Quick Deployment</h3>
              <p>
                Deploy your canisters in minutes with our streamlined process
              </p>
            </div>
            <div className="info-card">
              <span className="icon">
                <SecurityIcon />
              </span>
              <h3>Secure & Reliable</h3>
              <p>Enterprise-grade security for your deployments on the IC</p>
            </div>
            <div className="info-card">
              <span className="icon">
                <SpeedIcon />
              </span>
              <h3>High Performance</h3>
              <p>Optimized deployment process with real-time monitoring</p>
            </div>
            <div className="info-card">
              <span className="icon">
                <SavingsIcon />
              </span>
              <h3>Cost Effective</h3>
              <p>Flexible plans starting from free tier for developers</p>
            </div>
          </div>

          <div className="subscribe-cta">
            <h3>Ready to Deploy?</h3>
            <p>
              Select a subscription plan that fits your needs and start
              deploying on the Internet Computer.
            </p>
            <button
              className="subscribe-button"
              onClick={handleNavigateToBilling}
            >
              View Subscription Plans <ArrowForwardIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default UnsubscribedView;
