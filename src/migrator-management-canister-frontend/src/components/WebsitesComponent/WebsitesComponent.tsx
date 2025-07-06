import React, { useEffect, useState, useMemo } from "react";
import "./WebsitesComponent.css";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { useSubscription } from "../../context/SubscriptionContext/SubscriptionContext";
import { useFreemium } from "../../context/FreemiumContext/FreemiumContext";
import LanguageIcon from "@mui/icons-material/Language";
import StorageIcon from "@mui/icons-material/Storage";
import UpdateIcon from "@mui/icons-material/Update";
import LinkIcon from "@mui/icons-material/Link";
import AddIcon from "@mui/icons-material/Add";
import { Principal } from "@dfinity/principal";
import { getCanisterUrl } from "../../config/config";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import { useNavigate } from "react-router-dom";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import CodeIcon from "@mui/icons-material/Code";
import { Tooltip } from "@mui/material";
import HeaderCard from "../HeaderCard/HeaderCard";
import { useFreemiumLogic } from "../../hooks/useFreemiumLogic";
import { useSubscriptionLogic } from "../../hooks/useSubscriptionLogic";
import { useDeploymentLogic } from "../../hooks/useDeploymentLogic";

// Tag and sorting options
const statusMap: Record<string, string> = {
  installed: "Active",
  installing: "Code Installing",
  uninitialized: "Code Not Installed",
  failed: "Inactive",
  default: "Inactive",
};

const typeMap: Record<string, string> = {
  private: "Private",
  freemium: "Freemium",
};

const filterTagOptions = [
  "All",
  "Active",
  "Inactive",
  "Private",
  "Freemium",
  "Code Installing",
  "Code Not Installed",
];

const sortTagOptions = [
  { label: "All", value: "all" },
  { label: "Create Time ↑", value: "createAsc" },
  { label: "Create Time ↓", value: "createDesc" },
  { label: "Active First", value: "activeFirst" },
  { label: "Inactive First", value: "inactiveFirst" },
  { label: "Last Updated ↑", value: "updatedAsc" },
  { label: "Last Updated ↓", value: "updatedDesc" },
];

