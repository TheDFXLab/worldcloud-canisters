import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";

import { Tooltip } from "@mui/material";
import { fromE8sStable } from "../../../utility/e8s";
import {
  Subscription,
  Tier,
} from "../../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import "../BillingPage.css";

interface SubbedProps {
  subscription: Subscription | null;
  tiers: Tier[] | null;
  handleSelectPlan: (tierId: number) => void;
}

const tierIcons = [
  <RocketLaunchIcon />,
  <WorkspacePremiumIcon />,
  <CorporateFareIcon />,
];

export default function Subbed({
  subscription,
  tiers,
  handleSelectPlan,
}: SubbedProps) {
  return (
    /** Unsubscribed users */
    <div className="pricing-grid">
      {tiers &&
        tiers.map((tier) => (
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
                  ? "Get Started"
                  : "Upgrade Now"}
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
