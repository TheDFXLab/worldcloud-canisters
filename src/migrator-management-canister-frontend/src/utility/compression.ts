import JSZip from "jszip";

export interface StaticFile {
    path: string;
    content_type: string;
    content_encoding: [string] | [];
    content: Uint8Array;
}

export const extractZip = async (zipFile: File) => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(zipFile);
    const files: StaticFile[] = [];

    // Process each file in the zip
    for (const [path, file] of Object.entries(contents.files)) {
        // Skip directories
        if (file.dir) continue;

        // Read file content as Uint8Array
        const content = await file.async('uint8array');

        // Determine content type (you might want to expand this)
        const contentType = getContentType(path);

        files.push({
            path: path,
            content_type: contentType,
            content_encoding: [],
            content: content,
        });
    }

    return files;
};


const getContentType = (path: string) => {
    const extension = path.split('.').pop()?.toLowerCase();
    if (!extension) return 'application/octet-stream';
    const contentTypes: Record<string, string> = {
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
    };
    return contentTypes[extension] || 'application/octet-stream';
};