import { HttpAgent, Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import MainApi from "../main";

class AssetApi {
    constructor() {
    }

    async isIdentified(identity: Identity | null, agent: HttpAgent) {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        return mainApi.idenitified;
    }

    async getCanisterFiles(canisterId: string, identity: Identity | null, agent: HttpAgent) {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        const files = await mainApi.actor?.getAssetList(Principal.fromText(canisterId));

        if (files === undefined) {
            throw new Error("Failed to get canister files");
        }
        return files;
    }

    async getAsset(canisterId: string, key: string, identity: Identity | null, agent: HttpAgent) {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi || !mainApi.actor) {
            throw new Error("Failed to create main api");
        }
        const res = await mainApi.actor?.getCanisterAsset(Principal.fromText(canisterId), key);
        if ('ok' in res) {
            return res.ok;
        }
        throw this.handleResponseError(res.err);
    }

    private handleResponseError(error: string) {
        return { status: false, message: error };
    }
}

export default AssetApi;
