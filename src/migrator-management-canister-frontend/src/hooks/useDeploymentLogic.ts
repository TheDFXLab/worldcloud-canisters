import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../state/store';
import {
    fetchDeployments,
    fetchWorkflowHistory,
    setSelectedDeployment,
    setIsDispatched,
} from '../state/slices/deploymentSlice';
import { useIdentity } from '../context/IdentityContext/IdentityContext';
import { useHttpAgent } from '../context/HttpAgentContext/HttpAgentContext';
import { useProgress } from '../context/ProgressBarContext/ProgressBarContext';
import { Deployment } from '../components/AppLayout/interfaces';
import { Principal } from '@dfinity/principal';
import { deserializeDeployments, deserializeDeployment, serializeDeployment, DeserializedDeployment } from '../utility/principal';

const useAppDispatch = () => useDispatch<AppDispatch>();

export const useDeploymentLogic = () => {
    const dispatch = useAppDispatch();
    const { identity } = useIdentity();
    const { agent } = useHttpAgent();
    const { setIsLoadingProgress, setIsEnded } = useProgress();

    const {
        deployment: serializedDeployment,
        selectedDeployment: serializedSelectedDeployment,
        isLoading,
        error,
        isDispatched,
    } = useSelector((state: RootState) => state.deployments);

    // Deserialize deployments for use in the app
    const deployments = serializedDeployment ? [deserializeDeployment(serializedDeployment)] : [];
    const selectedDeployment = serializedSelectedDeployment ? deserializeDeployment(serializedSelectedDeployment) : null;

    // useEffect(() => {
    //     if (identity && agent && projectId !== undefined) {
    //         refreshDeployments(projectId);
    //     }
    // }, [identity, agent]);

    const refreshDeployments = useCallback(async (project_id: number) => {
        try {
            setIsLoadingProgress(true);
            setIsEnded(false);

            await dispatch(fetchDeployments({ identity, agent, project_id })).unwrap();
        } catch (error) {
            console.error('Failed to fetch deployments:', error);
        } finally {
            setIsLoadingProgress(false);
            setIsEnded(true);
        }
    }, [dispatch, identity, agent, setIsLoadingProgress, setIsEnded]);

    const getDeployment = useCallback((canisterId: string) => {
        return deployments.find(
            (deployment) => deployment.canister_id.toText() === canisterId
        );
    }, [deployments]);

    const getWorkflowRunHistory = useCallback(async (project_id: bigint) => {
        if (!identity || !agent) return;
        try {
            const result = await dispatch(
                fetchWorkflowHistory({ identity, agent, project_id })
            ).unwrap();
            return result;
        } catch (error) {
            console.error('Failed to fetch workflow history:', error);
        }
    }, [dispatch, identity, agent]);

    const handleAddDeployment = useCallback((deployment: Deployment) => {
        dispatch(setSelectedDeployment(serializeDeployment(deployment)));
    }, [dispatch]);

    // const handleUpdateDeployment = useCallback((canisterId: string, updates: Partial<Deployment>) => {
    //     dispatch(updateDeployment({ canisterId, updates }));
    // }, [dispatch]);

    const handleSetSelectedDeployment = useCallback((deployment: DeserializedDeployment | null) => {
        if (!deployment) return;
        dispatch(setSelectedDeployment(serializeDeployment(deployment)));
    }, [dispatch]);

    const handleSetIsDispatched = useCallback((value: boolean) => {
        dispatch(setIsDispatched(value));
    }, [dispatch]);

    return {
        deployments,
        selectedDeployment,
        isLoading,
        error,
        isDispatched,
        refreshDeployments,
        getDeployment,
        getWorkflowRunHistory,
        addDeployment: handleAddDeployment,
        // updateDeployment: handleUpdateDeployment,
        setSelectedDeployment: handleSetSelectedDeployment,
        setIsDispatched: handleSetIsDispatched,
    };
}; 