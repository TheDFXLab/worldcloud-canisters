export const environment = process.env.DFX_NETWORK || "local";
export const getCanisterUrl = (canisterId: string, envOverride?: string) => {
    let res = "";
    if (envOverride) {
        res = envOverride == "ic"
            ? `https://${canisterId}.icp0.io`
            : `http://${canisterId}.localhost:8000`;

    }

    res = environment === "ic"
        ? `https://${canisterId}.icp0.io`
        : `http://${canisterId}.localhost:8000`;
    return res;
};

const replica_port = environment === "ic" ? 4943 : 8000;
const replica_host = environment === "ic" ? "icp0.io" : "localhost";
export const http_host = environment === "ic" ? "icp0.io" : `http://localhost:${replica_port}`;
export const frontend_canister_id = process.env.CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_FRONTEND || "";
export const backend_canister_id = process.env.CANISTER_ID_MIGRATOR_MANAGEMENT_CANISTER_BACKEND || "";
export const icp_ledger_canister_id = process.env.CANISTER_ID_ICP_LEDGER_CANISTER || "";
export const internet_identity_canister_id = process.env.CANISTER_ID_INTERNET_IDENTITY || "";

export const frontend_canister_id_url = environment === "local" ? `http://${frontend_canister_id}.${replica_host}:${replica_port}` : `https://${frontend_canister_id}.icp0.io/`;
export const ledger_canister_id_url = environment === "local" ? `http://${icp_ledger_canister_id}.${replica_host}:${replica_port}` : `https://${icp_ledger_canister_id}.icp0.io/`;
export const internet_identity_canister_id_url = environment === "local" ? `http://${internet_identity_canister_id}.${replica_host}:${replica_port}` : `https://identity.ic0.app`;
const _dev_env = {
    github_client_id: "Ov23li8TWtkI36y5Mzr5"
}

export const internetIdentityConfig = {
    identityProvider: internet_identity_canister_id_url,
    loggedOutPrincipal: "2vxsx-fae",
    loginExpiryInHours: 1, // in hours
}


export const githubClientId = environment == "ic" ? process.env.REACT_APP_GITHUB_CLIENT_ID || "" : _dev_env.github_client_id;
export const githubClientSecret = process.env.REACT_APP_GITHUB_CLIENT_SECRET || ""; // TODO: Remove this

export const ngrok_tunnel = "https://a3ba5b2b8926.ngrok-free.app";
export const reverse_proxy_url = environment === "ic" ? process.env.REACT_APP_REVERSE_PROXY_REMOTE_URL : "http://localhost:8080";
// export const reverse_proxy_url = process.env.REACT_APP_REVERSE_PROXY_REMOTE_URL || "";
export const frontend_url = environment === "ic" ? `https://${frontend_canister_id}.icp0.io` : ngrok_tunnel;

export const cors_sh_api_key = process.env.REACT_APP_CORS_SH_API_KEY || "";
export const sign_message_prefix = "WorldCloud";