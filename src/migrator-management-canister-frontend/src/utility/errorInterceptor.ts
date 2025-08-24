
let disconnectFunction: (() => Promise<boolean>) | null = null;

export const setGlobalDisconnectFunction = (disconnect: () => Promise<boolean>) => {
    disconnectFunction = disconnect;
};

// Intercept all fetch calls globally
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    try {
        const response = await originalFetch(...args);

        // Check if response indicates delegation expiry
        if (response.status === 400) {
            // const responseText = await response.text();
            // const error = { message: responseText, status: 400 };

            if (disconnectFunction) {
                // if (isDelegationExpiryError(error) && disconnectFunction) {
                // debugger;
                await disconnectFunction();
                // await handleDelegationExpiry(disconnectFunction);
            }
        }

        return response;
    } catch (error) {
        // Check if the error itself indicates delegation expiry
        if (isDelegationExpiryError(error) && disconnectFunction) {
            // await handleDelegationExpiry(disconnectFunction);
            await disconnectFunction();

        }
        throw error;
    }
};

export const isDelegationExpiryError = (error: any) => {
    if (error.message.includes("Invalid delegation expiry:")) {
        return true;
    }
    return false;
}