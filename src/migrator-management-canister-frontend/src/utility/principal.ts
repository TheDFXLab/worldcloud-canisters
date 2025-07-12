import { Principal } from '@dfinity/principal';
import { WorkflowRunDetails } from '../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did';

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
export interface SerializedWorkflowRunDetail {
    workflow_run_id: number;
    repo_name: string;
    date_created: number;
    status: SerializedWorkflowRunStatus;
    branch: string;
    commit_hash: string;
    error_message: string;
    size: number;
}
export type CanisterDeploymentStatus = "uninitialized" | "installing" | "installed" | "failed";

export const serializeDeployment = (deployment: DeserializedDeployment): SerializedDeployment => ({
    ...deployment,
    canister_id: deployment.canister_id.toString(),
});

export const deserializeDeployment = (deployment: SerializedDeployment): DeserializedDeployment => ({
    ...deployment,
    canister_id: Principal.fromText(deployment.canister_id),
});

export const serializeDeployments = (deployments: DeserializedDeployment[]): SerializedDeployment[] =>
    deployments.map(serializeDeployment);

export const deserializeDeployments = (deployments: SerializedDeployment[]): DeserializedDeployment[] =>
    deployments.map(deserializeDeployment);

export type SerializedWorkflowRunStatus = "pending" | "completed" | "failed";
export const serializeWorkflowRun = (workflow_run: WorkflowRunDetails) => ({
    workflow_run_id: Number(workflow_run.workflow_run_id),
    repo_name: workflow_run.repo_name,
    date_created: Number(workflow_run.date_created),
    status: "pending" in workflow_run.status ? "pending" : "completed" in workflow_run.status ? "completed" : "failed",
    branch: workflow_run.branch.length > 0 ? workflow_run.branch[0] : "",
    commit_hash: workflow_run.commit_hash.length > 0 ? workflow_run.commit_hash[0] : "",
    error_message: workflow_run.error_message.length > 0 ? workflow_run.error_message[0] : "",
    size: workflow_run.size.length > 0 ? Number(workflow_run.size[0]) : 0
})
export const serializeWorkflowRunDetails = (workflow_run_details: WorkflowRunDetails[]) =>
    workflow_run_details.map((run) => serializeWorkflowRun(run));