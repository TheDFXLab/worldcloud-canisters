export const getCanisterUrl = (canisterId: string) => {
    return process.env.REACT_APP_ENVIRONMENT === "production"
        ? `https://${canisterId}.icp0.io`
        : `http://${canisterId}.localhost:4943`;
};
