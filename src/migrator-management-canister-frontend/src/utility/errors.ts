export const decodeError = (error: string) => {
    if (error.includes("Only the controllers of the canister")) {
        return { message: "You are not a controller" };
    }
    //add more
}