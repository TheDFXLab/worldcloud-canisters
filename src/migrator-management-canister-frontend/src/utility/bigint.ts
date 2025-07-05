import { Project } from "../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";

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