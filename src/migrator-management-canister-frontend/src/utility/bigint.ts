import { Principal } from "@dfinity/principal";
import { CanisterDeployment, Project, UsageLogExtended } from "../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { CanisterDeploymentStatus } from "./principal";
import { canister_settings, canister_status_result } from "@dfinity/agent/lib/cjs/canisters/management_service";
import { SerializedProjectPlan } from "../serialization/admin";
export interface SerializedCanisterStatus {
    status: string;
    cycles: number;
    settings: {
        freezing_threshold?: number;
        controllers?: string[];
        memory_allocation?: number;
        compute_allocation?: number;
    };
}

export interface DeserializedCanisterStatus {
    status: canister_status_result;
    cycles: bigint;
    settings: canister_settings;
}
// export type CanisterDeploymentStatus = "uninitialized" | "installing" | "installed" | "failed";
export interface SerializedCanisterDeployment {
    canister_id: string;
    status: CanisterDeploymentStatus;
    size: number;
    date_created: number;
    date_updated: number;
}

export interface SerializedProject {
    id: string;
    canister_id: string | null;
    name: string;
    description: string;
    tags: string[];
    // plan: Project["plan"];
    plan: SerializedProjectPlan;
    url: string | null;
    date_created: number;
    date_updated: number;
}

export interface DeserializedProject {
    id: bigint;
    canister_id: string | null;
    name: string;
    description: string;
    tags: string[];
    plan: SerializedProjectPlan;
    url: string | null;
    date_created: number;
    date_updated: number;
}
export interface SerializedUsageLogExtended {
    usage_log: SerializedUsageLog;
    reset_time_unix: number;
}

export interface SerializedUsageLog {
    is_active: boolean;
    usage_count: string; // amount of times the canister was occupied by the user since last used. Resets to 0 when (now - last_used > rate_limit_window)
    last_used: string; //last time the canister was occupied by the user
    rate_limit_window: string; //duration of a theoretical session. used to deny occupying a shared canister when (usage_count > max_uses_threshold)
    max_uses_threshold: string; // max
    quota: SerializedQuota;
}

interface SerializedQuota {
    consumed: number;
    total: number;
}

export interface DeserializedUsageLog {
    is_active: boolean;
    usage_count: number;
    last_used: number;
    rate_limit_window: number;
    max_uses_threshold: number;
    quota: DeserializedQuota;
}

interface DeserializedQuota {
    consumed: number;
    total: number;
}

export interface DeserializedActivityLog {
    id: number;
    category: string;
    description: string;
    create_time: number;
}

export interface SerializedActivityLog {
    id: bigint;
    category: string;
    description: string;
    create_time: bigint;
}


export const serializedUsageLog = (usageLog: UsageLogExtended): SerializedUsageLogExtended => ({
    usage_log: {
        is_active: usageLog.usage_log.is_active,
        usage_count: usageLog.usage_log.usage_count.toString(),
        last_used: usageLog.usage_log.last_used.toString(),
        rate_limit_window: usageLog.usage_log.rate_limit_window.toString(),
        max_uses_threshold: usageLog.usage_log.max_uses_threshold.toString(),
        quota: {
            consumed: Number(usageLog.usage_log.quota.consumed),
            total: Number(usageLog.usage_log.quota.total),
        }
    },
    reset_time_unix: Number(usageLog.reset_time_unix)

})
// export const serializedUsageLog= (usageLog: UsageLog): SerializedUsageLog => ({

//         ...usageLog,
//         usage_count: usageLog.usage_count.toString(),
//         last_used: usageLog.last_used.toString(),
//         rate_limit_window: usageLog.rate_limit_window.toString(),
//         max_uses_threshold: usageLog.max_uses_threshold.toString(),

// })

// export const deserializeUsageLog = (usageLog: SerializedUsageLog): DeserializedUsageLog => ({
//     ...usageLog,
//     usage_count: Number(usageLog.usage_count),
//     last_used: Number(usageLog.last_used),
//     rate_limit_window: Number(usageLog.rate_limit_window),
//     max_uses_threshold: Number(usageLog.max_uses_threshold),
//     quota: {
//         consumed: Number(usageLog.quota.consumed),
//         total: Number(usageLog.quota.total),
//     },

// })


export const deserializeUsageLog = (usageLog: SerializedUsageLogExtended): UsageLogExtended => ({
    usage_log: {
        is_active: usageLog.usage_log.is_active,
        usage_count: BigInt(usageLog.usage_log.usage_count),
        last_used: BigInt(usageLog.usage_log.last_used),
        rate_limit_window: BigInt(usageLog.usage_log.rate_limit_window),
        max_uses_threshold: BigInt(usageLog.usage_log.max_uses_threshold),
        quota: {
            consumed: BigInt(usageLog.usage_log.quota.consumed),
            total: BigInt(usageLog.usage_log.quota.total),
        },
    },
    reset_time_unix: BigInt(usageLog.reset_time_unix)

})

