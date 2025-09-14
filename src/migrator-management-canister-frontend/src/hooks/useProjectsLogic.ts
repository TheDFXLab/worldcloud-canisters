import { useCallback, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import MainApi from '../api/main';
import { getCanisterUrl } from '../config/config';
import {
    SerializedProject,
    DeserializedProject,
    deserializeProjects
} from '../utility/bigint';
import {
    setActiveFilterTag,
    setActiveSortTag,
    setViewMode,
    getUserProjects,
    setLoading,
    deployProject,
    fetchActivityLogs,
    clearProjectAssets,
    deleteProject,
    fetchUserUsage,
    getMyAddOns,
    getAddOnsList,
    hasAddOn,
    setupCustomDomainByProject,
    selectProjectDomainRegistrations,
    getDomainRegistrationsByProject,
    getParsedMyAddons,
    isAvailableSubdomainName,
    deleteDomainRegistration,
    // setProjectAddOns,
} from '../state/slices/projectsSlice';
import { RootState, AppDispatch } from '../state/store';
import { useIdentity } from '../context/IdentityContext/IdentityContext';
import { useHttpAgent } from '../context/HttpAgentContext/HttpAgentContext';
import { useFreemiumLogic } from './useFreemiumLogic';
import { useDeploymentLogic } from './useDeploymentLogic';
import { useCyclesLogic } from './useCyclesLogic';
import {
    SerializedAddOn,
    SerializedAddOnVariant,
    hasAddOn as hasAddOnUtil,
    getAddOnByType,
    filterAddOnsByStatus,
    filterAddOnsByType,
    getActiveAddOns,
    getAddOnsExpiringSoon,
    sortAddOnsByExpiry
} from '../serialization/addons';

export const getPlanDisplayName = (plan: any): string => {
    if (plan === 'freemium') return "Freemium";
    if (plan === 'paid') return "Paid";
    return 'Unknown';
};

// Add typed dispatch hook
const useAppDispatch = () => useDispatch<AppDispatch>();

export const useProjectsLogic = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { identity } = useIdentity();
    const { agent } = useHttpAgent();
    const { fetchUsage } = useFreemiumLogic();
    const { refreshDeployments } = useDeploymentLogic();
    const { getStatus } = useCyclesLogic();

    const {
        projects: serializedProjects,
        parsedMyAddons,
        isLoading,
        isLoadingClearAssets,
        isLoadingDeleteProject,
        isLoadingUsage,
        activeFilterTag,
        activeSortTag,
        viewMode,
        userUsage,
        addOns: projectAddOnsData,
        domainRegistrations,
        addOnsList,
        projectAddOns,
        isLoadingAddOns,
        isLoadingAddOnsList,
        isLoadingDomainRegistrations,
        isLoadingActivityLogs,
        isLoadingGetParsedMyAddons,
        isLoadingSubdomainNameAvailable,
        isLoadingDeleteDomainRegistration
    } = useSelector((state: RootState) => state.projects);

    // Function to refresh projects
    const refreshProjects = useCallback(async () => {
        if (identity && agent) {
            await dispatch(getUserProjects({
                identity,
                agent,
                silent: false // Explicitly set to false to show loading state
            }));
        }
    }, [dispatch, identity, agent]);

    // Fetch projects on mount and when identity/agent changes
    useEffect(() => {
        if (identity && agent) {
            refreshProjects();
        }
    }, [refreshProjects, identity, agent]);



    // Deserialize projects for use in the app
    const projects = useMemo(() =>
        deserializeProjects(serializedProjects), [serializedProjects]
    );

    const handleFilterChange = useCallback((tag: string) => {
        dispatch(setActiveFilterTag(tag));
    }, [dispatch]);

    const handleSortChange = useCallback((tag: string) => {
        dispatch(setActiveSortTag(tag));
    }, [dispatch]);

    const handleViewModeChange = useCallback(() => {
        dispatch(setViewMode(viewMode === 'card' ? 'table' : 'card'));
    }, [dispatch, viewMode]);

    const handleFetchActivityLogs = useCallback(async (projectId: bigint) => {
        if (identity && agent) {
            dispatch(fetchActivityLogs({
                identity,
                agent,
                projectId
            })).unwrap();
        }

    }, [dispatch, identity, agent])

    const handleClearProjectAssets = useCallback(async (projectId: number) => {
        if (identity && agent) {
            dispatch(clearProjectAssets({
                identity,
                agent,
                projectId
            })).unwrap();
        }
    }, [dispatch, identity, agent])


    const handleDeleteProject = useCallback(async (projectId: number) => {
        if (identity && agent) {
            dispatch(deleteProject({
                identity,
                agent,
                projectId
            })).unwrap();
        }
    }, [dispatch, identity, agent])

    const handleFetchUserUsage = useCallback(async (projectId: number) => {
        if (identity && agent) {
            dispatch(fetchUserUsage({
                identity,
                agent
            })).unwrap();
        }
    }, [dispatch, identity, agent])

    // Addon-related functions
    const handleFetchAddOns = useCallback(async (projectId: number) => {
        if (identity && agent) {
            let result = await dispatch(getMyAddOns({
                identity,
                agent,
                projectId
            })).unwrap();
        }
    }, [dispatch, identity, agent]);

    const handleFetchAddOnsList = useCallback(async () => {
        if (identity && agent) {
            let list = await dispatch(getAddOnsList({
                identity,
                agent
            })).unwrap();
        }
    }, [dispatch, identity, agent]);

    const handleCheckAddOn = useCallback(async (projectId: number, addonId: number) => {
        if (identity && agent) {
            const has = await dispatch(hasAddOn({
                identity,
                agent,
                projectId,
                addonId
            })).unwrap();
            return has;
        }
    }, [dispatch, identity, agent]);

    const handleSetupCustomDomainByProject = useCallback(async (projectId: number, domainName: string, addonId: number) => {
        if (identity && agent) {
            const result = await dispatch(setupCustomDomainByProject({
                identity,
                agent,
                projectId,
                domainName,
                addonId
            })).unwrap();
            return result;
        }
    }, [dispatch, identity, agent]);


    const handleGetParsedMyAddons = useCallback(async (projectId: number) => {
        if (identity && agent) {
            let my_addons = await dispatch(getParsedMyAddons({ identity, agent, projectId })).unwrap();
            return my_addons;
        }
    }, [dispatch, identity, agent])



    const refreshProjectAddOns = useCallback(async (projectId: number) => {
        if (identity && agent) {
            await handleFetchAddOns(projectId);
        }
    }, [identity, agent, handleFetchAddOns]);

    const handleFetchDomainRegistrations = useCallback(async (projectId: number) => {
        if (identity && agent) {
            await dispatch(getDomainRegistrationsByProject({
                identity, agent, projectId
            })).unwrap();
        }
    }, [dispatch, identity, agent])

    const handleCheckSubdomainNameAvailability = useCallback(async (projectId: number, subdomain: string, addon_id: number) => {
        if (identity && agent) {
            const available = await dispatch(isAvailableSubdomainName({ identity, agent, projectId, domainName: subdomain, addonId: addon_id })).unwrap();
            return available;
        }
        return false;
    }, [dispatch, identity, agent]);

    const handleDeleteDomainRegistration = useCallback(async (projectId: number, addonId: number) => {
        if (identity && agent) {
            const is_deleted = await dispatch(deleteDomainRegistration({ identity, agent, projectId, addonId })).unwrap();
            return is_deleted;
        }
    }, [dispatch, identity, agent])

    const handleInstallCode = useCallback(async (
        e: React.MouseEvent<HTMLButtonElement>,
        hasCanister: boolean,
        project_id: bigint,
        canister_id: string | null,
        is_freemium: boolean,
        identity: any,
        agent: any
    ) => {
        e.stopPropagation();
        if (hasCanister) {
            navigate(`/dashboard/deploy/${canister_id}/${project_id}`);
            return;
        }

        if (!agent) {
            throw new Error("HttpAgent not set.");
        }

        // try {
        const result = await dispatch(deployProject({
            identity,
            agent,
            projectId: project_id,
            isFreemium: is_freemium,
            validateSubscription: async () => ({ status: true, message: '' }) // TODO: implement proper validation
        })).unwrap();

        refreshDeployments(Number(project_id));
        fetchUsage();
        handleFetchUserUsage(Number(project_id));
        getStatus(Number(project_id));
        const updatedProject = result.updatedProjects.find(
            (p: SerializedProject) => p.id === project_id.toString()
        );

        if (!updatedProject) {
            throw new Error("Failed to find updated project after deployment");
        }

        return {
            canisterId: result.canisterId,
            project: updatedProject
        };

    }, [dispatch, navigate, fetchUsage]);


    const handleVisitWebsite = useCallback((e: React.MouseEvent<HTMLButtonElement>, canisterId: string) => {
        e.stopPropagation();
        window.open(getCanisterUrl(canisterId), '_blank');
    }, []);

    const handleProjectClick = useCallback((projectId: string, hasCanister: boolean, canisterId: string | null) => {
        // Only navigate to canister overview if it's not a button click
        if (hasCanister && canisterId) {
            navigate(`/dashboard/canister/${projectId}`);
        }
        else {
            navigate(`/dashboard/canister/${projectId}`);
        }
    }, [navigate]);





    const filteredProjects = useMemo(() => {
        if (!projects) return [];

        return projects.filter((project: DeserializedProject) => {
            if (activeFilterTag === 'All') return true;
            const planTag = getPlanDisplayName(project.plan);
            return activeFilterTag === planTag;
        });
    }, [projects, activeFilterTag]);

    const sortedProjects = useMemo(() => {
        return [...filteredProjects].sort((a, b) => {
            switch (activeSortTag) {
                case 'createAsc':
                    return (a.date_created || 0) - (b.date_created || 0);
                case 'createDesc':
                    return (b.date_created || 0) - (a.date_updated || 0);
                case 'updatedAsc':
                    return (a.date_updated || 0) - (b.date_updated || 0);
                case 'updatedDesc':
                    return (b.date_updated || 0) - (a.date_updated || 0);
                case 'nameAsc':
                    return a.name.localeCompare(b.name);
                case 'nameDesc':
                    return b.name.localeCompare(a.name);
                default:
                    return 0;
            }
        });
    }, [filteredProjects, activeSortTag]);

    // Addon utility functions
    const getProjectAddOns = useCallback((projectId: number): SerializedAddOn[] => {
        return projectAddOns[projectId] || [];
    }, [projectAddOns]);

    const checkProjectHasAddOn = useCallback((projectId: number, addonType: string): boolean => {
        const projectAddOnsData = getProjectAddOns(projectId);
        return hasAddOnUtil(projectAddOnsData, addonType as any);
    }, [getProjectAddOns]);

    const getProjectAddOnByType = useCallback((projectId: number, addonType: string): SerializedAddOn | undefined => {
        const projectAddOnsData = getProjectAddOns(projectId);
        return getAddOnByType(projectAddOnsData, addonType as any);
    }, [getProjectAddOns]);

    const getActiveProjectAddOns = useCallback((projectId: number): SerializedAddOn[] => {
        const projectAddOnsData = getProjectAddOns(projectId);
        return getActiveAddOns(projectAddOnsData);
    }, [getProjectAddOns]);

    const getExpiringProjectAddOns = useCallback((projectId: number, timeWindowMs: number): SerializedAddOn[] => {
        const projectAddOnsData = getProjectAddOns(projectId);
        return getAddOnsExpiringSoon(projectAddOnsData, timeWindowMs);
    }, [getProjectAddOns]);

    const getSortedProjectAddOns = useCallback((projectId: number): SerializedAddOn[] => {
        const projectAddOnsData = getProjectAddOns(projectId);
        return sortAddOnsByExpiry(projectAddOnsData);
    }, [getProjectAddOns]);

    const getAllExpiringAddOns = useCallback((timeWindowMs: number): Array<{ projectId: number; addOns: SerializedAddOn[] }> => {
        const result: Array<{ projectId: number; addOns: SerializedAddOn[] }> = [];
        Object.entries(projectAddOns).forEach(([projectIdStr, addOns]) => {
            const projectId = parseInt(projectIdStr);
            const expiringAddOns = getExpiringProjectAddOns(projectId, timeWindowMs);
            if (expiringAddOns.length > 0) {
                result.push({ projectId, addOns: expiringAddOns });
            }
        });
        return result;
    }, [projectAddOns, getExpiringProjectAddOns]);

    const hasAnyExpiringAddOns = useCallback((timeWindowMs: number): boolean => {
        return getAllExpiringAddOns(timeWindowMs).length > 0;
    }, [getAllExpiringAddOns]);

    const getProjectAddOnsByStatus = useCallback((projectId: number, status: 'available' | 'frozen'): SerializedAddOn[] => {
        const projectAddOnsData = getProjectAddOns(projectId);
        return filterAddOnsByStatus(projectAddOnsData, status);
    }, [getProjectAddOns]);

    const getProjectAddOnsByType = useCallback((projectId: number, type: 'register_domain' | 'register_subdomain'): SerializedAddOn[] => {
        const projectAddOnsData = getProjectAddOns(projectId);
        return filterAddOnsByType(projectAddOnsData, type);
    }, [getProjectAddOns]);

    const getProjectAddOnsCount = useCallback((projectId: number): number => {
        const projectAddOnsData = getProjectAddOns(projectId);
        return projectAddOnsData.length;
    }, [getProjectAddOns]);

    const getProjectActiveAddOnsCount = useCallback((projectId: number): number => {
        const activeAddOns = getActiveProjectAddOns(projectId);
        return activeAddOns.length;
    }, [getActiveProjectAddOns]);

    return {
        isLoading,
        isLoadingClearAssets,
        isLoadingDeleteProject,
        isLoadingUsage,
        isLoadingAddOns,
        isLoadingAddOnsList,
        isLoadingDomainRegistrations,
        isLoadingGetParsedMyAddons,
        activeFilterTag,
        activeSortTag,
        viewMode,
        userUsage,
        projects: sortedProjects,
        domainRegistrations,
        addOns: projectAddOnsData,
        addOnsList,
        projectAddOns,
        parsedMyAddons,

        handleFetchAddOns,
        handleFetchAddOnsList,
        handleCheckAddOn,
        handleSetupCustomDomainByProject,
        refreshProjectAddOns,
        getProjectAddOns,
        checkProjectHasAddOn,
        getProjectAddOnByType,
        getActiveProjectAddOns,
        getExpiringProjectAddOns,
        getSortedProjectAddOns,
        getAllExpiringAddOns,
        hasAnyExpiringAddOns,
        getProjectAddOnsByStatus,
        getProjectAddOnsByType,
        getProjectAddOnsCount,
        getProjectActiveAddOnsCount,
        handleFetchDomainRegistrations,
        handleFilterChange,
        handleSortChange,
        handleViewModeChange,
        handleInstallCode,
        handleVisitWebsite,
        handleProjectClick,
        refreshProjects,
        handleFetchActivityLogs,
        handleClearProjectAssets,
        handleDeleteProject,
        handleFetchUserUsage,
        handleGetParsedMyAddons,
        handleCheckSubdomainNameAvailability,
        handleDeleteDomainRegistration
    };
}; 