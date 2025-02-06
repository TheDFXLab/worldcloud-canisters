import { HttpAgent, Identity, ActorSubclass } from "@dfinity/agent";
import { http_host, icp_ledger_canister_id, internetIdentityConfig } from "../../config/config";
import { _SERVICE, TransferArgs, TransferResult } from "../../../../declarations/icp_ledger_canister/icp_ledger_canister.did";
import { createActor } from "../../../../declarations/icp_ledger_canister";
import MainApi from "../main";
import { icpToE8s } from "../../utility/e8s";


class LedgerApi {
    static instance: LedgerApi | null = null;
    static currentIdentity: Identity | null = null;

    canisterId: string;
    actor: ActorSubclass<_SERVICE> | null;
    idenitified: boolean;
    identity: Identity | null;
    transferFee: number;

    private constructor(identity: Identity | null, actor: ActorSubclass<_SERVICE> | null, isIdentified: boolean) {
        this.canisterId = icp_ledger_canister_id;
        this.actor = actor;
        this.transferFee = 10000;
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

            if (this.instance) return this.instance;

            const agent = await HttpAgent.create({ identity: identity ? identity : undefined, host: http_host })
            const actor = createActor(icp_ledger_canister_id, {
                agent: agent
            });
            let isIdentified = false;

            if (identity && identity.getPrincipal().toText() !== internetIdentityConfig.loggedOutPrincipal) {
                console.log(`Created actor with identity:`, identity.getPrincipal().toText());
                isIdentified = true;
            }

            this.instance = new LedgerApi(identity, actor, isIdentified);

            return this.instance;
        } catch (error) {
            console.error(`Error creating actor:`, error);
            return null;
        }

    }

    async transfer(to: string, amountInIcp: number) {
        if (!this.actor) {
            throw new Error("Actor not initialized");
        }
        if (!this.idenitified) {
            throw new Error("Actor not identified");
        }
        if (!this.identity) {
            throw new Error("Identity not initialized 1");
        }
        if (amountInIcp <= 0) {
            throw new Error("Amount must be greater than 0");
        }

        const mainApi = await MainApi.create(this.identity);
        if (!mainApi) {
            throw new Error("Main API not found");
        }

        const depositAddress = await mainApi.getUserDepositAddress();
        console.log(`Depsoit afdrees:`, depositAddress)
        if (!depositAddress) {
            throw new Error("Deposit address not found");
        }

        // Construct the transfer arguments
        let args: TransferArgs = {
            to: depositAddress,
            from_subaccount: [],
            created_at_time: [],
            memo: BigInt(0x1),
            amount: { e8s: BigInt(Number(icpToE8s(amountInIcp)) + this.transferFee) },
            fee: { e8s: BigInt(this.transferFee) },
        }

        // Perform the transfer
        const response: TransferResult = await this.actor.transfer(args);

        if ('Ok' in response) {
            console.log(`Transfer successful`);
            return true;
        }
        console.log(`Transfer failed`);
        return false;
    }
}

export default LedgerApi;
