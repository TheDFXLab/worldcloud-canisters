import { Principal } from "@dfinity/principal";

export const isLoggedOutPrincipal = (principal: Principal) => {
    return principal.toText() === "2vxsx-fae";
};
