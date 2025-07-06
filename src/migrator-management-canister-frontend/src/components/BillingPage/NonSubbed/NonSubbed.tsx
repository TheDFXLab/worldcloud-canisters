import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { Tooltip } from "@mui/material";
import { fromE8sStable } from "../../../utility/e8s";
import { Tier } from "../../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import "../BillingPage.css";
import { SubscriptionData } from "../../../state/slices/subscriptionSlice";

interface NonSubbedProps {
  hideButtons?: boolean;
  subscription: SubscriptionData | null;
  tiers: Tier[] | null;
  handleSelectPlan: (tierId: number) => void;
  pricingState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
}

const tierIcons = [
  <RocketLaunchIcon />,
  <WorkspacePremiumIcon />,
  <CorporateFareIcon />,
  <AutoAwesomeIcon />,
];

export default function NonSubbed({
  hideButtons,
  subscription,
  tiers,
  handleSelectPlan,
  pricingState,
}: NonSubbedProps) {
  const [showPricing, setShowPricing] = pricingState;
  return (
    <div className="pricing-container">
      {subscription && (
        <button className="back-button" onClick={() => setShowPricing(false)}>
          <ArrowBackIcon />
          <span>Back to Current Plan</span>
        </button>
      )}
      <div className="pricing-grid">
        {/** shift freemium tier object to start of array  */}
        {tiers &&
          [
            tiers[3],
            ...tiers.filter((tier) => parseInt(tier.id.toString()) !== 3),
          ].map((tier) => (
            <div
              key={tier.id}
              className={`pricing-card ${
                subscription && Number(subscription.tier_id) === Number(tier.id)
                  ? "current-tier"
                  : ""
              }`}
            >
              {subscription &&
                Number(subscription.tier_id) === Number(tier.id) && (
                  <div className="current-plan-badge">Current Plan</div>
                )}
              <div className="pricing-header">
                <div className="tier-icon">{tierIcons[Number(tier.id)]}</div>
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
                    {tier?.name === "Freemium" ? (
                      <>
                        <span>Shared Hosting</span>
                        <Tooltip
                          title="Website will be hosted for a limited trial period of 4 hours. Maximum number of trials is 3 per day."
                          arrow
                        >
                          <InfoIcon className="info-icon" />
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <span>Minimum Deposit</span>
                        <Tooltip
                          title="Minimum amount required for canister(s) creation. Amount will be reflected as cycles in the canister(s)"
                          arrow
                        >
                          <InfoIcon className="info-icon" />
                        </Tooltip>
                      </>
                    )}
                  </div>
                  <span className="deposit-value">
                    {tier?.name === "Freemium" ? (
                      <>
                        <span>Free</span>
                      </>
                    ) : (
                      <>{fromE8sStable(tier.min_deposit.e8s)} ICP</>
                    )}
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

                {!hideButtons && (
                  <button
                    className="select-plan-btn"
                    onClick={() => handleSelectPlan(Number(tier.id))}
                    disabled={
                      subscription
                        ? Number(subscription.tier_id) === Number(tier.id)
                        : false
                    }
                  >
                    {subscription &&
                    Number(subscription.tier_id) === Number(tier.id)
                      ? "Current Plan"
                      : fromE8sStable(tier.price.e8s) === 0
                      ? tier.name === "Freemium"
                        ? "Try Now"
                        : "Get Started"
                      : "Upgrade Now"}
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
