import { Principal } from "@dfinity/principal";
import { migrator_management_canister_backend } from "../../../../declarations/migrator-management-canister-backend";
import { ListResponse } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";

export interface CanisterStatus {
    status: string;
    cycles: number;
    controllers: string[];
}

class AuthorityApi {
    constructor(public readonly canisterId: Principal) {
    }

    async getControllers() {
        const response = await migrator_management_canister_backend.getControllers(this.canisterId);

        const controllers = response.map((controller) => controller.toText());
        return controllers;
    }

    async getCanisterStatus(canister_id: Principal): Promise<CanisterStatus> {
        const response = await migrator_management_canister_backend.getCanisterStatus(canister_id);
        const status = {
            status: Object.keys(response.status)[0],
            controllers: response.settings.controllers[0]?.map((controller) => controller.toString()) || [],
            cycles: Number(response.cycles)
        }
        console.log(`Canister statusss:`, status);
        return status;
    }

    async addController(controller: Principal) {
        const response = await migrator_management_canister_backend.addController(this.canisterId, controller);
        return response;
    }

    async removeController(controller: Principal) {
        const response = await migrator_management_canister_backend.removeController(this.canisterId, controller);
        return response;
    }

    async getAssetList(canister_id: Principal): Promise<ListResponse> {
        const response = await migrator_management_canister_backend.getAssetList(canister_id);
        return response;
    }
}

export default AuthorityApi;