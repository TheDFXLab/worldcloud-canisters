import { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchSlots,
    fetchAvailableSlots,
    fetchUsedSlots,
    fetchAllSubscriptions,
    fetchDeployedCanisters,
    setAllSlotDuration,
    deleteUsageLogs,
    updateSlot,
    deleteProjects,
    deleteWorkflowRunHistory,
    resetProjectSlot,
    resetSlots,
    purgeExpiredSessions,
    deleteAllLogs,
    grantRole,
    revokeRole,
    checkRole,
    uploadAssetCanisterWasm,
    fetchActivityLogsAll,
    fetchWorkflowRunHistoryAll,
    fetchUsageLogsAll,
    fetchUserSlot,
    fetchUserProjectsAll,
    fetchUserProjects,
    fetchProjectsAll,
    fetchCanisterDeploymentsAll,
    clearError,
    clearSuccessMessage,
} from '../state/slices/adminSlice';
import { RootState, AppDispatch } from '../state/store';
import { useIdentity } from '../context/IdentityContext/IdentityContext';
import { useHttpAgent } from '../context/HttpAgentContext/HttpAgentContext';

// Add typed dispatch hook
const useAppDispatch = () => useDispatch<AppDispatch>();

export const useAdminLogic = () => {
    const dispatch = useAppDispatch();
    const { identity } = useIdentity();
    const { agent } = useHttpAgent();

    const {
        slots,
        availableSlots,
        usedSlots,
        isLoadingSlots,
        allSubscriptions,
        isLoadingSubscriptions,
        deployedCanisters,
        isLoadingCanisters,
        activityLogs,
        isLoadingActivityLogs,
        workflowRunHistory,
        isLoadingWorkflowHistory,
        usageLogs,
        isLoadingUsageLogs,
        userProjects,
        isLoadingUserProjects,
        allProjects,
        isLoadingAllProjects,
        canisterDeployments,
        isLoadingCanisterDeployments,
        userSlot,
        isLoadingUserSlot,
        isLoadingAccessControl,
        isLoading,
        error,
        successMessage
    } = useSelector((state: RootState) => state.admin);

    // Fetch slots
    const refreshSlots = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchSlots({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    // Fetch available slots
    const refreshAvailableSlots = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchAvailableSlots({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    // Fetch used slots
    const refreshUsedSlots = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchUsedSlots({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    // Fetch all subscriptions
    const refreshAllSubscriptions = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchAllSubscriptions({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    // Fetch deployed canisters
    const refreshDeployedCanisters = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchDeployedCanisters({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    // Set all slot duration
    const handleSetAllSlotDuration = useCallback(async (newDurationMs: number) => {
        if (identity && agent) {
            await dispatch(setAllSlotDuration({ identity, agent, newDurationMs }));
            refreshSlots();
        }
    }, [dispatch, identity, agent]);

    // Delete usage logs
    const handleDeleteUsageLogs = useCallback(async () => {
        if (identity && agent) {
            await dispatch(deleteUsageLogs({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    // Update slot
    const handleUpdateSlot = useCallback(async (slotId: number, updatedSlot: any) => {
        if (identity && agent) {
            await dispatch(updateSlot({ identity, agent, slotId, updatedSlot }));
            refreshSlots();
        }
    }, [dispatch, identity, agent]);

    // Delete all projects
    const handleDeleteProjects = useCallback(async () => {
        if (identity && agent) {
            await dispatch(deleteProjects({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    // Delete workflow run history
    const handleDeleteWorkflowRunHistory = useCallback(async () => {
        if (identity && agent) {
            await dispatch(deleteWorkflowRunHistory({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    // Reset project slot
    const handleResetProjectSlot = useCallback(async (projectId: number) => {
        if (identity && agent) {
            await dispatch(resetProjectSlot({ identity, agent, projectId }));
        }
    }, [dispatch, identity, agent]);

    // Reset all slots
    const handleResetSlots = useCallback(async () => {
        if (identity && agent) {
            await dispatch(resetSlots({ identity, agent }));
            refreshSlots();
        }
    }, [dispatch, identity, agent]);

    // Purge expired sessions
    const handlePurgeExpiredSessions = useCallback(async () => {
        if (identity && agent) {
            await dispatch(purgeExpiredSessions({ identity, agent }));
            refreshSlots();
        }
    }, [dispatch, identity, agent]);

    // Delete all logs
    const handleDeleteAllLogs = useCallback(async () => {
        if (identity && agent) {
            await dispatch(deleteAllLogs({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    // Grant role
    const handleGrantRole = useCallback(async (principal: string, role: any) => {
        if (identity && agent) {
            await dispatch(grantRole({ identity, agent, principal, role }));
        }
    }, [dispatch, identity, agent]);

    // Revoke role
    const handleRevokeRole = useCallback(async (principal: string) => {
        if (identity && agent) {
            await dispatch(revokeRole({ identity, agent, principal }));
        }
    }, [dispatch, identity, agent]);

    // Check role
    const handleCheckRole = useCallback(async (principal: string) => {
        if (identity && agent) {
            await dispatch(checkRole({ identity, agent, principal }));
        }
    }, [dispatch, identity, agent]);

    // Upload asset canister WASM
    const handleUploadAssetCanisterWasm = useCallback(async (wasm: number[]) => {
        if (identity && agent) {
            await dispatch(uploadAssetCanisterWasm({ identity, agent, wasm }));
        }
    }, [dispatch, identity, agent]);

    // Fetch activity logs all
    const refreshActivityLogsAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchActivityLogsAll({ identity, agent, payload }));
        }
    }, [dispatch, identity, agent]);

    // Fetch workflow run history all
    const refreshWorkflowRunHistoryAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchWorkflowRunHistoryAll({ identity, agent, payload }));
        }
    }, [dispatch, identity, agent]);

    // Fetch usage logs all
    const refreshUsageLogsAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchUsageLogsAll({ identity, agent, payload }));
        }
    }, [dispatch, identity, agent]);

    // Fetch user slot
    const refreshUserSlot = useCallback(async (user: string) => {
        if (identity && agent) {
            await dispatch(fetchUserSlot({ identity, agent, user }));
        }
    }, [dispatch, identity, agent]);

    // Fetch user projects all
    const refreshUserProjectsAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchUserProjectsAll({ identity, agent, payload }));
        }
    }, [dispatch, identity, agent]);

    // Fetch user projects
    const refreshUserProjects = useCallback(async (user: string, payload: any) => {
        if (identity && agent) {
            await dispatch(fetchUserProjects({ identity, agent, user, payload }));
        }
    }, [dispatch, identity, agent]);

    // Fetch projects all
    const refreshProjectsAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchProjectsAll({ identity, agent, payload }));
        }
    }, [dispatch, identity, agent]);

    // Fetch canister deployments all
    const refreshCanisterDeploymentsAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchCanisterDeploymentsAll({ identity, agent, payload }));
        }
    }, [dispatch, identity, agent]);

    // Clear error
    const handleClearError = useCallback(() => {
        dispatch(clearError());
    }, [dispatch]);

    // Clear success message
    const handleClearSuccessMessage = useCallback(() => {
        dispatch(clearSuccessMessage());
    }, [dispatch]);

    // Fetch initial data on mount
    useEffect(() => {
        if (identity && agent) {
            refreshSlots();
            refreshAvailableSlots();
            refreshUsedSlots();
            refreshAllSubscriptions();
            refreshDeployedCanisters();
        }
    }, [refreshSlots, refreshAvailableSlots, refreshUsedSlots, refreshAllSubscriptions, refreshDeployedCanisters, identity, agent]);

    return {
        // Data
        slots,
        availableSlots,
        usedSlots,
        allSubscriptions,
        deployedCanisters,
        activityLogs,
        workflowRunHistory,
        usageLogs,
        userProjects,
        allProjects,
        canisterDeployments,
        userSlot,

        // Loading states
        isLoadingSlots,
        isLoadingSubscriptions,
        isLoadingCanisters,
        isLoadingActivityLogs,
        isLoadingWorkflowHistory,
        isLoadingUsageLogs,
        isLoadingUserProjects,
        isLoadingAllProjects,
        isLoadingCanisterDeployments,
        isLoadingUserSlot,
        isLoadingAccessControl,
        isLoading,

        // Messages
        error,
        successMessage,

        // Actions
        refreshSlots,
        refreshAvailableSlots,
        refreshUsedSlots,
        refreshAllSubscriptions,
        refreshDeployedCanisters,
        refreshActivityLogsAll,
        refreshWorkflowRunHistoryAll,
        refreshUsageLogsAll,
        refreshUserSlot,
        refreshUserProjectsAll,
        refreshUserProjects,
        refreshProjectsAll,
        refreshCanisterDeploymentsAll,
        handleSetAllSlotDuration,
        handleDeleteUsageLogs,
        handleUpdateSlot,
        handleDeleteProjects,
        handleDeleteWorkflowRunHistory,
        handleResetProjectSlot,
        handleResetSlots,
        handlePurgeExpiredSessions,
        handleDeleteAllLogs,
        handleGrantRole,
        handleRevokeRole,
        handleCheckRole,
        handleUploadAssetCanisterWasm,
        handleClearError,
        handleClearSuccessMessage,
    };
}; 