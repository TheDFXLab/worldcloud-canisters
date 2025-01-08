import { Principal } from "@dfinity/principal";
import { migrator_management_canister_backend, createActor } from "../../../../declarations/migrator-management-canister-backend";
import { Actor, ActorSubclass, HttpAgent } from "@dfinity/agent";
import { _SERVICE } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
// import { idlFactory as ledgerIDL, _SERVICE as LEDGER_SERVICE } from "../../../../declarations/icp_ledger_canister/icp_ledger_canister.did";


import { icpToE8s } from "../../utility/e8s";
import { ICPLedger } from "../../class/ICPLedger/ICPLedger";
import { TransferArgs } from "../../../../declarations/icp_ledger_canister/icp_ledger_canister.did";
import { TransferRequest } from "@dfinity/ledger-icp";
class CyclesApi {
    private agent: HttpAgent;
    private actor: ActorSubclass<_SERVICE>;
    private backendCanisterId: string;
    // private ledgerActor: ActorSubclass<LEDGER_SERVICE>;
    private ledgerInstance: ICPLedger;

    constructor(public canisterId: Principal) {
        const backendCanisterId = process.env.CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_BACKEND || '';
        this.backendCanisterId = backendCanisterId;

        if (!backendCanisterId) {
            throw new Error("CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_BACKEND is not set");
        }
        this.agent = new HttpAgent();
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

    async transferICPAndReceive(amount: number, userAddress: string) {
        console.log(`transferring ${amount} of ICP to cycles`);
        const ledgerCanisterId = process.env.CANISTER_ID_ICP_LEDGER_CANISTER || '';
        console.log(`ledgerCanisterId: `, ledgerCanisterId);
        if (!ledgerCanisterId) {
            throw new Error("CANISTER_ID_ICP_LEDGER_CANISTER is not set");
        }

        // Convert ICP amount to e8s
        const e8sAmount = icpToE8s(amount);

        const userDepositAddress = await this.actor.get_deposit_account_id(Principal.fromText(this.backendCanisterId), Principal.fromText(userAddress)) as Uint8Array;
        console.log(`userDepositAddress: `, userDepositAddress);

        // Prepare transfer args
        const transferArgs: TransferArgs = {
            memo: BigInt(0x1),
            amount: { e8s: e8sAmount },
            fee: { e8s: BigInt(10000) },
            to: userDepositAddress,
            from_subaccount: [],
            created_at_time: [],
        };

        try {
            // Transfer ICP
            const transferResult = await this.ledgerInstance.actor?.transfer(transferArgs)
            console.log("Transfer result:", transferResult);

            // Call wallet_receive
            const receiveResult = await this.actor.wallet_receive();
            console.log("Receive result:", receiveResult);

            return receiveResult;
        } catch (error) {
            console.error("Error:", error);
            throw error;
        }
    }
}


export default CyclesApi;