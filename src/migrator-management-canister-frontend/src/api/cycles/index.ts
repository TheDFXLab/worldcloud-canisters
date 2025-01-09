import { Principal } from "@dfinity/principal";
import { migrator_management_canister_backend, createActor } from "../../../../declarations/migrator-management-canister-backend";
import { Actor, ActorSubclass, HttpAgent } from "@dfinity/agent";
import { _SERVICE } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
// import { idlFactory as ledgerIDL, _SERVICE as LEDGER_SERVICE } from "../../../../declarations/icp_ledger_canister/icp_ledger_canister.did";


import { cyclesToTerra, icpToE8s, terraToCycles } from "../../utility/e8s";
import { ICPLedger } from "../../class/ICPLedger/ICPLedger";
import { TransferArgs } from "../../../../declarations/icp_ledger_canister/icp_ledger_canister.did";
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

    async addCycles(icpAmount: number, canisterId: Principal) {
        try {
            const price = 10;
            const cycleCost = 1.33; // USD cost of 1 cycle
            const amountInTCycles = icpAmount * price / cycleCost;
            const amountInCycles = Math.floor(terraToCycles(amountInTCycles));
            console.log(`Adding cycles for ${icpAmount} ICP /${price * icpAmount} USD / ${amountInTCycles} TCycles. `);
            const result = await this.actor.addCycles(canisterId, BigInt(amountInCycles));
            return result;
        } catch (error) {
            console.error("Error adding cycles:", error);
            throw error;
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
            console.log("Transfer result:", Object.keys(transferResult)[0]);

            if (Object.keys(transferResult)[0] !== "Ok") {
                console.log("Transfer resulssssst:", Object.keys(Object.values(transferResult)[0])[0]);
                throw { message: `Transfer failed: ${Object.keys(Object.values(transferResult)[0])[0]}` };
            }
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