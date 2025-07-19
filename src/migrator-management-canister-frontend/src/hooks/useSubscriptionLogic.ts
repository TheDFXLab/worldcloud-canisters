import { useCallback, useEffect, useState } from 'react';
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
import { useLedger } from '../context/LedgerContext/LedgerContext';
import { backend_canister_id } from '../config/config';
import MainApi from '../api/main';
import { useToaster } from '../context/ToasterContext/ToasterContext';
import { useLoaderOverlay } from '../context/LoaderOverlayContext/LoaderOverlayContext';
import { useSideBar } from '../context/SideBarContext/SideBarContext';
import { useActionBar } from '../context/ActionBarContext/ActionBarContext';

// Add typed dispatch hook
const useAppDispatch = () => useDispatch<AppDispatch>();

interface SubscriptionValidation {
    status: boolean;
    message: string;
    max: number;
    current: number;
}

export const useSubscriptionLogic = () => {
    const dispatch = useAppDispatch();
    const { identity } = useIdentity();
    const { agent } = useHttpAgent();
    const { transfer, getPendingDeposits } = useLedger();
    const { totalCredits } = useCycles();
    const { setToasterData, setShowToaster } = useToaster();
    const { summon, destroy } = useLoaderOverlay();

    // Single loading state for all subscription-related operations
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSubscriptionData = useCallback(async (silent = false) => {
        if (!identity || !agent) {
            setError("Not authenticated");
            setIsLoading(false);
            return;
        }

        if (!silent) {
            setIsLoading(true);
        }
        setError(null);

        try {
            // Load both subscription and tiers in parallel
            const [subscriptionResult, tiersResult] = await Promise.all([
                dispatch(fetchSubscription({ identity, agent, silent })).unwrap(),
                dispatch(fetchTiers({ identity, agent, silent })).unwrap()
            ]);


            return {
                subscription: subscriptionResult,
                tiers: tiersResult
            };
        } catch (err: any) {
            const errorMessage = err.message || "Failed to load subscription data";
            setError(errorMessage);

            // Only show toast for non-silent failures
            if (!silent) {
                setToasterData({
                    headerContent: "Loading Error",
                    toastStatus: false,
                    toastData: errorMessage,
                    timeout: 5000
                });
                setShowToaster(true);
            }

            throw err;
        } finally {
            if (!silent) {
                setIsLoading(false);
            }
        }
    }, [dispatch, identity, agent, setToasterData, setShowToaster]);

    // Load data on mount
    useEffect(() => {
        loadSubscriptionData();
    }, [loadSubscriptionData]);

    const {
        subscription,
        tiers,
    } = useSelector((state: RootState) => state.subscription);

    const refreshSubscription = useCallback(() => {
        if (identity && agent) {
            dispatch(fetchSubscription({ identity, agent, silent: true }));
        }
    }, [dispatch, identity, agent]);

    const getSubscription = useCallback(async () => {
        if (!identity || !agent) return 0;
        try {
            const result = await dispatch(fetchSubscription({ identity, agent, silent: true })).unwrap();
            return result;
        } catch (error) {
            console.error('Failed to get credits:', error);
            return 0;
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
        async (
            tierId: number,
            amountInIcp: number
        ) => {
            if (!identity || !agent
            ) {
                throw {
                    status: false,
                    message: 'Missing required dependencies',
                };
            }

            const mainApi = await MainApi.create(identity, agent);
            if (!mainApi) throw new Error(`MainApi is not initialized.`);
            try {
                const credits_available = await mainApi.getCreditsAvailable();
                // Not enough credits depositted to backend
                if (credits_available < amountInIcp) {
                    console.log(`============================================`)
                    console.log(`============================================`)
                    console.log(`Available Credits is less than required amount. Available: ${credits_available.toString()}, Required: ${amountInIcp}`);
                    console.log(`============================================`)
                    console.log(`============================================`)

                    // Check if there are any pending deposits
                    const pending_deposits = await getPendingDeposits();
                    if (pending_deposits < amountInIcp) {
                        // Pay full amount 
                        let amount_to_deposit = amountInIcp;

                        // Pay remaining amount only
                        if (pending_deposits < amountInIcp) {
                            amount_to_deposit = amountInIcp - pending_deposits;
                        }

                        const deposit = await transfer(amount_to_deposit, backend_canister_id);
                        if (!deposit) {
                            throw new Error(`Failed to transfer ${amountInIcp} ICP tokens to backend canister.`);
                        }
                    }

                    const available_balance = await mainApi.deposit();
                    console.log(`============================================`)
                    console.log(`============================================`)
                    console.log(`available balance after deposit:`, available_balance);
                    console.log(`============================================`)
                    console.log(`============================================`)

                }

                const response = await dispatch(
                    createSubscription({
                        identity,
                        agent,
                        tierId,
                    })
                ).unwrap();

                if (!response) {
                    throw new Error('Failed to create subscription.');
                }

                await refreshSubscription();
                return { status: true, message: "Retrieved subscription", data: response };
            } catch (error: any) {
                console.log(`============================================`)
                console.log(`============================================`)
                console.log(`Error in ():`, error.message)
                console.log(`============================================`)
                console.log(`============================================`)
                return {
                    status: false,
                    message: error.message || 'Failed to create subscription',
                    data: {}
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
        isLoading,
        error,
        loadSubscriptionData,
        subscribe,
        clearError: handleClearError,
        getSubscription,
        validateSubscription
    };
}; 