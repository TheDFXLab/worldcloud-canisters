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
import UpgradeIcon from "@mui/icons-material/Upgrade";
import NonSubbed from "./NonSubbed/NonSubbed";
import Subbed from "./Subbed/Subbed";
import { usePricing } from "../../context/PricingContext/PricingContext";

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
    // tiers,
    isLoadingSub,
    isLoadingTiers,
    subscribe,
    getSubscription,
  } = useSubscription();

  const { tiers } = usePricing();

  /** State */
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [showPricing, setShowPricing] = useState<boolean>(false);

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
          overrideEnableSubmit={
            parseInt(tiers[selectedPlanId].id.toString()) === 3
          }
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
        />
      </div>

      <div className="billing-content">
        {showPricing || !subscription ? (
          <NonSubbed
            subscription={subscription}
            tiers={tiers}
            handleSelectPlan={handleSelectPlan}
            pricingState={[showPricing, setShowPricing]}
          />
        ) : (
          <Subbed
            subscription={subscription}
            tiers={tiers}
            pricingState={[showPricing, setShowPricing]}
          />
        )}
      </div>
    </div>
  );
};

export default BillingPage;
