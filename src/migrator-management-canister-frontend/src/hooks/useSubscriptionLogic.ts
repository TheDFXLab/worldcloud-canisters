import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../state/store';
import {
    fetchSubscription,
    fetchTiers,
    createSubscription,
    clearError,
} from '../state/slices/subscriptionSlice';
import { useIdentity } from '../context/IdentityContext/IdentityContext';
import { useHttpAgent } from '../context/HttpAgentContext/HttpAgentContext';
import { useCycles } from '../context/CyclesContext/CyclesContext';

// Add typed dispatch hook
const useAppDispatch = () => useDispatch<AppDispatch>();

interface SubscriptionValidation {
    status: boolean;
    message: string;
    max: number;
    current: number;
}

export const useSubscriptionLogic = () => {
    const dispatch = useAppDispatch(); // Use typed dispatch
    const { identity } = useIdentity();
    const { agent } = useHttpAgent();
    const { totalCredits } = useCycles();

    const {
        subscription,
        tiers,
        isLoadingSub,
        isLoadingTiers,
        error,
    } = useSelector((state: RootState) => state.subscription);

    // Effect to fetch initial data
    useEffect(() => {
        if (identity && agent) {
            dispatch(fetchSubscription({ identity, agent }));
            dispatch(fetchTiers({ identity }));
        }
    }, [dispatch, identity, agent]);

    const refreshSubscription = useCallback(() => {
        if (identity && agent) {
            dispatch(fetchSubscription({ identity, agent }));
        }
    }, [dispatch, identity, agent]);

    const validateSubscription = useCallback(
        async (refreshSub: boolean): Promise<SubscriptionValidation> => {
            if (refreshSub) {
                await refreshSubscription();
            }

            if (!tiers) {
                return {
                    status: false,
                    message: 'No tiers found',
                    max: 0,
                    current: 0,
                };
            }

            if (!subscription) {
                return {
                    status: false,
                    message: 'No subscription found',
                    max: 0,
                    current: 0,
                };
            }

            const maxSlots = Number(tiers[Number(subscription?.tier_id)].slots);
            const currentSlots = subscription?.canisters.length;

            if (currentSlots >= maxSlots) {
                return {
                    status: false,
                    message: 'You have reached the maximum number of canisters for this tier',
                    max: maxSlots,
                    current: currentSlots,
                };
            }

            return {
                status: true,
                message: `Used ${currentSlots}/${maxSlots} canister slots.`,
                max: maxSlots,
                current: currentSlots,
            };
        },
        [tiers, subscription, refreshSubscription]
    );

    const subscribe = useCallback(
        async (tierId: number, amountInIcp: number) => {
            if (!identity || !agent || !totalCredits) {
                return {
                    status: false,
                    message: 'Missing required dependencies',
                };
            }

            try {
                const response = await dispatch(
                    createSubscription({
                        identity,
                        agent,
                        tierId,
                        amountInIcp,
                        totalCredits: totalCredits.total_credits,
                    })
                ).unwrap();

                await refreshSubscription();
                return response;
            } catch (error: any) {
                return {
                    status: false,
                    message: error.message || 'Failed to create subscription',
                };
            }
        },
        [dispatch, identity, agent, totalCredits, refreshSubscription]
    );

    const handleClearError = useCallback(() => {
        dispatch(clearError());
    }, [dispatch]);

    return {
        subscription,
        tiers,
        isLoadingSub,
        isLoadingTiers,
        error,
        refreshSubscription,
        validateSubscription,
        subscribe,
        clearError: handleClearError,
    };
}; 