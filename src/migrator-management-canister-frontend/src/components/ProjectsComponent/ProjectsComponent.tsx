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
import { mapHeaderContent } from "../../utility/headerCard";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import { useDeploymentLogic } from "../../hooks/useDeploymentLogic";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import ProjectsSkeleton from "./ProjectsSkeleton";
import { useConfirmationModal } from "../../context/ConfirmationModalContext/ConfirmationModalContext";
import { ConfirmationModal } from "../ConfirmationPopup/ConfirmationModal";

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
  const { setHeaderCard } = useHeaderCard();
  const { setActionBar } = useActionBar();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const { summon, destroy } = useLoaderOverlay();
  const { setToasterData, setShowToaster } = useToaster();
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
    handleDeleteProject,
    handleClearProjectAssets,
  } = useProjectsLogic();

  const { getDeployment } = useDeploymentLogic();
  const { showModal, setShowModal } = useConfirmationModal();

  // State for confirmation modal
  const [confirmationAction, setConfirmationAction] = useState<string | null>(
    null
  );
  const [selectedProject, setSelectedProject] = useState<any>(null);

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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  useEffect(() => {
    setHeaderCard(mapHeaderContent("projects"));
  }, []);

  const handleConfirmation = async (amount: number) => {
    if (!selectedProject) return;

    try {
      if (confirmationAction === "delete") {
        await handleDeleteProject(parseInt(selectedProject.id));
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: "Project deleted successfully.",
          timeout: 3000,
        });
        setShowToaster(true);
        navigate("/dashboard/projects");
      } else if (confirmationAction === "clear") {
        await handleClearProjectAssets(parseInt(selectedProject.id));
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: "Project assets cleared successfully.",
          timeout: 3000,
        });
        setShowToaster(true);
      }
    } catch (error: any) {
      console.error(`Failed to ${confirmationAction} project:`, error.message);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || `Failed to ${confirmationAction} project.`,
        textColor: "red",
        timeout: 4000,
      });
      setShowToaster(true);
    } finally {
      setConfirmationAction(null);
      setSelectedProject(null);
    }
  };

  const getModalConfig = () => {
    if (confirmationAction === "delete") {
      return {
        title: "Delete Project",
        message: `Are you sure you want to delete the project "${selectedProject?.name}"? This action cannot be undone.`,
        confirmText: "Delete Project",
        cancelText: "Cancel",
        showWalletInfo: false,
        showInputField: false,
        showTotalPrice: false,
      };
    } else if (confirmationAction === "clear") {
      return {
        title: "Clear Project Assets",
        message: `Are you sure you want to clear all assets from the project "${selectedProject?.name}"? This will remove all deployed files but keep the project structure.`,
        confirmText: "Clear Assets",
        cancelText: "Cancel",
        showWalletInfo: false,
        showInputField: false,
        showTotalPrice: false,
      };
    }
    // Default cycles config (not used in this component but needed for type safety)
    return {
      title: "Add Cycles",
      message: "Enter the amount of ICP to convert to cycles",
      confirmText: "Add Cycles",
      cancelText: "Cancel",
      showCyclesInfo: true,
      showWalletInfo: true,
      showEstimatedCycles: true,
      showInputField: true,
      showTotalPrice: false,
    };
  };

  // If loading, show skeleton
  if (isLoading) {
    return <ProjectsSkeleton viewMode={viewMode} />;
  }

  // If no projects at all, show the dotted silhouette card
  if (!projects || projects.length === 0) {
    return (
      <div className="projects-container">
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

  // useEffect(() => {
  //   setHeaderCard({
  //     description: `Your canister is deployed with principal ${canisterId}`,
  //     title: "Upload the zip file containing your website assets.",
  //     className: "deployment-header",
  //   });
  // }, []);

  return (
    <div className="projects-container">
      {showModal && (
        <ConfirmationModal
          amountState={["0", () => {}]}
          overrideEnableSubmit={confirmationAction ? true : undefined}
          onHide={() => {
            setShowModal(false);
            setConfirmationAction(null);
            setSelectedProject(null);
          }}
          onConfirm={handleConfirmation}
          type="cycles"
          customConfig={getModalConfig()}
        />
      )}

      {/* <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      ></div> */}
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
                canisterDeployment={
                  project.canister_id
                    ? getDeployment(project.canister_id)
                    : undefined
                }
                key={`${project.name}-${project.date_created}`}
                project={project}
                freemiumSlot={freemiumSlot}
                onDeployNewCode={() => {
                  navigate(
                    `/dashboard/deploy/${project.canister_id}/${project.id}`
                  );
                }}
                onInstallCode={async (e) => {
                  try {
                    summon("Setting up canister...");
                    const result = await handleInstallCode(
                      e,
                      !!project.canister_id,
                      project.id,
                      project.canister_id,
                      project.plan === "freemium",
                      identity,
                      agent
                    );

                    if (result) {
                      setToasterData({
                        headerContent: "Success",
                        toastStatus: true,
                        toastData: `Attached runner: ${result.canisterId}`,
                        textColor: "green",
                        timeout: 3000,
                      });
                      setShowToaster(true);
                    }
                  } catch (error: any) {
                    console.error("Failed to deploy canister:", error.message);
                    setToasterData({
                      headerContent: "Error",
                      toastStatus: false,
                      toastData: error.message || "Failed to attach runner.",
                      textColor: "red",
                      timeout: 5000,
                    });
                    setShowToaster(true);
                    // Handle subscription-related errors
                    if (error.message.includes("subscription")) {
                      navigate("/dashboard/billing");
                    }
                  } finally {
                    destroy();
                  }
                }}
                onVisitWebsite={(e) =>
                  handleVisitWebsite(e, project.canister_id!)
                }
                onClick={() =>
                  handleProjectClick(
                    project.id.toString(),
                    !!project.canister_id,
                    project.canister_id
                  )
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
                    canisterDeployment={
                      project.canister_id
                        ? getDeployment(project.canister_id)
                        : undefined
                    }
                    onDeployNewCode={() => {
                      navigate(
                        `/dashboard/deploy/${project.canister_id}/${project.id}`
                      );
                    }}
                    onInstallCode={async (e) => {
                      try {
                        summon("Setting up canister...");
                        const result = await handleInstallCode(
                          e,
                          !!project.canister_id,
                          project.id,
                          project.canister_id,
                          project.plan === "freemium",
                          identity,
                          agent
                        );

                        if (result) {
                          setToasterData({
                            headerContent: "Success",
                            toastStatus: true,
                            toastData: `Attached runner: ${result.canisterId}`,
                            textColor: "green",
                            timeout: 3000,
                          });
                          setShowToaster(true);
                        }
                      } catch (error: any) {
                        console.error(
                          "Failed to deploy canister:",
                          error.message
                        );
                        setToasterData({
                          headerContent: "Error",
                          toastStatus: false,
                          toastData:
                            error.message || "Failed to attach runner.",
                          textColor: "red",
                          timeout: 5000,
                        });
                        setShowToaster(true);
                        // Handle subscription-related errors
                        if (error.message.includes("subscription")) {
                          navigate("/dashboard/billing");
                        }
                      } finally {
                        destroy();
                      }
                    }}
                    onVisitWebsite={(e) =>
                      handleVisitWebsite(e, project.canister_id!)
                    }
                    onClick={() =>
                      handleProjectClick(
                        project.id.toString(),
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