export const serializeProject = (project: DeserializedProject): SerializedProject => ({
    ...project,
    id: project.id.toString(),
});

export const deserializeProject = (project: SerializedProject): DeserializedProject => ({
    ...project,
    id: BigInt(project.id),
});

export const serializeProjects = (projects: DeserializedProject[]): SerializedProject[] =>
    projects.map(serializeProject);

export const deserializeProjects = (projects: SerializedProject[]): DeserializedProject[] =>
    projects.map(deserializeProject);

export const serializeActivityLog = (log: DeserializedActivityLog): SerializedActivityLog => ({
    id: BigInt(log.id),
    category: log.category,
    description: log.description,
    create_time: BigInt(log.create_time)
});

export const deserializeActivityLog = (log: SerializedActivityLog): DeserializedActivityLog => ({
    id: Number(log.id),
    category: log.category,
    description: log.description,
    create_time: Number(log.create_time)
});

export const serializeActivityLogs = (logs: DeserializedActivityLog[]): SerializedActivityLog[] =>
    logs.map(serializeActivityLog);

export const deserializeActivityLogs = (logs: SerializedActivityLog[]): DeserializedActivityLog[] =>
    logs.map(deserializeActivityLog);

// export const deserializeCanisterStatus = (status: SerializedCanisterStatus): DeserializedCanisterStatus => ({
//     status: status.status === "running" ? { running: null } : status.status === 'stopped' ? { stopped: null } : { stopping: null },
//     cycles: BigInt(status.cycles),
//     settings: {
//         freezing_threshold: status.settings.freezing_threshold ? [BigInt(status.settings.freezing_threshold)] : [],
//         controllers: status.settings.controllers ? status.settings.controllers : [],
//         memory_allocation: status.settings.memory_allocation ? [BigInt(status.settings.memory_allocation)] : [BigInt(0)],
//         compute_allocation: status.settings.compute_allocation ? [BigInt(status.settings.compute_allocation)] : [BigInt(0)],
//     }
// })

export const serializeCanisterStatus = (status: canister_status_result): SerializedCanisterStatus => ({
    status: "running" in status.status ? "running" : "stopping" in status.status ? "stopping" : "stopped",
    cycles: Number(status.cycles),
    settings: {
        freezing_threshold: Number(status.settings.freezing_threshold),
        controllers: status.settings.controllers.map(c => c.toString()),
        memory_allocation: Number(status.settings.memory_allocation),
        compute_allocation: Number(status.settings.compute_allocation),
        // ...{ freezing_threshold: status.settings.freezing_threshold.length > 0 ? Number(status.settings.freezing_threshold[0]) : undefined, },
        // ...{ controllers: status.settings.controllers.length > 0 ? status.settings.controllers.map(c => c.toString()) : undefined, },
        // ...{ memory_allocation: status.settings.memory_allocation.length > 0 ? Number(status.settings.memory_allocation) : undefined },
        // ...{ compute_allocation: status.settings.compute_allocation.length > 0 ? Number(status.settings.compute_allocation) : undefined }
    }
})
export const serializeCanisterDeployment = (canister_deployment: CanisterDeployment): SerializedCanisterDeployment => ({
    canister_id: canister_deployment.canister_id.toString(),
    status: "uninitialized" in canister_deployment.status ? "uninitialized" : "installing" in canister_deployment.status ? "installing" : "installed" in canister_deployment ? "installed" : "failed",
    size: Number(canister_deployment.size),
    date_created: Number(canister_deployment.date_created),
    date_updated: Number(canister_deployment.date_updated)
})


export const bigIntToNumber = (value: bigint | number | undefined): number | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value;
    return Number(value);
};
type TimestampUnit = "seconds" | "milliseconds" | "microseconds" | "nanoseconds"
export const bigIntToDate = (origin_timestamp: bigint | number | undefined, source_unit: TimestampUnit = "nanoseconds"): number | undefined => {
    if (origin_timestamp === undefined) return undefined;

    const value = bigIntToNumber(origin_timestamp);
    if (value === undefined) return undefined;
    let divisor = 1_000_000;
    switch (source_unit) {
        case "seconds":
            divisor = 1 / 1_000;
            break;
        case "milliseconds":
            divisor = 1;
            break;
        case "microseconds":
            divisor = 1_000;
            break;
        case "nanoseconds":
            divisor = 1_000_000;
            break;
        default:
            break;
    }
    const date_timestamp = Math.floor(value / divisor);// Convert nanoseconds to milliseconds by dividing by 1M
    return date_timestamp;
};

export const dateToNano = (date: Date): bigint => {
    return BigInt(date.getTime() * 1_000_000);
};
