import { Principal } from "@dfinity/principal";

export interface Deployment {
    canister_id: Principal;
    date_created: number;
    date_updated: number;
    size: number;
    status: CanisterDeploymentStatus;
}

export type CanisterDeploymentStatus =
    | "uninitialized"
    | "installing"
    | "installed"
    | "failed";