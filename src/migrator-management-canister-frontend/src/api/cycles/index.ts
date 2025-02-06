import { Principal } from "@dfinity/principal";
import { createActor } from "../../../../declarations/migrator-management-canister-backend";
import { ActorSubclass, HttpAgent } from "@dfinity/agent";
import { _SERVICE } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { ICPLedger } from "../../class/ICPLedger/ICPLedger";
import { Identity } from "@dfinity/agent";

class CyclesApi {
    private agent: HttpAgent;
    private actor: ActorSubclass<_SERVICE>;
    private backendCanisterId: string;
    private ledgerInstance: ICPLedger;

    constructor(public canisterId: Principal, identity: Identity) {
        const backendCanisterId = process.env.CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_BACKEND || '';
        this.backendCanisterId = backendCanisterId;

        if (!backendCanisterId) {
            throw new Error("CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_BACKEND is not set");
        }
        this.agent = new HttpAgent({ identity });
        const actor = createActor(this.backendCanisterId, { agent: this.agent });
        this.actor = actor;

        this.ledgerInstance = new ICPLedger(this.agent, Principal.fromText(process.env.CANISTER_ID_ICP_LEDGER_CANISTER || ''));
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

    /**
     * Add cycles to the canister
     * @param canisterId 
     * @returns 
     */
    async addCycles(canisterId: Principal) {
        try {
            const result = await this.actor.addCycles(canisterId);
            return result;
        } catch (error) {
            console.error("Error adding cycles:", error);
            throw error;
        }

    }
}


export default CyclesApi;