import React, { useEffect } from "react";
import { RegisterSubdomainAddon } from "./RegisterSubdomainAddon";
import { SerializedAddOn } from "../../../serialization/addons";
import { useProjectsLogic } from "../../../hooks/useProjectsLogic";
import { CheckCircle } from "@mui/icons-material";
import { Alert, Chip, Typography } from "@mui/material";

interface AddonComponentFactoryProps {
  addon: SerializedAddOn;
  projectId: string;
  canisterId?: string;
}

export const AddonComponentFactory: React.FC<AddonComponentFactoryProps> = ({
  addon,
  projectId,
  canisterId,
}) => {
  const { handleFetchDomainRegistrations, domainRegistrations } =
    useProjectsLogic();

  // useEffect(() => {
  //   const fetchDomainRegistrations = async () => {
  //     debugger;
  //     await handleFetchDomainRegistrations(parseInt(projectId));
  //   };
  //   fetchDomainRegistrations();
  // }, [projectId]);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "complete":
        return "success";
      case "pending":
        return "warning";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
      case "complete":
        return "Active";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  // Map addon types to their respective components
  const renderAddonComponent = () => {
    switch (addon.type) {
      case "register_subdomain":
        return (
          <RegisterSubdomainAddon
            projectId={projectId}
            canisterId={canisterId}
            addonId={addon.id}
            addon={addon}
          />
        );

      case "register_domain":
        // Coming soon - placeholder for future implementation
        return (
          <div className="coming-soon-addon">
            <div className="addon-header">
              <div className="addon-icon">
                <span>🌐</span>
              </div>
              <div className="addon-info">
                <h4>Register Domain</h4>
                <p>Custom domain registration (Coming Soon)</p>
              </div>
              <div className="addon-status">
                <span className="coming-soon-badge">Coming Soon</span>
              </div>
            </div>
            <div className="coming-soon-content">
              <p>
                Full domain registration functionality will be available soon.
              </p>
            </div>
          </div>
        );

      default:
        // Fallback for unknown addon types
        return (
          <div className="unknown-addon">
            <div className="addon-header">
              <div className="addon-icon">
                <span>❓</span>
              </div>
              <div className="addon-info">
                <h4>Unknown Add-on Type</h4>
                <p>Type: {addon.type}</p>
              </div>
            </div>
            <div className="unknown-content">
              <p>This add-on type is not yet supported.</p>
            </div>
          </div>
        );
    }
  };

  return renderAddonComponent();
};
