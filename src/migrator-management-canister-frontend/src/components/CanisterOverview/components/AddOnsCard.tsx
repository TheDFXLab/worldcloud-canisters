import React from "react";
import ExtensionIcon from "@mui/icons-material/Extension";
import { Button, Chip, Tooltip } from "@mui/material";
import { SerializedAddOnVariant } from "../../../serialization/addons";
import { useProjectsLogic } from "../../../hooks/useProjectsLogic";
import { useLedger } from "../../../context/LedgerContext/LedgerContext";
import { useConfirmationModal } from "../../../context/ConfirmationModalContext/ConfirmationModalContext";
import { useToaster } from "../../../context/ToasterContext/ToasterContext";
import { useLoaderOverlay } from "../../../context/LoaderOverlayContext/LoaderOverlayContext";
import { useIdentity } from "../../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../../context/HttpAgentContext/HttpAgentContext";
import MainApi from "../../../api/main";
import { ConfirmationModal } from "../../ConfirmationPopup/ConfirmationModal";
import "./AddOnsCard.css";
import { e8sToIcp } from "../../../utility/e8s";

interface AddOnsCardProps {
  projectId: string;
  onSubscribe: (addonId: number) => void;
}

// Mock data for coming soon features - moved outside component to prevent recreation
const COMING_SOON_ADDONS = [
  {
    id: 999,
    name: "Advanced Analytics",
    type: "analytics" as any,
    expiry_duration: "month" as any,
    expiry: 1,
    price: 0,
    features: [
      "Real-time performance metrics",
      "User behavior tracking",
      "Custom dashboard creation",
      "Export capabilities",
    ],
    isComingSoon: true,
    estimatedRelease: "Q2 2025",
  },
  {
    id: 998,
    name: "Multi-Region Deployment",
    type: "deployment" as any,
    expiry_duration: "year" as any,
    expiry: 1,
    price: 0,
    features: [
      "Global CDN distribution",
      "Region-specific optimization",
      "Automatic failover",
      "Performance monitoring",
    ],
    isComingSoon: true,
    estimatedRelease: "Q3 2025",
  },
];

// Skeleton component for addon cards
const AddOnCardSkeleton: React.FC = () => (
  <div className="addon-card skeleton">
    <div className="addon-header skeleton">
      <div className="addon-icon skeleton-icon"></div>
      <div className="addon-title skeleton-title"></div>
      <div className="addon-price skeleton-price"></div>
    </div>
    <div className="addon-features skeleton">
      <div className="feature skeleton-feature"></div>
      <div className="feature skeleton-feature"></div>
      <div className="feature skeleton-feature"></div>
    </div>
    <div className="addon-footer skeleton">
      <div className="subscribe-button skeleton-button"></div>
    </div>
  </div>
);

