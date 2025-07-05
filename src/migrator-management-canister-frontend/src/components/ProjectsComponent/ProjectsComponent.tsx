import React, { useEffect, useState, useRef } from "react";
import "./ProjectsComponent.css";
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
import TableChartIcon from "@mui/icons-material/TableChart";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import MainApi from "../../api/main";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import CountdownChip from "./CountdownChip";
import { useFreemiumLogic } from "../../hooks/useFreemiumLogic";
import { useProjectsLogic } from "../../hooks/useProjectsLogic";
import { ProjectCard } from "./ProjectCard";
import { ProjectTableRow } from "./ProjectTableRow";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../state/store";

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
  const { setActiveTab } = useSideBar();
  const navigate = useNavigate();
  const { setActionBar } = useActionBar();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const { usageData: freemiumSlot, fetchUsage } = useFreemiumLogic();
  const {
    projects,
    isLoading,
    activeFilterTag,
    activeSortTag,
    viewMode,
    handleFilterChange,
    handleSortChange,
    handleViewModeChange,
    handleInstallCode,
    handleVisitWebsite,
    handleProjectClick,
    refreshProjects,
  } = useProjectsLogic();

  useEffect(() => {
    setActiveTab("projects");
    setActionBar(null);
  }, []);

  // Tag filter state
  const [filterTagsExpanded, setFilterTagsExpanded] = useState(false);
  const [sortTagsExpanded, setSortTagsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // useEffect(() => {
  //   refreshFreemiumUsage();
  // }, []);

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
              onClick={() => handleFilterChange(tag)}
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
              onClick={() => handleSortChange(sort.value)}
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
          onClick={handleViewModeChange}
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
          {projects?.length === 0 ? (
            <div className="no-projects-message">
              No projects match your filter.
            </div>
          ) : (
            projects?.map((project) => (
              <ProjectCard
                key={`${project.name}-${project.date_created}`}
                project={project}
                freemiumSlot={freemiumSlot}
                onInstallCode={async (e) => {
                  console.log(`INSTALLING CODE>....`);
                  await handleInstallCode(
                    e,
                    !!project.canister_id,
                    project.id,
                    project.canister_id,
                    identity,
                    agent
                  );
                  // Refresh after installation completes
                  // await refreshProjects();
                  // await fetchUsage();
                  // await refreshFreemiumUsage();
                }}
                onVisitWebsite={(e) =>
                  handleVisitWebsite(e, project.canister_id!)
                }
                onClick={() =>
                  handleProjectClick(!!project.canister_id, project.canister_id)
                }
              />
            ))
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
              {projects?.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    No projects match your filter.
                  </td>
                </tr>
              ) : (
                projects?.map((project) => (
                  <ProjectTableRow
                    key={`${project.name}-${project.date_created}`}
                    project={project}
                    freemiumSlot={freemiumSlot}
                    onInstallCode={(e) =>
                      handleInstallCode(
                        e,
                        !!project.canister_id,
                        project.id,
                        project.canister_id,
                        identity,
                        agent
                      )
                    }
                    onVisitWebsite={(e) =>
                      handleVisitWebsite(e, project.canister_id!)
                    }
                    onClick={() =>
                      handleProjectClick(
                        !!project.canister_id,
                        project.canister_id
                      )
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProjectsComponent;
