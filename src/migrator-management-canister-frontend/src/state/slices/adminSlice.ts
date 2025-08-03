import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import MainApi from '../../api/main';
import { backend_canister_id } from '../../config/config';
import { Principal } from '@dfinity/principal';
import { Subscription } from '../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did';
import { SerializedSubscription, serializePrincipal, serializeSlot, serializeSubscription } from '../../serialization/subscription';
import { handleBackendResponse, handleError } from '../../utility/errorHandler';
import {
    SerializedActivityLog,
    SerializedWorkflowRunDetails,
    SerializedUsageLog,
    SerializedProject,
    SerializedCanisterDeployment,
    SerializedShareableCanister,
    PaginationPayload,
    serializeActivityLogsPair,
    serializeWorkflowRunDetailsPair,
    serializeUsageLogsPair,
    serializeProjectsPair,
    serializeCanisterDeploymentsPair,
    serializeProjectsIdPair,
    serializeShareableCanister,
    serializeProject,
    serializePaginationPayload,
    SerializedRole,
    serializeAdminRole,
    serializeAdminRolePairs,
    SerializedBookEntry,
    serializeBookEntries,
} from '../../serialization/admin';
import { SerializedUsageLogExtended } from '../../utility/bigint';

// Types
export interface AdminState {
    // Slots Management
    slots: any[];
    availableSlots: number[];
    usedSlots: [number, boolean][];
    isLoadingSlots: boolean;

    // Subscriptions Management
    allSubscriptions: [string, any][];
    isLoadingSubscriptions: boolean;

    // Deployed Canisters
    deployedCanisters: string[];
    isLoadingCanisters: boolean;

    // Activity Logs
    activityLogs: [number, SerializedActivityLog[]][];
    isLoadingActivityLogs: boolean;

    // Workflow Run History
    workflowRunHistory: [number, SerializedWorkflowRunDetails[]][];
    isLoadingWorkflowHistory: boolean;

    // Usage Logs
    usageLogs: [string, SerializedUsageLogExtended][];
    isLoadingUsageLogs: boolean;

    // User Projects
    userProjects: [string, SerializedProject[]][];
    isLoadingUserProjects: boolean;

    // All Projects
    allProjects: [number, SerializedProject][];
    isLoadingAllProjects: boolean;

    // Canister Deployments
    canisterDeployments: [string, SerializedCanisterDeployment][];
    isLoadingCanisterDeployments: boolean;

    // User Slot
    userSlot: SerializedShareableCanister | null;
    isLoadingUserSlot: boolean;

    // Access Control
    admins: [string, SerializedRole][];
    isLoadingAccessControl: boolean;

    // Book Entries
    bookEntries: SerializedBookEntry[];
    isLoadingBookEntries: boolean;

    // Treasury Balance
    treasuryBalance: number | null;
    isLoadingTreasuryBalance: boolean;

    treasuryPrincipal: string | null;
    isLoadingTreasury: boolean;

    // General Admin State
    isLoading: boolean;
    error: string | null;
    successMessage: string | null;

    // current user role
    currentUserRole: SerializedRole | null,
    isLoadingCurrentUserRole: boolean,
}


const initialState: AdminState = {
    slots: [],
    availableSlots: [],
    usedSlots: [],
    isLoadingSlots: false,
    allSubscriptions: [],
    isLoadingSubscriptions: false,
    deployedCanisters: [],
    isLoadingCanisters: false,
    activityLogs: [],
    isLoadingActivityLogs: false,
    workflowRunHistory: [],
    isLoadingWorkflowHistory: false,
    usageLogs: [],
    isLoadingUsageLogs: false,
    userProjects: [],
    isLoadingUserProjects: false,
    allProjects: [],
    isLoadingAllProjects: false,
    canisterDeployments: [],
    isLoadingCanisterDeployments: false,
    userSlot: null,
    isLoadingUserSlot: false,
    isLoadingAccessControl: false,
    bookEntries: [],
    isLoadingBookEntries: false,
    treasuryBalance: null,
    isLoadingTreasuryBalance: false,
    isLoading: false,
    error: null,
    successMessage: null,
    admins: [],
    treasuryPrincipal: null,
    isLoadingTreasury: false,
    currentUserRole: null,
    isLoadingCurrentUserRole: false,

};

