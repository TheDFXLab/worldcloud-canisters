import { Principal } from "@dfinity/principal";

export interface SerializedSubscription {
    user_id: string;
    tier_id: number;
    canisters: string[];
    free_canisters: string[];
    used_slots: number;
    max_slots: number;
    date_created: number;
    date_updated: number;
}

export interface DeserializedSubscription {
    user_id: Principal;
    tier_id: bigint;
    canisters: Principal[];
    free_canisters: Principal[];
    used_slots: bigint;
    max_slots: bigint;
    date_created: bigint;
    date_updated: bigint;
}


export const serializeSubscription = (subscription: any): any => {
    const serialized: any = {};

    for (const [key, value] of Object.entries(subscription)) {
        if (value === null || value === undefined) {
            serialized[key] = value;
        } else if (typeof value === "bigint") {
            serialized[key] = Number(value);
        } else if (typeof value === "object" && value.toString) {
            serialized[key] = value.toString();
        } else if (typeof value === "object") {
            serialized[key] = JSON.stringify(value);
        } else {
            serialized[key] = value;
        }
    }

    return serialized;
};

export const serializeSubscriptionPair = (pair: [any, any]): [string, any] => {
    const [principal, subscription] = pair;

    // Serialize the principal (first element)
    const serializedPrincipal = typeof principal === "object" && principal.toString
        ? principal.toString()
        : typeof principal === "string"
            ? principal
            : String(principal);

    // Serialize the subscription (second element)
    const serializedSubscription = serializeSubscription(subscription);

    return [serializedPrincipal, serializedSubscription];
};


export const serializeBigIntArray = (arr: bigint[]): number[] => {
    return arr.map(item => Number(item));
};

export const serializeUsedSlots = (slots: [bigint, boolean][]): [number, boolean][] => {
    return slots.map(([id, used]) => [Number(id), used]);
};

export const serializeSlot = (slot: any) => {
    const serialized: any = {};

    // Handle all possible fields
    for (const [key, value] of Object.entries(slot)) {
        if (value === null || value === undefined) {
            serialized[key] = value;
        } else if (typeof value === "bigint") {
            serialized[key] = Number(value);
        } else if (typeof value === "object" && value.toString) {
            // Handle Principal objects and other objects with toString
            if (key === 'status') {
                // For status, extract the actual status value
                const statusObj = value as any;
                if (statusObj.available !== undefined) {
                    serialized[key] = statusObj.available ? 'available' : 'unavailable';
                } else {
                    serialized[key] = 'unknown';
                }
            } else {
                serialized[key] = value.toString();
            }
        } else if (typeof value === "object") {
            // Handle other objects - convert to string representation
            serialized[key] = JSON.stringify(value);
        } else {
            // Handle primitives (string, number, boolean)
            serialized[key] = value;
        }
    }

    return serialized;
};


// Serialization helpers
export const serializePrincipal = (principal: any): string => {
    return typeof principal === 'string' ? principal : principal.toString();
};
