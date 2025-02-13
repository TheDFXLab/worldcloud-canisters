import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import CorporateFareIcon from "@mui/icons-material/CorporateFare";
import MemoryIcon from "@mui/icons-material/Memory";
import { Tooltip, LinearProgress } from "@mui/material";
import UpgradeIcon from "@mui/icons-material/Upgrade";

import { fromE8sStable } from "../../../utility/e8s";
import {
  Subscription,
  Tier,
} from "../../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import "./Subbed.css";
import "../BillingPage.css";
interface SubbedProps {
  subscription: Subscription | null;
  tiers: Tier[] | null;
  pricingState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
}

const tierIcons = [
  <RocketLaunchIcon />,
  <WorkspacePremiumIcon />,
  <CorporateFareIcon />,
];

export default function Subbed({
  subscription,
  tiers,
  pricingState,
}: SubbedProps) {
  const [showPricing, setShowPricing] = pricingState;
  if (!subscription || !tiers) return null;

  const currentTier = tiers[Number(subscription.tier_id)];
  const usedSlots = subscription.canisters.length;
  const maxSlots = Number(currentTier.slots);
  const usagePercentage = (usedSlots / maxSlots) * 100;

  return (
    <div className="current-plan-section">
      {/* Plan Header */}
      <div className="current-plan-header">
        <div className="plan-icon">
          {tierIcons[Number(subscription.tier_id)]}
        </div>
        <div className="plan-info">
          <h3>{currentTier.name} Plan</h3>
          <p className="plan-status">
            <CheckCircleIcon className="status-icon" />
            Active
          </p>
        </div>
        {subscription && (
          <button
            className="view-plans-button"
            onClick={() => setShowPricing(!showPricing)}
          >
            <UpgradeIcon />
            <span>
              {showPricing ? "View Current Plan" : "View Available Plans"}
            </span>
          </button>
        )}
      </div>

      {/* Resource Usage */}
      <div className="resource-usage">
        <div className="usage-header">
          <MemoryIcon className="usage-icon" />
          <h4>Resource Usage</h4>
        </div>
        <div className="usage-stats">
          <div className="usage-info">
            <span>Canister Slots</span>
            <span className="usage-count">
              {usedSlots} / {maxSlots}
            </span>
          </div>
          <LinearProgress
            variant="determinate"
            value={usagePercentage}
            className={`usage-progress ${
              usagePercentage > 80 ? "warning" : ""
            }`}
          />
          {usagePercentage > 80 && (
            <p className="usage-warning">
              {usagePercentage >= 100
                ? "You've reached your slot limit. Consider upgrading your plan."
                : "You're approaching your slot limit. Consider upgrading your plan."}
            </p>
          )}
        </div>
      </div>

      {/* Plan Details */}
      <div className="plan-details">
        <div className="detail-row">
          <div className="detail-label">
            <span>Minimum Deposit</span>
            <Tooltip title="Required ICP balance to maintain this tier" arrow>
              <InfoIcon className="info-icon" />
            </Tooltip>
          </div>
          <span className="detail-value highlight">
            {fromE8sStable(currentTier.min_deposit.e8s)} ICP
          </span>
        </div>

        {/* Active Canisters */}
        {subscription.canisters.length > 0 && (
          <div className="active-canisters">
            <h4>Active Canisters</h4>
            <div className="canister-list">
              {subscription.canisters.map((canister, index) => (
                <div key={index} className="canister-item">
                  <MemoryIcon className="canister-icon" />
                  <code className="canister-id">{canister.toText()}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan Features */}
        <div className="features-list">
          <h4>Plan Features</h4>
          <ul className="features-grid">
            {currentTier.features.map((feature, index) => (
              <li key={index} className="feature-item">
                <CheckCircleIcon className="feature-icon" />
                <span className="feature-text">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
