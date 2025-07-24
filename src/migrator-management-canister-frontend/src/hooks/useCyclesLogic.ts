import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../state/store';
import {
    fetchCreditsAvailable,
    estimateCycles,
    fetchCanisterStatus,
    setCurrentCanisterId,
    addCycles,
} from '../state/slices/cyclesSlice';
import { useIdentity } from '../context/IdentityContext/IdentityContext';
import { useHttpAgent } from '../context/HttpAgentContext/HttpAgentContext';
import { useLedger } from '../context/LedgerContext/LedgerContext';
import { fromE8sStable } from '../utility/e8s';
import { Principal } from '@dfinity/principal';

const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

const useAppDispatch = () => useDispatch<AppDispatch>();

export const useCyclesLogic = () => {
    const dispatch = useAppDispatch();
    const { identity } = useIdentity();
    const { agent } = useHttpAgent();
    const { balance, depositIfNotEnoughCredits } = useLedger();

    const {
        cyclesAvailable,
        totalCredits,
        maxCyclesExchangeable,
        currentCanisterId,
        canisterStatus,
        cyclesStatus,
        cyclesRate,
        isLoading,
        lastFetchTimestamp,
    } = useSelector((state: RootState) => state.cycles);

    // Effect to fetch initial data and handle periodic updates
    useEffect(() => {
        if (identity && agent && balance) {
            const fetchData = () => {
                const now = Date.now();
                if (!lastFetchTimestamp || now - lastFetchTimestamp >= CACHE_TIME) {
                    dispatch(fetchCreditsAvailable({ identity, agent, balance }));
                }
            };

            fetchData();
            const interval = setInterval(fetchData, CACHE_TIME);
            return () => clearInterval(interval);
        }
    }, [dispatch, identity, agent, balance, lastFetchTimestamp]);

    // Effect to handle maximum cycles calculation
    useEffect(() => {
        if (identity && agent && balance) {
            dispatch(estimateCycles({
                identity,
                agent,
                amountInIcp: fromE8sStable(balance)
            }));
        }
    }, [dispatch, identity, agent, balance]);

    const fetchCredits = useCallback(async () => {
        if (!identity || !agent || !(typeof balance !== 'bigint' && balance)) return 0;
        try {
            const result = await dispatch(

                fetchCreditsAvailable({ identity, agent, balance })
            ).unwrap();
            return result;
        } catch (error) {
            console.error('Failed to get credits:', error);
            return 0;
        }
    }, [dispatch, identity, agent]);

    const handleEstimateCycles = useCallback(async (amountInIcp: number) => {
        if (!identity || !agent) return 0;
        try {
            const result = await dispatch(
                estimateCycles({ identity, agent, amountInIcp })
            ).unwrap();
            return result;
        } catch (error) {
            console.error('Failed to estimate cycles:', error);
            return 0;
        }
    }, [dispatch, identity, agent]);

    const handleGetStatus = useCallback(async (project_id: number) => {
        if (!identity || !agent) return;
        try {
            const result = await dispatch(
                fetchCanisterStatus({ identity, agent, project_id: BigInt(project_id) })
            ).unwrap();
            console.log(`GETTING STATSS:`, result)
            return result;
        } catch (error) {
            console.error('Failed to fetch canister status:', error);
            throw error;
        }
    }, [dispatch, identity, agent]);

    const handleSetCurrentCanisterId = useCallback((canisterId: Principal) => {
        dispatch(setCurrentCanisterId(canisterId.toText()));
    }, [dispatch]);

    const handleAddCycles = useCallback(async (project_id: number, amount_in_icp: number) => {
        if (identity && agent) {
            await depositIfNotEnoughCredits(amount_in_icp, agent);
            await dispatch(addCycles({
                identity,
                agent,
                project_id,
                amount_in_icp
            }))
            await dispatch(fetchCanisterStatus({
                identity,
                agent,
                project_id: BigInt(project_id)
            }))
        }
    }, [dispatch, identity, agent])

    return {
        cyclesAvailable,
        totalCredits,
        maxCyclesExchangeable,
        currentCanisterId: currentCanisterId ? Principal.fromText(currentCanisterId) : null,
        canisterStatus,
        cyclesStatus,
        cyclesRate,
        isLoadingCycles: isLoading.cycles,
        isLoadingStatus: isLoading.status,
        isLoadingCredits: isLoading.credits,
        isLoadingEstimateCycles: isLoading.estimateCycles,
        fetchCredits: fetchCredits,
        estimateCycles: handleEstimateCycles,
        getStatus: handleGetStatus,
        setCurrentCanisterId: handleSetCurrentCanisterId,
        handleAddCycles
    };
}; 