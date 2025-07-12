import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Tier, Subscription } from '../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did';
import MainApi from '../../api/main';
;

// Frontend interfaces
export interface FrontendTier {
    id: number;
    name: string;
    slots: number;
    min_deposit: { e8s: number };
    price: { e8s: number };
    features: string[];
}

export interface SubscriptionData {
    tier_id: number;
    canisters: string[];
    date_created: number;
    date_updated: number;
    max_slots: number;
    used_slots: number;
    user_id: string;
}

interface SubscriptionState {
    subscription: SubscriptionData | null;
    tiers: FrontendTier[] | null;
    isLoadingSub: boolean;
    isLoadingTiers: boolean;
    error: string | null;
}

// Helper function to convert backend subscription to frontend format
const convertSubscription = (sub: Subscription | null): SubscriptionData | null => {
    if (!sub) return null;
    return {
        ...sub,
        tier_id: Number(sub.tier_id),
        date_created: Number(sub.date_created),
        date_updated: Number(sub.date_updated),
        max_slots: Number(sub.max_slots),
        used_slots: Number(sub.used_slots),
        user_id: sub.user_id.toString(),
        canisters: sub.canisters.map(p => p.toString())
    };
};

// Helper function to convert tier data
const convertTier = (tier: Tier): FrontendTier => ({
    ...tier,
    id: Number(tier.id),
    slots: Number(tier.slots),
    min_deposit: { e8s: Number(tier.min_deposit.e8s) },
    price: { e8s: Number(tier.price.e8s) }
});

const initialState: SubscriptionState = {
    subscription: null,
    tiers: null,
    isLoadingSub: false,
    isLoadingTiers: false,
    error: null,
};

// Async thunks
export const fetchSubscription = createAsyncThunk(
    'subscription/fetchSubscription',
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
        const subscription = await mainApi?.actor?.get_subscription();
        if (!subscription) {
            throw new Error('Failed to fetch subscription');
        }
        if ('ok' in subscription) {
            return { subscription: convertSubscription(subscription.ok), silent };
        } else {
            if (subscription.err === "Subscription not found") {
                return { subscription: null, silent };
            }
            throw new Error(subscription.err);
        }
    }
);

export const fetchTiers = createAsyncThunk(
    'subscription/fetchTiers',
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
        const tiers = await mainApi?.actor?.get_tiers();
        if (!tiers) {
            throw new Error('Failed to fetch tiers');
        }
        return { tiers: tiers.map(convertTier), silent };
    }
);

export const createSubscription = createAsyncThunk(
    'subscription/create',
    async ({
        identity,
        agent,
        tierId,
    }: {
        identity: any;
        agent: any;
        tierId: number;
    }) => {
        const mainApi = await MainApi.create(identity, agent);
        const result = await mainApi?.actor?.create_subscription(BigInt(tierId));
        if (!result) {
            throw new Error('Failed to create subscription');
        }
        if ('ok' in result) {
            return convertSubscription(result.ok);
        } else {
            throw new Error(result.err);
        }
    }
);

export const validateSubscription = createAsyncThunk(
    'subscription/validate',
    async ({ subscription, tiers }: { subscription: SubscriptionData | null; tiers: FrontendTier[] | null }) => {
        if (!tiers) {
            throw new Error('No tiers found');
        }

        if (!subscription) {
            throw new Error('No subscription found');
        }

        const maxSlots = Number(tiers[Number(subscription.tier_id)].slots);
        const currentSlots = subscription.canisters.length;

        if (currentSlots >= maxSlots) {
            throw new Error('You have reached the maximum number of canisters for this tier');
        }

        return {
            status: true,
            message: `Used ${currentSlots}/${maxSlots} canister slots.`,
            max: maxSlots,
            current: currentSlots,
        };
    }
);

export const subscriptionSlice = createSlice({
    name: 'subscription',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch subscription
            .addCase(fetchSubscription.pending, (state, action) => {
                if (!action.meta.arg.silent) {
                    state.isLoadingSub = true;
                    state.error = null;
                }
            })
            .addCase(fetchSubscription.fulfilled, (state, action) => {
                if (!action.payload.silent) {
                    state.isLoadingSub = false;
                }
                state.subscription = action.payload.subscription;
            })
            .addCase(fetchSubscription.rejected, (state, action) => {
                if (!action.meta.arg.silent) {
                    state.isLoadingSub = false;
                    state.error = action.error.message || 'Failed to fetch subscription';
                }
            })
            // Fetch tiers
            .addCase(fetchTiers.pending, (state, action) => {
                if (!action.meta.arg.silent) {
                    state.isLoadingTiers = true;
                    state.error = null;
                }
            })
            .addCase(fetchTiers.fulfilled, (state, action) => {
                if (!action.payload.silent) {
                    state.isLoadingTiers = false;
                }
                state.tiers = action.payload.tiers;
            })
            .addCase(fetchTiers.rejected, (state, action) => {
                if (!action.meta.arg.silent) {
                    state.isLoadingTiers = false;
                    state.error = action.error.message || 'Failed to fetch tiers';
                }
            })
            // Create subscription
            .addCase(createSubscription.pending, (state) => {
                state.isLoadingSub = true;
                state.error = null;
            })
            .addCase(createSubscription.fulfilled, (state, action) => {
                state.isLoadingSub = false;
                state.subscription = action.payload;
            })
            .addCase(createSubscription.rejected, (state, action) => {
                state.isLoadingSub = false;
                state.error = action.error.message || 'Failed to create subscription';
            });
    },
});

export const { clearError } = subscriptionSlice.actions;
export default subscriptionSlice.reducer; 