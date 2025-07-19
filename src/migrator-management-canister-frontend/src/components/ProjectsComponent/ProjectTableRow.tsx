import React from "react";
import { DeserializedProject } from "../../utility/bigint";
import { getPlanDisplayName } from "../../hooks/useProjectsLogic";
import CodeIcon from "@mui/icons-material/Code";
import { Tooltip } from "@mui/material";
import CountdownChip from "./CountdownChip";

interface ProjectTableRowProps {
  project: DeserializedProject;
  freemiumSlot: any;
  onInstallCode: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onVisitWebsite: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}

export const ProjectTableRow: React.FC<ProjectTableRowProps> = ({
  project,
  freemiumSlot,
  onInstallCode,
  onVisitWebsite,
  onClick,
}) => {
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
      className={`project-row ${project.plan}`}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <td>
        <span>{project.name}</span>
      </td>
      <td>{hasCanister ? "Deployed" : "Not deployed"}</td>
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
        {hasCanister && (
          <button className="action-button primary" onClick={onVisitWebsite}>
            Visit Website
          </button>
        )}
        <Tooltip title="Deploy new version" arrow>
          <button className="action-button secondary" onClick={onInstallCode}>
            <CodeIcon /> Install Code
          </button>
        </Tooltip>
      </td>
    </tr>
  );
};
