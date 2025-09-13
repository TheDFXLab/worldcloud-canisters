import { Principal } from "@dfinity/principal";
import { createActor } from "../../../../declarations/migrator-management-canister-backend";
import { ActorSubclass, HttpAgent, Identity } from "@dfinity/agent";
import { _SERVICE, ActivityLog, GetProjectsByUserPayload, Project, ProjectPlan, Response, Result, StoreAssetInCanisterPayload, UsageLogExtended, WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { backend_canister_id, http_host, internetIdentityConfig } from "../../config/config";
import { StaticFile } from "../../utility/compression";
import { DeserializedProject, DeserializedUsageLog, SerializedUsageLog, serializedUsageLog, SerializedUsageLogExtended } from "../../utility/bigint";
import { DeserializedActivityLog, DeserializedPaginationPayload, PaginationPayload, serializePaginationPayload } from "../../serialization/admin";
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

    private async validate() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }
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
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }
            const response = await this.actor.getCanisterDeployments(BigInt(project_id));
            if ("ok" in response) {
                return response.ok[0];
            }
            else {
                throw this.handleResponseError(response.err);
            }
        } catch (error) {
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
            throw error;
        }
    }

    async storeInAssetCanister(project_id: bigint, files: StaticFile[], current_batch: number, total_batch_count: number, workflowRunDetails?: WorkflowRunDetails) {
        try {
            return await this.uploadAssetsToProject(project_id, files, current_batch, total_batch_count, workflowRunDetails);
        } catch (error: any) {
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
            throw error;
        }
    }

    async get_quota_reset_time_utc() {
        this.validate();

        return await this.actor?.get_next_quota_reset_utc();
    }

    // Request a freemium session for deployment
    async getUserFreemiumUsage() {
        try {
            this.validate();

            const result = await this.actor?.get_user_slot();
            if (!result) {
                throw new Error("Failed to request freemium session");
            }

            if ("ok" in result) {
                const slot = result.ok.length > 0 ? result.ok[0] : null;

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
                    status: slot.status,
                };
            }
            else {
                throw this.handleResponseError(result.err);
            }
        } catch (error) {
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
            if (!result) {
                throw new Error("Failed to get projects");
            }

            if ('err' in result) {
                throw this.handleResponseError(result.err);
            }

            return result.ok.map((project: Project) => {
                const canisterId = project.canister_id && project.canister_id.length > 0 ? project.canister_id[0] : null;
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
    async getUserUsage(): Promise<UsageLogExtended> {
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
                throw this.handleResponseError(result.err);
            }

            return result.ok;
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
        if ('ok' in result) {
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


    async get_add_ons_list() {
        await this.validate();
        const result = await this.actor?.get_add_ons_list();
        if (result) return result;
        throw this.handleResponseError("Unexpected error occured");
    }

    async has_add_on_by_project(project_id: number, add_on_id: number): Promise<boolean> {
        await this.validate();
        const result = await this.actor?.has_add_on_by_project(BigInt(project_id), BigInt(add_on_id));

        if (result && 'ok' in result) return result.ok;
        throw this.handleResponseError(result ? result.err : "Unexpected error occured");
    }

    async get_add_ons_by_project(project_id: number) {
        await this.validate();
        const result = await this.actor?.get_add_ons_by_project(BigInt(project_id));

        if (result && 'ok' in result) return result.ok;
        throw this.handleResponseError(result ? result.err : "Unexpected error occured");
    }

    async subscribe_add_on(project_id: number, add_on_id: number) {
        await this.validate();
        const result = await this.actor?.subscribe_add_on(BigInt(project_id), BigInt(add_on_id));

        if (result && 'ok' in result) return result.ok;
        throw this.handleResponseError(result ? result.err : "Unexpected error occured");
    }

    // Public domain methods for projects
    async get_domain_registrations_by_project(projectId: number) {
        await this.validate();
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }

        const result = await this.actor.get_domain_registrations_by_canister(BigInt(projectId));
        if (result && 'ok' in result) return result.ok;
        throw this.handleResponseError(result ? result.err : "Unexpected error occured");
    }

    async get_domain_registration_status(registrationId: string) {
        await this.validate();
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }

        const result = await this.actor.get_domain_registration_status(registrationId);
        if (result && 'ok' in result) return result.ok;
        throw this.handleResponseError(result ? result.err : "Unexpected error occured");

    }

    async get_parsed_my_addons(projectId: number) {
        await this.validate();
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }

        const result = await this.actor.get_my_addons(BigInt(projectId));
        if (result && 'ok' in result) return result.ok;
        throw this.handleResponseError(result ? result.err : "Unexpected error occured");

    }

    async setup_custom_domain_by_project(projectId: number, subdomainName: string, add_on_id: number) {
        await this.validate();
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }

        const result = await this.actor.setup_custom_domain_by_project(BigInt(projectId), subdomainName, BigInt(add_on_id));
        if (result && 'ok' in result) return result.ok;
        throw this.handleResponseError(result ? result.err : "Unexpected error occured");
    }


    async is_subdomain_available(subdomain: string, project_id: number, addon_id: number) {
        await this.validate();
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }

        const result = await this.actor.is_available_subdomain(BigInt(project_id), subdomain, BigInt(addon_id));
        return result;
    }

    async delete_domain_registration(project_id: number, addon_id: number) {
        await this.validate();
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }

        const result = await this.actor.delete_domain_registration(BigInt(project_id), BigInt(addon_id));
        if ('ok' in result) return result.ok;
        throw this.handleResponseError(result.err);
    }




















    /************************** */
    /************************** */
    /************************** */
    /******* ADMIN SECTION ******/
    /************************** */
    /************************** */
    /************************** */


    async get_slots(limit?: number | null, index?: number | null) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.get_slots(limit ? [BigInt(limit)] : [], index ? [BigInt(index)] : []);
    }

    async get_available_slots(limit?: number | null, index?: number | null) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.get_available_slots(limit ? [BigInt(limit)] : [], index ? [BigInt(index)] : []);
    }

    async get_used_slots() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.get_used_slots();
    }

    async get_all_subscriptions() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.get_all_subscriptions();
    }

    async getDeployedCanisters() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.getDeployedCanisters();
    }

    async admin_get_admin_users(payload: PaginationPayload) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }
        return await this.actor.admin_get_admins(serializePaginationPayload(payload));
    }

    async admin_set_all_slot_duration(newDurationMs: number) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_set_all_slot_duration(BigInt(newDurationMs));
    }

    async admin_delete_usage_logs() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_delete_usage_logs();
    }

    async admin_get_canister_domain_registrations(canisterId: string) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }
        return await this.actor.admin_get_canister_domain_registrations(Principal.fromText(canisterId));
    }

    async admin_get_global_timers() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }
        return await this.actor.admin_get_global_timers();
    }
    async admin_setup_custom_domain(project_id: number, canisterId: string, subdomainName: string, add_on_id: number) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }
        return await this.actor.admin_setup_custom_domain(BigInt(project_id), Principal.fromText(canisterId), subdomainName, BigInt(add_on_id));
    }
    async admin_get_domain_registrations() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }
        return await this.actor.admin_get_domain_registrations();

    }



    async update_slot(slotId: number, updatedSlot: any) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.update_slot(BigInt(slotId), updatedSlot);
    }

    async delete_projects() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.delete_projects();
    }

    async delete_workflow_run_history() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.delete_workflow_run_history();
    }

    async reset_project_slot(projectId: number) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.reset_project_slot(BigInt(projectId));
    }

    async reset_slots() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }
        let is = await this.actor.reset_slots();
        return is;
    }

    async purge_expired_sessions() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.purge_expired_sessions();
    }

    async delete_all_logs() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.delete_all_logs();
    }

    async grant_role(principal: string, role: any) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.grant_role(Principal.fromText(principal), role);
    }

    async revoke_role(principal: string) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.revoke_role(Principal.fromText(principal));
    }

    async is_admin() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not initialized.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.is_admin();
    }

    async check_role(principal: string) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not initialized.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.check_role(Principal.fromText(principal));
    }

    async uploadAssetCanisterWasm(wasm: number[]) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.uploadAssetCanisterWasm(wasm);
    }

    // New Admin API Methods
    async admin_get_activity_logs_all(payload: DeserializedPaginationPayload) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_get_activity_logs_all(payload);
    }

    async admin_get_workflow_run_history_all(payload: DeserializedPaginationPayload) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_get_workflow_run_history_all(payload);
    }

    async admin_get_usage_logs_all(payload: DeserializedPaginationPayload) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_get_usage_logs_all(payload);
    }

    async admin_get_user_slot_id(user: string) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_get_user_slot_id(Principal.fromText(user));
    }

    async admin_get_user_projects_all(payload: DeserializedPaginationPayload) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_get_user_projects_all(payload);
    }

    async admin_get_user_projects(user: string, payload: DeserializedPaginationPayload) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_get_user_projects(Principal.fromText(user), payload);
    }

    async admin_get_projects_all(payload: DeserializedPaginationPayload) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_get_projects_all(payload);
    }

    async admin_get_canister_deployments_all(payload: DeserializedPaginationPayload) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_get_canister_deployments_all(payload);
    }

    async admin_get_book_entries_all(payload: DeserializedPaginationPayload) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        return await this.actor.admin_get_book_entries_all(payload);
    }

    async admin_set_treasury(treasuryPrincipal: string) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }
        return await this.actor.admin_set_treasury(Principal.fromText(treasuryPrincipal));
    }

    async admin_withdraw_treasury() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }
        return await this.actor.admin_withdraw_treasury();
    }

    async admin_get_treasury_principal() {
        this.validate();
        return await this.actor?.admin_get_treasury_principal();
    }
    async admin_get_treasury_balance() {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }
        return await this.actor.admin_get_treasury_balance();
    }


    async admin_set_ic_domains(canister_id: string, file: StaticFile) {
        this.validate();
        await this.actor?.edit_ic_domains(Principal.fromText(canister_id), file);
        return true;
    }

    async admin_grant_subscription(user_principal: string, subscription_tier_id: number) {
        this.validate();

        const result = await this.actor?.admin_grant_subscription(Principal.fromText(user_principal), BigInt(subscription_tier_id));
        if (!result) {
            throw new Error("Failed to grant subscription");
        }
        if ("ok" in result) {
            return result.ok;
        }
        throw this.handleResponseError(result.err);
    }

    async admin_grant_addon(project_id: number, addon_id: number, expiry_in_ms: number) {
        this.validate();
        const result = await this.actor?.admin_grant_addon(BigInt(project_id), BigInt(addon_id), BigInt(expiry_in_ms));
        if (!result) {
            throw new Error("Failed to grant addon");
        }
        if ("ok" in result) {
            return result.ok;
        }
        throw this.handleResponseError(result.err);
    }
}


export default MainApi;