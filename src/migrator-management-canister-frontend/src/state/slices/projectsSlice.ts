import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import MainApi, { PlanType } from '../../api/main';
import { Principal } from '@dfinity/principal';
import {
    SerializedProject,
    DeserializedProject,
    serializeProject,
    deserializeProject,
    serializeProjects,
    deserializeProjects,
    bigIntToNumber,
    deserializeUsageLog,
    DeserializedUsageLog,
    DeserializedActivityLog,
    SerializedActivityLog,
    deserializeActivityLogs
} from '../../utility/bigint';
import { fetchFreemiumUsage } from './freemiumSlice';

export type UsageLog = DeserializedUsageLog;

export interface ProjectsState {
    projects: SerializedProject[];
    isLoading: boolean;
    activeFilterTag: string;
    activeSortTag: string;
    viewMode: 'card' | 'table';
    error: string | null;
    userUsage: UsageLog | null;
    isLoadingUsage: boolean;
    activityLogs: DeserializedActivityLog[];
    isLoadingActivityLogs: boolean;
    isLoadingClearAssets: boolean;
    isLoadingDeleteProject: boolean;
}

const initialState: ProjectsState = {
    projects: [],
    isLoading: false,
    activeFilterTag: 'All',
    activeSortTag: 'all',
    viewMode: 'card',
    error: null,
    userUsage: null,
    isLoadingUsage: false,
    activityLogs: [],
    isLoadingActivityLogs: false,
    isLoadingClearAssets: false,
    isLoadingDeleteProject: false,
};

export const getUserProjects = createAsyncThunk(
    'projects/getAll',
    async ({
        identity,
        agent,
        page,
        limit,
        silent = false
    }: {
        identity: any;
        agent: any;
        page?: number;
        limit?: number;
        silent?: boolean;
    }, { dispatch }) => {
        const mainApi = await MainApi.create(identity, agent);
        const projects = await mainApi?.getUserProjects(page, limit);
        if (!projects) {
            throw new Error('Failed to fetch projects');
        }
        return { projects: serializeProjects(projects), silent };
    }
);

export const createProject = createAsyncThunk(
    'projects/create',
    async ({
        identity,
        agent,
        name,
        description,
        tags,
        plan
    }: {
        identity: any;
        agent: any;
        name: string;
        description: string;
        tags: string[];
        plan: PlanType;
    }) => {
        const mainApi = await MainApi.create(identity, agent);
        const createResult = await mainApi?.createProject(name, description, tags, plan);

        if (!createResult) {
            throw new Error('Failed to create project');
        }

        const projects = await mainApi?.getUserProjects();
        if (!projects) {
            throw new Error('Failed to fetch projects after creation');
        }

        // Convert dates to number and serialize bigints
        const formattedProjects = projects.map(project => ({
            ...project,
            date_created: Number(project.date_created),
            date_updated: Number(project.date_updated)
        }));

        return {
            newProject: serializeProject(createResult),
            updatedProjects: serializeProjects(formattedProjects)
        };
    }
);

export const deployProject = createAsyncThunk(
    'projects/deploy',
    async ({
        identity,
        agent,
        projectId,
        isFreemium,
        validateSubscription
    }: {
        identity: any;
        agent: any;
        projectId: bigint;
        isFreemium: boolean;
        validateSubscription: () => Promise<{ status: boolean; message: string; }>;
    }, { dispatch }) => {
        if (!isFreemium) {
            const validation = await validateSubscription();
            if (!validation.status) {
                throw new Error(validation.message);
            }
        }

        const mainApi = await MainApi.create(identity, agent);
        const canisterId = await mainApi?.deployAssetCanister(projectId);
        console.log(`DEPLOYED ASSET CANISTER`, canisterId);

        if (!canisterId) {
            throw new Error('Failed to deploy canister');
        }

        // Fetch fresh project data after deployment
        const projectsResponse = await dispatch(getUserProjects({
            identity, agent
        })).unwrap();

        // Automatically refresh freemium usage after successful deployment
        if (isFreemium) {
            await dispatch(fetchFreemiumUsage({
                identity,
                agent,
                silent: true
            })).unwrap();
        }

        return {
            canisterId: canisterId,
            projectId: projectId.toString(),
            updatedProjects: projectsResponse.projects
        };
    }
);

export const fetchUserUsage = createAsyncThunk(
    'projects/fetchUserUsage',
    async ({ identity, agent }: { identity: any, agent: any }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("MainApi is not initialized.");
        }
        const result = await mainApi.getUserUsage();
        return deserializeUsageLog(result);
    }
);

