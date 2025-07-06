import { Project, UsageLog } from "../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";

export interface SerializedProject {
    id: string;
    canister_id: string | null;
    name: string;
    description: string;
    tags: string[];
    plan: Project["plan"];
    date_created: number;
    date_updated: number;
}

export interface DeserializedProject {
    id: bigint;
    canister_id: string | null;
    name: string;
    description: string;
    tags: string[];
    plan: Project["plan"];
    date_created: number;
    date_updated: number;
}

export interface SerializedUsageLog {
    is_active: boolean;
    usage_count: string; // amount of times the canister was occupied by the user since last used. Resets to 0 when (now - last_used > rate_limit_window)
    last_used: string; //last time the canister was occupied by the user
    rate_limit_window: string; //duration of a theoretical session. used to deny occupying a shared canister when (usage_count > max_uses_threshold)
    max_uses_threshold: string; // max
}

export interface DeserializedUsageLog {
    is_active: boolean;
    usage_count: number;
    last_used: number;
    rate_limit_window: number;
    max_uses_threshold: number;
}

export const serializedUsageLog = (usageLog: UsageLog): SerializedUsageLog => ({
    ...usageLog,
    usage_count: usageLog.usage_count.toString(),
    last_used: usageLog.last_used.toString(),
    rate_limit_window: usageLog.rate_limit_window.toString(),
    max_uses_threshold: usageLog.max_uses_threshold.toString()
})

export const deserializeUsageLog = (usageLog: SerializedUsageLog): DeserializedUsageLog => ({
    ...usageLog,
    usage_count: Number(usageLog.usage_count),
    last_used: Number(usageLog.last_used),
    rate_limit_window: Number(usageLog.rate_limit_window),
    max_uses_threshold: Number(usageLog.max_uses_threshold)
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

export const bigIntToNumber = (value: bigint | number | undefined): number | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value;
    return Number(value);
};

export const bigIntToDate = (nanoseconds: bigint | number | undefined): number | undefined => {
    if (nanoseconds === undefined) return undefined;
    const value = bigIntToNumber(nanoseconds);
    if (value === undefined) return undefined;
    return value / 1_000_000; // Convert nanoseconds to milliseconds
};

export const dateToNano = (date: Date): bigint => {
    return BigInt(date.getTime() * 1_000_000);
};
