import React, { useEffect, useState } from "react";
import "./BillingPage.css";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { Tooltip } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useSubscription } from "../../context/SubscriptionContext/SubscriptionContext";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import { fromE8sStable } from "../../utility/e8s";
import HeaderCard from "../HeaderCard/HeaderCard";
import LoadingView from "../LoadingView/LoadingView";
import { Tier } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import SubscriptionApi from "../../api/subscription/SubscriptionApi";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import { ConfirmationModal } from "../ConfirmationPopup/ConfirmationModal";
import { useConfirmationModal } from "../../context/ConfirmationModalContext/ConfirmationModalContext";

const BillingPage: React.FC = () => {
  /** Hooks */
  const { setShowModal } = useConfirmationModal();
  const { identity } = useIdentity();
  const { setActiveTab } = useSideBar();
  const { setActionBar } = useActionBar();
  const { setToasterData, setShowToaster } = useToaster();
  const { summon, destroy } = useLoaderOverlay();
  const {
    subscription,
    tiers,
    isLoadingSub,
    isLoadingTiers,
    subscribe,
    getSubscription,
  } = useSubscription();

  /** State */
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>("");

  const tierIcons = [
    <RocketLaunchIcon />,
    <WorkspacePremiumIcon />,
    <CorporateFareIcon />,
  ];

  // Set the active tab to settings
  useEffect(() => {
    setActiveTab("billing");
    setActionBar(null);
  }, []);

  const handleSelectPlan = (tierId: number | null) => {
    if (!tiers || tierId === null) return;
    let price = fromE8sStable(
      tiers[tierId].price.e8s + tiers[tierId].min_deposit.e8s
    );
    setAmount(price.toString());
    setSelectedPlanId(tierId);
    setShowModal(true);
  };

  const handleSubscribe = async (tierId: number | null) => {
    if (tierId === null) {
      setShowToaster(true);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please select a plan",
        timeout: 2000,
      });
      return;
    }
    try {
      summon("Processing your request...");

      const res = await subscribe(tierId, Number(amount));
      if (res.status) {
        getSubscription();
        setToasterData({
          headerContent: "Subscription Created",
          toastStatus: true,
          toastData: res.message,
          timeout: 2000,
        });
        setShowToaster(true);
      } else {
        throw new Error(res.message);
      }
    } catch (error: any) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message,
        timeout: 2000,
      });
      setShowToaster(true);
      console.log(`Error subscribing.`, error);
    } finally {
      destroy();
    }
  };
  useEffect(() => {
    console.log(`Tiers`, tiers);
    console.log(`Subscription`, subscription);
  }, [tiers, subscription]);

  if (isLoadingSub || isLoadingTiers) {
    return <LoadingView type="billing" />;
  }

  return (
    <div className="billing-container">
      {tiers && selectedPlanId !== null && (
        <ConfirmationModal
          type="subscription"
          onHide={() => setShowModal(false)}
          onConfirm={() => handleSubscribe(selectedPlanId)}
          amountState={[amount, setAmount]}
          customConfig={{
            totalPrice: fromE8sStable(
              tiers[selectedPlanId].price.e8s +
                tiers[selectedPlanId].min_deposit.e8s
            ),
            showInputField: false,
            message: `You are subscribing to the ${
              tiers[selectedPlanId].name
            } plan. ${fromE8sStable(
              tiers[selectedPlanId].price.e8s +
                tiers[selectedPlanId].min_deposit.e8s
            )} ICP will be transferred from your wallet.`,
          }}
        />
      )}

      <div className="billing-header">
        <HeaderCard
          title="Subscription & Billing"
          description="Manage your subscription and billing preferences"
          className="deployment-header"
        />
      </div>

      <div className="billing-content">
        {subscription && tiers ? (
          <div className="current-plan-section">
            <div className="current-plan-header">
              <div className="plan-icon">
                {tierIcons[Number(subscription.tier_id)]}
              </div>
              <div className="plan-info">
                <h3>{tiers[Number(subscription.tier_id)].name} Plan</h3>
                <p className="plan-status">
                  <CheckCircleIcon className="status-icon" />
                  Active
                </p>
              </div>
            </div>
            <div className="plan-details">
              <div className="detail-row">
                <div className="detail-label">
                  <span>Available Slots </span>
                  <Tooltip title="Number of canisters you can deploy" arrow>
                    <InfoIcon className="info-icon" />
                  </Tooltip>
                </div>
                <span className="detail-value">
                  {Number(tiers[Number(subscription.tier_id)].slots) -
                    subscription.canisters.length}{" "}
                  Canisters
                </span>
              </div>
              <div className="detail-row">
                <div className="detail-label">
                  <span>Minimum Deposit</span>

                  <Tooltip
                    title="Required ICP balance to maintain this tier"
                    arrow
                  >
                    <InfoIcon className="info-icon" />
                  </Tooltip>
                </div>
                <span className="detail-value">
                  {fromE8sStable(
                    tiers[Number(subscription.tier_id)].min_deposit.e8s
                  )}{" "}
                  ICP
                </span>
              </div>
              <div className="features-list">
                <h4>Included Features</h4>
                <ul>
                  {tiers[Number(subscription.tier_id)].features.map(
                    (feature, index) => (
                      <li key={index}>
                        <CheckCircleIcon className="feature-icon" />
                        {feature}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="pricing-grid">
            {tiers &&
              tiers.map((tier) => (
                <div key={tier.id} className="pricing-card">
                  <div className="pricing-header">
                    <div className="tier-icon">
                      {tierIcons[Number(tier.id)]}
                    </div>
                    <h3>{tier.name}</h3>
                    <div className="price">
                      <span className="amount">
                        {fromE8sStable(tier.price.e8s) === 0
                          ? "Free"
                          : `${fromE8sStable(tier.price.e8s)} ICP`}
                      </span>
                      <span className="period">One-time payment</span>
                    </div>
                  </div>
                  <div className="pricing-content">
                    <div className="deposit-info">
                      <div className="deposit-label">
                        <span>Minimum Deposit</span>
                        <Tooltip
                          title="Minimum amount required for canister(s) creation. Amount will be reflected as cycles in the canister(s)"
                          arrow
                        >
                          <InfoIcon className="info-icon" />
                        </Tooltip>
                      </div>
                      <span className="deposit-value">
                        {fromE8sStable(tier.min_deposit.e8s)} ICP
                      </span>
                    </div>
                    <ul className="features">
                      {tier.features.map((feature, index) => (
                        <li key={index}>
                          <CheckCircleIcon className="feature-icon" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      className="select-plan-btn"
                      onClick={() => handleSelectPlan(Number(tier.id))}
                    >
                      {fromE8sStable(tier.price.e8s) === 0
                        ? "Get Started"
                        : "Upgrade Now"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;
