import React from "react";
import { Skeleton } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import LanguageIcon from "@mui/icons-material/Language";
import "./ProjectsSkeleton.css";

interface ProjectsSkeletonProps {
  viewMode?: "card" | "table";
}

const ProjectsSkeleton: React.FC<ProjectsSkeletonProps> = ({
  viewMode = "card",
}) => {
  const FilterTagsSkeleton = () => (
    <div className="skeleton-tags-row">
      <span className="filter-icon-illustration">
        <FilterListIcon />
      </span>
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={80}
            height={24}
            style={{ borderRadius: "20px" }}
          />
        ))}
    </div>
  );

  const SortTagsSkeleton = () => (
    <div className="skeleton-tags-row sort-row">
      <span className="filter-icon-illustration">
        <SortByAlphaIcon />
      </span>
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={100}
            height={24}
            style={{ borderRadius: "20px" }}
          />
        ))}
    </div>
  );

  const ProjectCardSkeleton = () => (
    <div className="skeleton-project-card">
      <div className="skeleton-project-card-content">
        <div className="skeleton-project-main-info">
          <div className="skeleton-project-header">
            <div className="skeleton-project-title-row">
              <LanguageIcon />
              <Skeleton width={200} height={28} />
            </div>
            <Skeleton
              variant="rounded"
              width={80}
              height={24}
              style={{ borderRadius: "20px" }}
            />
          </div>
          <Skeleton width="60%" height={20} style={{ marginTop: "8px" }} />
        </div>

        <div className="skeleton-project-details-row">
          <div className="skeleton-detail-item">
            <Skeleton variant="circular" width={20} height={20} />
            <div className="skeleton-detail-content">
              <Skeleton width={80} height={16} />
              <Skeleton width={120} height={20} />
            </div>
          </div>
          <div className="skeleton-detail-item">
            <Skeleton variant="circular" width={20} height={20} />
            <div className="skeleton-detail-content">
              <Skeleton width={80} height={16} />
              <Skeleton width={140} height={20} />
            </div>
          </div>
          <div className="skeleton-detail-item">
            <Skeleton variant="circular" width={20} height={20} />
            <div className="skeleton-detail-content">
              <Skeleton width={80} height={16} />
              <Skeleton width={160} height={20} />
            </div>
          </div>
        </div>

        <div className="skeleton-project-tags">
          {Array(2)
            .fill(0)
            .map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                width={60}
                height={24}
                style={{ borderRadius: "12px" }}
              />
            ))}
        </div>

        <div className="skeleton-project-actions">
          <Skeleton
            variant="rounded"
            width="100%"
            height={38}
            style={{ borderRadius: "8px" }}
          />
          <Skeleton
            variant="rounded"
            width={38}
            height={38}
            style={{ borderRadius: "8px" }}
          />
          <Skeleton
            variant="rounded"
            width={38}
            height={38}
            style={{ borderRadius: "8px" }}
          />
        </div>
      </div>
    </div>
  );

  const ProjectTableSkeleton = () => (
    <div className="skeleton-projects-table-wrapper">
      <table className="skeleton-projects-table">
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
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <tr key={i}>
                <td>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <LanguageIcon />
                    <Skeleton width={150} height={24} />
                  </div>
                </td>
                <td>
                  <Skeleton width={100} height={24} />
                </td>
                <td>
                  <Skeleton
                    variant="rounded"
                    width={80}
                    height={24}
                    style={{ borderRadius: "20px" }}
                  />
                </td>
                <td>
                  <Skeleton width={120} height={24} />
                </td>
                <td>
                  <Skeleton width={120} height={24} />
                </td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Skeleton variant="rounded" width={32} height={32} />
                    <Skeleton variant="rounded" width={32} height={32} />
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="skeleton-projects-container">
      <FilterTagsSkeleton />
      <SortTagsSkeleton />
      {viewMode === "card" ? (
        <div className="skeleton-projects-grid">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
        </div>
      ) : (
        <ProjectTableSkeleton />
      )}
    </div>
  );
};

export default ProjectsSkeleton;
