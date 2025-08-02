import React from "react";
import { Skeleton } from "@mui/material";
import "./RepoSelectorSkeleton.css";

interface RepoSelectorSkeletonProps {
  cardCount?: number;
  showPagination?: boolean;
  showActionBar?: boolean;
}

const RepoSelectorSkeleton: React.FC<RepoSelectorSkeletonProps> = ({
  cardCount = 6,
  showPagination = true,
  showActionBar = true,
}) => {
  const RepoCardSkeleton = () => (
    <div className="skeleton-repo-card">
      <div className="skeleton-repo-name">
        <Skeleton width="80%" height={24} />
      </div>

      <div className="skeleton-repo-info">
        <div className="skeleton-repo-full-name">
          <Skeleton width="100%" height={16} />
        </div>
        <div className="skeleton-repo-visibility">
          <Skeleton
            variant="rounded"
            width="100%"
            height="100%"
            style={{ borderRadius: "12px" }}
          />
        </div>
      </div>

      <div className="skeleton-repo-actions">
        <div className="skeleton-repo-link">
          <Skeleton width="100%" height="100%" />
        </div>
      </div>
    </div>
  );

  const PaginationSkeleton = () => (
    <div className="skeleton-pagination">
      <div className="skeleton-pagination-button">
        <Skeleton
          variant="rounded"
          width="100%"
          height="100%"
          style={{ borderRadius: "8px" }}
        />
      </div>
      <div className="skeleton-pagination-info">
        <Skeleton width="100%" height="100%" />
      </div>
      <div className="skeleton-pagination-button">
        <Skeleton
          variant="rounded"
          width="100%"
          height="100%"
          style={{ borderRadius: "8px" }}
        />
      </div>
    </div>
  );

  const ActionBarSkeleton = () => (
    <div className="skeleton-action-bar">
      <div className="skeleton-action-left">
        <div className="skeleton-action-icon">
          <Skeleton
            variant="rounded"
            width="100%"
            height="100%"
            style={{ borderRadius: "4px" }}
          />
        </div>
        <div className="skeleton-action-text">
          <Skeleton width="100%" height="100%" />
        </div>
      </div>
      <div className="skeleton-action-button">
        <Skeleton
          variant="rounded"
          width="100%"
          height="100%"
          style={{ borderRadius: "8px" }}
        />
      </div>
    </div>
  );

  return (
    <div className="skeleton-repo-selector-container">
      <div className="skeleton-repo-grid-container">
        <div className="skeleton-repo-grid">
          {/* Render exactly 6 cards for 3x2 grid layout */}
          {Array(cardCount)
            .fill(0)
            .map((_, index) => (
              <RepoCardSkeleton key={index} />
            ))}
        </div>
      </div>

      {showPagination && <PaginationSkeleton />}
      {showActionBar && <ActionBarSkeleton />}
    </div>
  );
};

export default RepoSelectorSkeleton;
