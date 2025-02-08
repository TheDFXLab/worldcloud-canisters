import { Principal } from "@dfinity/principal";
import { createActor } from "../../../../declarations/migrator-management-canister-backend";
import { ActorSubclass, HttpAgent } from "@dfinity/agent";
import { _SERVICE } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { ICPLedger } from "../../class/ICPLedger/ICPLedger";
import { Identity } from "@dfinity/agent";
import { e8sToIcp, icpToE8s } from "../../utility/e8s";
import { backend_canister_id, http_host, internetIdentityConfig } from "../../config/config";

class CyclesApi {
    private static instance: CyclesApi | null = null;
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
            const agent = await HttpAgent.create({ identity: identity ? identity : undefined, host: http_host });
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
            const mainApi = new CyclesApi(identity, actor, isIdentified);
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
    async getUserDepositAddress(identifiedActor: any) {
        try {

            if (!identifiedActor) {
                throw new Error("Identified Actor not initialized.");
            }

            const depositAddr = await identifiedActor.getDepositAddress();
            return depositAddr;
        } catch (error) {
            return null;
        }
    }

    async getCyclesToAdd(amountInIcp?: number) {
        const amountInE8s = amountInIcp ? BigInt(e8sToIcp(amountInIcp)) : null;
        const result = await this.actor?.getCyclesToAdd(amountInE8s ? [amountInE8s] : [], []);
        console.log("result:", result);
        if (!result) {
            throw new Error("Error getting cycles to add");
        }

        if ('ok' in result) {
            return result.ok;
        }

        return 0;
    }

    async estimateCyclesToAdd(amountInIcp: number) {
        const amountInE8s = BigInt(icpToE8s(amountInIcp));
        const result = await this.actor?.estimateCyclesToAdd(amountInE8s);
        if (!result) {
            throw new Error("Error estimating cycles to add");
        }
        return result;
    }

    /**
     * Add cycles to the canister
     * @param canisterId 
     * @returns 
     */
    async addCycles(canisterId: Principal, amountInIcp?: number) {
        try {
            console.log(`Adding cycles to canister ${canisterId.toText()} with amount ${amountInIcp}`);

            if (!amountInIcp) {
                throw new Error("Amount in ICP is required");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified");
            }
            console.log(`Adding cycles as identity:`, this.identity.getPrincipal().toText());
            const result = await this.actor?.addCycles(canisterId, amountInIcp);
            return result;
        } catch (error) {
            console.error("Error adding cycles:", error);
            throw error;
        }

    }
}


export default CyclesApi;