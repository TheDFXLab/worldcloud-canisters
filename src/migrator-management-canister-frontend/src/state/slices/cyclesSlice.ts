import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Principal } from '@dfinity/principal';
import MainApi from '../../api/main';
import CyclesApi from '../../api/cycles';
import { fromE8sStable } from '../../utility/e8s';
import { CanisterStatusResponse } from '../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did';
import { CanisterStatus } from '../../api/authority';

export interface CreditsResponse {
    total_credits: number;
    equivalent_cycles: number;
}

interface CyclesState {
    cyclesAvailable: number;
    totalCredits: CreditsResponse | null;
    maxCyclesExchangeable: number;
    currentCanisterId: string | null;
    canisterStatus: CanisterStatus | null;
    cyclesStatus: CanisterStatus | null;
    cyclesRate: number;
    isLoading: {
        cycles: boolean;
        status: boolean;
        credits: boolean;
        estimateCycles: boolean;
    };
    error: string | null;
    lastFetchTimestamp: number | null;
}

const initialState: CyclesState = {
    cyclesAvailable: 0,
    totalCredits: null,
    maxCyclesExchangeable: 0,
    currentCanisterId: null,
    canisterStatus: null,
    cyclesStatus: null,
    cyclesRate: 0,
    isLoading: {
        cycles: false,
        status: false,
        credits: false,
        estimateCycles: false,
    },
    error: null,
    lastFetchTimestamp: null,
};

export const fetchCreditsAvailable = createAsyncThunk(
    'cycles/fetchCredits',
    async ({ identity, agent, balance }: { identity: any; agent: any; balance: bigint }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error('Error creating main API');
        }
        const credits = await mainApi.getCreditsAvailable();
        if (!credits && credits !== BigInt(0)) {
            throw new Error('Error getting credits available');
        }

        const cyclesApi = await CyclesApi.create(identity, agent);
        if (!cyclesApi) {
            throw new Error('Cycles API not created');
        }
        const equivalentCycles = await cyclesApi.estimateCyclesToAdd(fromE8sStable(credits));

        return {
            total_credits: fromE8sStable(credits),
            equivalent_cycles: fromE8sStable(BigInt(Math.floor(equivalentCycles)), 12),
        };
    }
);

export const estimateCycles = createAsyncThunk(
    'cycles/estimate',
    async ({ identity, agent, amountInIcp }: { identity: any; agent: any; amountInIcp: number }) => {
        const cyclesApi = await CyclesApi.create(identity, agent);
        if (!cyclesApi) {
            throw new Error('Cycles API not created');
        }
        return await cyclesApi.estimateCyclesToAdd(amountInIcp);
    }
);

export const fetchCanisterStatus = createAsyncThunk(
    'cycles/fetchStatus',
    async ({ identity, agent, canisterId }: { identity: any; agent: any; canisterId: string }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error('Main API not created');
        }
        return await mainApi.getCanisterStatus(Principal.fromText(canisterId));
    }
);

export const cyclesSlice = createSlice({
    name: 'cycles',
    initialState,
    reducers: {
        setCurrentCanisterId: (state, action) => {
            state.currentCanisterId = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Credits Available
            .addCase(fetchCreditsAvailable.pending, (state) => {
                state.isLoading.credits = true;
                state.error = null;
            })
            .addCase(fetchCreditsAvailable.fulfilled, (state, action) => {
                state.isLoading.credits = false;
                state.totalCredits = action.payload;
                state.lastFetchTimestamp = Date.now();
            })
            .addCase(fetchCreditsAvailable.rejected, (state, action) => {
                state.isLoading.credits = false;
                state.error = action.error.message || 'Failed to fetch credits';
            })
            // Estimate Cycles
            .addCase(estimateCycles.pending, (state) => {
                state.isLoading.estimateCycles = true;
            })
            .addCase(estimateCycles.fulfilled, (state, action) => {
                state.isLoading.estimateCycles = false;
                state.maxCyclesExchangeable = action.payload;
                if (state.totalCredits?.total_credits) {
                    state.cyclesRate = action.payload / state.totalCredits.total_credits;
                }
            })
            .addCase(estimateCycles.rejected, (state, action) => {
                state.isLoading.estimateCycles = false;
                state.error = action.error.message || 'Failed to estimate cycles';
            })
            // Canister Status
            .addCase(fetchCanisterStatus.pending, (state) => {
                state.isLoading.status = true;
            })
            .addCase(fetchCanisterStatus.fulfilled, (state, action) => {
                state.isLoading.status = false;
                state.cyclesStatus = action.payload;
            })
            .addCase(fetchCanisterStatus.rejected, (state, action) => {
                state.isLoading.status = false;
                state.error = action.error.message || 'Failed to fetch canister status';
            });
    },
});

export const { setCurrentCanisterId, clearError } = cyclesSlice.actions;
export default cyclesSlice.reducer; 