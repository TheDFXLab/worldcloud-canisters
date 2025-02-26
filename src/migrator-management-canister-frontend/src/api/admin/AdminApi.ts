import { HttpAgent, Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import MainApi from "../main";

class AdminApi {
    constructor() {
    }

    async isIdentified(identity: Identity | null, agent: HttpAgent) {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        return mainApi.idenitified;
    }

    async isAdmin(principal: string, identity: Identity | null, agent: HttpAgent) {
        try {
            const mainApi = await MainApi.create(identity, agent);
            if (!mainApi) {
                throw new Error("Failed to create main api");
            }
            const role = await mainApi.actor?.check_role(Principal.fromText(principal));
            if (!role) {
                throw new Error("Failed to check role");
            }
            if ('ok' in role) {
                let roleValue = Object.keys(role.ok)[0];
                if (roleValue === 'admin' || roleValue === 'super_admin') {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }

    }
}

export default AdminApi;
