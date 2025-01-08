import { Actor } from '@dfinity/agent';
import { idlFactory } from '../../../../declarations/icp_ledger_canister';
import type { _SERVICE } from '../../../../declarations/icp_ledger_canister/icp_ledger_canister.did';
import { HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

export class ICPLedger {
    public actor: _SERVICE;

    constructor(agent: HttpAgent, canisterId: Principal) {
        this.actor = Actor.createActor<_SERVICE>(idlFactory, {
            agent: agent,
            canisterId: canisterId
        });
    }
}
