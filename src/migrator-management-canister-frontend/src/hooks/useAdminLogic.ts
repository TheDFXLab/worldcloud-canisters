import { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    getAdmins,
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
    isAdmin,
    uploadAssetCanisterWasm,
    fetchActivityLogsAll,
    fetchWorkflowRunHistoryAll,
    fetchUsageLogsAll,
    fetchUserSlot,
    fetchUserProjectsAll,
    fetchUserProjects,
    fetchProjectsAll,
    fetchCanisterDeploymentsAll,
    fetchBookEntriesAll,
    clearError,
    clearSuccessMessage,
    getTreasury,
    withdrawTreasury,
    setTreasury,
} from '../state/slices/adminSlice';
import { RootState, AppDispatch } from '../state/store';
import { useIdentity } from '../context/IdentityContext/IdentityContext';
import { useHttpAgent } from '../context/HttpAgentContext/HttpAgentContext';
import { PaginationPayload } from '../serialization/admin';

// Add typed dispatch hook
const useAppDispatch = () => useDispatch<AppDispatch>();

export const useAdminLogic = () => {
    const dispatch = useAppDispatch();
    const { identity } = useIdentity();
    const { agent } = useHttpAgent();

    const {
        treasuryBalance,
        treasuryPrincipal,
        admins,
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
        currentUserRole,
        isLoadingCurrentUserRole,
        bookEntries,
        isLoadingBookEntries,
        isLoading,
        isLoadingTreasury,
        error,
        successMessage,
    } = useSelector((state: RootState) => state.admin);

    // Fetch slots
    const refreshSlots = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchSlots({ identity, agent })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch available slots
    const refreshAvailableSlots = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchAvailableSlots({ identity, agent })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch used slots
    const refreshUsedSlots = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchUsedSlots({ identity, agent })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch all subscriptions
    const refreshAllSubscriptions = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchAllSubscriptions({ identity, agent })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch deployed canisters
    const refreshDeployedCanisters = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchDeployedCanisters({ identity, agent })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Set all slot duration
    const handleSetAllSlotDuration = useCallback(async (newDurationMs: number) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(setAllSlotDuration({ identity, agent, newDurationMs })).unwrap();
            refreshSlots();
            return { status: true, message: 'Slot duration updated successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to update slot duration',
            };
        }
    }, [dispatch, identity, agent, refreshSlots]);

    // Delete usage logs
    const handleDeleteUsageLogs = useCallback(async () => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(deleteUsageLogs({ identity, agent })).unwrap();
            return { status: true, message: 'Usage logs deleted successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to delete usage logs',
            };
        }
    }, [dispatch, identity, agent]);

    // Update slot
    const handleUpdateSlot = useCallback(async (slotId: number, updatedSlot: any) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(updateSlot({ identity, agent, slotId, updatedSlot })).unwrap();
            await refreshSlots();
            return { status: true, message: 'Slot updated successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to update slot',
            };
        }
    }, [dispatch, identity, agent, refreshSlots]);

    // Delete all projects
    const handleDeleteProjects = useCallback(async () => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(deleteProjects({ identity, agent })).unwrap();
            return { status: true, message: 'Projects deleted successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to delete projects',
            };
        }
    }, [dispatch, identity, agent]);

    // Delete workflow run history
    const handleDeleteWorkflowRunHistory = useCallback(async () => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(deleteWorkflowRunHistory({ identity, agent })).unwrap();
            return { status: true, message: 'Workflow run history deleted successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to delete workflow run history',
            };
        }
    }, [dispatch, identity, agent]);

    // Reset project slot
    const handleResetProjectSlot = useCallback(async (projectId: number) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(resetProjectSlot({ identity, agent, projectId })).unwrap();
            return { status: true, message: 'Project slot reset successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to reset project slot',
            };
        }
    }, [dispatch, identity, agent]);

    // Reset all slots
    const handleResetSlots = useCallback(async () => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(resetSlots({ identity, agent })).unwrap();
            await refreshSlots();
            return { status: true, message: 'All slots reset successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to reset slots',
            };
        }
    }, [dispatch, identity, agent, refreshSlots]);

    // Purge expired sessions
    const handlePurgeExpiredSessions = useCallback(async () => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(purgeExpiredSessions({ identity, agent })).unwrap();
            await refreshSlots();
            return { status: true, message: 'Expired sessions purged successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to purge expired sessions',
            };
        }
    }, [dispatch, identity, agent, refreshSlots]);

    // Delete all logs
    const handleDeleteAllLogs = useCallback(async () => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(deleteAllLogs({ identity, agent })).unwrap();
            return { status: true, message: 'All logs deleted successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to delete all logs',
            };
        }
    }, [dispatch, identity, agent]);

    const handleGetAdmins = useCallback(async (payload: PaginationPayload) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(getAdmins({ identity, agent, payload })).unwrap();
            return { status: true, message: 'Admins fetched successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to fetch admins',
            };
        }
    }, [dispatch, identity, agent]);

    // Grant role
    const handleGrantRole = useCallback(async (principal: string, role: any) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(grantRole({ identity, agent, principal, role })).unwrap();
            return { status: true, message: 'Role granted successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to grant role',
            };
        }
    }, [dispatch, identity, agent]);

    // Revoke role
    const handleRevokeRole = useCallback(async (principal: string) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(revokeRole({ identity, agent, principal })).unwrap();
            return { status: true, message: 'Role revoked successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to revoke role',
            };
        }
    }, [dispatch, identity, agent]);

    // Check role
    const handleCheckRole = useCallback(async (principal: string) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(checkRole({ identity, agent, principal })).unwrap();
            return { status: true, message: 'Role checked successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to check role',
            };
        }
    }, [dispatch, identity, agent]);

    // Check current user's role
    const checkCurrentUserRole = useCallback(async () => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            const principal = identity.getPrincipal().toText();
            await dispatch(isAdmin({ identity, agent, principal })).unwrap();
            return { status: true, message: 'Admin status checked successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to check admin status',
            };
        }
    }, [dispatch, identity, agent]);

    // Upload asset canister WASM
    const handleUploadAssetCanisterWasm = useCallback(async (wasm: number[]) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(uploadAssetCanisterWasm({ identity, agent, wasm })).unwrap();
            return { status: true, message: 'Asset canister WASM uploaded successfully' };
        } catch (error: any) {
            throw {
                status: false,
                message: error.message || 'Failed to upload WASM',
            };
        }
    }, [dispatch, identity, agent]);

    // Fetch activity logs all
    const refreshActivityLogsAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchActivityLogsAll({ identity, agent, payload })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch workflow run history all
    const refreshWorkflowRunHistoryAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchWorkflowRunHistoryAll({ identity, agent, payload })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch usage logs all
    const refreshUsageLogsAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchUsageLogsAll({ identity, agent, payload })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch user slot
    const refreshUserSlot = useCallback(async (user: string) => {
        if (identity && agent) {
            await dispatch(fetchUserSlot({ identity, agent, user })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch user projects all
    const refreshUserProjectsAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchUserProjectsAll({ identity, agent, payload })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch user projects
    const refreshUserProjects = useCallback(async (user: string, payload: any) => {
        if (identity && agent) {
            await dispatch(fetchUserProjects({ identity, agent, user, payload })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch projects all
    const refreshProjectsAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchProjectsAll({ identity, agent, payload })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch canister deployments all
    const refreshCanisterDeploymentsAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchCanisterDeploymentsAll({ identity, agent, payload })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch book entries all
    const refreshBookEntriesAll = useCallback(async (payload: any) => {
        if (identity && agent) {
            await dispatch(fetchBookEntriesAll({ identity, agent, payload }));
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


    const handleGetTreasuryPrincipal = useCallback(() => {
        if (identity && agent) {
            dispatch(getTreasury({ identity, agent }))
        }
    }, [dispatch])

    // Treasury methods
    const handleSetTreasury = useCallback(async (treasuryPrincipal: string) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(setTreasury({ identity, agent, treasuryPrincipal })).unwrap();
            return { status: true, message: 'Treasury set successfully' };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Failed to set treasury',
            };
        }
    }, [dispatch, identity, agent]);

    const handleWithdrawTreasury = useCallback(async () => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            const result = await dispatch(withdrawTreasury({ identity, agent })).unwrap();
            return { status: true, message: `Withdrew ${result} e8s from treasury`, amount: result };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Failed to withdraw from treasury',
            };
        }
    }, [dispatch, identity, agent]);

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
        admins,
        currentUserRole,
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
        bookEntries,
        treasuryPrincipal,
        treasuryBalance,

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
        isLoadingCurrentUserRole,
        isLoadingBookEntries,
        isLoading,
        isLoadingTreasury,

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
        refreshBookEntriesAll,
        handleSetAllSlotDuration,
        handleDeleteUsageLogs,
        handleUpdateSlot,
        handleDeleteProjects,
        handleDeleteWorkflowRunHistory,
        handleResetProjectSlot,
        handleResetSlots,
        handlePurgeExpiredSessions,
        handleDeleteAllLogs,
        handleGetAdmins,
        handleGrantRole,
        handleRevokeRole,
        handleCheckRole,
        checkCurrentUserRole,
        handleUploadAssetCanisterWasm,
        handleClearError,
        handleClearSuccessMessage,

        // Treasury
        handleGetTreasuryPrincipal,
        setTreasury: handleSetTreasury,
        withdrawTreasury: handleWithdrawTreasury,
    };
}; 