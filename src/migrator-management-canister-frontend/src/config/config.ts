export const getCanisterUrl = (canisterId: string) => {
    return process.env.REACT_APP_ENVIRONMENT === "production"
        ? `https://${canisterId}.icp0.io`
        : `http://${canisterId}.localhost:4943`;
};

export const backend_canister_id = process.env.CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_BACKEND || "";
export const icp_ledger_canister_id = process.env.CANISTER_ID_INTERNET_IDENTITY || "";
console.log(`ICP canister id`, icp_ledger_canister_id)
export const internetIdentityConfig = {
    identityProvider: `http://${icp_ledger_canister_id}.localhost:4943/`,
    loggedOutPrincipal: "2vxsx-fae",
    loginExpiryInHours: 1, // in hours
}
