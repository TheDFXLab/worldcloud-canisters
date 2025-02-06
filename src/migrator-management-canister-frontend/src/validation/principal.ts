import { Principal } from "@dfinity/principal";

export const isValidPrincipal = (address: string): boolean => {
    const principal = Principal.fromText(address);
    if (!principal) {
        return false;
    }
    return true;
}