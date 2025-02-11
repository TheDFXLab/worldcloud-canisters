import { Identity } from "@dfinity/agent";
import MainApi from "../main";
import { Subscription } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";

export interface SubscribeResponse {
    status: boolean;
    message: string;
    subscription?: Subscription;
}

class SubscriptionApi {
    constructor() {
    }

    async getTiersList(identity: Identity | null) {
        const mainApi = await MainApi.create(identity);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        const tiers = await mainApi.actor?.get_tiers();
        if (!tiers) {
            throw new Error("Failed to get tiers");
        }
        console.log('tiers', tiers);
        return tiers;
    }

    async getAllSubscriptions(identity: Identity | null) {
        try {
            const mainApi = await MainApi.create(identity);
            if (!mainApi) {
                throw new Error("Failed to create main api");
            }
            const subscriptions = await mainApi.actor?.get_all_subscriptions();
            console.log(`All subs: `, subscriptions);
            if (!subscriptions) {
                throw new Error("Failed to get all subscriptions");
            }
            return subscriptions;
        } catch (error) {
            console.error(error);
        }

    }

    async getSubscription(identity: Identity | null) {
        const mainApi = await MainApi.create(identity);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        const subscription = await mainApi.actor?.get_subscription();
        console.log(`Got subscription response`, subscription);
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

    async createSubscription(identity: Identity | null, tierId: number) {
        const mainApi = await MainApi.create(identity);
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