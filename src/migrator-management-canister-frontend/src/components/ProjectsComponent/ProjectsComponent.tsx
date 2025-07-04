import React, { useEffect, useState, useRef } from "react";
import "./ProjectsComponent.css";
import { useProjects } from "../../context/ProjectContext/ProjectContext";
import LanguageIcon from "@mui/icons-material/Language";
import StorageIcon from "@mui/icons-material/Storage";
import UpdateIcon from "@mui/icons-material/Update";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import { getCanisterUrl } from "../../config/config";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";
import { useNavigate } from "react-router-dom";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import CodeIcon from "@mui/icons-material/Code";
import { Tooltip } from "@mui/material";
import HeaderCard from "../HeaderCard/HeaderCard";
import { ProjectData } from "../../context/ProjectContext/ProjectContext";
import TableChartIcon from "@mui/icons-material/TableChart";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import MainApi from "../../api/main";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import CountdownChip from "./CountdownChip";
import { useFreemium } from "../../context/FreemiumContext/FreemiumContext";

// Tag and sorting options
const planMap: Record<string, string> = {
  freemium: "Freemium",
  paid: "Paid",
};

const getPlanDisplayName = (plan: any): string => {
  if (typeof plan === "object" && plan !== null) {
    if ("freemium" in plan) return "Freemium";
    if ("paid" in plan) return "Paid";
  }
  return "Unknown";
};

const filterTagOptions = ["All", "Freemium", "Paid"];

const sortTagOptions = [
  { label: "All", value: "all" },
  { label: "Create Time ↑", value: "createAsc" },
  { label: "Create Time ↓", value: "createDesc" },
  { label: "Last Updated ↑", value: "updatedAsc" },
  { label: "Last Updated ↓", value: "updatedDesc" },
  { label: "Name A-Z", value: "nameAsc" },
  { label: "Name Z-A", value: "nameDesc" },
];

const TAGS_SHOWN_MOBILE = 3;

