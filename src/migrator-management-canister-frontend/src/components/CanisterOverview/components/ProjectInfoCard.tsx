import React from "react";
import InfoIcon from "@mui/icons-material/Info";
import { Chip } from "@mui/material";

interface Project {
  id: bigint;
  name: string;
  description: string;
  canister_id: string;
  plan: { freemium: null } | { paid: null };
  date_created: bigint;
  tags: string[];
}

interface ProjectInfoCardProps {
  currentProject: Project;
}

export const ProjectInfoCard: React.FC<ProjectInfoCardProps> = ({
  currentProject,
}) => {
  return (
    <div className="overview-card">
      <div className="card-header">
        <InfoIcon />
        <h3>Project Details</h3>
      </div>
      <div className="card-content">
        <div className="info-table">
          <div className="info-row">
            <div className="info-label">Project Name</div>
            <div className="info-value">{currentProject?.name}</div>
          </div>
          <div className="info-row">
            <div className="info-label">Description</div>
            <div className="info-value">
              {currentProject?.description || "No description"}
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Created</div>
            <div className="info-value">
              {currentProject?.date_created
                ? new Date(Number(currentProject.date_created)).toLocaleString()
                : "N/A"}
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Tags</div>
            <div className="info-value">
              <div className="tags-container">
                {currentProject?.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    className="tag-chip"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
