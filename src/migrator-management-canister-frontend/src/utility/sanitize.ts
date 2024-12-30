import { StaticFile } from "./compression";

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

    console.log(`indexHtmlPath: `, indexHtmlPath);
    const rootDir = indexHtmlPath.split("index.html")[0];

    console.log(`Root directory path: `, rootDir);

    if (rootDir.length == 0) {
        return unzippedFiles;
    }

    const sanitizedFiles = unzippedFiles.map((file) => {
        const split = file.path.split(`${rootDir}`);
        console.log(`split: `, split);
        return { ...file, path: split.length > 1 ? split[1] : split[0] }
    })

    return sanitizedFiles;
}