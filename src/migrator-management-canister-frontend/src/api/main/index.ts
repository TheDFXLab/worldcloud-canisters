import { Principal } from "@dfinity/principal";
import { migrator_management_canister_backend, createActor } from "../../../../declarations/migrator-management-canister-backend";
import { LedgerCanister, TransferRequest } from "@dfinity/ledger-icp";
import { Actor, ActorSubclass, HttpAgent } from "@dfinity/agent";
import { _SERVICE } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";

class MainApi {
    private agent: HttpAgent;
    private actor: ActorSubclass<_SERVICE>;
    private backendCanisterId: string;

    constructor(public canisterId: Principal) {
        const backendCanisterId = process.env.CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_BACKEND || '';
        this.backendCanisterId = backendCanisterId;

        if (!backendCanisterId) {
            throw new Error("CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_BACKEND is not set");
        }
        this.agent = new HttpAgent();
        const actor = createActor(this.backendCanisterId, { agent: this.agent });
        this.actor = actor;
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

            const depositAddr = await this.actor.get_deposit_account_id(Principal.fromText(this.backendCanisterId), identifiedActor.caller);
            console.log("depositAddr", depositAddr);
            return depositAddr;

        } catch (error) {
            return null;
        }
    }

}


export default MainApi;