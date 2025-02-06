import { Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import MainApi from "../main";

class AssetApi {
    constructor() {
    }

    async isIdentified(identity: Identity | null) {
        const mainApi = await MainApi.create(identity);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        return mainApi.idenitified;
    }

    async getCanisterFiles(canisterId: string, identity: Identity | null) {
        const mainApi = await MainApi.create(identity);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        const files = await mainApi.actor?.getAssetList(Principal.fromText(canisterId));

        if (files === undefined) {
            throw new Error("Failed to get canister files");
        }
        return files;
    }

    async getAsset(canisterId: string, key: string, identity: Identity | null) {
        const mainApi = await MainApi.create(identity);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        return mainApi.actor?.getCanisterAsset(Principal.fromText(canisterId), key);
    }
}

export default AssetApi;
