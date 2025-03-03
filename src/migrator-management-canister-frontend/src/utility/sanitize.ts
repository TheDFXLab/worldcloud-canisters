import { StaticFile } from "./compression";
import { Principal } from "@dfinity/principal";

export const sanitizeUnzippedFiles = (unzippedFiles: StaticFile[]) => {

    const blacklist = ["__MACOSX", ".DS_Store"];
    unzippedFiles = unzippedFiles.filter((file) => !blacklist.some((blacklisted) => file.path.includes(blacklisted)));

    const rootDirPath = unzippedFiles.map((file) => file.path.endsWith("index.html") ? file.path : null).filter((path) => path !== null);

    if (rootDirPath.length === 0) {
        throw new Error("No root directory found");
    }

    if (rootDirPath.length > 1) {
        throw new Error("Multiple root directories found");
    }

    const indexHtmlPath = rootDirPath[0];

    const rootDir = indexHtmlPath.split("index.html")[0];

    if (rootDir.length == 0) {
        return unzippedFiles;
    }

    const sanitizedFiles = unzippedFiles.map((file) => {
        const split = file.path.split(`${rootDir}`);
        return { ...file, path: split.length > 1 ? split[1] : split[0] }
    })

    return sanitizedFiles;
}


export const sanitizeObject = (obj: any): any => {
    obj = sanitizeBigInt(obj);
    obj = sanitizePrincipal(obj);
    return obj;
}

export const sanitizePrincipal = (obj: any): any => {
    // Handle null/undefined
    if (obj == null) {
        return obj;
    }

    // Handle primitives
    if (typeof obj !== 'object') {
        return obj;
    }

    // Handle Principal objects directly
    if (obj instanceof Principal) {
        return obj.toText();
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(sanitizePrincipal);
    }

    // Handle raw Principal-like objects
    if (obj._isPrincipal === true && '_arr' in obj) {
        try {
            return Principal.fromUint8Array(
                new Uint8Array(Object.values(obj._arr))
            ).toText();
        } catch (error) {
            console.error('Failed to convert Principal-like object:', error);
            return null;
        }
    }

    // Handle objects recursively
    const newObj: Record<string, any> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = sanitizePrincipal(obj[key]);
        }
    }
    return newObj;
};

export const sanitizeBigInt = (obj: any): any => {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'bigint') {
        return Number(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeBigInt(item));
    }

    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = sanitizeBigInt(obj[key]);
        }
        return newObj;
    }

    return obj;
}