// Async thunks
export const fetchSlots = createAsyncThunk(
    'admin/fetchSlots',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.get_slots(null, null);
        if ('ok' in response) {
            // Serialize before dispatching
            return response.ok.map(serializeSlot);
        }
        throw new Error('Failed to fetch slots');
    }
);

export const fetchAvailableSlots = createAsyncThunk(
    'admin/fetchAvailableSlots',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.get_available_slots(null, null);
        if ('ok' in response) {
            // Serialize before dispatching
            return response.ok.map((id: any) => Number(id));
        }
        throw new Error('Failed to fetch available slots');
    }
);

export const fetchUsedSlots = createAsyncThunk(
    'admin/fetchUsedSlots',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.get_used_slots();
        // Serialize before dispatching
        return response.map(([id, used]: [any, boolean]) => [Number(id), used]) as [number, boolean][];
    }
);

export const fetchAllSubscriptions = createAsyncThunk(
    'admin/fetchAllSubscriptions',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.get_all_subscriptions();
        if ('ok' in response) {
            // Serialize before dispatching
            return response.ok.map((pair: [Principal, Subscription]) => {
                const [principal, subscription] = pair;
                return [
                    typeof principal === "object" && principal.toString ? principal.toString() : String(principal),
                    serializeSubscription(subscription)
                ];
            }) as [string, SerializedSubscription][];
        }
        throw new Error('Failed to fetch subscriptions');
    }
);

export const fetchDeployedCanisters = createAsyncThunk(
    'admin/fetchDeployedCanisters',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.getDeployedCanisters();
        if ('ok' in response) {
            // Serialize before dispatching
            return response.ok.map((principal: any) =>
                typeof principal === "object" && principal.toString ? principal.toString() : String(principal)
            );
        }
        throw new Error('Failed to fetch deployed canisters');
    }
);

export const setAllSlotDuration = createAsyncThunk(
    'admin/setAllSlotDuration',
    async ({
        identity,
        agent,
        newDurationMs
    }: {
        identity: any;
        agent: any;
        newDurationMs: number
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_set_all_slot_duration(newDurationMs);
        if ('ok' in response) {
            return response.ok;
        }
        throw new Error('Failed to set slot duration');
    }
);

export const deleteUsageLogs = createAsyncThunk(
    'admin/deleteUsageLogs',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        await api.admin_delete_usage_logs();
        return true;
    }
);

export const updateSlot = createAsyncThunk(
    'admin/updateSlot',
    async ({
        identity,
        agent,
        slotId,
        updatedSlot
    }: {
        identity: any;
        agent: any;
        slotId: number;
        updatedSlot: any
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.update_slot(slotId, updatedSlot);
        if ('ok' in response) {
            return response.ok;
        }
        throw new Error('Failed to update slot');
    }
);

export const deleteProjects = createAsyncThunk(
    'admin/deleteProjects',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        return await api.delete_projects();
    }
);

export const deleteWorkflowRunHistory = createAsyncThunk(
    'admin/deleteWorkflowRunHistory',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        await api.delete_workflow_run_history();
        return true;
    }
);

export const resetProjectSlot = createAsyncThunk(
    'admin/resetProjectSlot',
    async ({
        identity,
        agent,
        projectId
    }: {
        identity: any;
        agent: any;
        projectId: number
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.reset_project_slot(projectId);
        if ('ok' in response) {
            return response.ok;
        }
        throw new Error('Failed to reset project slot');
    }
);

export const resetSlots = createAsyncThunk(
    'admin/resetSlots',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.reset_slots();
        if ('ok' in response) {
            return response.ok;
        }
        throw new Error(response.err);
    }
);

