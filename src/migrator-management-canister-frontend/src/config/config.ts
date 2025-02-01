export const environment = process.env.DFX_NETWORK || "local";
export const getCanisterUrl = (canisterId: string) => {
    return environment === "production"
        ? `https://${canisterId}.icp0.io`
        : `http://${canisterId}.localhost:8000`;
};

const replica_port = environment === "production" ? 4943 : 8000;
const replica_host = environment === "production" ? "icp0.io" : "localhost";
export const http_host = environment === "production" ? "icp0.io" : `http://localhost:${replica_port}`;
export const frontend_canister_id = process.env.CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_FRONTEND || "";
export const backend_canister_id = process.env.CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_BACKEND || "";
export const icp_ledger_canister_id = process.env.CANISTER_ID_ICP_LEDGER_CANISTER || "";
export const internet_identity_canister_id = process.env.CANISTER_ID_INTERNET_IDENTITY || "";

export const frontend_canister_id_url = environment === "local" ? `http://${frontend_canister_id}.${replica_host}:${replica_port}` : `https://${frontend_canister_id}.icp0.io/`;
export const ledger_canister_id_url = environment === "local" ? `http://${icp_ledger_canister_id}.${replica_host}:${replica_port}` : `https://${icp_ledger_canister_id}.icp0.io/`;
export const internet_identity_canister_id_url = environment === "local" ? `http://${internet_identity_canister_id}.${replica_host}:${replica_port}` : `https://${internet_identity_canister_id}.icp0.io/`;

export const internetIdentityConfig = {
    identityProvider: internet_identity_canister_id_url,
    loggedOutPrincipal: "2vxsx-fae",
    loginExpiryInHours: 1, // in hours
}


export const githubClientId = process.env.REACT_APP_GITHUB_CLIENT_ID || "";
export const githubClientSecret = process.env.REACT_APP_GITHUB_CLIENT_SECRET || ""; // TODO: Remove this

export const ngrok_tunnel = "https://1172-78-109-71-103.ngrok-free.app";
export const reverse_proxy_url = "https://cors-anywhere.herokuapp.com";