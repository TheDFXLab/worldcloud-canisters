// Helper function to determine badge color based on content type
export const getTypeBadgeColor = (contentType: string): string => {
    if (contentType.startsWith('image')) return 'info';
    if (contentType.startsWith('text')) return 'success';
    if (contentType.includes('octet-stream')) return 'warning';
    return 'secondary';
};

// Add this to utils/formatters.ts
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const shortenPrincipal = (principal: string) => {
    return `${principal.substring(0, 10)}...${principal.substring(principal.length - 10)}`;
};

export const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'N/A';

    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