export const purgeExpiredSessions = createAsyncThunk(
    'admin/purgeExpiredSessions',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.purge_expired_sessions();
        if ('ok' in response) {
            return response.ok;
        }
        throw new Error('Failed to purge expired sessions');
    }
);

export const deleteAllLogs = createAsyncThunk(
    'admin/deleteAllLogs',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        await api.delete_all_logs();
        return true;
    }
);

export const getAdmins = createAsyncThunk(
    'admin/getAdmins',
    async ({
        identity,
        agent,
        payload
    }: {
        identity: any;
        agent: any;
        payload: PaginationPayload;
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_admin_users(payload);
        if ('ok' in response) {
            return response.ok.map(r => serializeAdminRolePairs(r));
        }
        throw new Error('Failed to get admins.');
    }
);

export const grantRole = createAsyncThunk(
    'admin/grantRole',
    async ({
        identity,
        agent,
        principal,
        role
    }: {
        identity: any;
        agent: any;
        principal: string;
        role: any
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.grant_role(principal, role);
        if ('ok' in response) {
            return response.ok;
        }
        throw new Error('Failed to grant role');
    }
);

export const revokeRole = createAsyncThunk(
    'admin/revokeRole',
    async ({
        identity,
        agent,
        principal
    }: {
        identity: any;
        agent: any;
        principal: string
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.revoke_role(principal);
        if ('ok' in response) {
            return response.ok;
        }
        throw new Error('Failed to revoke role');
    }
);

export const isAdmin = createAsyncThunk(
    'admin/isAdmin',
    async ({
        identity,
        agent,
        principal
    }: {
        identity: any;
        agent: any;
        principal: string
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.is_admin();
        if ('ok' in response) {
            return response.ok;
        }
        throw new Error('Failed to check role');
    }
);
export const checkRole = createAsyncThunk(
    'admin/checkRole',
    async ({
        identity,
        agent,
        principal
    }: {
        identity: any;
        agent: any;
        principal: string
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.check_role(principal);
        if ('ok' in response) {
            return serializeAdminRole(response.ok);
        }
        throw new Error('Failed to check role');
    }
);

export const uploadAssetCanisterWasm = createAsyncThunk(
    'admin/uploadAssetCanisterWasm',
    async ({
        identity,
        agent,
        wasm
    }: {
        identity: any;
        agent: any;
        wasm: number[]
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.uploadAssetCanisterWasm(wasm);
        if ('ok' in response) {
            return response.ok;
        }
        throw new Error('Failed to upload WASM');
    }
);

// New Admin Functions
export const fetchActivityLogsAll = createAsyncThunk(
    'admin/fetchActivityLogsAll',
    async ({
        identity,
        agent,
        payload
    }: {
        identity: any;
        agent: any;
        payload: PaginationPayload;
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_activity_logs_all(serializePaginationPayload(payload));
        if ('ok' in response) {
            return response.ok.map(serializeActivityLogsPair);
        }
        throw new Error('Failed to fetch activity logs');
    }
);

export const fetchWorkflowRunHistoryAll = createAsyncThunk(
    'admin/fetchWorkflowRunHistoryAll',
    async ({
        identity,
        agent,
        payload
    }: {
        identity: any;
        agent: any;
        payload: PaginationPayload;
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_workflow_run_history_all(serializePaginationPayload(payload));
        if ('ok' in response) {
            return response.ok.map(serializeWorkflowRunDetailsPair);
        }
        throw new Error('Failed to fetch workflow run history');
    }
);

export const fetchUsageLogsAll = createAsyncThunk(
    'admin/fetchUsageLogsAll',
    async ({
        identity,
        agent,
        payload
    }: {
        identity: any;
        agent: any;
        payload: PaginationPayload;
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_usage_logs_all(serializePaginationPayload(payload));
        if ('ok' in response) {
            return response.ok.map(serializeUsageLogsPair);
        }
        throw new Error('Failed to fetch usage logs');
    }
);

export const fetchUserSlot = createAsyncThunk(
    'admin/fetchUserSlot',
    async ({
        identity,
        agent,
        user
    }: {
        identity: any;
        agent: any;
        user: string;
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_user_slot_id(user);
        if ('ok' in response) {
            return response.ok ? serializeShareableCanister(response.ok) : null;
        }
        throw new Error('Failed to fetch user slot');
    }
);

export const fetchUserProjectsAll = createAsyncThunk(
    'admin/fetchUserProjectsAll',
    async ({
        identity,
        agent,
        payload
    }: {
        identity: any;
        agent: any;
        payload: PaginationPayload;
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_user_projects_all(serializePaginationPayload(payload));
        if ('ok' in response) {
            return response.ok.map(serializeProjectsPair);
        }
        throw new Error('Failed to fetch user projects');
    }
);

export const fetchUserProjects = createAsyncThunk(
    'admin/fetchUserProjects',
    async ({
        identity,
        agent,
        user,
        payload
    }: {
        identity: any;
        agent: any;
        user: string;
        payload: PaginationPayload;
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_user_projects(user, serializePaginationPayload(payload));
        if ('ok' in response) {
            return response.ok.map(serializeProject);
        }
        throw new Error('Failed to fetch user projects');
    }
);

export const fetchProjectsAll = createAsyncThunk(
    'admin/fetchProjectsAll',
    async ({
        identity,
        agent,
        payload
    }: {
        identity: any;
        agent: any;
        payload: PaginationPayload;
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_projects_all(serializePaginationPayload(payload));
        if ('ok' in response) {
            return response.ok.map(serializeProjectsIdPair);
        }
        throw new Error('Failed to fetch all projects');
    }
);

export const fetchCanisterDeploymentsAll = createAsyncThunk(
    'admin/fetchCanisterDeploymentsAll',
    async ({
        identity,
        agent,
        payload
    }: {
        identity: any;
        agent: any;
        payload: PaginationPayload;
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_canister_deployments_all(serializePaginationPayload(payload));
        if ('ok' in response) {
            return response.ok.map(serializeCanisterDeploymentsPair);
        }
        throw new Error('Failed to fetch canister deployments');
    }
);

export const fetchBookEntriesAll = createAsyncThunk(
    'admin/fetchBookEntriesAll',
    async ({
        identity,
        agent,
        payload
    }: {
        identity: any;
        agent: any;
        payload: PaginationPayload;
    }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_book_entries_all(serializePaginationPayload(payload));
        if ('ok' in response) {
            return serializeBookEntries(response.ok);
        }
        throw new Error('Failed to fetch book entries');
    }
);

export const fetchTreasuryBalance = createAsyncThunk(
    'admin/fetchTreasuryBalance',
    async ({ identity, agent }: { identity: any; agent: any }) => {
        const api = await MainApi.create(identity, agent);
        if (!api) throw new Error('Failed to create API instance');
        const response = await api.admin_get_treasury_balance();
        if ('ok' in response) {
            return Number(response.ok);
        }
        throw new Error('Failed to fetch treasury balance');
    }
);


export const setTreasury = createAsyncThunk(
    'subscription/setTreasury',
    async ({
        identity,
        agent,
        treasuryPrincipal,
    }: {
        identity: any;
        agent: any;
        treasuryPrincipal: string;
    }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error('Failed to create API instance');
        }

        const result = await mainApi.admin_set_treasury(treasuryPrincipal);
        if (!result) {
            throw new Error('Failed to set treasury');
        }

        // Use the new error handling utility
        handleBackendResponse(result);
        return treasuryPrincipal;
    }
);

export const withdrawTreasury = createAsyncThunk(
    'subscription/withdrawTreasury',
    async ({
        identity,
        agent,
    }: {
        identity: any;
        agent: any;
    }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error('Failed to create API instance');
        }

        const result = await mainApi.admin_withdraw_treasury();
        if (!result) {
            throw new Error('Failed to withdraw from treasury');
        }

        // Use the new error handling utility
        return handleBackendResponse(result);
    }
);
export const getTreasury = createAsyncThunk(
    'subscription/getTreasury',
    async ({
        identity,
        agent,
    }: {
        identity: any;
        agent: any;
    }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error('Failed to create API instance');
        }
        const response = await mainApi.admin_get_treasury_principal();

        if (!response) {
            throw new Error("Failed to get treasury principal.");
        }
        // Use the new error handling utility
        const result = handleBackendResponse(response);
        return serializePrincipal(result);
    }
);


// Slice
const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearSuccessMessage: (state) => {
            state.successMessage = null;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
        },
        setSuccessMessage: (state, action: PayloadAction<string>) => {
            state.successMessage = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Fetch Slots
        builder
            .addCase(fetchSlots.pending, (state) => {
                state.isLoadingSlots = true;
                state.error = null;
            })
            .addCase(fetchSlots.fulfilled, (state, action) => {
                state.isLoadingSlots = false;
                state.slots = action.payload;
            })
            .addCase(fetchSlots.rejected, (state, action) => {
                state.isLoadingSlots = false;
                state.error = action.error.message || 'Failed to fetch slots';
            });

        // Fetch Available Slots
        builder
            .addCase(fetchAvailableSlots.pending, (state) => {
                state.isLoadingSlots = true;
                state.error = null;
            })
            .addCase(fetchAvailableSlots.fulfilled, (state, action) => {
                state.isLoadingSlots = false;
                state.availableSlots = action.payload;
            })
            .addCase(fetchAvailableSlots.rejected, (state, action) => {
                state.isLoadingSlots = false;
                state.error = action.error.message || 'Failed to fetch available slots';
            });

        // Fetch Used Slots
        builder
            .addCase(fetchUsedSlots.pending, (state) => {
                state.isLoadingSlots = true;
                state.error = null;
            })
            .addCase(fetchUsedSlots.fulfilled, (state, action) => {
                state.isLoadingSlots = false;
                state.usedSlots = action.payload;
            })
            .addCase(fetchUsedSlots.rejected, (state, action) => {
                state.isLoadingSlots = false;
                state.error = action.error.message || 'Failed to fetch used slots';
            });

        // Fetch All Subscriptions
        builder
            .addCase(fetchAllSubscriptions.pending, (state) => {
                state.isLoadingSubscriptions = true;
                state.error = null;
            })
            .addCase(fetchAllSubscriptions.fulfilled, (state, action) => {
                state.isLoadingSubscriptions = false;
                state.allSubscriptions = action.payload;
            })
            .addCase(fetchAllSubscriptions.rejected, (state, action) => {
                state.isLoadingSubscriptions = false;
                state.error = action.error.message || 'Failed to fetch subscriptions';
            });

        // Fetch Deployed Canisters
        builder
            .addCase(fetchDeployedCanisters.pending, (state) => {
                state.isLoadingCanisters = true;
                state.error = null;
            })
            .addCase(fetchDeployedCanisters.fulfilled, (state, action) => {
                state.isLoadingCanisters = false;
                state.deployedCanisters = action.payload;
            })
            .addCase(fetchDeployedCanisters.rejected, (state, action) => {
                state.isLoadingCanisters = false;
                state.error = action.error.message || 'Failed to fetch deployed canisters';
            });

        // Set All Slot Duration
        builder
            .addCase(setAllSlotDuration.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(setAllSlotDuration.fulfilled, (state) => {
                state.isLoading = false;
                state.successMessage = 'Slot duration updated successfully';
            })
            .addCase(setAllSlotDuration.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to set slot duration';
            });

        // Delete Usage Logs
        builder
            .addCase(deleteUsageLogs.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteUsageLogs.fulfilled, (state) => {
                state.isLoading = false;
                state.successMessage = 'Usage logs deleted successfully';
            })
            .addCase(deleteUsageLogs.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to delete usage logs';
            });

        // Update Slot
        builder
            .addCase(updateSlot.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateSlot.fulfilled, (state) => {
                state.isLoading = false;
                state.successMessage = 'Slot updated successfully';
            })
            .addCase(updateSlot.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to update slot';
            });

        // Delete Projects
        builder
            .addCase(deleteProjects.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteProjects.fulfilled, (state) => {
                state.isLoading = false;
                state.successMessage = 'All projects deleted successfully';
            })
            .addCase(deleteProjects.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to delete projects';
            });

        // Delete Workflow Run History
        builder
            .addCase(deleteWorkflowRunHistory.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteWorkflowRunHistory.fulfilled, (state) => {
                state.isLoading = false;
                state.successMessage = 'Workflow run history deleted successfully';
            })
            .addCase(deleteWorkflowRunHistory.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to delete workflow run history';
            });

        // Reset Project Slot
        builder
            .addCase(resetProjectSlot.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(resetProjectSlot.fulfilled, (state) => {
                state.isLoading = false;
                state.successMessage = 'Project slot reset successfully';
            })
            .addCase(resetProjectSlot.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to reset project slot';
            });

        // Reset Slots
        builder
            .addCase(resetSlots.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(resetSlots.fulfilled, (state) => {
                state.isLoading = false;
                state.successMessage = 'All slots reset successfully';
            })
            .addCase(resetSlots.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to reset slots';
            });

        // Purge Expired Sessions
        builder
            .addCase(purgeExpiredSessions.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(purgeExpiredSessions.fulfilled, (state) => {
                state.isLoading = false;
                state.successMessage = 'Expired sessions purged successfully';
            })
            .addCase(purgeExpiredSessions.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to purge expired sessions';
            });

        // Delete All Logs
        builder
            .addCase(deleteAllLogs.pending, (state) => {
                state.isLoadingActivityLogs = true;
                state.error = null;
            })
            .addCase(deleteAllLogs.fulfilled, (state) => {
                state.isLoadingActivityLogs = false;
                state.successMessage = 'All activity logs deleted successfully';
            })
            .addCase(deleteAllLogs.rejected, (state, action) => {
                state.isLoadingActivityLogs = false;
                state.error = action.error.message || 'Failed to delete activity logs';
            });

        // Grant Role
        builder
            .addCase(grantRole.pending, (state) => {
                state.isLoadingAccessControl = true;
                state.error = null;
            })
            .addCase(grantRole.fulfilled, (state) => {
                state.isLoadingAccessControl = false;
                state.successMessage = 'Role granted successfully';
            })
            .addCase(grantRole.rejected, (state, action) => {
                state.isLoadingAccessControl = false;
                state.error = action.error.message || 'Failed to grant role';
            });

        // Revoke Role
        builder
            .addCase(revokeRole.pending, (state) => {
                state.isLoadingAccessControl = true;
                state.error = null;
            })
            .addCase(revokeRole.fulfilled, (state) => {
                state.isLoadingAccessControl = false;
                state.successMessage = 'Role revoked successfully';
            })
            .addCase(revokeRole.rejected, (state, action) => {
                state.isLoadingAccessControl = false;
                state.error = action.error.message || 'Failed to revoke role';
            });

        // Check Role
        builder
            .addCase(checkRole.pending, (state) => {
                state.isLoadingCurrentUserRole = true;
                state.error = null;
            })
            .addCase(checkRole.fulfilled, (state, action) => {
                state.isLoadingCurrentUserRole = false;
                state.currentUserRole = action.payload;
            })
            .addCase(checkRole.rejected, (state, action) => {
                state.isLoadingCurrentUserRole = false;
                state.currentUserRole = null;
                state.error = action.error.message || 'Failed to check role';
            });

        // Is Admin
        builder
            .addCase(isAdmin.pending, (state) => {
                state.isLoadingCurrentUserRole = true;
                state.error = null;
            })
            .addCase(isAdmin.fulfilled, (state, action) => {
                state.isLoadingCurrentUserRole = false;
                state.currentUserRole = action.payload ? "admin" : null;
            })
            .addCase(isAdmin.rejected, (state, action) => {
                state.isLoadingCurrentUserRole = false;
                state.currentUserRole = null;
                state.error = action.error.message || 'Failed to check admin status';
            });

        // Upload Asset Canister WASM
        builder
            .addCase(uploadAssetCanisterWasm.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(uploadAssetCanisterWasm.fulfilled, (state) => {
                state.isLoading = false;
                state.successMessage = 'Asset canister WASM uploaded successfully';
            })
            .addCase(uploadAssetCanisterWasm.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to upload WASM';
            });

        // Fetch Activity Logs All
        builder
            .addCase(fetchActivityLogsAll.pending, (state) => {
                state.isLoadingActivityLogs = true;
                state.error = null;
            })
            .addCase(fetchActivityLogsAll.fulfilled, (state, action) => {
                state.isLoadingActivityLogs = false;
                state.activityLogs = action.payload;
            })
            .addCase(fetchActivityLogsAll.rejected, (state, action) => {
                state.isLoadingActivityLogs = false;
                state.error = action.error.message || 'Failed to fetch activity logs';
            });

        // Fetch Workflow Run History All
        builder
            .addCase(fetchWorkflowRunHistoryAll.pending, (state) => {
                state.isLoadingWorkflowHistory = true;
                state.error = null;
            })
            .addCase(fetchWorkflowRunHistoryAll.fulfilled, (state, action) => {
                state.isLoadingWorkflowHistory = false;
                state.workflowRunHistory = action.payload;
            })
            .addCase(fetchWorkflowRunHistoryAll.rejected, (state, action) => {
                state.isLoadingWorkflowHistory = false;
                state.error = action.error.message || 'Failed to fetch workflow run history';
            });

        // Fetch Usage Logs All
        builder
            .addCase(fetchUsageLogsAll.pending, (state) => {
                state.isLoadingUsageLogs = true;
                state.error = null;
            })
            .addCase(fetchUsageLogsAll.fulfilled, (state, action) => {
                state.isLoadingUsageLogs = false;
                state.usageLogs = action.payload;
            })
            .addCase(fetchUsageLogsAll.rejected, (state, action) => {
                state.isLoadingUsageLogs = false;
                state.error = action.error.message || 'Failed to fetch usage logs';
            });

        // Fetch User Slot
        builder
            .addCase(fetchUserSlot.pending, (state) => {
                state.isLoadingUserSlot = true;
                state.error = null;
            })
            .addCase(fetchUserSlot.fulfilled, (state, action) => {
                state.isLoadingUserSlot = false;
                state.userSlot = action.payload;
            })
            .addCase(fetchUserSlot.rejected, (state, action) => {
                state.isLoadingUserSlot = false;
                state.error = action.error.message || 'Failed to fetch user slot';
            });

        // Fetch User Projects All
        builder
            .addCase(fetchUserProjectsAll.pending, (state) => {
                state.isLoadingUserProjects = true;
                state.error = null;
            })
            .addCase(fetchUserProjectsAll.fulfilled, (state, action) => {
                state.isLoadingUserProjects = false;
                state.userProjects = action.payload;
            })
            .addCase(fetchUserProjectsAll.rejected, (state, action) => {
                state.isLoadingUserProjects = false;
                state.error = action.error.message || 'Failed to fetch user projects';
            });

        // Fetch User Projects
        builder
            .addCase(fetchUserProjects.pending, (state) => {
                state.isLoadingUserProjects = true;
                state.error = null;
            })
            .addCase(fetchUserProjects.fulfilled, (state, action) => {
                state.isLoadingUserProjects = false;
                // This returns a single user's projects, not pairs
                // You might want to handle this differently based on your UI needs
            })
            .addCase(fetchUserProjects.rejected, (state, action) => {
                state.isLoadingUserProjects = false;
                state.error = action.error.message || 'Failed to fetch user projects';
            });

        // Fetch Projects All
        builder
            .addCase(fetchProjectsAll.pending, (state) => {
                state.isLoadingAllProjects = true;
                state.error = null;
            })
            .addCase(fetchProjectsAll.fulfilled, (state, action) => {
                state.isLoadingAllProjects = false;
                state.allProjects = action.payload;
            })
            .addCase(fetchProjectsAll.rejected, (state, action) => {
                state.isLoadingAllProjects = false;
                state.error = action.error.message || 'Failed to fetch all projects';
            });

        // Fetch Canister Deployments All
        builder
            .addCase(fetchCanisterDeploymentsAll.pending, (state) => {
                state.isLoadingCanisterDeployments = true;
                state.error = null;
            })
            .addCase(fetchCanisterDeploymentsAll.fulfilled, (state, action) => {
                state.isLoadingCanisterDeployments = false;
                state.canisterDeployments = action.payload;
            })
            .addCase(fetchCanisterDeploymentsAll.rejected, (state, action) => {
                state.isLoadingCanisterDeployments = false;
                state.error = action.error.message || 'Failed to fetch canister deployments';
            });
        builder
            .addCase(getAdmins.pending, (state) => {
                state.isLoadingAccessControl = true;
            })
            .addCase(getAdmins.fulfilled, (state, action) => {
                state.isLoadingAccessControl = false;
                state.admins = action.payload;
            })
            .addCase(getAdmins.rejected, (state, action) => {
                state.isLoadingAccessControl = false;
                state.error = action.error.message || "Failed to get admins.";
            });

        // Fetch Book Entries All
        builder
            .addCase(fetchBookEntriesAll.pending, (state) => {
                state.isLoadingBookEntries = true;
                state.error = null;
            })
            .addCase(fetchBookEntriesAll.fulfilled, (state, action) => {
                state.isLoadingBookEntries = false;
                state.bookEntries = action.payload;
            })
            .addCase(fetchBookEntriesAll.rejected, (state, action) => {
                state.isLoadingBookEntries = false;
                state.error = action.error.message || 'Failed to fetch book entries';
            });

        // Fetch Treasury Balance
        builder
            .addCase(fetchTreasuryBalance.pending, (state) => {
                state.isLoadingTreasuryBalance = true;
                state.error = null;
            })
            .addCase(fetchTreasuryBalance.fulfilled, (state, action) => {
                state.isLoadingTreasuryBalance = false;
                state.treasuryBalance = Number(action.payload);
            })
            .addCase(fetchTreasuryBalance.rejected, (state, action) => {
                state.isLoadingTreasuryBalance = false;
                state.error = action.error.message || 'Failed to fetch treasury balance';
            });

        builder  // Set treasury
            .addCase(setTreasury.pending, (state) => {
                state.isLoadingTreasury = true;
                state.error = null;
            })
            .addCase(setTreasury.fulfilled, (state, action) => {
                state.isLoadingTreasury = false;
                state.treasuryPrincipal = action.payload;
            })
            .addCase(setTreasury.rejected, (state, action) => {
                state.isLoadingTreasury = false;
                state.error = handleError(action.error);
            })
            // Withdraw treasury
            .addCase(withdrawTreasury.pending, (state) => {
                state.isLoadingTreasury = true;
                state.error = null;
            })
            .addCase(withdrawTreasury.fulfilled, (state) => {
                state.isLoadingTreasury = false;
            })
            .addCase(withdrawTreasury.rejected, (state, action) => {
                state.isLoadingTreasury = false;
                state.error = handleError(action.error);
            })
            .addCase(getTreasury.pending, (state) => {
                state.isLoadingTreasury = true;
            })
            .addCase(getTreasury.fulfilled, (state, action) => {
                state.isLoadingTreasury = false;
                state.treasuryPrincipal = action.payload;
            })
            .addCase(getTreasury.rejected, (state, action) => {
                state.isLoadingTreasury = false;
                state.error = handleError(action.error);
            })
    },
});

export const { clearError, clearSuccessMessage, setError, setSuccessMessage } = adminSlice.actions;
export default adminSlice.reducer; 