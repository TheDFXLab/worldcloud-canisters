import React, { useEffect, useState } from "react";
import { useAdminLogic } from "../../../hooks/useAdminLogic";
import { PaginationPayload } from "../../../serialization/admin";
import "./ActivityLogsManagement.css";

const ActivityLogsManagement: React.FC = () => {
  const {
    activityLogs,
    isLoadingActivityLogs,
    refreshActivityLogsAll,
    handleDeleteAllLogs,
  } = useAdminLogic();

  const [pagination, setPagination] = useState<PaginationPayload>({
    limit: 20,
    page: 0,
  });

  useEffect(() => {
    refreshActivityLogsAll(pagination);
  }, [pagination, refreshActivityLogsAll]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 0 }));
  };

  const handleDeleteLogs = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete all activity logs? This action cannot be undone."
      )
    ) {
      await handleDeleteAllLogs();
      refreshActivityLogsAll(pagination);
    }
  };

  return (
    <div className="activity-logs-management">
      <div className="activity-logs-section-header">
        <h3>Activity Logs Management</h3>
        <div className="activity-logs-header-actions">
          <button
            className="activity-logs-delete-button"
            onClick={handleDeleteLogs}
            disabled={isLoadingActivityLogs}
          >
            Delete All Logs
          </button>
        </div>
      </div>

      <div className="activity-logs-pagination-controls">
        <div className="activity-logs-pagination-info">
          <label>Items per page:</label>
          <select
            value={pagination.limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {isLoadingActivityLogs ? (
        <div className="activity-logs-loading-container">
          <div className="activity-logs-loading-spinner"></div>
          <p>Loading activity logs...</p>
        </div>
      ) : (
        <div className="activity-logs-content">
          {activityLogs.length === 0 ? (
            <div className="activity-logs-empty-state">
              <p>No activity logs found.</p>
            </div>
          ) : (
            <div className="activity-logs-list">
              {activityLogs.map(([projectId, logs]) => (
                <div key={projectId} className="activity-logs-project-group">
                  <h4>Project ID: {projectId}</h4>
                  <div className="activity-logs-container">
                    {logs.map((log, index) => (
                      <div key={index} className="activity-log-item">
                        <div className="activity-log-header">
                          <span className="activity-log-id">#{log.id}</span>
                          <span className="activity-log-action">
                            {log.action}
                          </span>
                          <span className="activity-log-time">
                            {new Date(log.create_time).toLocaleString()}
                          </span>
                        </div>
                        <div className="activity-log-details">
                          <p>{log.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="activity-logs-pagination-navigation">
        <button
          onClick={() => handlePageChange(pagination.page! - 1)}
          disabled={pagination.page === 0}
          className="activity-logs-pagination-button"
        >
          Previous
        </button>
        <span className="activity-logs-page-info">
          Page {pagination.page! + 1}
        </span>
        <button
          onClick={() => handlePageChange(pagination.page! + 1)}
          disabled={activityLogs.length < (pagination.limit || 20)}
          className="activity-logs-pagination-button"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ActivityLogsManagement;
