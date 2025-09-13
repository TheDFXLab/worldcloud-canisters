import React from "react";
import ExtensionIcon from "@mui/icons-material/Extension";
import { Button, Chip, Tooltip } from "@mui/material";
import { SerializedAddOn } from "../../../serialization/addons";
import { useProjectsLogic } from "../../../hooks/useProjectsLogic";
import { formatDate } from "../../../utility/formatter";
import { AddonComponentFactory } from "./AddonComponentFactory";
import "./MyAddonsCard.css";

interface MyAddonsCardProps {
  projectId: string;
}

// Skeleton component for my addons
const MyAddonItemSkeleton: React.FC = () => (
  <div className="my-addon-item skeleton">
    <div className="addon-main-info skeleton">
      <div className="addon-icon skeleton-icon"></div>
      <div className="addon-details skeleton">
        <div className="addon-name skeleton-title"></div>
        <div className="addon-meta skeleton">
          <div className="skeleton-chip"></div>
          <div className="skeleton-chip"></div>
        </div>
      </div>
      <div className="addon-status skeleton">
        <div className="status-indicator skeleton-status"></div>
      </div>
    </div>
    <div className="addon-info-grid skeleton">
      <div className="info-item skeleton">
        <div className="info-label skeleton-label"></div>
        <div className="info-value skeleton-value"></div>
      </div>
      <div className="info-item skeleton">
        <div className="info-label skeleton-label"></div>
        <div className="info-value skeleton-value"></div>
      </div>
      <div className="info-item skeleton">
        <div className="info-label skeleton-label"></div>
        <div className="info-value skeleton-value"></div>
      </div>
    </div>
  </div>
);

export const MyAddonsCard: React.FC<MyAddonsCardProps> = ({ projectId }) => {
  const {
    projectAddOns,
    isLoadingAddOns,
    isLoadingDomainRegistrations,
    projects,
    parsedMyAddons,
    isLoadingGetParsedMyAddons,
  } = useProjectsLogic();
  const currentProjectAddons = projectAddOns[parseInt(projectId)] || [];

  // Show skeleton while loading
  if (isLoadingAddOns || isLoadingDomainRegistrations) {
    return (
      <div className="overview-card">
        <div className="card-header">
          <ExtensionIcon />
          <h3>My Add-ons</h3>
          <span className="addon-count skeleton-count"></span>
        </div>
        <div className="card-content">
          <div className="my-addons-list">
            {[...Array(3)].map((_, index) => (
              <MyAddonItemSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no addons
  if (currentProjectAddons.length === 0) {
    return (
      <div className="overview-card">
        <div className="card-header">
          <ExtensionIcon />
          <h3>My Add-ons</h3>
          <span className="addon-count">0 services</span>
        </div>
        <div className="card-content">
          <div className="empty-state">
            <ExtensionIcon className="empty-icon" />
            <p>No active add-on services</p>
            <span className="empty-hint">
              Subscribe to add-ons from the marketplace to see them here
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Get the current project to access canister ID
  const currentProject = projects.find((p) => p.id.toString() === projectId);
  const canisterId = currentProject?.canister_id || undefined;

  return (
    <div className="overview-card">
      <div className="card-header">
        <ExtensionIcon />
        <h3>My Add-ons</h3>
        <span className="addon-count">
          {currentProjectAddons.length} service
          {currentProjectAddons.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="card-content">
        <div className="my-addons-list">
          {currentProjectAddons.map((addon) => (
            <AddonComponentFactory
              key={addon.id}
              addon={addon}
              projectId={projectId}
              canisterId={canisterId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
