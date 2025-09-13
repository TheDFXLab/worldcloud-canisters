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
    deserializeActivityLogs,
    SerializedUsageLogExtended
} from '../../utility/bigint';
import { fetchFreemiumUsage } from './freemiumSlice';
import { SerializedDomainRegistration, serializeDomainRegistrations, SerializedParsedMyAddons, serializeParsedMyAddons, serializeUsageLog } from '../../serialization/admin';
import { serializeAddOns, serializeAddOnVariantList, SerializedAddOn, SerializedAddOnVariant } from '../../serialization/addons';

export type UsageLog = SerializedUsageLogExtended;
export interface DomainRegistrationsMap {
    [projectId: number]: SerializedDomainRegistration[]
}

export interface ProjectsState {
    projects: SerializedProject[];
    activeFilterTag: string;
    activeSortTag: string;
    projectAddOns: { [projectId: number]: SerializedAddOn[] };
    addOnsList: SerializedAddOnVariant[];
    viewMode: 'card' | 'table';
    addOns: SerializedAddOn[];
    userUsage: UsageLog | null;
    activityLogs: DeserializedActivityLog[];
    // Domain registrations
    domainRegistrations: { [projectId: number]: SerializedDomainRegistration[] };
    parsedMyAddons: SerializedParsedMyAddons;



    // Loading flags
    isLoading: boolean;
    isLoadingUsage: boolean;
    isLoadingActivityLogs: boolean;
    isLoadingClearAssets: boolean;
    isLoadingDeleteProject: boolean;
    isLoadingAddOns: boolean;
    isLoadingAddOnsList: boolean;
    isLoadingDomainRegistrations: boolean;
    isLoadingGetParsedMyAddons: boolean;
    isLoadingSubdomainNameAvailable: boolean;
    isLoadingDeleteDomainRegistration: boolean;
    isLoadingSetupCustomDomain: boolean;


    // Errors
    error: string | null;

}

const initialState: ProjectsState = {
    addOns: [],
    addOnsList: [],
    projects: [],
    projectAddOns: {},
    activeFilterTag: 'All',
    activeSortTag: 'all',
    viewMode: 'card',
    userUsage: null,
    activityLogs: [],
    domainRegistrations: {},
    parsedMyAddons: { domain_addons: [] },

    // Loading flags
    isLoadingUsage: false,
    isLoadingActivityLogs: false,
    isLoadingClearAssets: false,
    isLoadingDeleteProject: false,
    isLoading: false,
    isLoadingAddOns: false,
    isLoadingAddOnsList: false,
    isLoadingDomainRegistrations: false,
    isLoadingGetParsedMyAddons: false,
    isLoadingSubdomainNameAvailable: false,
    isLoadingDeleteDomainRegistration: false,
    isLoadingSetupCustomDomain: false,
    //
    // Errors
    error: null,
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
        return serializeUsageLog(result);
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

export const hasAddOn = createAsyncThunk(
    'projects/hasAddOn',
    async ({ identity, agent, projectId, addonId }: { identity: any, agent: any, projectId: number, addonId: number }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) throw new Error("MainApi is not initialized.");

        const has = await mainApi.has_add_on_by_project(projectId, addonId);
        return has;
    }
)

export const getMyAddOns = createAsyncThunk(
    'projects/getAddOns',
    async ({ identity, agent, projectId }: { identity: any, agent: any, projectId: number }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) throw new Error("MainApi is not initialized.");
        const addOns = await mainApi.get_add_ons_by_project(projectId);
        let s = serializeAddOns(addOns);
        return s;

    }
)


export const getAddOnsList = createAsyncThunk(
    'projects/getAddOnsList',
    async ({ identity, agent }: { identity: any, agent: any }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) throw new Error("MainApi is not initialized.");

        const addOns = await mainApi.get_add_ons_list();
        return serializeAddOnVariantList(addOns);
    }
)

export const getDomainRegistrationsByProject = createAsyncThunk(
    'projects/getDomainRegistrationsByProject',
    async ({ identity, agent, projectId }: { identity: any, agent: any, projectId: number }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) throw new Error("MainApi not initialized.");
        const registrations = await mainApi.get_domain_registrations_by_project(projectId);
        return serializeDomainRegistrations(registrations);
    }
)