const WebsitesComponent: React.FC = () => {
  /** Hooks */
  // const { deployments } = useDeployments();
  const { deployments } = useDeploymentLogic();
  const { subscription } = useSubscriptionLogic();
  const { usageData: freemiumUsage } = useFreemiumLogic();
  const { setActiveTab } = useSideBar();
  const navigate = useNavigate();
  const { setActionBar } = useActionBar();

  useEffect(() => {
    setActiveTab("websites");
    setActionBar(null);
  }, []);

  // Combine all canisters from subscription and freemium - memoized to prevent unnecessary recalculations
  const allCanisters = useMemo(() => {
    const subCanisters = subscription?.canisters || [];
    const subCanisterIds: string[] = Array.isArray(subCanisters)
      ? subCanisters.map((c: any) =>
          typeof c === "object" && c !== null && typeof c.toText === "function"
            ? c.toText()
            : c
        )
      : [];
    const freemiumCanisters =
      freemiumUsage && freemiumUsage.canister_id ? [freemiumUsage] : [];

    return [
      ...subCanisterIds.map((id: string) => ({
        canister_id: id,
        type: "private",
      })),
      ...freemiumCanisters.map((c) => ({
        canister_id: c.canister_id,
        type: "freemium",
      })),
    ];
  }, [subscription?.canisters, freemiumUsage]);

  // Helper to get deployment details by canister id - memoized to prevent recalculation
  const getDeployment = useMemo(
    () => (canisterId: string) =>
      deployments.find((d) => d.canister_id.toText() === canisterId),
    [deployments]
  );

  // Tag filter state
  const [activeFilterTag, setActiveFilterTag] = useState<string>("All");
  const [activeSortTag, setActiveSortTag] = useState<string>("all");

  // Filtering logic - memoized
  const filteredCanisters = useMemo(
    () =>
      allCanisters.filter(({ canister_id, type }) => {
        if (activeFilterTag === "All") return true;
        if (!canister_id) return false;

        const deployment = getDeployment(canister_id);
        const status = deployment?.status || "default";
        const statusTag = statusMap[status] || statusMap.default;
        const typeTag = typeMap[type] || type;

        if (activeFilterTag === statusTag) return true;
        if (activeFilterTag === typeTag) return true;
        if (activeFilterTag === "Code Installing" && status === "installing")
          return true;
        if (
          activeFilterTag === "Code Not Installed" &&
          status === "uninitialized"
        )
          return true;
        return false;
      }),
    [allCanisters, activeFilterTag, getDeployment]
  );

  // Sorting logic - memoized
  const sortedCanisters = useMemo(
    () =>
      [...filteredCanisters].sort((a, b) => {
        if (!a.canister_id || !b.canister_id) return 0;

        const depA = getDeployment(a.canister_id);
        const depB = getDeployment(b.canister_id);

        switch (activeSortTag) {
          case "createAsc":
            return (depA?.date_created || 0) - (depB?.date_created || 0);
          case "createDesc":
            return (depB?.date_created || 0) - (depA?.date_created || 0);
          case "activeFirst":
            return (
              (depB?.status === "installed" ? 1 : 0) -
              (depA?.status === "installed" ? 1 : 0)
            );
          case "inactiveFirst":
            return (
              (depA?.status === "installed" ? 1 : 0) -
              (depB?.status === "installed" ? 1 : 0)
            );
          case "updatedAsc":
            return (depA?.date_updated || 0) - (depB?.date_updated || 0);
          case "updatedDesc":
            return (depB?.date_updated || 0) - (depA?.date_updated || 0);
          default:
            return 0;
        }
      }),
    [filteredCanisters, activeSortTag, getDeployment]
  );

  // If no canisters at all, show the dotted silhouette card
  if (allCanisters.length === 0) {
    return (
      <div className="websites-container">
        {/* <HeaderCard
          title="Your Websites"
          description="Manage your deployed websites and canisters"
        /> */}
        <div className="websites-grid empty-align-left">
          <div
            className="website-card dotted-card"
            onClick={() => navigate("/dashboard/new")}
          >
            <div className="dotted-card-upper">
              <AddIcon className="dotted-plus" />
              <div className="dotted-card-message">
                <strong>Try out a free website</strong>
                <p>
                  Click here to deploy a temporary website for free using our
                  freemium plan.
                </p>
              </div>
            </div>
            <div className="dotted-card-divider" />
            <div className="dotted-card-lower">
              <div className="dotted-card-message">
                <strong>Create a private website</strong>
                <p>
                  Or create a private, production-ready website with your own
                  canister.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="websites-container">
      {/* <HeaderCard
        title="Your Websites"
        description="Manage your deployed websites and canisters"
      /> */}
      {/* Tag filter row */}
      <div className="tags-row">
        {filterTagOptions.map((tag) => (
          <button
            key={tag}
            className={`tag-chip${activeFilterTag === tag ? " active" : ""}`}
            onClick={() => setActiveFilterTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      {/* Sorting row */}
      <div className="tags-row sort-row">
        {sortTagOptions.map((sort) => (
          <button
            key={sort.value}
            className={`tag-chip${
              activeSortTag === sort.value ? " active" : ""
            }`}
            onClick={() => setActiveSortTag(sort.value)}
          >
            {sort.label}
          </button>
        ))}
      </div>
      <div className="websites-grid">
        {sortedCanisters.map(({ canister_id, type }) => {
          if (!canister_id) {
            return;
          }
          const deployment = getDeployment(canister_id);
          const status = deployment?.status || "default";
          const statusTag = statusMap[status] || statusMap.default;
          return (
            <div
              key={canister_id}
              className={`website-card project-card ${type}`}
              onClick={() => navigate(`/dashboard/canister/${canister_id}`)}
            >
              <div className="website-header">
                <LanguageIcon />
                <div className={`status-badge ${status}`}>{statusTag}</div>
              </div>
              <div className="website-content">
                <h3 className="website-title">
                  <LinkIcon className="link-icon" />
                  {canister_id?.slice(0, 8)}...icp0.io
                </h3>
                <div className="website-details">
                  <div className="detail-item">
                    <StorageIcon />
                    <div className="detail-content">
                      <span className="detail-label">Canister ID</span>
                      <span className="detail-value">{canister_id}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <UpdateIcon />
                    <div className="detail-content">
                      <span className="detail-label">Last Updated</span>
                      <span className="detail-value">
                        {deployment?.date_updated
                          ? new Date(
                              Number(deployment.date_updated) / 1000000
                            ).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                  </div>
                  {/* Add more details here if available */}
                </div>
              </div>
              <div className="website-actions">
                <button
                  className="action-button primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canister_id) {
                      return;
                    }
                    window.open(getCanisterUrl(canister_id), "_blank");
                  }}
                >
                  Visit Website
                </button>
                <Tooltip title="Deploy new version" arrow>
                  <button
                    className="action-button secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/deploy/${canister_id}`);
                    }}
                  >
                    <CodeIcon />
                  </button>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WebsitesComponent;
