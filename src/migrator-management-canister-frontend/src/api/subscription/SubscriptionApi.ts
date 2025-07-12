import { HttpAgent, Identity } from "@dfinity/agent";
import MainApi from "../main";
import { Subscription } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { http_host } from "../../config/config";

export interface SubscribeResponse {
    status: boolean;
    message: string;
    subscription?: Subscription;
}

class SubscriptionApi {
    constructor() {
    }

    async getTiersList(identity: Identity | null, agent?: HttpAgent) {
        const _agent = agent || await HttpAgent.create({ host: http_host });

        if (!_agent) {
            throw new Error("Failed to get agent");
        }
        const mainApi = await MainApi.create(identity, _agent);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        const tiers = await mainApi.actor?.get_tiers();
        if (!tiers) {
            throw new Error("Failed to get tiers");
        }
        return tiers;
    }

    async getAllSubscriptions(identity: Identity | null, agent: HttpAgent) {
        try {
            const mainApi = await MainApi.create(identity, agent);
            if (!mainApi) {
                throw new Error("Failed to create main api");
            }
            // const subscriptions = await mainApi.actor?.get_all_subscriptions();
            // if (!subscriptions) {
            //     throw new Error("Failed to get all subscriptions");
            // }
            // return subscriptions;
        } catch (error) {
            console.error(error);
        }

    }

    async getSubscription(identity: Identity | null, agent: HttpAgent) {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        const subscription = await mainApi.actor?.get_subscription();
        if (!subscription) {
            throw new Error("Failed to get subscription");
        }
        if ('ok' in subscription) {
            return subscription.ok;
        }
        else {
            if (subscription.err === "Subscription not found") {
                return null;
            }
        }
        return null;
    }

    async createSubscription(identity: Identity | null, agent: HttpAgent, tierId: number) {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }

        const response = await mainApi.actor?.create_subscription(BigInt(tierId))
        if (!response) {
            throw new Error("Failed to create subscription");
        }
        if ("ok" in response) {
            return {
                status: true,
                message: "Subscription created successfully",
                subscription: response.ok,
            };
        }
        else {
            return {
                status: false,
                message: response.err,
            };
        }

    }
}

export default SubscriptionApi;