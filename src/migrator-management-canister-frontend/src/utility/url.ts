export interface RequestCodeResponse {
    device_code: string;
    expires_in: string;
    interval: string;
    user_code: string;
    verification_uri: string;
}
export const parse_get_device_code_response = (response_text: string): RequestCodeResponse => {

    // 1. Extract the part before the first period (.)
    const queryString = response_text.split(".")[0];

    // 2. Parse with URLSearchParams
    const params = new URLSearchParams(queryString);

    const device_code = params.get("device_code");
    const expires_in = params.get("expires_in");
    const interval = params.get("interval");
    const user_code = params.get("user_code");
    const verification_uri = params.get("verification_uri");

    if (!device_code || !expires_in || !interval || !user_code || !verification_uri) throw new Error(`Device code not found`);

    return {
        device_code,
        expires_in,
        interval,
        user_code,
        verification_uri: "https://github.com/login/device",
    };
}

export function parse_github_query_response(raw: string) {
    // Extract the part before the first period (.)
    const queryString = raw.split(".")[0];

    // Parse with URLSearchParams
    const params = new URLSearchParams(queryString);

    // Convert to a plain object
    const result: Record<string, string | string[]> = {};
    for (const key of params.keys()) {
        const allValues = params.getAll(key).map(decodeURIComponent);
        result[key] = allValues.length > 1 ? allValues : allValues[0];
    }
    return result;
}