export const getDomainRegistrationStatus = createAsyncThunk(
    'projects/getDomainRegistrationStatus',
    async ({ identity, agent, registrationId }: { identity: any, agent: any, registrationId: string }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) throw new Error("MainApi not initialized.");

        const status = await mainApi.get_domain_registration_status(registrationId);
        return status;
    }
)

export const getParsedMyAddons = createAsyncThunk(
    'projects/getParsedMyAddons',
    async ({ identity, agent, projectId }: { identity: any, agent: any, projectId: number }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) throw new Error("MainApi not initialized.");

        const result = await mainApi.get_parsed_my_addons((projectId));

        // debugger;
        return serializeParsedMyAddons(result);
    }
)


export const setupCustomDomainByProject = createAsyncThunk(
    'projects/setupCustomDomainByProject',
    async ({ identity, agent, projectId, domainName, addonId }: { identity: any, agent: any, projectId: number, domainName: string, addonId: number }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) throw new Error("MainApi not initialized.");

        const result = await mainApi.setup_custom_domain_by_project(projectId, domainName, addonId);
        return result;
    }
)

export const isAvailableSubdomainName = createAsyncThunk(
    'projects/isAvailableSubdomainName',
    async ({ identity, agent, projectId, domainName, addonId }: { identity: any, agent: any, projectId: number, domainName: string, addonId: number }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) throw new Error("MainApi not initialized.");

        const result = await mainApi.is_subdomain_available(domainName, projectId, addonId);
        return result;
    }
)

