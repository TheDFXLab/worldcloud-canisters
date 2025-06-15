import Cookies from "js-cookie";

type AuthKey = "jwt" | "github_token"

class AuthState {
    private static instance: AuthState;

    private constructor() {
    }

    public static getInstance(): AuthState {
        if (!AuthState.instance) {
            AuthState.instance = new AuthState();
        }
        return AuthState.instance;
    }

    public getAccessToken(key: AuthKey) {
        const token = Cookies.get(key);
        if (!token) {
            throw new Error("No access token found, in authstate");
        }
        return token;
    }

    public setAccessToken(key: AuthKey, token: string) {
        Cookies.set(key, token);
    }

    public clearAccessToken(key: AuthKey) {
        Cookies.remove(key);
    }
}

export default AuthState;