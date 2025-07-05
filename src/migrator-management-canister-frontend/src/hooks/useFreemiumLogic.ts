import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFreemiumUsage } from '../state/slices/freemiumSlice';
import { RootState, AppDispatch } from '../state/store';
import { useIdentity } from '../context/IdentityContext/IdentityContext';
import { useHttpAgent } from '../context/HttpAgentContext/HttpAgentContext';

// Add type for dispatch
const useAppDispatch = () => useDispatch<AppDispatch>();

export const useFreemiumLogic = () => {
    const dispatch = useAppDispatch();
    const { identity } = useIdentity();
    const { agent } = useHttpAgent();

    const {
        usageData,
        hasActiveSlot,
        isLoading,
        error,
        lastFetchTimestamp,
    } = useSelector((state: RootState) => state.freemium);

    // Function to fetch freemium usage data
    const fetchUsage = useCallback(async (silent: boolean = false) => {
        if (!identity || !agent) return;

        try {
            await dispatch(fetchFreemiumUsage({ identity, agent, silent })).unwrap();
        } catch (err) {
            console.error('Failed to fetch freemium usage:', err);
        }
    }, [dispatch, identity, agent]);

    // Initial fetch on mount
    useEffect(() => {
        if (identity && agent && !lastFetchTimestamp) {
            fetchUsage();
        }
    }, [identity, agent, lastFetchTimestamp, fetchUsage]);

    // Utility function to check if the slot is expired
    const isSlotExpired = useCallback(() => {
        if (!usageData) return false;

        const now = Date.now();
        const endTime = usageData.start_timestamp + usageData.duration;
        return now > endTime;
    }, [usageData]);

    // Get remaining time in milliseconds
    const getRemainingTime = useCallback(() => {
        if (!usageData) return 0;

        const now = Date.now();
        const endTime = usageData.start_timestamp + usageData.duration;
        return Math.max(0, endTime - now);
    }, [usageData]);

    return {
        usageData,
        hasActiveSlot,
        isLoading,
        error,
        isSlotExpired: isSlotExpired(),
        remainingTime: getRemainingTime(),
        fetchUsage,
    };
}; 