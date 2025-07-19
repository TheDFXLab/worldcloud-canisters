import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import MainApi from '../../api/main';
import { Principal } from '@dfinity/principal';

enum SlotStatus {
    occupied = "Active Trial",
    available = "Inactive",
}

export interface FreemiumUsageData {
    project_id?: number;
    canister_id?: string | null;
    owner: string;
    user?: string;
    start_timestamp: number;
    create_timestamp: number;
    duration: number;
    start_cycles?: number;
    status: string;
    tier_id?: number;
    canisters?: string[];
}

export interface FreemiumState {
    usageData: FreemiumUsageData | null;
    hasActiveSlot: boolean;
    isLoading: boolean;
    error: string | null;
    lastFetchTimestamp: number | null;
}

const convertUsageData = (usage: any): FreemiumUsageData => {
    // Return a default FreemiumUsageData object if usage is null or undefined
    if (!usage) {
        return {
            owner: '',
            start_timestamp: 0,
            create_timestamp: 0,
            duration: 0,
            status: 'unknown'
        };
    }

    // Convert Principal objects to strings and bigints to numbers
    return {
        project_id: usage.project_id ? Number(usage.project_id) : undefined,
        canister_id: usage.canister_id ? usage.canister_id.toString() : null,
        owner: usage.owner ? usage.owner.toString() : '',
        user: usage.user ? usage.user.toString() : undefined,
        start_timestamp: usage.start_timestamp ? Number(usage.start_timestamp) : 0,
        create_timestamp: usage.create_timestamp ? Number(usage.create_timestamp) : 0,
        duration: usage.duration ? Number(usage.duration) : 0,
        start_cycles: usage.start_cycles ? Number(usage.start_cycles) : undefined,
        status: usage.status ? Object.keys(usage.status)[0] : 'unknown',
        tier_id: usage.tier_id ? Number(usage.tier_id) : undefined,
        canisters: usage.canisters ? usage.canisters.map((p: Principal) => p.toString()) : undefined
    };
};

const initialState: FreemiumState = {
    usageData: null,
    hasActiveSlot: false,
    isLoading: false,
    error: null,
    lastFetchTimestamp: null,
};

export const fetchFreemiumUsage = createAsyncThunk(
    'freemium/fetchUsage',
    async ({
        identity,
        agent,
        silent = false
    }: {
        identity: any;
        agent: any;
        silent?: boolean;
    }) => {
        const mainApi = await MainApi.create(identity, agent);
        const usage = await mainApi?.getUserFreemiumUsage();
        console.log('Raw freemium usage data:', usage);

        // Return both the usage data and whether there's an active slot
        return {
            usage: usage ? convertUsageData(usage) : null,
            hasActiveSlot: !!usage,
            silent
        };
    }
);

export const freemiumSlice = createSlice({
    name: 'freemium',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchFreemiumUsage.pending, (state, action) => {
                if (!action.meta.arg.silent) {
                    state.isLoading = true;
                    state.error = null;
                }
            })
            .addCase(fetchFreemiumUsage.fulfilled, (state, action) => {
                if (!action.meta.arg.silent) {
                    state.isLoading = false;
                }
                state.usageData = action.payload.usage;
                state.hasActiveSlot = action.payload.hasActiveSlot;
                state.lastFetchTimestamp = Date.now();
            })
            .addCase(fetchFreemiumUsage.rejected, (state, action) => {
                if (!action.meta.arg.silent) {
                    state.isLoading = false;
                    state.error = action.error.message || 'Failed to fetch freemium usage';
                }
            });
    },
});

export const { clearError } = freemiumSlice.actions;
export default freemiumSlice.reducer; 