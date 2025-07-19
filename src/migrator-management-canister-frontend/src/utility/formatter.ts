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

export const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const shortenPrincipal = (principal: string) => {
    return `${principal.substring(0, 10)}...${principal.substring(principal.length - 10)}`;
};

export const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    // For timestamps less than a minute ago
    if (diffInSeconds < 60) {
        return 'just now';
    }
    // For timestamps less than an hour ago
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    // For timestamps less than a day ago
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    // For timestamps less than a week ago
    if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    // For older timestamps, use the full date format
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
