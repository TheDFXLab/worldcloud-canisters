import { Principal } from "@dfinity/principal";

// Activity Log Types
export interface SerializedActivityLog {
    id: number;
    project_id: number;
    action: string;
    details: string;
    create_time: number;
}

export interface DeserializedActivityLog {
    id: bigint;
    project_id: bigint;
    action: string;
    details: string;
    create_time: bigint;
}

// Workflow Run Details Types
export interface SerializedWorkflowRunDetails {
    workflow_run_id: number;
    repo_name: string;
    date_created: number;
    status: string;
    branch: string | null;
    commit_hash: string | null;
    error_message: string | null;
    size: number | null;
}

export interface DeserializedWorkflowRunDetails {
    workflow_run_id: bigint;
    repo_name: string;
    date_created: bigint;
    status: any;
    branch: string | null;
    commit_hash: string | null;
    error_message: string | null;
    size: bigint | null;
}

// Usage Log Types
export interface SerializedUsageLog {
    is_active: boolean;
    usage_count: number;
    last_used: number;
    rate_limit_window: number;
    max_uses_threshold: number;
    quota: {
        consumed: number;
        total: number;
    };
}

export interface DeserializedUsageLog {
    is_active: boolean;
    usage_count: bigint;
    last_used: bigint;
    rate_limit_window: bigint;
    max_uses_threshold: bigint;
    quota: {
        consumed: bigint;
        total: bigint;
    };
}

// Project Types
export interface SerializedProject {
    id: number;
    user: string;
    canister_id: string | null;
    name: string;
    description: string;
    tags: string[];
    plan: any;
    date_created: number;
    date_updated: number;
}

export interface DeserializedProject {
    id: bigint;
    user: Principal;
    canister_id: Principal | null;
    name: string;
    description: string;
    tags: string[];
    plan: any;
    date_created: bigint;
    date_updated: bigint;
}

// Canister Deployment Types
export interface SerializedCanisterDeployment {
    canister_id: string;
    status: string;
    size: number;
    date_created: number;
    date_updated: number;
}

export interface DeserializedCanisterDeployment {
    canister_id: Principal;
    status: any;
    size: bigint;
    date_created: bigint;
    date_updated: bigint;
}

// Shareable Canister Types
export interface SerializedShareableCanister {
    id: number;
    project_id: number | null;
    canister_id: string | null;
    owner: string;
    user: string;
    create_timestamp: number;
    start_timestamp: number;
    duration: number;
    start_cycles: number;
    status: string;
}

export interface DeserializedShareableCanister {
    id: bigint;
    project_id: bigint | null;
    canister_id: Principal | null;
    owner: Principal;
    user: Principal;
    create_timestamp: bigint;
    start_timestamp: bigint;
    duration: bigint;
    start_cycles: bigint;
    status: any;
}

// Pagination Types
export interface PaginationPayload {
    limit?: number;
    page?: number;
}

// Serialization Functions
export const serializeActivityLog = (activityLog: any): SerializedActivityLog => {
    return {
        id: Number(activityLog.id),
        project_id: Number(activityLog.project_id),
        action: activityLog.action,
        details: activityLog.details,
        create_time: Number(activityLog.create_time),
    };
};

export const serializeWorkflowRunDetails = (workflowRun: any): SerializedWorkflowRunDetails => {
    return {
        workflow_run_id: Number(workflowRun.workflow_run_id),
        repo_name: workflowRun.repo_name,
        date_created: Number(workflowRun.date_created),
        status: workflowRun.status,
        branch: workflowRun.branch,
        commit_hash: workflowRun.commit_hash,
        error_message: workflowRun.error_message,
        size: workflowRun.size ? Number(workflowRun.size) : null,
    };
};

export const serializeUsageLog = (usageLog: any): SerializedUsageLog => {
    return {
        is_active: usageLog.is_active,
        usage_count: Number(usageLog.usage_count),
        last_used: Number(usageLog.last_used),
        rate_limit_window: Number(usageLog.rate_limit_window),
        max_uses_threshold: Number(usageLog.max_uses_threshold),
        quota: {
            consumed: Number(usageLog.quota.consumed),
            total: Number(usageLog.quota.total),
        },
    };
};

