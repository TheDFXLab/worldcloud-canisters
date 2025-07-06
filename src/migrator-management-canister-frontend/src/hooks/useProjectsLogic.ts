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
    setLoading
} from '../state/slices/projectsSlice';
import { RootState, AppDispatch } from '../state/store';
import { useIdentity } from '../context/IdentityContext/IdentityContext';
import { useHttpAgent } from '../context/HttpAgentContext/HttpAgentContext';
import { useFreemiumLogic } from './useFreemiumLogic';

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

    const {
        projects: serializedProjects,
        isLoading,
        activeFilterTag,
        activeSortTag,
        viewMode,
    } = useSelector((state: RootState) => state.projects);

    // Function to refresh projects
    const refreshProjects = useCallback(async () => {
        if (identity && agent) {
            console.log(`Now getting user project in dispatch..`)
            await dispatch(getUserProjects({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    // // Fetch projects on mount and when identity/agent changes
    // useEffect(() => {
    //     refreshProjects();
    // }, [refreshProjects, identity, agent]);

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

    const handleInstallCode = useCallback(async (
        e: React.MouseEvent<HTMLButtonElement>,
        hasCanister: boolean,
        project_id: bigint,
        canister_id: string | null,
        identity: any,
        agent: any
    ) => {
        e.stopPropagation();
        console.log(`HANDLING INStALL CODE:`, {
            hasCanister, project_id, canister_id
        });
        if (hasCanister) {
            navigate(`/dashboard/deploy/${canister_id}/${canister_id}`);
        } else {
            if (!agent) {
                console.log(`HttpAgent not set.`);
                return;
            }

            const mainApi = await MainApi.create(identity, agent);
            const res = await mainApi?.deployAssetCanister(project_id);

            if (!res?.status) {
                console.error(`Failed to attach canister id:`, res?.message);
                return;
            }

            // Refresh projects after successful deployment
            await refreshProjects();
            await fetchUsage();
        }
    }, [navigate, refreshProjects]);

    const handleVisitWebsite = useCallback((e: React.MouseEvent<HTMLButtonElement>, canisterId: string) => {
        e.stopPropagation();
        window.open(getCanisterUrl(canisterId), '_blank');
    }, []);

    const handleProjectClick = useCallback((projectId: string, hasCanister: boolean, canisterId: string | null) => {
        // if (hasCanister && canisterId) {
        navigate(`/dashboard/canister/${projectId}`);
        // }
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
        activeFilterTag,
        activeSortTag,
        viewMode,
        handleFilterChange,
        handleSortChange,
        handleViewModeChange,
        handleInstallCode,
        handleVisitWebsite,
        handleProjectClick,
        refreshProjects,
    };
}; 