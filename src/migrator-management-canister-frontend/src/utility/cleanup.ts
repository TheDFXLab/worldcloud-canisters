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
        'freemium',
        'projects'
    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));
};