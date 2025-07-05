import { Principal } from '@dfinity/principal';

export interface SerializedDeployment {
    canister_id: string;
    status: string;
    date_created: number;
    date_updated: number;
    size: number;
}

export interface DeserializedDeployment {
    canister_id: Principal;
    status: string;
    date_created: number;
    date_updated: number;
    size: number;
}

export const serializeDeployment = (deployment: DeserializedDeployment): SerializedDeployment => ({
    ...deployment,
    canister_id: deployment.canister_id.toText(),
});

export const deserializeDeployment = (deployment: SerializedDeployment): DeserializedDeployment => ({
    ...deployment,
    canister_id: Principal.fromText(deployment.canister_id),
});

export const serializeDeployments = (deployments: DeserializedDeployment[]): SerializedDeployment[] =>
    deployments.map(serializeDeployment);

export const deserializeDeployments = (deployments: SerializedDeployment[]): DeserializedDeployment[] =>
    deployments.map(deserializeDeployment); 