export const fetchActivityLogs = createAsyncThunk(
    'projects/fetchActivityLogs',
    async ({ identity, agent, projectId }: { identity: any, agent: any, projectId: bigint }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("MainApi is not initialized.");
        }
        const result = await mainApi.getProjectActivityLogs(projectId);

        return deserializeActivityLogs(result);
    }
);

export const clearProjectAssets = createAsyncThunk(
    'projects/clearProjectAssets',
    async ({ identity, agent, projectId }: { identity: any, agent: any, projectId: number }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("MainApi is not initialized.");
        }
        const is_cleared = await mainApi.clearProjectAssets(projectId);
        return is_cleared;
    }
)

export const deleteProject = createAsyncThunk(
    'projects/deleteProject',
    async ({ identity, agent, projectId }: { identity: any, agent: any, projectId: number }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("MainApi is not initialized.");
        }
        const is_deleted = await mainApi.deleteProject(projectId);
        return is_deleted;
    }
)

export const projectsSlice = createSlice({
    name: 'projects',
    initialState,
    reducers: {
        setProjects: (state, action: PayloadAction<DeserializedProject[]>) => {
            state.projects = serializeProjects(action.payload);
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setActiveFilterTag: (state, action: PayloadAction<string>) => {
            state.activeFilterTag = action.payload;
        },
        setActiveSortTag: (state, action: PayloadAction<string>) => {
            state.activeSortTag = action.payload;
        },
        setViewMode: (state, action: PayloadAction<'card' | 'table'>) => {
            state.viewMode = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getUserProjects.pending, (state, action) => {
                if (!action.meta.arg.silent) {
                    state.isLoading = true;
                    state.error = null;
                }
            })
            .addCase(getUserProjects.fulfilled, (state, action) => {
                if (!action.payload.silent) {
                    state.isLoading = false;
                }
                state.projects = action.payload.projects;
            })
            .addCase(getUserProjects.rejected, (state, action) => {
                if (!action.meta.arg.silent) {
                    state.isLoading = false;
                    state.error = action.error.message || 'Failed to fetch projects';
                }
            })
            .addCase(createProject.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createProject.fulfilled, (state, action) => {
                state.isLoading = false;
                state.projects = action.payload.updatedProjects;
            })
            .addCase(createProject.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to create project';
            })
            .addCase(deployProject.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deployProject.fulfilled, (state, action) => {
                state.isLoading = false;
                // Update all projects with fresh data
                state.projects = action.payload.updatedProjects;
            })
            .addCase(deployProject.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to deploy project';
            })
            .addCase(fetchUserUsage.pending, (state) => {
                state.isLoadingUsage = true;
            })
            .addCase(fetchUserUsage.fulfilled, (state, action) => {
                state.isLoadingUsage = false;
                state.userUsage = action.payload ? action.payload : null;
            })
            .addCase(fetchUserUsage.rejected, (state, action) => {
                state.isLoadingUsage = false;
                state.error = action.error.message || 'Failed to fetch user usage';
            })
            .addCase(fetchActivityLogs.pending, (state) => {
                state.isLoadingActivityLogs = true;
            })
            .addCase(fetchActivityLogs.fulfilled, (state, action) => {
                state.isLoadingActivityLogs = false;
                state.activityLogs = action.payload;
            })
            .addCase(fetchActivityLogs.rejected, (state, action) => {
                state.isLoadingActivityLogs = false;
                state.error = action.error.message || 'Failed to fetch activity logs';
            })
            .addCase(clearProjectAssets.pending, (state) => {
                state.isLoadingClearAssets = true;
            })
            .addCase(clearProjectAssets.fulfilled, (state, action) => {
                state.isLoadingClearAssets = false;
            })
            .addCase(clearProjectAssets.rejected, (state, action) => {
                state.isLoadingClearAssets = false;
                state.error = action.error.message || "Failed to clear assets"
            })
            .addCase(deleteProject.pending, (state) => {
                state.isLoadingDeleteProject = true;
            })
            .addCase(deleteProject.fulfilled, (state, action) => {
                state.isLoadingDeleteProject = false;
            })
            .addCase(deleteProject.rejected, (state, action) => {
                state.isLoadingDeleteProject = false;
                state.error = action.error.message || "Failed to delete project"
            })
    },
});

export const {
    setProjects,
    setLoading,
    setActiveFilterTag,
    setActiveSortTag,
    setViewMode,
    setError,
} = projectsSlice.actions;

export default projectsSlice.reducer; 