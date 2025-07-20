import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Principal } from '@dfinity/principal';
import MainApi from '../../api/main';
import { Deployment } from '../../components/AppLayout/interfaces';
import { WorkflowRunDetails } from '../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did';
import { internetIdentityConfig } from '../../config/config';
import {
    SerializedDeployment,
    DeserializedDeployment,
    serializeDeployment,
    deserializeDeployment,
    serializeDeployments,
    deserializeDeployments,
    serializeWorkflowRunDetails
} from '../../utility/principal';

interface DeploymentState {
    deployment: SerializedDeployment | null;
    selectedDeployment: SerializedDeployment | null;
    isLoading: boolean;
    error: string | null;
    isDispatched: boolean;
}

const initialState: DeploymentState = {
    deployment: null,
    selectedDeployment: null,
    isLoading: false,
    error: null,
    isDispatched: false,
};

export const fetchDeployments = createAsyncThunk(
    'deployments/fetch',
    async ({ identity, agent, project_id }: { identity: any; agent: any, project_id: number }) => {
        if (identity.getPrincipal().toText() === internetIdentityConfig.loggedOutPrincipal) {
            throw new Error('Logged out, skipping deployment refresh');
        }

        const mainApi = await MainApi.create(identity, agent);
        const result = await mainApi?.getCanisterDeployments(project_id);
        console.log(`GOT USER DEPLPOYMENTA:`, result)
        if (!result) {
            throw new Error('No deployments found');
        }

        const processedDeployments = {
            ...result,
            size: Number(result.size),
            status: Object.keys(result.status)[0] as Deployment['status'],
            date_created: Number(result.date_created),
            date_updated: Number(result.date_updated),
        };
        // const processedDeployments = result.map((deployment) => ({
        //     ...deployment,
        //     size: Number(deployment.size),
        //     status: Object.keys(deployment.status)[0] as Deployment['status'],
        //     date_created: Number(deployment.date_created),
        //     date_updated: Number(deployment.date_updated),
        // }));

        return serializeDeployment(processedDeployments);
    }
);

export const fetchWorkflowHistory = createAsyncThunk(
    'deployments/fetchWorkflowHistory',
    async ({ identity, agent, project_id }: { identity: any; agent: any; project_id: bigint }) => {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error('Failed to create main api instance.');
        }

        const response = await mainApi.getWorkflowHistory(project_id);
        if (!response) {
            throw new Error("Unexpected error");
        }
        if ('ok' in response) {
            return serializeWorkflowRunDetails(response.ok);
        }
        else {
            if ('err' in response) {
                throw new Error(response.err);
            }
        }
    }
);

export const deploymentSlice = createSlice({
    // name: 'deployments',
    // initialState,
    // reducers: {
    //     setSelectedDeployment: (state, action) => {
    //         state.selectedDeployment = action.payload ? serializeDeployment(action.payload) : null;
    //     },
    //     addDeployment: (state, action) => {
    //         state.deployments.push(serializeDeployment(action.payload));
    //     },
    //     updateDeployment: (state, action) => {
    //         const { canisterId, updates } = action.payload;
    //         const index = state.deployments.findIndex(
    //             dep => dep.canister_id === canisterId
    //         );
    //         if (index !== -1) {
    //             state.deployments[index] = {
    //                 ...state.deployments[index],
    //                 ...serializeDeployment(updates)
    //             };
    //         }
    //     },
    //     setIsDispatched: (state, action) => {
    //         state.isDispatched = action.payload;
    //     },
    //     clearError: (state) => {
    //         state.error = null;
    //     },
    // },
    name: 'deployments',
    initialState,
    reducers: {
        setSelectedDeployment: (state, action) => {
            state.selectedDeployment = action.payload ? serializeDeployment(action.payload) : null;
        },
        setIsDispatched: (state, action) => {
            state.isDispatched = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDeployments.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchDeployments.fulfilled, (state, action) => {
                state.isLoading = false;
                state.deployment = action.payload;
                console.log(`action payload:`, action.payload)

                state.selectedDeployment = action.payload;
                console.log(`action payload:`, action.payload)
            })
            .addCase(fetchDeployments.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch deployments';
            });
    },
});

export const {
    setSelectedDeployment,
    // addDeployment,
    // updateDeployment,
    setIsDispatched,
    clearError,
} = deploymentSlice.actions;

export default deploymentSlice.reducer; 