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
    setIcDomains,
    fetchCanisterDomainRegistrations,
    fetchGlobalTimers,
    setupCustomDomain,
    adminGrantSubscription,
    adminGrantAddon,
    adminSetupFreemiumDomain,
    fetchFreemiumDomainRegistrationsPaginated,
    fetchDomainRegistrationsPaginated,
    fetchFreemiumRegistrationByCanister,
    deleteDomainRegistration,
    setCanisterToSlot,
    setCloudflareConfig,
    adminResetQuotas,
} from '../state/slices/adminSlice';
import { RootState, AppDispatch } from '../state/store';
import { useIdentity } from '../context/IdentityContext/IdentityContext';
import { useHttpAgent } from '../context/HttpAgentContext/HttpAgentContext';
import { PaginationPayload, SerializedProjectPlan } from '../serialization/admin';
import { StaticFile } from '../utility/compression';
import { Principal } from '@dfinity/principal';

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
        canisterDomainRegistrations,
        globalTimers,

        isLoadingBookEntries,
        isLoading,
        isLoadingTreasury,
        isLoadingEditIcDomains,
        isLoadingDomainRegistrations,
        isLoadingGlobalTimers,
        isLoadingCustomDomain,
        isLoadingCanisterDomainRegistrations,

        isLoadingGrantSubscription,
        isLoadingGrantAddon,
        freemiumRegistrationByCanister,
        isLoadingFreemiumRegistrationByCanister,
        domainRegistrationsPaginated,
        freemiumDomainRegistrationsPaginated,
        isLoadingDomainRegistrationsPaginated,
        isLoadingFreemiumDomainRegistrationsPaginated,
        isLoadingDeleteDomainRegistration,
        isLoadingSetCanisterToSlot,
        isLoadingSetCloudflareConfig,
        isLoadingResetQuotas,

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


    const handleGetTreasuryPrincipal = useCallback(async () => {
        if (identity && agent) {
            await dispatch(getTreasury({ identity, agent }))
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

    const handleSetIcDomains = useCallback(async (canister_id: string, file: StaticFile) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            const result = await dispatch(setIcDomains({ identity, agent, canister_id, file })).unwrap();
            return { status: true, message: `Set ic domains for canster ${canister_id}` };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Failed to set the ic domain name',
            };
        }
    }, [dispatch, identity, agent]);


    const refreshCanisterDomainRegistrations = useCallback(async (canisterId: string) => {
        if (identity && agent) {
            await dispatch(fetchCanisterDomainRegistrations({ identity, agent, canisterId })).unwrap();
        }
    }, [dispatch, identity, agent]);

    const refreshGlobalTimers = useCallback(async () => {
        if (identity && agent) {
            await dispatch(fetchGlobalTimers({ identity, agent })).unwrap();
        }
    }, [dispatch, identity, agent]);

    const handleSetupCustomDomain = useCallback(async (projectId: number, canisterId: string, subdomainName: string, addonId: number) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(setupCustomDomain({ identity, agent, projectId, canisterId, subdomainName, addonId })).unwrap();
            return { status: true, message: 'Custom domain setup successfully' };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Failed to setup custom domain',
            };
        }
    }, [dispatch, identity, agent]);

    const handleGrantSubscription = useCallback(async (user_principal: string, subscription_tier_id: number) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(adminGrantSubscription({ identity, agent, user_principal, subscription_tier_id })).unwrap();
            return { status: true, message: 'Subscription granted successfully' };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Failed to grant subscription',
            };
        }
    }, [dispatch, identity, agent]);

    const handleGrantAddon = useCallback(async (project_id: number, addon_id: number, expiry_in_ms: number) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(adminGrantAddon({ identity, agent, project_id, addon_id, expiry_in_ms })).unwrap();
            return { status: true, message: 'Addon granted successfully' };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Failed to grant addon',
            };
        }
    }, [dispatch, identity, agent]);

    const handleAdminSetupFreemiumDomain = useCallback(async (canister_id: Principal, subdomain_name: string) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(adminSetupFreemiumDomain({ identity, agent, canister_id, subdomain_name })).unwrap();
            return { status: true, message: 'Freemium domain setup successfully' };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Failed to setup freemium domain',
            }
        }
    }, [dispatch, identity, agent]);

    const handleDeleteDomainRegistration =
        useCallback(async (registration_id: number, type: SerializedProjectPlan) => {
            if (!identity || !agent) {
                throw new Error('Missing required dependencies');
            }
            try {
                await dispatch(deleteDomainRegistration({ identity, agent, registration_id, type })).unwrap();
                return { status: true, message: 'Deleted domain registration' };
            } catch (error: any) {
                return {
                    status: false,
                    message: error.message || 'Failed to delete domain registration',
                }
            }
        }, [dispatch, identity, agent]);

    const handleSetCanisterToSlot = useCallback(async (canister_id: Principal, slot_id: number) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(setCanisterToSlot({ identity, agent, canister_id, slot_id })).unwrap();
            return { status: true, message: 'Set slot id to canister' };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Failed to set canister to slot id',
            }
        }
    }, [dispatch, identity, agent]);

    const handleSetCloudflareConfig = useCallback(async (email: string, api_key: string, zone_id: string) => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(setCloudflareConfig({ identity, agent, email, api_key, zone_id })).unwrap();
            return { status: true, message: 'Set cloudflare configuration.' };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Failed to set cloudflare configuration.',
            }
        }
    }, [dispatch, identity, agent]);

    const handleResetQuotas = useCallback(async () => {
        if (!identity || !agent) {
            throw new Error('Missing required dependencies');
        }
        try {
            await dispatch(adminResetQuotas({ identity, agent })).unwrap();
            return { status: true, message: 'Reset quotas.' };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Failed to reset quotas.',
            }
        }
    }, [dispatch, identity, agent]);



    // Fetch freemium domain registrations paginated
    const refreshFreemiumDomainRegistrationsPaginated = useCallback(async (payload: PaginationPayload) => {
        if (identity && agent) {
            await dispatch(fetchFreemiumDomainRegistrationsPaginated({ identity, agent, payload })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch domain registrations paginated
    const refreshDomainRegistrationsPaginated = useCallback(async (payload: PaginationPayload) => {
        if (identity && agent) {
            await dispatch(fetchDomainRegistrationsPaginated({ identity, agent, payload })).unwrap();
        }
    }, [dispatch, identity, agent]);

    // Fetch freemium registration by canister
    const refreshFreemiumRegistrationByCanister = useCallback(async (canisterId: Principal) => {
        if (identity && agent) {
            await dispatch(fetchFreemiumRegistrationByCanister({ identity, agent, canisterId })).unwrap();
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
        canisterDomainRegistrations,
        globalTimers,

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
        isLoadingEditIcDomains,
        isLoadingDomainRegistrations,
        isLoadingGlobalTimers,
        isLoadingCustomDomain,
        isLoadingCanisterDomainRegistrations,
        isLoadingGrantSubscription,
        isLoadingGrantAddon,
        isLoadingDeleteDomainRegistration,
        isLoadingFreemiumRegistrationByCanister,
        isLoadingDomainRegistrationsPaginated,
        isLoadingFreemiumDomainRegistrationsPaginated,
        isLoadingSetCanisterToSlot,



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
        handleSetupCustomDomain,

        // Treasury
        handleGetTreasuryPrincipal,
        handleSetTreasury,
        withdrawTreasury: handleWithdrawTreasury,
        handleSetIcDomains,
        refreshCanisterDomainRegistrations,
        refreshGlobalTimers,
        handleGrantSubscription,
        handleGrantAddon,
        handleAdminSetupFreemiumDomain,
        refreshFreemiumDomainRegistrationsPaginated,
        refreshDomainRegistrationsPaginated,
        refreshFreemiumRegistrationByCanister,
        handleDeleteDomainRegistration,
        handleSetCanisterToSlot,
        handleSetCloudflareConfig,
        handleResetQuotas,
        freemiumRegistrationByCanister,
        domainRegistrationsPaginated,
        freemiumDomainRegistrationsPaginated,

    };
}; 