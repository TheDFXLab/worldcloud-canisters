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
} from '../state/slices/projectsSlice';
import { RootState, AppDispatch } from '../state/store';
import { useIdentity } from '../context/IdentityContext/IdentityContext';
import { useHttpAgent } from '../context/HttpAgentContext/HttpAgentContext';
import { useFreemiumLogic } from './useFreemiumLogic';
import { useDeploymentLogic } from './useDeploymentLogic';

export const getPlanDisplayName = (plan: any): string => {
    if (typeof plan === 'object' && plan !== null) {
        if ('freemium' in plan) return 'Freemium';
        if ('paid' in plan) return 'Paid';
    }
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

    const {
        projects: serializedProjects,
        isLoading,
        isLoadingClearAssets,
        isLoadingDeleteProject,
        isLoadingUsage,
        activeFilterTag,
        activeSortTag,
        viewMode,
        userUsage
    } = useSelector((state: RootState) => state.projects);

    // Function to refresh projects
    const refreshProjects = useCallback(async () => {
        if (identity && agent) {
            console.log(`Now getting user project in dispatch..`);
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
            }));
        }

    }, [dispatch, identity, agent])

    const handleClearProjectAssets = useCallback(async (projectId: number) => {
        if (identity && agent) {
            dispatch(clearProjectAssets({
                identity,
                agent,
                projectId
            }));
        }
    }, [dispatch, identity, agent])


    const handleDeleteProject = useCallback(async (projectId: number) => {
        if (identity && agent) {
            dispatch(deleteProject({
                identity,
                agent,
                projectId
            }))
        }
    }, [dispatch, identity, agent])

    const handleFetchUserUsage = useCallback(async (projectId: number) => {
        if (identity && agent) {
            dispatch(fetchUserUsage({
                identity,
                agent
            }));
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
            console.log(`HttpAgent not set.`);
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
                    return (b.date_created || 0) - (a.date_created || 0);
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

    return {
        projects: sortedProjects,
        isLoading,
        isLoadingClearAssets,
        isLoadingDeleteProject,
        isLoadingUsage,
        activeFilterTag,
        activeSortTag,
        viewMode,
        userUsage,
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
        handleFetchUserUsage
    };
}; 