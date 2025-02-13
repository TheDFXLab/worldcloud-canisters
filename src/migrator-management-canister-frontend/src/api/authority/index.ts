import { Principal } from "@dfinity/principal";
import { ListResponse } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { Identity } from "@dfinity/agent";
import MainApi from "../main";
import { internetIdentityConfig } from "../../config/config";

export interface CanisterStatus {
    status: string;
    cycles: number;
    controllers: string[];
}

class AuthorityApi {
    constructor(public readonly canisterId: Principal) {
    }

    /**
     * Get the controllers of the canister
     * @param identity 
     * @returns list of controller principal ids
     */
    async getControllers(identity: Identity | null) {
        if (!identity || identity.getPrincipal().toText() === internetIdentityConfig.loggedOutPrincipal) {
            throw new Error("User is not logged in");
        }
        const mainApi = await MainApi.create(identity);

        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        const response = await mainApi.actor?.getControllers(this.canisterId);

        if (!response) {
            throw new Error("Failed to get controllers");
        }
        const controllers = response.map((controller) => controller.toText());
        return controllers;
    }

    /**
     * Get the status of the canister
     * @param canister_id 
     * @param identity 
     * @returns status, controllers list and cycles balance
     */
    async getCanisterStatus(canister_id: Principal, identity: Identity | null): Promise<CanisterStatus> {
        const mainApi = await MainApi.create(identity);

        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        const response = await mainApi.actor?.getCanisterStatus(canister_id);
        if (!response) {
            throw new Error("Failed to get canister status");
        }
        const status = {
            status: Object.keys(response.status)[0],
            controllers: response.settings.controllers[0]?.map((controller) => controller.toString()) || [],
            cycles: Number(response.cycles)
        }
        return status;
    }

    /**
     * Add a controller to the canister
     * @param controller 
     * @param identity 
     * @returns 
     */
    async addController(controller: Principal, identity: Identity | null) {
        const mainApi = await MainApi.create(identity);

        if (!mainApi) {
            throw new Error("Failed to create main api");
        }

        const response = await mainApi.actor?.addController(this.canisterId, controller);
        if (response === undefined) {
            throw new Error("Failed to add controller");
        }
        if ("ok" in response) {
            return response.ok;
        }
        else {
            throw new Error("Failed to add controller: " + response.err);
        }
    }

    /**
     * Remove a controller from the canister
     * @param controller 
     * @param identity 
     * @returns 
     */
    async removeController(controller: Principal, identity: Identity | null) {
        const mainApi = await MainApi.create(identity);

        if (!mainApi) {
            throw new Error("Failed to create main api");
        }

        const response = await mainApi.actor?.removeController(this.canisterId, controller);
        if (response === undefined) {
            throw new Error("Failed to remove controller");
        }
        if ("ok" in response) {
            return response.ok;
        }
        else {
            throw new Error("Failed to remove controller: " + response.err);
        }
    }

    /**
     * Get the list of assets in an asset storage canister
     * @param canister_id 
     * @param identity 
     * @returns list of assets
     */
    async getAssetList(canister_id: Principal, identity: Identity | null): Promise<ListResponse> {
        const mainApi = await MainApi.create(identity);

        if (!mainApi) {
            throw new Error("Failed to create main api");
        }

        const response = await mainApi.actor?.getAssetList(canister_id);
        if (response === undefined) {
            throw new Error("Failed to get asset list");
        }
        return response;
    }
}

export default AuthorityApi;