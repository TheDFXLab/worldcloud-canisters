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

interface NonSubbedProps {
  subscription: Subscription;
  tiers: Tier[];
}

const tierIcons = [
  <RocketLaunchIcon />,
  <WorkspacePremiumIcon />,
  <CorporateFareIcon />,
];

export default function NonSubbed({ subscription, tiers }: NonSubbedProps) {
  return (
    /** subscribed users */
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

            <Tooltip title="Required ICP balance to maintain this tier" arrow>
              <InfoIcon className="info-icon" />
            </Tooltip>
          </div>
          <span className="detail-value">
            {fromE8sStable(tiers[Number(subscription.tier_id)].min_deposit.e8s)}{" "}
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
  );
}
