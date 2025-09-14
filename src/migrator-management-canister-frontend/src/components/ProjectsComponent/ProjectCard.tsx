import React, { useEffect } from "react";
import {
  DeserializedProject,
  SerializedCanisterDeployment,
} from "../../utility/bigint";
import { getPlanDisplayName } from "../../hooks/useProjectsLogic";
import LanguageIcon from "@mui/icons-material/Language";
import StorageIcon from "@mui/icons-material/Storage";
import UpdateIcon from "@mui/icons-material/Update";
import CodeIcon from "@mui/icons-material/Code";
import { Tooltip } from "@mui/material";
import CountdownChip from "./CountdownChip";
import { FreemiumUsageData } from "../../state/slices/freemiumSlice";
import { CanisterDeployment } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { DeserializedDeployment } from "../AppLayout/interfaces";
import { CanisterDeploymentStatus } from "../../utility/principal";
import LaunchIcon from "@mui/icons-material/Launch";

interface ProjectCardProps {
  project: DeserializedProject;
  freemiumSlot: FreemiumUsageData | null;
  canisterDeployment: DeserializedDeployment | undefined;
  onInstallCode: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDeployNewCode: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onVisitWebsite: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  freemiumSlot,
  canisterDeployment,
  onInstallCode,
  onDeployNewCode,
  onVisitWebsite,
  onClick,
}) => {
  const planTag = getPlanDisplayName(project.plan);
  const hasCanister = !!project.canister_id;
  const hasInstalledCode = false;
  const deploymentStatus: CanisterDeploymentStatus = canisterDeployment?.status
    ? (canisterDeployment.status as CanisterDeploymentStatus)
    : "uninitialized";
  const isFreemium = planTag.toLowerCase() === "freemium";

  // Break down the conditions for better debugging
  const hasFreemiumSlot = !!freemiumSlot;
  const hasFreemiumCanisterId = hasFreemiumSlot && !!freemiumSlot.canister_id;
  const canisterIdsMatch =
    hasFreemiumCanisterId &&
    String(freemiumSlot.canister_id).toLowerCase() ===
      String(project.canister_id).toLowerCase();

  // Show countdown if it's a freemium project with a canister and has active slot data
  const showCountdown =
    isFreemium &&
    hasCanister &&
    hasFreemiumSlot &&
    freemiumSlot.status === "occupied";

  const getActionButtonMessage = () => {
    let title = "";
    let tooltipMessage = "";
    let isButton = true;
    if (hasCanister) {
      switch (deploymentStatus) {
        case "installed":
          title = "Update Code";
          tooltipMessage = "Deploy a new version of the web application.";
          break;
        case "uninitialized":
          title = "Deploy New Code";
          tooltipMessage =
            "No code is installed in the project's canister yet. Click here to deploy a new version of the web application.";
          break;
        case "failed":
          title = "Deploy New Code";
          tooltipMessage = "Deploy a new version of the web application.";
          break;
        case "installing":
          title = "Installing...";
          tooltipMessage = "Project is in the process of installing new code.";
          isButton = false;
          break;
        default:
          break;
      }
    } else {
      if (isFreemium) {
        title = "Request Freemium Session";
        tooltipMessage =
          "Freemium projects require requesting access to a shareable runner and acquiring a time slot. Click here to receive a time slot.";
      } else {
        title = "Attach Runner";
        tooltipMessage =
          "Project requires a runner for hosting the web application. Click here to get started, this will consume 1 canister from your plan.";
      }
    }
    return { title, tooltipMessage, isButton };
  };

  return (
    <div className={`project-card ${project.plan}`} onClick={onClick}>
      <div className="project-card-content">
        <div className="project-header">
          <LanguageIcon />

          <div
            className={`plan-badge`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div>
              {hasCanister && (
                <span className={`tag `}>{deploymentStatus}</span>
              )}
            </div>
            <span
              className={`chip ${
                planTag.toLowerCase() === "paid" ? "paid" : "freemium"
              }`}
            >
              {planTag}
            </span>
            {showCountdown && freemiumSlot && (
              <CountdownChip
                startTimestamp={freemiumSlot.start_timestamp}
                duration={freemiumSlot.duration}
              />
            )}
          </div>
        </div>

        <div className="project-main-info">
          <h3 className="project-title">{project.name}</h3>
          <p className="project-description">{project.description}</p>
        </div>

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
                  ? new Date(project.date_updated).toLocaleString()
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
                  ? new Date(project.date_created).toLocaleString()
                  : "-"}
              </span>
            </div>
          </div>
        </div>

        {project.tags.length > 0 && (
          <div className="project-tags">
            {project.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="tag">
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="tag more-tags">+{project.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="project-actions">
          {hasCanister && deploymentStatus === "installed" && (
            <button
              className="action-button primary"
              onClick={(e) => {
                e.stopPropagation();
                onVisitWebsite(e);
              }}
            >
              Visit Website
            </button>
          )}
          <Tooltip
            title={getActionButtonMessage().tooltipMessage}
            disableHoverListener={
              getActionButtonMessage().tooltipMessage.length === 0
            }
          >
            <button
              className="action-button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasCanister) {
                  onDeployNewCode(e);
                } else {
                  onInstallCode(e);
                }
              }}
            >
              <CodeIcon />
              {getActionButtonMessage().title}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
