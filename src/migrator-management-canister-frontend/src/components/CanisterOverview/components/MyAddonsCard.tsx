import React from "react";
import ExtensionIcon from "@mui/icons-material/Extension";
import { Button, Chip, Tooltip } from "@mui/material";
import { SerializedAddOn } from "../../../serialization/addons";
import { useProjectsLogic } from "../../../hooks/useProjectsLogic";
import { formatDate } from "../../../utility/formatter";
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
  const { projectAddOns, isLoadingAddOns } = useProjectsLogic();
  const currentProjectAddons = projectAddOns[parseInt(projectId)] || [];

  // Show skeleton while loading
  if (isLoadingAddOns) {
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

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Active";
      case "frozen":
        return "Frozen";
      default:
        return "Unknown";
    }
  };

  const isExpired = (expiresAt?: number) => {
    if (!expiresAt) return false;
    return Date.now() > expiresAt * 1000;
  };

  const getTimeUntilExpiry = (expiresAt?: number) => {
    if (!expiresAt) return "No expiry";

    const now = Date.now();
    const expiryTime = expiresAt * 1000;
    const timeLeft = expiryTime - now;

    if (timeLeft <= 0) return "Expired";

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) return `${days} day${days !== 1 ? "s" : ""} left`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} left`;
    return "Less than 1 hour left";
  };

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
            <div key={addon.id} className="my-addon-item">
              <div className="addon-main-info">
                <div className="addon-icon">
                  <ExtensionIcon />
                </div>
                <div className="addon-details">
                  <h4 className="addon-name">{addon.id}</h4>
                  <div className="addon-meta">
                    <Chip
                      label={addon.type.replace("_", " ")}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={getStatusText(addon.status)}
                      size="small"
                      color={getStatusColor(addon.status) as any}
                      variant="outlined"
                    />
                  </div>
                </div>
                <div className="addon-status">
                  <div className={`status-indicator ${addon.status}`}>
                    <span className="status-dot" />
                    {getStatusText(addon.status)}
                  </div>
                </div>
              </div>

              <div className="addon-info-grid">
                <div className="info-item">
                  <span className="info-label">Created:</span>
                  <span className="info-value">
                    {formatDate(addon.created_on)}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Last Updated:</span>
                  <span className="info-value">
                    {formatDate(addon.updated_on)}
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">Expires:</span>
                  <span
                    className={`info-value ${
                      isExpired(addon.expires_at) ? "expired" : ""
                    }`}
                  >
                    {addon.expires_at
                      ? getTimeUntilExpiry(addon.expires_at)
                      : "Never"}
                  </span>
                </div>
              </div>

              {isExpired(addon.expires_at) && (
                <div className="expiry-warning">
                  <span className="warning-icon">⚠️</span>
                  <span className="warning-text">
                    This add-on has expired. Renew to continue using the
                    service.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
