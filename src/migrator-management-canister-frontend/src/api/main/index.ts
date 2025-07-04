import { Principal } from "@dfinity/principal";
import { createActor } from "../../../../declarations/migrator-management-canister-backend";
import { ActorSubclass, HttpAgent, Identity } from "@dfinity/agent";
import { _SERVICE, DepositReceipt, GetProjectsByUserPayload, Project, ProjectPlan, Response, StoreAssetInCanisterPayload, WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { backend_canister_id, http_host, internetIdentityConfig } from "../../config/config";
import { StaticFile } from "../../utility/compression";

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
        const subscriptions = await this.actor?.get_all_subscriptions();
        return subscriptions;
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
            return null;
        }
    }

    async getCreditsAvailable() {
        try {
            const credits = await this.actor?.getMyCredits();
            return credits;
        } catch (error) {
            return null;
        }
    }

    async getCanisterDeployments() {
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
            const deployments = await this.actor.getCanisterDeployments();
            return deployments;
        } catch (error) {
            console.log(`Error getting canister deployments:`, error)
            return null;
        }
    }

    async getWorkflowHistory(canisterId: Principal) {
        const runsHistory = await this.actor?.getWorkflowRunHistory(
            canisterId
        );
        return runsHistory;
    }

    async getCanisterStatus(canisterId: Principal) {
        const result = await this.actor?.getCanisterStatus(canisterId);

        if (!result) {
            throw new Error("Failed to get canister status");
        }

        return result;
    }

    async uploadWasm(wasmBytes: number[]) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const result = await this.actor.uploadAssetCanisterWasm(
                wasmBytes
            );;
            return result;
        } catch (error) {
            console.log(`Error uploading WASM:`, error)
            return null;
        }
    }

    async deployAssetCanister(project_id: bigint) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const result = await this.actor.deployAssetCanister(project_id);
            if ("Ok" in result || "ok" in result) {
                return { status: true, message: Object.values(result)[0] };
            }
            else {
                throw { status: false, message: "Error deploying asset canister: " + Object.values(result)[0] };
            }
        } catch (error) {
            console.log(`Error deploying asset canister:`, error)
            return null;
        }
    }

    async storeInAssetCanister(canisterId: Principal, files: StaticFile[], workflowRunDetails?: WorkflowRunDetails) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const result = await this.actor.storeInAssetCanister(canisterId, files, workflowRunDetails ? [workflowRunDetails] : []);
            if ("Ok" in result || "ok" in result) {
                return { status: true, message: "Stored files successfully." };
            }
            else {
                throw { status: false, message: "Error storing in asset canister: " + Object.values(result)[0] };
            }
        } catch (error: any) {
            console.log(`Error storing in asset canister:`, error)
            return { status: false, message: `Failed to upload file batch. ${error.message}` };
        }
    }

    // Updates the user balance in backend book after deposit to special address by user
    async deposit() {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const depositResult: DepositReceipt = await this.actor.depositIcp();
            if ("Ok" in depositResult) {
                return depositResult.Ok;
            }
            else {
                throw new Error("Error depositing ICP: " + depositResult.Err);
            }
        } catch (error) {
            console.log(`Error depositing ICP:`, error)
            return null;
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
            if (!result) {
                throw new Error("Failed to request freemium session");
            }

            if ("Ok" in result || "ok" in result) {
                return true;
            } else {
                throw new Error("Error requesting freemium session: " + Object.values(result)[0]);
            }
        } catch (error) {
            console.log(`Error requesting freemium session:`, error)
            return false;
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
                return {
                    project_id: result.ok.project_id.length > 0 ? result.ok.project_id[0] : null,
                    canister_id: result.ok.canister_id.length > 0 ? result.ok.canister_id[0] : null,
                    owner: result.ok.owner,
                    user: result.ok.user,
                    start_timestamp: result.ok.start_timestamp,
                    create_timestamp: result.ok.create_timestamp,
                    duration: result.ok.duration,
                    start_cycles: result.ok.start_cycles,
                    status: result.ok.status

                };
            } else {
                throw new Error("Error requesting freemium session: " + Object.values(result)[0]);
            }
        } catch (error) {
            console.log(`Error requesting freemium session:`, error)
            return false;
        }
    }

    // Creates a project and deploys a canister
    async createProject(
        project_name: string,
        description: string = "A standard asset canister for serving static site over HTTP.",
        tags: string[],
        plan: PlanType
    ) {
        if (!this.actor) {
            throw new Error("Actor not initialized.");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified.");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized.");
        }

        const payload: CreateProjectPayload = {
            project_name: project_name,
            project_description: description,
            tags: tags,
            plan: plan === 'freemium' ? { freemium: null } : { paid: null }
        };
        const response = await this.actor.create_project(payload);

        if ("ok" in response) {
            return {
                project_id: response.ok.project_id,
                is_freemium: response.ok.is_freemium
            };
        }
        else {
            console.log(`Error creating project.`, response.err);
            throw new Error(`Failed to create project: ${response.err}`);
        }
    }

    async uploadAssetsToProject(project_id: number, files: StaticFile[], workflowRunDetails?: WorkflowRunDetails) {
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
                project_id: BigInt(project_id),
                files,
                workflow_run_details: workflowRunDetails ? [workflowRunDetails] : []
            }

            const result = await this.actor.upload_assets_to_project(payload);
            if ("Ok" in result || "ok" in result) {
                return { status: true, message: "Stored files successfully." };
            }
            else {
                throw { status: false, message: "Error storing in asset canister: " + Object.values(result)[0] };
            }
        } catch (error: any) {
            console.log(`Error storing in asset canister:`, error)
            return { status: false, message: `Failed to upload file batch. ${error.message}` };
        }
    }

    async getUserProjects(page?: number, limit?: number) {
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
                limit: limit ? [BigInt(limit)] : [],
                page: page ? [BigInt(page)] : []

            }

            const result = await this.actor.get_projects_by_user(payload);
            console.log(`Result get projects`, result)
            if ("ok" in result) {
                const sanitized = result.ok.map((project: Project) => {
                    return {
                        id: project.id,
                        canister_id: project.canister_id ? project.canister_id.toString() : null,
                        name: project.name,
                        description: project.description,
                        tags: project.tags,
                        plan: project.plan,
                        date_created: project.date_created,
                        date_updated: project.date_updated
                    }
                })

                console.log(`Got all user projects.`, sanitized);
                return sanitized;
            }
            else {
                if ("err" in result) {
                    console.error(`Error getting projects `, result.err);
                }
            }
        } catch (error: any) {
            console.log(`Error getting user projects:`, error)
            return null;
        }
    }

}


export default MainApi;