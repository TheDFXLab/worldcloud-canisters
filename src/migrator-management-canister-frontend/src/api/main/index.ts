import { Principal } from "@dfinity/principal";
import { createActor } from "../../../../declarations/migrator-management-canister-backend";
import { ActorSubclass, HttpAgent, Identity } from "@dfinity/agent";
import { _SERVICE, ActivityLog, GetProjectsByUserPayload, Project, ProjectPlan, Response, Result, StoreAssetInCanisterPayload, WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { backend_canister_id, http_host, internetIdentityConfig } from "../../config/config";
import { StaticFile } from "../../utility/compression";
import { DeserializedProject, DeserializedUsageLog, SerializedUsageLog, serializedUsageLog } from "../../utility/bigint";
// import { CanisterStatus } from "../authority";

interface CreateProjectPayload {
    project_name: string;
    project_description: string;
    tags: string[];
    plan: ProjectPlan;
}

export type PlanType = "freemium" | "paid";

class MainApi {
    private static instance: MainApi | null = null;
    private static currentIdentity: Identity | null = null;

    canisterId: string;
    actor: ActorSubclass<_SERVICE> | null;
    idenitified: boolean;
    identity: Identity | null;
    agent: HttpAgent | null;
    private constructor(identity: Identity | null, actor: ActorSubclass<_SERVICE> | null, isIdentified: boolean, agent: HttpAgent) {
        this.canisterId = backend_canister_id;
        this.actor = actor;
        this.identity = identity;
        this.idenitified = isIdentified;
        this.agent = agent;
    }

    static async create(identity: Identity | null, agent: HttpAgent) {
        try {
            // Clear instance if identity has changed
            if (this.currentIdentity !== identity) {
                this.instance = null;
                this.currentIdentity = identity;
            }

            // Return existing instance if already created
            if (this.instance) return this.instance;

            const actor = createActor(backend_canister_id, {
                agent: agent
            });
            let isIdentified = false;

            if (identity && identity.getPrincipal().toText() !== internetIdentityConfig.loggedOutPrincipal) {
                isIdentified = true;
            }
            else {
                isIdentified = false;
            }

            // Create new instance
            const mainApi = new MainApi(identity, actor, isIdentified, agent);
            this.instance = mainApi;

            return mainApi;
        } catch (error) {
            console.error(`Error creating actor:`, error);
            return null;
        }
    }

    async get_all_subscriptions() {
        // const subscriptions = await this.actor?.get_all_subscriptions();
        // return subscriptions;
    }

    // Get identity's derived public key
    async getPublicKey() {
        const publicKeyResult = await this.actor?.public_key();
        if (!publicKeyResult) {
            throw new Error(`Failed to get public key: ${publicKeyResult}`);
        }
        if ('Err' in publicKeyResult) {
            throw new Error(`Failed to get public key: ${publicKeyResult.Err}`);
        }
        const publicKey = publicKeyResult.Ok.public_key_hex;
        return publicKey;
    }

    // Sign message with identity's derived public key
    async signMessage(message: string) {
        const signResult = await this.actor?.sign(message);
        if (!signResult) {
            throw new Error(`Failed to sign message: ${signResult}`);
        }
        if ('Err' in signResult) {
            throw new Error(`Failed to sign message: ${signResult.Err}`);
        }
        const signature = signResult.Ok.signature_hex;
        return signature;
    }

    /**
     * Get the deposit address for a user from the ICP ledger canister.
     * @param identifiedActor - The identified ICP ledger actor.
     * @returns The deposit address for the user.
     */
    async getUserDepositAddress() {
        try {
            if (!this.identity) {
                throw new Error("Identity not initialized 2.");
            }
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const depositAddr = await this.actor.get_deposit_account_id(Principal.fromText(backend_canister_id), this.identity.getPrincipal());
            return depositAddr;

        } catch (error) {
            console.log(`Error getting deposit address:`, error)
            return null;
        }
    }

    async getPendingDeposits() {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }
            const pendingDeposits = await this.actor.getMyPendingDeposits();
            return pendingDeposits;
        } catch (error) {
            console.log(`Error getting pending deposits:`, error)
            // return null;
            throw error;
        }
    }

    async getCreditsAvailable() {
        try {
            const credits = await this.actor?.getMyCredits();
            if (credits === null || credits === undefined) { throw new Error(`Failed to get credits available for user.`) }
            return credits;
        } catch (error) {
            // return null;
            throw error;
        }
    }

    async getCanisterDeployments(project_id: number) {
        try {
            console.log("Getting canister deployments", this.agent);

            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }
            console.log("Getting canister deployments", this.agent);
            const response = await this.actor.getCanisterDeployments(BigInt(project_id));
            if ("ok" in response) {
                return response.ok[0];
            }
            else {
                throw this.handleResponseError(response.err);
            }
        } catch (error) {
            console.log(`Error getting canister deployments:`, error)
            throw error;
        }
    }

    async getWorkflowHistory(project_id: bigint) {
        const runsHistory = await this.actor?.getWorkflowRunHistory(
            project_id
        );
        return runsHistory;
    }

    async getCanisterStatus(project_id: bigint) {
        const result = await this.actor?.getCanisterStatus(project_id);
        if (!result) {
            throw new Error("Failed to get canister status");
        }

        // if ('ok' in result) {
        //     return {
        //         status: 'running' in result.ok.status ? "running" : 'stopped' in result.ok.status ? 'stopped' : 'stopping',
        //         cycles: result.ok.cycles,
        //         controllers: []
        //     } as CanisterStatus;
        // }
        if ('ok' in result) {
            return {
                // status: 'running' in result.ok.status ? "running" : 'stopped' in result.ok.status ? 'stopped' : 'stopping',
                status: result.ok.status,
                cycles: result.ok.cycles,
                settings: result.ok.settings
            };
        }
        else {
            if ('err' in result) {
                throw new Error(result.err as string);
            }
            else {
                throw new Error("Unexpected error occured.");
            }
        }

    }

    private handleResult(result: Result) {
        if ("ok" in result) {
            return result.ok;
        }
        else if ("err" in result) {
            throw { status: false, message: result.err };
        }
    }

    private handleResponseError(error: string) {
        return { status: false, message: error }
    }


    async uploadWasm(wasmBytes: number[]) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const result = await this.actor.uploadAssetCanisterWasm(
                wasmBytes
            );

            if ('ok' in result) {
                return result.ok;
            }
            else {
                throw result.err;
            }
        } catch (error) {
            console.log(`Error uploading WASM:`, error)
            throw error;
        }
    }

    async deployAssetCanister(project_id: bigint) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const result = await this.actor.deployAssetCanister(project_id);
            if ('ok' in result) {
                return result.ok;
            }
            else {
                throw this.handleResult(result);
            }
        } catch (error) {
            console.log(`Error deploying asset canister:`, error)
            throw error;
        }
    }

    async storeInAssetCanister(project_id: bigint, files: StaticFile[], current_batch: number, total_batch_count: number, workflowRunDetails?: WorkflowRunDetails) {
        try {
            return await this.uploadAssetsToProject(project_id, files, current_batch, total_batch_count, workflowRunDetails);
        } catch (error: any) {
            console.log(`Error storing in asset canister:`, error)
            throw error;
        }
    }


    // Updates the user balance in backend book after deposit to special address by user
    async deposit() {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const depositResult = await this.actor.depositIcp();

            if ("ok" in depositResult) {
                return depositResult.ok;
            }
            else {
                throw this.handleResponseError(depositResult.err);
            }
        } catch (error) {
            console.log(`Error depositing ICP:`, error)
            throw error;
        }
    }

    // Request a freemium session for deployment
    async requestFreemiumSession(project_id: bigint) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }

            const result = await this.actor.deployAssetCanister(project_id);
            if ('ok' in result) {
                return result.ok;
            }
            else {
                throw this.handleResponseError(result.err);
            }
        } catch (error) {
            console.log(`Error requesting freemium session:`, error)
            throw error;
        }
    }


    // Request a freemium session for deployment
    async getUserFreemiumUsage() {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }

            const result = await this.actor.get_user_slot();
            if (!result) {
                throw new Error("Failed to request freemium session");
            }

            if ("ok" in result) {
                const slot = result.ok.length > 0 ? result.ok[0] : null;
                console.log(`((((SLOT)))) slot,`, slot)

                // If no slot exists, return null (this is a valid state)
                if (!slot) {
                    return null;
                }

                // Return the slot data in a consistent format
                return {
                    project_id: slot.project_id.length > 0 ? slot.project_id[0] : null,
                    canister_id: slot.canister_id.length > 0 ? slot.canister_id[0] : null,
                    owner: slot.owner,
                    user: slot.user,
                    start_timestamp: slot.start_timestamp,
                    create_timestamp: slot.create_timestamp,
                    duration: slot.duration,
                    start_cycles: slot.start_cycles,
                    status: slot.status
                };
            }
            else {
                throw this.handleResponseError(result.err);
            }
        } catch (error) {
            console.log(`Error requesting freemium session:`, error);
            throw error;
        }
    }

    // Creates a project and deploys a canister
    async createProject(
        project_name: string,
        description: string = "A standard asset canister for serving static site over HTTP.",
        tags: string[],
        plan: PlanType
    ): Promise<DeserializedProject | null> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }

            const projectPlan: ProjectPlan = plan === "freemium" ? { freemium: null } : { paid: null };

            const payload: CreateProjectPayload = {
                project_name,
                project_description: description,
                tags,
                plan: projectPlan,
            };

            const result = await this.actor.create_project(payload);

            if ('ok' in result) {
                const currentTime = BigInt(Date.now());

                return {
                    id: result.ok.project_id,
                    name: project_name,
                    description,
                    tags,
                    plan: projectPlan,
                    canister_id: null,
                    date_created: Number(currentTime),
                    date_updated: Number(currentTime)
                };
            }
            else {
                throw this.handleResponseError(result.err);
            }
        } catch (error) {
            console.error(`Error creating project:`, error);
            throw error;
        }
    }

    async uploadAssetsToProject(project_id: bigint, files: StaticFile[], current_batch: number, total_batch_count: number, workflowRunDetails?: WorkflowRunDetails) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }

            const payload: StoreAssetInCanisterPayload = {
                project_id,
                files,
                workflow_run_details: workflowRunDetails ? [workflowRunDetails] : [],
                current_batch: BigInt(current_batch),
                total_batch_count: BigInt(total_batch_count)
            }
            const result = await this.actor.upload_assets_to_project(payload);
            if ("ok" in result) {
                return { status: true, message: "Stored files successfully." };
            }
            else {
                throw this.handleResponseError(result.err);
            }
        } catch (error: any) {
            console.log(`Error storing in asset canister:`, error)
            return { status: false, message: `Failed to upload file batch. ${error.message}` };
        }
    }

    async getUserProjects(page?: number, limit?: number): Promise<DeserializedProject[] | null> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }

            const payload: GetProjectsByUserPayload = {
                user: this.identity.getPrincipal(),
                page: page ? [BigInt(page)] : [],
                limit: limit ? [BigInt(limit)] : [],
            };

            const result = await this.actor.get_projects_by_user(payload);
            console.log(`REUSLT froM get USER FEREMIUM`, result)
            if (!result) {
                throw new Error("Failed to get projects");
            }

            if ('err' in result) {
                console.log(`ERROR IN REUSLT`)
                throw this.handleResponseError(result.err);
            }

            return result.ok.map((project: Project) => {
                const canisterId = project.canister_id && project.canister_id.length > 0 ? project.canister_id[0] : null;
                console.log("RETURNINGINGIN", {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    tags: project.tags,
                    plan: project.plan,
                    canister_id: canisterId ? canisterId.toText() : null,
                    date_created: Number(project.date_created),
                    date_updated: Number(project.date_updated)
                })
                return {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    tags: project.tags,
                    plan: project.plan,
                    canister_id: canisterId ? canisterId.toText() : null,
                    date_created: Number(project.date_created),
                    date_updated: Number(project.date_updated)
                };
            });
        } catch (error) {
            console.error(`Error getting projects:`, error);
            return null;
        }
    }
    async getUserUsage(): Promise<SerializedUsageLog> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }

            const result = await this.actor.get_user_usage();
            if (!result) {
                throw new Error("Failed to get projects");
            }

            if ('err' in result) {
                console.log(`ERROR IN REUSLT`)
                throw this.handleResponseError(result.err);
            }

            return serializedUsageLog(result.ok);
        } catch (error) {
            console.error(`Error getting projects:`, error);
            throw error;
        }
    }

    async getProjectActivityLogs(projectId: bigint): Promise<any> {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        const result = await this.actor.get_project_activity_logs(projectId);
        if (!result) {
            throw new Error("Failed to get activity logs");
        }
        console.log(`Activity lgs`, result)
        if ('ok' in result) {
            console.log(`retr`, result.ok[0])
            console.log(`retr`, result.ok.map(o => { return { ...o, create_time: Number(o.create_time / BigInt(1_000_000)) } }));

            return result.ok.map(o => { return { ...o, create_time: Number(o.create_time / BigInt(1_000_000)) } });
        }
        else {
            throw this.handleResponseError(result.err);
        }
    }

    async clearProjectAssets(projectId: number): Promise<boolean> {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        const result = await this.actor.clear_project_assets(BigInt(projectId));
        if ('ok' in result) {
            return true;
        }
        throw this.handleResponseError(result.err);
    }

    async deleteProject(projectId: number): Promise<boolean> {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        const result = await this.actor.delete_project(BigInt(projectId));
        if ("ok" in result) {
            return result.ok;
        }

        throw this.handleResponseError(result.err);
    }


}


export default MainApi;