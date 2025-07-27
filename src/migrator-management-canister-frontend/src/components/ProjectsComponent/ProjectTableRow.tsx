import React from "react";
import { DeserializedProject } from "../../utility/bigint";
import { getPlanDisplayName } from "../../hooks/useProjectsLogic";
import CodeIcon from "@mui/icons-material/Code";
import { Tooltip } from "@mui/material";
import CountdownChip from "./CountdownChip";
import { CanisterDeploymentStatus } from "../../utility/principal";
import { DeserializedDeployment } from "../AppLayout/interfaces";

interface ProjectTableRowProps {
  project: DeserializedProject;
  freemiumSlot: any;
  canisterDeployment: DeserializedDeployment | undefined;
  onInstallCode: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onDeployNewCode: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onVisitWebsite: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}

export const ProjectTableRow: React.FC<ProjectTableRowProps> = ({
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
  const isFreemium = planTag.toLowerCase() === "freemium";

  // Get deployment status
  const deploymentStatus: CanisterDeploymentStatus = canisterDeployment?.status
    ? (canisterDeployment.status as CanisterDeploymentStatus)
    : "uninitialized";

  // Show countdown if it's a freemium project with a canister and has active slot data
  const showCountdown =
    isFreemium &&
    hasCanister &&
    freemiumSlot &&
    freemiumSlot.status === "occupied" &&
    String(freemiumSlot.canister_id).toLowerCase() ===
      String(project.canister_id).toLowerCase();

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

  const actionButtonMessage = getActionButtonMessage();

  return (
    <tr
      className={`project-row ${project.plan}`}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <td>
        <span>{project.name}</span>
      </td>
      <td>
        {hasCanister ? (
          <span className={`status-badge ${deploymentStatus}`}>
            {deploymentStatus}
          </span>
        ) : (
          "Not deployed"
        )}
      </td>
      <td>
        <span
          className={`chip ${
            planTag.toLowerCase() === "paid" ? "paid" : "freemium"
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
          ? new Date(project.date_created).toLocaleString()
          : "-"}
      </td>
      <td>
        {project.date_updated
          ? new Date(project.date_updated).toLocaleString()
          : "-"}
      </td>
      <td style={{ display: "flex", gap: 8 }}>
        {hasCanister && deploymentStatus === "installed" && (
          <Tooltip title="Visit the deployed website" arrow>
            <button
              className="action-button primary"
              onClick={(e) => {
                e.stopPropagation();
                onVisitWebsite(e);
              }}
            >
              Visit Website
            </button>
          </Tooltip>
        )}
        <Tooltip
          title={actionButtonMessage.tooltipMessage}
          disableHoverListener={actionButtonMessage.tooltipMessage.length === 0}
          arrow
        >
          <button
            className={`action-button ${
              actionButtonMessage.isButton ? "secondary" : "disabled"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (hasCanister) {
                onDeployNewCode(e);
              } else {
                onInstallCode(e);
              }
            }}
            disabled={!actionButtonMessage.isButton}
          >
            <CodeIcon />
            {actionButtonMessage.title}
          </button>
        </Tooltip>
      </td>
    </tr>
  );
};