export const AddOnsCard: React.FC<AddOnsCardProps> = ({
  projectId,
  onSubscribe,
}) => {
  const { addOnsList, isLoadingAddOnsList } = useProjectsLogic();
  const { balance, depositIfNotEnoughCredits } = useLedger();
  const { showModal, setShowModal } = useConfirmationModal();
  const { setToasterData, setShowToaster } = useToaster();
  const { summon, destroy } = useLoaderOverlay();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();

  const [selectedAddon, setSelectedAddon] =
    React.useState<SerializedAddOnVariant | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Combine real addons with coming soon addons using useMemo to prevent recreation
  const allAddons = React.useMemo(() => {
    // return [...(addOnsList || []), ...COMING_SOON_ADDONS];
    return [...(addOnsList || [])];
  }, [addOnsList]);

  // Show skeleton while loading
  if (isLoadingAddOnsList) {
    return (
      <div className="overview-card">
        <div className="card-header">
          <ExtensionIcon />
          <h3>Available Add-ons</h3>
        </div>
        <div className="card-content">
          <div className="addons-grid">
            {[...Array(6)].map((_, index) => (
              <AddOnCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no addons
  if (!allAddons || allAddons.length === 0) {
    return (
      <div className="overview-card">
        <div className="card-header">
          <ExtensionIcon />
          <h3>Available Add-ons</h3>
        </div>
        <div className="card-content">
          <div className="empty-state">
            <p>No add-ons available at the moment.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubscribe = async (
    addon: SerializedAddOnVariant & {
      isComingSoon?: boolean;
      estimatedRelease?: string;
    }
  ) => {
    if (addon.isComingSoon) {
      setToasterData({
        headerContent: "Coming Soon",
        toastStatus: false,
        toastData: `This feature will be available in ${addon.estimatedRelease}`,
        timeout: 4000,
      });
      setShowToaster(true);
      return;
    }

    if (!identity || !agent) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Identity or agent not initialized",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    setSelectedAddon(addon);

    try {
      summon("Checking credits...");

      // Check if user has enough credits
      const mainApi = await MainApi.create(identity, agent);
      if (!mainApi) throw new Error("MainApi not initialized");

      const creditsAvailable = await mainApi.getCreditsAvailable();
      const requiredCredits = BigInt(addon.price);

      if (creditsAvailable < requiredCredits) {
        // Not enough credits, show payment modal
        setSelectedAddon(addon);
        setShowModal(true);
      } else {
        // Enough credits, proceed with subscription
        await processSubscription(addon.id);
      }
    } catch (error: any) {
      console.error("Error checking credits:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to check credits",
        timeout: 3000,
      });
      setShowToaster(true);
    } finally {
      destroy();
    }
  };

  const processSubscription = async (addonId: number) => {
    if (!identity || !agent) return;

    setIsProcessing(true);
    try {
      summon("Subscribing to add-on...");

      const mainApi = await MainApi.create(identity, agent);
      if (!mainApi) throw new Error("MainApi not initialized");

      const result = await mainApi.subscribe_add_on(
        parseInt(projectId),
        addonId
      );

      if (result) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: "Successfully subscribed to add-on!",
          timeout: 3000,
        });
        setShowToaster(true);
        onSubscribe(addonId);
      }
    } catch (error: any) {
      console.error("Error subscribing to add-on:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to subscribe to add-on",
        timeout: 3000,
      });
      setShowToaster(true);
    } finally {
      setIsProcessing(false);
      destroy();
    }
  };

  const handlePaymentConfirm = async (amount: number) => {
    if (!selectedAddon) return;

    try {
      summon("Processing payment...");

      // Deposit the required amount
      const depositedAmount = await depositIfNotEnoughCredits(
        e8sToIcp(selectedAddon.price),
        agent!
      );

      if (depositedAmount !== undefined) {
        // Now proceed with subscription
        await processSubscription(selectedAddon.id);
      }
    } catch (error: any) {
      console.error("Error processing payment:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to process payment",
        timeout: 3000,
      });
      setShowToaster(true);
    } finally {
      destroy();
      setShowModal(false);
      setSelectedAddon(null);
    }
  };

  const getExpiryText = (expiry: string, duration: number): string => {
    if (expiry === "none") return "No expiry";
    if (duration === 1) return `1 ${expiry}`;
    return `${duration} ${expiry}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "success";
      case "frozen":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <>
      <div className="overview-card">
        <div className="card-header">
          <ExtensionIcon />
          <h3>Available Add-ons</h3>
        </div>
        <div className="card-content">
          <div className="addons-grid">
            {allAddons.map((addon) => {
              const isComingSoon = (addon as any).isComingSoon;
              const estimatedRelease = (addon as any).estimatedRelease;

              return (
                <div
                  key={addon.id}
                  className={`addon-card ${isComingSoon ? "coming-soon" : ""}`}
                >
                  {isComingSoon && (
                    <div className="coming-soon-badge">
                      <span>Coming Soon</span>
                    </div>
                  )}

                  <div className="addon-header">
                    <div
                      className={`addon-icon ${
                        isComingSoon ? "coming-soon" : ""
                      }`}
                    >
                      <ExtensionIcon />
                    </div>
                    <div className="addon-info">
                      <h4 className="addon-title">{addon.name}</h4>
                      <div className="addon-type">
                        <Chip
                          label={addon.type.replace("_", " ")}
                          size="small"
                          color={isComingSoon ? "default" : "primary"}
                          variant="outlined"
                        />
                      </div>
                    </div>
                    <div
                      className={`addon-price ${
                        isComingSoon ? "coming-soon" : ""
                      }`}
                    >
                      {isComingSoon ? "TBD" : `${e8sToIcp(addon.price)} ICP`}
                    </div>
                  </div>

                  <div className="addon-features">
                    {addon.features.map((feature, index) => (
                      <div key={index} className="feature-item">
                        <span className="feature-dot" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {isComingSoon && (
                    <div className="coming-soon-info">
                      <div className="release-date">
                        <span className="release-label">
                          Estimated Release:
                        </span>
                        <span className="release-value">
                          {estimatedRelease}
                        </span>
                      </div>
                      <div className="coming-soon-description">
                        This feature is currently in development and will be
                        available soon.
                      </div>
                    </div>
                  )}

                  <div className="addon-footer">
                    <div className="addon-expiry">
                      <span className="expiry-label">Duration:</span>
                      <span className="expiry-value">
                        {getExpiryText(addon.expiry_duration, addon.expiry)}
                      </span>
                    </div>

                    <Button
                      variant="contained"
                      color={isComingSoon ? "inherit" : "primary"}
                      size="small"
                      onClick={() => handleSubscribe(addon)}
                      disabled={isProcessing}
                      className={`subscribe-button ${
                        isComingSoon ? "coming-soon" : ""
                      }`}
                    >
                      {isComingSoon
                        ? "Coming Soon"
                        : isProcessing
                        ? "Processing..."
                        : "Subscribe"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && selectedAddon && (
        <ConfirmationModal
          amountState={["0", () => {}]}
          overrideEnableSubmit={true}
          onHide={() => {
            setShowModal(false);
            setSelectedAddon(null);
          }}
          onConfirm={handlePaymentConfirm}
          type="addon"
          customConfig={{
            title: `Purchase ${selectedAddon.name}`,
            message: `This add-on service costs ${e8sToIcp(
              selectedAddon.price
            )} ICP. Please confirm your purchase.`,
            confirmText: "Purchase Add-on",
            cancelText: "Cancel",
            showWalletInfo: true,
            showInputField: false,
            showTotalPrice: true,
            totalPrice: e8sToIcp(selectedAddon.price),
          }}
        />
      )}
    </>
  );
};