const ProjectsComponent: React.FC = () => {
  /** Hooks */
  const { projects, isLoading } = useProjects();
  const { setActiveTab } = useSideBar();
  const navigate = useNavigate();
  const { setActionBar } = useActionBar();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const {
    usageData: freemiumSlot,
    isLoadingUsageData,
    refreshFreemiumUsage,
  } = useFreemium();

  useEffect(() => {
    setActiveTab("projects");
    setActionBar(null);
  }, []);

  // Tag filter state
  const [activeFilterTag, setActiveFilterTag] = useState<string>("All");
  const [activeSortTag, setActiveSortTag] = useState<string>("all");
  const [filterTagsExpanded, setFilterTagsExpanded] = useState(false);
  const [sortTagsExpanded, setSortTagsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    refreshFreemiumUsage();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterTagsExpanded(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortTagsExpanded(false);
      }
    }
    if ((isMobile && filterTagsExpanded) || (isMobile && sortTagsExpanded)) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterTagsExpanded, sortTagsExpanded, isMobile]);

  // Filtering logic
  const filteredProjects = projects
    ? projects?.filter((project) => {
        if (activeFilterTag === "All") return true;
        const planTag = getPlanDisplayName(project.plan);
        return activeFilterTag === planTag;
      })
    : [];

  // Sorting logic
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    console.log(`Projects`);
    switch (activeSortTag) {
      case "createAsc":
        return (a.date_created || 0) - (b.date_created || 0);
      case "createDesc":
        return (b.date_created || 0) - (a.date_created || 0);
      case "updatedAsc":
        return (a.date_updated || 0) - (b.date_updated || 0);
      case "updatedDesc":
        return (b.date_updated || 0) - (a.date_updated || 0);
      case "nameAsc":
        return a.name.localeCompare(b.name);
      case "nameDesc":
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

  // If no projects at all, show the dotted silhouette card
  if (!isLoading && (!projects || projects.length === 0)) {
    return (
      <div className="projects-container">
        <HeaderCard
          title="Your Projects"
          description="Manage your projects and deployments"
        />
        <div className="projects-grid empty-align-left">
          <div
            className="project-card dotted-card"
            onClick={() => navigate("/dashboard/new")}
          >
            <div className="dotted-card-upper">
              <AddIcon className="dotted-plus" />
              <div className="dotted-card-message">
                <strong>Create your first project</strong>
                <p>
                  Click here to create a new project and start deploying your
                  applications.
                </p>
              </div>
            </div>
            <div className="dotted-card-divider" />
            <div className="dotted-card-lower">
              <div className="dotted-card-message">
                <strong>Choose your plan</strong>
                <p>
                  Start with a free freemium project or create a paid project
                  for production use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="projects-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <HeaderCard
          title="Your Projects"
          description="Manage your projects and deployments"
        />
      </div>
      {/* Filter tags row */}
      <div style={{ position: "relative" }}>
        <div className="tags-row" ref={filterRef}>
          <span className="filter-icon-illustration">
            <FilterListIcon />
          </span>
          {(isMobile &&
          !filterTagsExpanded &&
          filterTagOptions.length > TAGS_SHOWN_MOBILE
            ? filterTagOptions.slice(0, TAGS_SHOWN_MOBILE)
            : filterTagOptions
          ).map((tag) => (
            <button
              key={tag}
              className={`tag-chip${activeFilterTag === tag ? " active" : ""}`}
              onClick={() => setActiveFilterTag(tag)}
            >
              {tag}
            </button>
          ))}
          {isMobile && filterTagOptions.length > TAGS_SHOWN_MOBILE && (
            <button
              className="tag-chip show-more"
              onClick={() => setFilterTagsExpanded((v) => !v)}
            >
              {filterTagsExpanded ? "Less" : "More"}
            </button>
          )}
        </div>
        {/* Sorting tags row */}
        <div className="tags-row sort-row" ref={sortRef}>
          <span className="filter-icon-illustration">
            <SortByAlphaIcon />
          </span>
          {(isMobile &&
          !sortTagsExpanded &&
          sortTagOptions.length > TAGS_SHOWN_MOBILE
            ? sortTagOptions.slice(0, TAGS_SHOWN_MOBILE)
            : sortTagOptions
          ).map((sort) => (
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
          {isMobile && sortTagOptions.length > TAGS_SHOWN_MOBILE && (
            <button
              className="tag-chip show-more"
              onClick={() => setSortTagsExpanded((v) => !v)}
            >
              {sortTagsExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
        <button
          className="toggle-view-btn"
          onClick={() => setViewMode(viewMode === "card" ? "table" : "card")}
          aria-label={
            viewMode === "card" ? "Switch to table view" : "Switch to card view"
          }
        >
          {viewMode === "card" ? <TableChartIcon /> : <ViewModuleIcon />}{" "}
          {viewMode === "card" ? "Table View" : "Card View"}
        </button>
      </div>
      {viewMode === "card" ? (
        <div className="projects-grid">
          {sortedProjects.length === 0 ? (
            <div className="no-projects-message">
              No projects match your filter.
            </div>
          ) : (
            sortedProjects.map((project) => {
              const planTag = getPlanDisplayName(project.plan);
              const hasCanister = !!project.canister_id;
              const isFreemium = planTag.toLowerCase() === "freemium";
              // Check if this project is the current user's active freemium session
              const showCountdown =
                isFreemium &&
                hasCanister &&
                freemiumSlot &&
                freemiumSlot?.canister_id &&
                freemiumSlot.canister_id === project.canister_id;
              return (
                <div
                  key={`${project.name}-${project.date_created}`}
                  className={`project-card ${project.plan}`}
                  onClick={() => {
                    if (hasCanister) {
                      navigate(`/dashboard/canister/${project.canister_id}`);
                    } else {
                      // navigate(`/dashboard/new`);
                    }
                  }}
                >
                  <div className="project-card-content">
                    {/* Row 1: Icon and Paid/Freemium badge */}
                    <div className="project-header">
                      <LanguageIcon />
                      <div
                        className={`plan-badge ${project.plan}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          className={`chip ${
                            planTag.toLowerCase() === "paid"
                              ? "paid"
                              : "freemium"
                          }`}
                        >
                          {planTag}
                        </span>
                        {showCountdown && (
                          <CountdownChip
                            startTimestamp={freemiumSlot.start_timestamp}
                            duration={freemiumSlot.duration}
                          />
                        )}
                      </div>
                    </div>
                    {/* Row 2: Project name and description */}
                    <div className="project-main-info">
                      <h3 className="project-title">{project.name}</h3>
                      <p className="project-description">
                        {project.description}
                      </p>
                    </div>
                    {/* Row 3: Canister ID, Last Updated, Date Created */}
                    <div className="project-details-row">
                      <div className="detail-item">
                        <StorageIcon />
                        <div className="detail-content">
                          <span className="detail-label">Canister ID</span>
                          <span className="detail-value">
                            {hasCanister
                              ? `${project.canister_id?.slice(0, 8)}...icp0.io`
                              : "Not deployed"}
                          </span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <UpdateIcon />
                        <div className="detail-content">
                          <span className="detail-label">Last Updated</span>
                          <span className="detail-value">
                            {project.date_updated
                              ? new Date(
                                  Number(project.date_updated) / 1000000
                                ).toLocaleString()
                              : "-"}
                          </span>
                        </div>
                      </div>
                      <div className="detail-item">
                        <UpdateIcon style={{ transform: "rotate(-90deg)" }} />
                        <div className="detail-content">
                          <span className="detail-label">Date Created</span>
                          <span className="detail-value">
                            {project.date_created
                              ? new Date(
                                  Number(project.date_created) / 1000000
                                ).toLocaleString()
                              : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Row 4: Tags */}
                    {project.tags.length > 0 && (
                      <div className="project-tags">
                        {project.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="tag">
                            {tag}
                          </span>
                        ))}
                        {project.tags.length > 3 && (
                          <span className="tag more-tags">
                            +{project.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Row 5: Actions */}
                    <div className="project-actions">
                      {hasCanister && (
                        <button
                          className="action-button primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              getCanisterUrl(project.canister_id!),
                              "_blank"
                            );
                          }}
                        >
                          Visit Website
                        </button>
                      )}
                      <Tooltip title="Deploy new version" arrow>
                        <button
                          className="action-button secondary"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (hasCanister) {
                              navigate(
                                `/dashboard/deploy/${project.canister_id}/${project.canister_id}`
                              );
                            } else {
                              if (!agent) {
                                console.log(`HttpAgent not set.`);
                                return;
                              }

                              const mainApi = await MainApi.create(
                                identity,
                                agent
                              );

                              const res = await mainApi?.deployAssetCanister(
                                project.id
                              );
                              if (!res?.status) {
                                console.error(
                                  `Failed to attach canister id:`,
                                  res?.message
                                );
                                return;
                              }

                              navigate(`/dashboard/projects`);
                            }
                          }}
                        >
                          {hasCanister ? (
                            <>
                              <CodeIcon />
                              <span>Install Code</span>
                            </>
                          ) : (
                            <>
                              <CodeIcon /> <span>Attach Canister</span>
                            </>
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="projects-table-wrapper">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Date Created</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    No projects match your filter.
                  </td>
                </tr>
              ) : (
                sortedProjects.map((project) => {
                  const planTag = getPlanDisplayName(project.plan);
                  const hasCanister = !!project.canister_id;
                  const isFreemium = planTag.toLowerCase() === "freemium";
                  const showCountdown =
                    isFreemium &&
                    hasCanister &&
                    freemiumSlot &&
                    freemiumSlot.canister_id === project.canister_id;
                  return (
                    <tr
                      key={`${project.name}-${project.date_created}`}
                      className={`project-row ${project.plan}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        if (hasCanister) {
                          navigate(
                            `/dashboard/canister/${project.canister_id}`
                          );
                        } else {
                          navigate(`/dashboard/new`);
                        }
                      }}
                    >
                      <td
                      // style={{
                      //   display: "flex",
                      //   alignItems: "center",
                      //   gap: 8,
                      // }}
                      >
                        {/* <LanguageIcon fontSize="small" /> */}
                        <span>{project.name}</span>
                      </td>
                      <td>{hasCanister ? "Deployed" : "Not deployed"}</td>
                      <td>
                        <span
                          className={`chip ${
                            planTag.toLowerCase() === "paid"
                              ? "paid"
                              : "freemium"
                          }`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {planTag}
                          {showCountdown && (
                            <CountdownChip
                              startTimestamp={freemiumSlot.start_timestamp}
                              duration={freemiumSlot.duration}
                            />
                          )}
                        </span>
                      </td>
                      <td>
                        {project.date_created
                          ? new Date(
                              Number(project.date_created) / 1000000
                            ).toLocaleString()
                          : "-"}
                      </td>
                      <td>
                        {project.date_updated
                          ? new Date(
                              Number(project.date_updated) / 1000000
                            ).toLocaleString()
                          : "-"}
                      </td>
                      <td style={{ display: "flex", gap: 8 }}>
                        {hasCanister && (
                          <button
                            className="action-button primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                getCanisterUrl(project.canister_id!),
                                "_blank"
                              );
                            }}
                          >
                            Visit Website
                          </button>
                        )}
                        <Tooltip title="Deploy new version" arrow>
                          <button
                            className="action-button secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasCanister) {
                                navigate(
                                  `/dashboard/deploy/${project.canister_id}`
                                );
                              } else {
                                navigate(`/dashboard/new`);
                              }
                            }}
                          >
                            <CodeIcon /> Install Code
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProjectsComponent;
