import { AddOnService, AddOnVariant, ExpiryDuration } from "../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";

export type SerializedAddOnStatus = "available" | "frozen";

export type SerializedAddOnServiceType = "register_domain" | "register_subdomain";

export interface SerializedAddOn {
    id: number;
    status: SerializedAddOnStatus;
    type: SerializedAddOnServiceType;
    created_on: number;
    updated_on: number;
    expires_at?: number;
}
export type SerializedAddOnExpiry = "none" | "minute" | "hour" | "day" | "month" | "year";
export interface SerializedAddOnVariant {
    id: number;
    name: string;
    type: SerializedAddOnServiceType;
    expiry_duration: SerializedAddOnExpiry;
    expiry: number;
    price: number;
    features: string[];
}

// Helper function to convert AddOnServiceStatus to SerializedAddOnStatus
const serializeAddOnStatus = (status: { 'available': null } | { 'frozen': null }): SerializedAddOnStatus => {
    if ('available' in status) return "available";
    if ('frozen' in status) return "frozen";
    return "available"; // fallback
};

// Helper function to convert AddOnServiceType to SerializedAddOnServiceType
const serializeAddOnServiceType = (type: { 'register_domain': null } | { 'register_subdomain': null }): SerializedAddOnServiceType => {
    if ('register_domain' in type) return "register_domain";
    if ('register_subdomain' in type) return "register_subdomain";
    return "register_domain"; // fallback
};

export const serializeAddOn = (addon: AddOnService): SerializedAddOn => {
    return {
        id: Number(addon.id),
        status: serializeAddOnStatus(addon.status),
        type: serializeAddOnServiceType(addon.type),
        created_on: Number(addon.created_on),
        updated_on: Number(addon.updated_on),
        expires_at: addon.expires_at.length > 0 ? Number(addon.expires_at[0]) : undefined
    };
};

export const serializeAddOns = (addons: AddOnService[]): SerializedAddOn[] => {
    return addons.map(addon => serializeAddOn(addon));
};

export const serializeAddonExpiry = (expiry: ExpiryDuration): SerializedAddOnExpiry => {
    if ('none' in expiry) return "none";
    else if ('minute' in expiry) return "minute";
    else if ('hour' in expiry) return "hour";
    else if ('day' in expiry) return "day";
    else if ('month' in expiry) return "month";
    else if ('year' in expiry) return "year";
    else return 'none';
}

export const serializeAddOnVariant = (variant: AddOnVariant): SerializedAddOnVariant => {
    return {
        id: Number(variant.id),
        name: variant.name,
        type: serializeAddOnServiceType(variant.type),
        expiry: Number(variant.expiry_duration),
        expiry_duration: serializeAddonExpiry(variant.expiry),
        price: Number(variant.price),
        features: variant.features,
    };
}

export const serializeAddOnVariantList = (variant: AddOnVariant[]): SerializedAddOnVariant[] => {
    return variant.map(serializeAddOnVariant);
}

// Utility function to check if an addon has expired
export const isAddOnExpired = (addon: SerializedAddOn): boolean => {
    if (!addon.expires_at) return false;
    return Date.now() > addon.expires_at;
};

// Utility function to get time until expiry
export const getTimeUntilExpiry = (addon: SerializedAddOn): number | null => {
    if (!addon.expires_at) return null;
    const now = Date.now();
    return Math.max(0, addon.expires_at - now);
};

// Utility function to filter addons by status
export const filterAddOnsByStatus = (addons: SerializedAddOn[], status: SerializedAddOnStatus): SerializedAddOn[] => {
    return addons.filter(addon => addon.status === status);
};

// Utility function to filter addons by type
export const filterAddOnsByType = (addons: SerializedAddOn[], type: SerializedAddOnServiceType): SerializedAddOn[] => {
    return addons.filter(addon => addon.type === type);
};

// Utility function to check if a project has a specific addon
export const hasAddOn = (addons: SerializedAddOn[], addonType: SerializedAddOnServiceType): boolean => {
    return addons.some(addon => addon.type === addonType && addon.status === "available");
};

// Utility function to get addon by type
export const getAddOnByType = (addons: SerializedAddOn[], addonType: SerializedAddOnServiceType): SerializedAddOn | undefined => {
    return addons.find(addon => addon.type === addonType);
};

// Utility function to get active (non-expired) addons
export const getActiveAddOns = (addons: SerializedAddOn[]): SerializedAddOn[] => {
    return addons.filter(addon => !isAddOnExpired(addon));
};

// Utility function to get addons that are about to expire within a time window (in milliseconds)
export const getAddOnsExpiringSoon = (addons: SerializedAddOn[], timeWindowMs: number): SerializedAddOn[] => {
    const now = Date.now();
    return addons.filter(addon => {
        if (!addon.expires_at) return false;
        const timeUntilExpiry = addon.expires_at - now;
        return timeUntilExpiry > 0 && timeUntilExpiry <= timeWindowMs;
    });
};

// Utility function to sort addons by expiry date (closest to expiry first)
export const sortAddOnsByExpiry = (addons: SerializedAddOn[]): SerializedAddOn[] => {
    return [...addons].sort((a, b) => {
        if (!a.expires_at && !b.expires_at) return 0;
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        return a.expires_at - b.expires_at;
    });
};