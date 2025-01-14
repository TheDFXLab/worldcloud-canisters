import { Principal } from "@dfinity/principal";
import { createActor } from "../../../../declarations/migrator-management-canister-backend";
import { ActorSubclass, HttpAgent, Identity } from "@dfinity/agent";
import { _SERVICE, DepositReceipt } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { backend_canister_id, internetIdentityConfig } from "../../config/config";
import { StaticFile } from "../../utility/compression";

class MainApi {
    private static instance: MainApi | null = null;
    private static currentIdentity: Identity | null = null;

    canisterId: string;
    actor: ActorSubclass<_SERVICE> | null;
    idenitified: boolean;
    identity: Identity | null;
    private constructor(identity: Identity | null, actor: ActorSubclass<_SERVICE> | null, isIdentified: boolean) {
        this.canisterId = backend_canister_id;
        this.actor = actor;
        this.identity = identity;
        this.idenitified = isIdentified;
    }

    static async create(identity: Identity | null) {
        try {
            // Clear instance if identity has changed
            if (this.currentIdentity !== identity) {
                this.instance = null;
                this.currentIdentity = identity;
            }

            // Return existing instance if already created
            if (this.instance) return this.instance;

            // Create instance if not already created
            const agent = await HttpAgent.create({ identity: identity ? identity : undefined });
            const actor = createActor(backend_canister_id, {
                agent: agent
            });
            let isIdentified = false;

            if (identity && identity.getPrincipal().toText() !== internetIdentityConfig.loggedOutPrincipal) {
                isIdentified = true;
                console.log(`Created new actor with identity:`, identity.getPrincipal().toText());
            }
            else {
                isIdentified = false;
            }

            // Create new instance
            const mainApi = new MainApi(identity, actor, isIdentified);
            this.instance = mainApi;
            return mainApi;
        } catch (error) {
            console.error(`Error creating actor:`, error);
            return null;
        }
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

    async getCanisterDeployments() {
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
            const deployments = await this.actor.getCanisterDeployments();
            return deployments;
        } catch (error) {
            console.log(`Error getting canister deployments:`, error)
            return null;
        }
    }

    async deployAssetCanister() {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const result = await this.actor.deployAssetCanister();
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

    async storeInAssetCanister(canisterId: Principal, files: StaticFile[]) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const result = await this.actor.storeInAssetCanister(canisterId, files);
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


}


export default MainApi;