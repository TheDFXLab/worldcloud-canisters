// TODO: Remove github token
export const clearUserData = () => {
    const keysToRemove = [
        'adminStatus',
        'subscription',
        'userBalance',
        'connectionStatus',
        'totalCredits',
        'ic-identity',
        'ic-delegation',

    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));
};