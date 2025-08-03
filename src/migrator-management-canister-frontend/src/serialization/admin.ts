import { Principal } from "@dfinity/principal";
import { ProjectPlan, Role, UsageLog, UsageLogExtended } from "../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { SerializedUsageLogExtended } from "../utility/bigint";

// Activity Log Types
export interface SerializedActivityLog {
    id: number;
    category: string;
    description: string;
    create_time: number;
}

export interface DeserializedActivityLog {
    id: bigint;
    category: string;
    description: string;
    create_time: bigint;
}
export type SerializedCanisterDeploymentStatus = "installed" | "installing" | "uninitialized" | "failed";

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

export type SerializedProjectPlan = "freemium" | "paid";

// Project Types
export interface SerializedProject {
    id: number;
    user: string;
    canister_id: string | null;
    name: string;
    description: string;
    tags: string[];
    plan: SerializedProjectPlan;
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
    plan: ProjectPlan;
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

export type SerializedRole = "super_admin" | "admin";

// Pagination Types
export interface PaginationPayload {
    limit?: number;
    page?: number;
}

export interface DeserializedPaginationPayload {
    limit: [bigint];
    page: [bigint];
}

// Serialization Functions
export const serializeActivityLog = (activityLog: any): SerializedActivityLog => {
    return {
        id: Number(activityLog.id),
        category: activityLog.category,
        description: activityLog.description,
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

export const serializeUsageLog = (usageLog: UsageLogExtended): SerializedUsageLogExtended => {
    return {
        usage_log: {
            is_active: usageLog.usage_log.is_active,
            usage_count: usageLog.usage_log.usage_count.toString(),
            last_used: usageLog.usage_log.last_used.toString(),
            rate_limit_window: usageLog.usage_log.rate_limit_window.toString(),
            max_uses_threshold: usageLog.usage_log.max_uses_threshold.toString(),
            quota: {
                consumed: Number(usageLog.usage_log.quota.consumed),
                total: Number(usageLog.usage_log.quota.total),
            },
        },
        reset_time_unix: Number(usageLog.reset_time_unix)
    };
}
export const serializeUsageLogAdmin = (usageLog: UsageLog): SerializedUsageLogExtended => {
    return {
        usage_log: {
            is_active: usageLog.is_active,
            usage_count: usageLog.usage_count.toString(),
            last_used: usageLog.last_used.toString(),
            rate_limit_window: usageLog.rate_limit_window.toString(),
            max_uses_threshold: usageLog.max_uses_threshold.toString(),
            quota: {
                consumed: Number(usageLog.quota.consumed),
                total: Number(usageLog.quota.total),
            },
        },
        reset_time_unix: Number(0)
    };
};
const serializeProjectPlan = (plan: ProjectPlan): SerializedProjectPlan => {
    if ("freemium" in plan) return "freemium";
    if ("paid" in plan) return "paid";
    return "freemium";
}
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
        plan: serializeProjectPlan(project.plan),
        date_created: Number(project.date_created),
        date_updated: Number(project.date_updated),
    };
};
export const serializeCanisterDeploymentStatus = (status: any): SerializedCanisterDeploymentStatus => {
    if ("uninitialized" in status) return "uninitialized";
    if ("installed" in status) return "installed";
    if ("installing" in status) return "installing";
    if ("failed" in status) return "failed";
    return "failed";
}

export const serializeCanisterDeployment = (deployment: any): SerializedCanisterDeployment => {
    return {
        canister_id: typeof deployment.canister_id === 'string' ?
            deployment.canister_id : deployment.canister_id.toString(),
        status: serializeCanisterDeploymentStatus(deployment.status),
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

export const serializeUsageLogs = (usageLogs: any[]): SerializedUsageLogExtended[] => {
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
export const serializeUsageLogsPairAdmin = (pair: [any, any]): [string, SerializedUsageLogExtended] => {
    const [principal, usageLog] = pair;
    const serializedPrincipal = typeof principal === 'string' ? principal : principal.toString();
    return [serializedPrincipal, serializeUsageLogAdmin(usageLog)];
};
export const serializeUsageLogsPair = (pair: [any, any]): [string, SerializedUsageLogExtended] => {
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

export const deserializePaginationPayload = (payload: DeserializedPaginationPayload): any => {
    return {
        limit: payload.limit && payload?.limit.length > 0 ? Number(payload.limit) : 20,
        page: payload.page && payload?.page.length > 0 ? Number(payload.page) : 0,
    };
};

export const serializeAdminRolePairs = (pair: [Principal, Role]): [string, SerializedRole] => {
    const [principal, deployment] = pair;
    const serializedPrincipal = typeof principal === 'string' ? principal : principal.toString();
    return [serializedPrincipal, serializeAdminRole(deployment)];
};
export const serializeAdminRole = (role: Role): SerializedRole => {
    if ("super_admin" in role) return "super_admin";
    if ("admin" in role) return "admin";
    return "admin";
}

// Book Entries Types
export interface SerializedBookEntry {
    principal: string;
    balances: { [token: string]: number };
}

export interface DeserializedBookEntry {
    principal: Principal;
    balances: [Principal, bigint][];
}

export const serializeBookEntry = (entry: [Principal, [Principal, bigint][]]): SerializedBookEntry => {
    const [principal, balances] = entry;
    const serializedBalances: { [token: string]: number } = {};

    // Convert array of [token, amount] pairs to object
    balances.forEach(([token, amount]) => {
        serializedBalances[token.toString()] = Number(amount);
    });

    return {
        principal: principal.toString(),
        balances: serializedBalances
    };
};

export const serializeBookEntries = (entries: [Principal, [Principal, bigint][]][]): SerializedBookEntry[] => {
    return entries.map(entry => serializeBookEntry(entry));
};