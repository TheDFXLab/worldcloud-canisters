import React from "react";
import ExtensionIcon from "@mui/icons-material/Extension";
import StorefrontIcon from "@mui/icons-material/Storefront";
import "./AddonSelector.css";

export type AddonView = "marketplace" | "my-addons";

interface AddonSelectorProps {
  currentView: AddonView;
  onViewChange: (view: AddonView) => void;
  myAddonsCount?: number;
  isLoading?: boolean;
}

export const AddonSelector: React.FC<AddonSelectorProps> = ({
  currentView,
  onViewChange,
  myAddonsCount = 0,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="addon-selector">
        <div className="selector-header">
          <h3 className="selector-title">Add-on Services</h3>
          <p className="selector-subtitle">
            Manage your existing add-ons or explore new services
          </p>
        </div>

        <div className="selector-tabs">
          <button className="selector-tab skeleton" disabled>
            <StorefrontIcon className="tab-icon" />
            <span className="tab-label"></span>
            <span className="tab-description"></span>
          </button>

          <button className="selector-tab skeleton" disabled>
            <ExtensionIcon className="tab-icon" />
            <span className="tab-label"></span>
            <span className="tab-description"></span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="addon-selector">
      <div className="selector-header">
        <h3 className="selector-title">Add-on Services</h3>
        <p className="selector-subtitle">
          Manage your existing add-ons or explore new services
        </p>
      </div>

      <div className="selector-tabs">
        <button
          className={`selector-tab ${
            currentView === "marketplace" ? "active" : ""
          }`}
          onClick={() => onViewChange("marketplace")}
        >
          <StorefrontIcon className="tab-icon" />
          <span className="tab-label">Marketplace</span>
          <span className="tab-description">Browse available add-ons</span>
        </button>

        <button
          className={`selector-tab ${
            currentView === "my-addons" ? "active" : ""
          }`}
          onClick={() => onViewChange("my-addons")}
        >
          <ExtensionIcon className="tab-icon" />
          <span className="tab-label">My Add-ons</span>
          <span className="tab-description">
            {myAddonsCount > 0
              ? `${myAddonsCount} active service${
                  myAddonsCount !== 1 ? "s" : ""
                }`
              : "No active services"}
          </span>
        </button>
      </div>
    </div>
  );
};
