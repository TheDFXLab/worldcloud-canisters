import { reverse_proxy_url, sign_message_prefix } from "../../config/config";
import { HttpAgent, Identity } from "@dfinity/agent";
import MainApi from "../main";
import AuthState from "../../state/AuthState";
interface LoginPayload {
    message: string, signature: string, publicKey: string
}

class AuthApi {
    constructor() { }

    // Performs challenge-response authentication with off-chain backend
    public async signIn(identity: Identity, agent: HttpAgent, setMessage: (message: string) => void) {
        try {
            const principal = identity.getPrincipal().toText();

            setMessage("Requesting challenge message to sign...");

            // Request challenge message from off-chain
            const url = new URL('/auth/challenge', reverse_proxy_url);
            url.searchParams.append('principal', principal);
            const challengeResponse = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!challengeResponse.ok) {
                const error = await challengeResponse.text();
                throw new Error(`Challenge request failed: ${error}`);
            }

            // Message to sign, optionally show to user
            const { message } = await challengeResponse.json();

            setMessage("Ensuring secure sign in...");

            // Get identity's derivced public key from backend canister
            const mainApi = await MainApi.create(identity, agent);
            const publicKeyResult = await mainApi?.getPublicKey();
            if (!publicKeyResult) {
                throw new Error(`Failed to get public key: ${publicKeyResult}`);
            }

            setMessage("Signing message...");

            // Sign the message via backend canister
            const signatureHex = await mainApi?.signMessage(message);
            if (!signatureHex) {
                throw new Error(`Failed to sign message: ${signatureHex}`);
            }

            setMessage("Logging in...");

            // Create login URL
            const loginUrl = new URL('/auth/login', reverse_proxy_url);

            // Send only signature and public key
            const response = await fetch(loginUrl.toString(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message,
                    publickey: publicKeyResult,
                    signature: signatureHex
                })

            });

            const data = await response.json();

            // Set access token in cookies
            const authState = AuthState.getInstance();
            authState.setAccessToken(data.token);
            return data;
        } catch (error) {
            console.error("Error signing in:", error);
            throw error;
        }
    }

    // Clears access token from cookies
    async signOut() {
        const authState = AuthState.getInstance();
        authState.clearAccessToken();
    }

}

export default AuthApi;