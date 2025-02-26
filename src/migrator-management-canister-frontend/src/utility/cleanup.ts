export const clearUserData = () => {
    const keysToRemove = [
        'adminStatus',
        'subscription',
        'userBalance',
        'connectionStatus',
        'totalCredits'
    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));
};