export const serializeProject = (project: any): SerializedProject => {
    return {
        id: Number(project.id),
        user: typeof project.user === 'string' ? project.user : project.user.toString(),
        canister_id: project.canister_id ?
            (typeof project.canister_id === 'string' ? project.canister_id : project.canister_id.toString()) :
            null,
        name: project.name,
        description: project.description,
        tags: project.tags,
        plan: project.plan,
        date_created: Number(project.date_created),
        date_updated: Number(project.date_updated),
    };
};

export const serializeCanisterDeployment = (deployment: any): SerializedCanisterDeployment => {
    return {
        canister_id: typeof deployment.canister_id === 'string' ?
            deployment.canister_id : deployment.canister_id.toString(),
        status: deployment.status,
        size: Number(deployment.size),
        date_created: Number(deployment.date_created),
        date_updated: Number(deployment.date_updated),
    };
};

export const serializeShareableCanister = (canister: any): SerializedShareableCanister => {
    return {
        id: Number(canister.id),
        project_id: canister.project_id ? Number(canister.project_id) : null,
        canister_id: canister.canister_id ?
            (typeof canister.canister_id === 'string' ? canister.canister_id : canister.canister_id.toString()) :
            null,
        owner: typeof canister.owner === 'string' ? canister.owner : canister.owner.toString(),
        user: typeof canister.user === 'string' ? canister.user : canister.user.toString(),
        create_timestamp: Number(canister.create_timestamp),
        start_timestamp: Number(canister.start_timestamp),
        duration: Number(canister.duration),
        start_cycles: Number(canister.start_cycles),
        status: canister.status,
    };
};

// Serialize arrays of data
export const serializeActivityLogs = (activityLogs: any[]): SerializedActivityLog[] => {
    return activityLogs.map(serializeActivityLog);
};

export const serializeWorkflowRunDetailsArray = (workflowRuns: any[]): SerializedWorkflowRunDetails[] => {
    return workflowRuns.map(serializeWorkflowRunDetails);
};

export const serializeUsageLogs = (usageLogs: any[]): SerializedUsageLog[] => {
    return usageLogs.map(serializeUsageLog);
};

export const serializeProjects = (projects: any[]): SerializedProject[] => {
    return projects.map(serializeProject);
};

export const serializeCanisterDeployments = (deployments: any[]): SerializedCanisterDeployment[] => {
    return deployments.map(serializeCanisterDeployment);
};

export const serializeShareableCanisters = (canisters: any[]): SerializedShareableCanister[] => {
    return canisters.map(serializeShareableCanister);
};

// Serialize pairs (Principal/string, data)
export const serializeActivityLogsPair = (pair: [any, any[]]): [number, SerializedActivityLog[]] => {
    const [projectId, activityLogs] = pair;
    return [Number(projectId), serializeActivityLogs(activityLogs)];
};

export const serializeWorkflowRunDetailsPair = (pair: [any, any[]]): [number, SerializedWorkflowRunDetails[]] => {
    const [projectId, workflowRuns] = pair;
    return [Number(projectId), serializeWorkflowRunDetailsArray(workflowRuns)];
};

export const serializeUsageLogsPair = (pair: [any, any]): [string, SerializedUsageLog] => {
    const [principal, usageLog] = pair;
    const serializedPrincipal = typeof principal === 'string' ? principal : principal.toString();
    return [serializedPrincipal, serializeUsageLog(usageLog)];
};

export const serializeProjectsPair = (pair: [any, any[]]): [string, SerializedProject[]] => {
    const [principal, projects] = pair;
    const serializedPrincipal = typeof principal === 'string' ? principal : principal.toString();
    return [serializedPrincipal, serializeProjects(projects)];
};

export const serializeCanisterDeploymentsPair = (pair: [any, any]): [string, SerializedCanisterDeployment] => {
    const [principal, deployment] = pair;
    const serializedPrincipal = typeof principal === 'string' ? principal : principal.toString();
    return [serializedPrincipal, serializeCanisterDeployment(deployment)];
};

export const serializeProjectsIdPair = (pair: [any, any]): [number, SerializedProject] => {
    const [projectId, project] = pair;
    return [Number(projectId), serializeProject(project)];
};

// Helper function to serialize pagination payload
export const serializePaginationPayload = (payload: PaginationPayload): any => {
    return {
        limit: payload.limit ? [BigInt(payload.limit)] : [],
        page: payload.page ? [BigInt(payload.page)] : [],
    };
}; 