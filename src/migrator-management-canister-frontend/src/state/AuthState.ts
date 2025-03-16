import Cookies from "js-cookie";
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

    public getAccessToken() {
        const token = Cookies.get("jwt");
        if (!token) {
            throw new Error("No access token found");
        }
        return token;
    }

    public setAccessToken(token: string) {
        Cookies.set("jwt", token);
    }

    public clearAccessToken() {
        Cookies.remove("jwt");
    }
}

export default AuthState;