import React, { useState, useEffect } from "react";
import { useAdminLogic } from "../../../hooks/useAdminLogic";
import { PaginationPayload } from "../../../serialization/admin";
import "./SystemManagement.css";

const SystemManagement: React.FC = () => {
  const {
    usageLogs,
    isLoadingUsageLogs,
    workflowRunHistory,
    isLoadingWorkflowHistory,
    allProjects,
    isLoadingAllProjects,
    userProjects,
    isLoadingUserProjects,
    refreshUsageLogsAll,
    refreshWorkflowRunHistoryAll,
    refreshProjectsAll,
    refreshUserProjectsAll,
    handleDeleteUsageLogs,
    handleDeleteWorkflowRunHistory,
    handleDeleteProjects,
    handlePurgeExpiredSessions,
    handleResetSlots,
  } = useAdminLogic();

  const [usagePagination, setUsagePagination] = useState<PaginationPayload>({
    limit: 10,
    page: 0,
  });

  const [workflowPagination, setWorkflowPagination] =
    useState<PaginationPayload>({
      limit: 10,
      page: 0,
    });

  const [projectsPagination, setProjectsPagination] =
    useState<PaginationPayload>({
      limit: 10,
      page: 0,
    });

  useEffect(() => {
    refreshUsageLogsAll(usagePagination);
    refreshWorkflowRunHistoryAll(workflowPagination);
    refreshProjectsAll(projectsPagination);
  }, [
    usagePagination,
    workflowPagination,
    projectsPagination,
    refreshUsageLogsAll,
    refreshWorkflowRunHistoryAll,
    refreshProjectsAll,
  ]);

  const handleDeleteUsageLogsAction = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete all usage logs? This action cannot be undone."
      )
    ) {
      await handleDeleteUsageLogs();
      refreshUsageLogsAll(usagePagination);
    }
  };

  const handleDeleteWorkflowHistoryAction = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete all workflow run history? This action cannot be undone."
      )
    ) {
      await handleDeleteWorkflowRunHistory();
      refreshWorkflowRunHistoryAll(workflowPagination);
    }
  };

  const handleDeleteProjectsAction = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete all projects? This action cannot be undone."
      )
    ) {
      await handleDeleteProjects();
      refreshProjectsAll(projectsPagination);
    }
  };

  const handlePurgeSessionsAction = async () => {
    if (
      window.confirm(
        "Are you sure you want to purge all expired sessions? This action cannot be undone."
      )
    ) {
      await handlePurgeExpiredSessions();
    }
  };

  const handleResetSlotsAction = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset all slots? This action cannot be undone."
      )
    ) {
      await handleResetSlots();
    }
  };

  return (
    <div className="system-management">
      <div className="system-management-section-header">
        <h3>System Management</h3>
        <p>Manage system-wide operations and monitor overall system health</p>
      </div>

      {/* System Operations */}
      <div className="system-management-operations">
        <h4>System Operations</h4>
        <div className="system-management-operations-grid">
          <div className="system-management-operation-card">
            <h5>Usage Logs</h5>
            <p>Manage user usage logs and quotas</p>
            <div className="system-management-operation-stats">
              <span>Total Logs: {usageLogs.length}</span>
            </div>
            <button
              onClick={handleDeleteUsageLogsAction}
              disabled={isLoadingUsageLogs}
              className="system-management-danger-button"
            >
              Delete All Usage Logs
            </button>
          </div>

          <div className="system-management-operation-card">
            <h5>Workflow History</h5>
            <p>Manage workflow run history</p>
            <div className="system-management-operation-stats">
              <span>Total Runs: {workflowRunHistory.length}</span>
            </div>
            <button
              onClick={handleDeleteWorkflowHistoryAction}
              disabled={isLoadingWorkflowHistory}
              className="system-management-danger-button"
            >
              Delete All Workflow History
            </button>
          </div>

          <div className="system-management-operation-card">
            <h5>Projects</h5>
            <p>Manage all user projects</p>
            <div className="system-management-operation-stats">
              <span>Total Projects: {allProjects.length}</span>
            </div>
            <button
              onClick={handleDeleteProjectsAction}
              disabled={isLoadingAllProjects}
              className="system-management-danger-button"
            >
              Delete All Projects
            </button>
          </div>

          <div className="system-management-operation-card">
            <h5>Session Management</h5>
            <p>Manage freemium sessions and slots</p>
            <div className="system-management-operation-buttons">
              <button
                onClick={handlePurgeSessionsAction}
                className="system-management-warning-button"
              >
                Purge Expired Sessions
              </button>
              <button
                onClick={handleResetSlotsAction}
                className="system-management-danger-button"
              >
                Reset All Slots
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Statistics */}
      <div className="system-management-statistics">
        <h4>System Statistics</h4>
        <div className="system-management-stats-grid">
          <div className="system-management-stat-card">
            <h5>Usage Logs</h5>
            {isLoadingUsageLogs ? (
              <div className="system-management-loading">Loading...</div>
            ) : (
              <div className="system-management-stat-content">
                <p>Total Logs: {usageLogs.length}</p>
                {usageLogs.slice(0, 3).map(([principal, log]) => (
                  <div key={principal} className="system-management-log-item">
                    <span>{principal.substring(0, 8)}...</span>
                    <span>
                      Used: {log.usage_count}/{log.quota.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="system-management-stat-card">
            <h5>Workflow Runs</h5>
            {isLoadingWorkflowHistory ? (
              <div className="system-management-loading">Loading...</div>
            ) : (
              <div className="system-management-stat-content">
                <p>Total Runs: {workflowRunHistory.length}</p>
                {workflowRunHistory.slice(0, 3).map(([projectId, runs]) => (
                  <div
                    key={projectId}
                    className="system-management-workflow-item"
                  >
                    <span>Project: {projectId}</span>
                    <span>Runs: {runs.length}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="system-management-stat-card">
            <h5>Projects</h5>
            {isLoadingAllProjects ? (
              <div className="system-management-loading">Loading...</div>
            ) : (
              <div className="system-management-stat-content">
                <p>Total Projects: {allProjects.length}</p>
                {allProjects.slice(0, 3).map(([projectId, project]) => (
                  <div
                    key={projectId}
                    className="system-management-project-item"
                  >
                    <span>{project.name}</span>
                    <span>{project.plan}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemManagement;