export const deleteDomainRegistration = createAsyncThunk(
    'projects/deleteDomainRegistration',
    async ({ identity, agent, projectId, addonId }: { identity: any, agent: any, projectId: number, addonId: number }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) throw new Error("MainApi not initialized.");

        const result = await mainApi.delete_domain_registration(projectId, addonId);
        return result;
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
        // setProjectAddOns: (state, action: PayloadAction<{ projectId: number; addOns: SerializedAddOn[] }>) => {
        //     state.projectAddOns[action.payload.projectId] = action.payload.addOns;
        // },
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
            .addCase(getMyAddOns.pending, (state) => {
                state.isLoadingAddOns = true;
                state.error = null;
            })
            .addCase(getMyAddOns.fulfilled, (state, action) => {
                state.isLoadingAddOns = false;
                state.addOns = action.payload;
                // Also store addons for the specific project
                if (action.meta.arg.projectId.toString().length) {
                    state.projectAddOns[action.meta.arg.projectId] = action.payload;
                }
            })
            .addCase(getMyAddOns.rejected, (state, action) => {
                state.isLoadingAddOns = false;
                state.error = action.error.message || 'Failed to fetch add-ons';
            })
            .addCase(hasAddOn.pending, (state) => {
                state.error = null;
            })
            .addCase(hasAddOn.fulfilled, (state, action) => {
                // hasAddOn returns a boolean, no state update needed
            })
            .addCase(hasAddOn.rejected, (state, action) => {
                state.error = action.error.message || 'Failed to check add-on status';
            })

            .addCase(getAddOnsList.pending, (state) => {
                state.addOnsList = [];
                state.isLoadingAddOnsList = true;
            })
            .addCase(getAddOnsList.fulfilled, (state, action) => {
                state.isLoadingAddOnsList = false;
                state.addOnsList = [];
                state.addOnsList = action.payload;
            })
            .addCase(getAddOnsList.rejected, (state, action) => {
                state.isLoadingAddOnsList = false;
                state.addOnsList = [];
                state.error = action.error.message || "Failed to get add-on list from backend API.";
            })

            .addCase(getDomainRegistrationsByProject.pending, (state) => {
                state.isLoadingDomainRegistrations = true;
                state.error = null;
            })
            .addCase(getDomainRegistrationsByProject.fulfilled, (state, action) => {
                state.isLoadingDomainRegistrations = false;
                state.domainRegistrations[action.meta.arg.projectId] = action.payload;
            })
            .addCase(getDomainRegistrationsByProject.rejected, (state, action) => {
                state.isLoadingDomainRegistrations = false;
                state.error = action.error.message || "Failed to fetch domain registrations by project";
            })
            .addCase(isAvailableSubdomainName.pending, (state) => {
                state.isLoadingSubdomainNameAvailable = true;
            })
            .addCase(isAvailableSubdomainName.fulfilled, (state, action) => {
                state.isLoadingSubdomainNameAvailable = false;
            })
            .addCase(isAvailableSubdomainName.rejected, (state, action) => {
                state.isLoadingSubdomainNameAvailable = false;
                state.error = action.error.message ? action.error.message : "Failed to check availability of subdomain name.";
            })

            // .addCase(getDomainRegistrationsByProject.pending, (state) => {
            //     state.isLoadingDomainRegistrations = true;
            //     state.error = null;
            // })
            // .addCase(getDomainRegistrationsByProject.fulfilled, (state, action) => {
            //     state.isLoadingDomainRegistrations = false;
            //     // This thunk is for fetching by canister, not project.
            //     // We need to find the projectId from the canisterId.
            //     // For now, we'll just store the raw result.
            //     // A more robust solution would involve mapping canisterId to projectId.
            //     // For this example, we'll just store the raw result.
            //     state.domainRegistrations[action.meta.arg.projectId] = action.payload; // This line is problematic
            // })
            // .addCase(getDomainRegistrationsByProject.rejected, (state, action) => {
            //     state.isLoadingDomainRegistrations = false;
            //     state.error = action.error.message || "Failed to fetch domain registrations by canister";
            // })

            .addCase(getDomainRegistrationStatus.pending, (state) => {
                state.error = null;
            })
            .addCase(getDomainRegistrationStatus.fulfilled, (state, action) => {
                // This thunk is for fetching status by registrationId.
                // We don't need to store it in the state as it's a single value.
            })
            .addCase(getDomainRegistrationStatus.rejected, (state, action) => {
                state.error = action.error.message || "Failed to fetch domain registration status";
            })

            .addCase(setupCustomDomainByProject.pending, (state) => {
                state.isLoadingSetupCustomDomain = true;
                state.error = null;
            })
            .addCase(setupCustomDomainByProject.fulfilled, (state, action) => {
                state.isLoadingSetupCustomDomain = false;
            })
            .addCase(setupCustomDomainByProject.rejected, (state, action) => {
                state.isLoadingSetupCustomDomain = false;
                state.error = action.error.message || "Failed to setup custom domain";
            })
            .addCase(getParsedMyAddons.pending, (state) => {
                state.isLoadingGetParsedMyAddons = true;
            })
            .addCase(getParsedMyAddons.fulfilled, (state, action) => {
                state.isLoadingGetParsedMyAddons = false;
                state.parsedMyAddons = action.payload;
            })
            .addCase(getParsedMyAddons.rejected, (state, action) => {
                state.isLoadingGetParsedMyAddons = false;
                state.error = action.error.message ? action.error.message : "Failed to get parsed addons";
            })
            .addCase(deleteDomainRegistration.pending, (state) => {
                state.isLoadingDeleteDomainRegistration = true;
            })
            .addCase(deleteDomainRegistration.fulfilled, (state, action) => {
                state.isLoadingDeleteDomainRegistration = false;
            })
            .addCase(deleteDomainRegistration.rejected, (state, action) => {
                state.isLoadingDeleteDomainRegistration = false;
                state.error = action.error.message ? action.error.message : "Failed to delete domain registration"
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
    // setProjectAddOns,
} = projectsSlice.actions;

// Selector to get addons for a specific project
export const selectProjectAddOns = (state: { projects: ProjectsState }, projectId: number): SerializedAddOn[] => {
    return state.projects.projectAddOns[projectId] || [];
};

// Selector to get all addons
export const selectAllAddOns = (state: { projects: ProjectsState }): SerializedAddOn[] => {
    return state.projects.addOns;
};

// Selector to get addons loading state
export const selectAddOnsLoading = (state: { projects: ProjectsState }): boolean => {
    return state.projects.isLoadingAddOns;
};

// Selector to get domain registrations for a specific project
export const selectProjectDomainRegistrations = (state: { projects: ProjectsState }, projectId: number): any[] => {
    return state.projects.domainRegistrations[projectId] || [];
};

// Selector to get domain registrations loading state
export const selectDomainRegistrationsLoading = (state: { projects: ProjectsState }): boolean => {
    return state.projects.isLoadingDomainRegistrations;
};

export default projectsSlice.reducer; 