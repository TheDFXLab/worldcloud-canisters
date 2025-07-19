import { HttpAgent, Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import MainApi from "../main";
import { extractZip, StaticFile } from "../../utility/compression";
import { sanitizeUnzippedFiles } from "../../utility/sanitize";
import { WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";

class FileUploadApi {
    constructor() {
    }

    async isIdentified(identity: Identity | null, agent: HttpAgent) {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        return mainApi.idenitified;
    }

    async uploadFromZip(zipFile: File, projectId: bigint, identity: Identity | null, workflowRunDetails: WorkflowRunDetails, agent: HttpAgent) {
        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
            throw new Error("Failed to create main api");
        }
        const sanitizedFiles = await this.processZipFile(zipFile);

        return await this.handleUploadToCanister(sanitizedFiles, projectId, identity, workflowRunDetails, agent);

    }

    private async handleUploadToCanister(unzippedFiles: StaticFile[], projectId: bigint, identity: Identity | null, workflowRunDetails: WorkflowRunDetails, agent: HttpAgent) {
        try {
            const totalSize = unzippedFiles.reduce(
                (acc, file) => acc + file.content.length,
                0
            );

            let totalUploadedSize = 0;
            // 2MB limit
            if (totalSize < 2000000) {
                const result = await this.storeAssetsInCanister(unzippedFiles, projectId, identity, workflowRunDetails, 1, 1, agent);
                totalUploadedSize += result.uploadedSize ?? 0;
                // setUploadedSize(totalUploadedSize);
            } else {
                const BATCH_SIZE_LIMIT = 2000000; // 1.8MB

                const totalBatches = Math.ceil(totalSize / BATCH_SIZE_LIMIT);

                let batchCount = 0;
                // Split large files into chunks
                const processedFiles: StaticFile[] = [];
                for (const file of unzippedFiles) {
                    if (file.content.length > BATCH_SIZE_LIMIT) {
                        batchCount++;

                        // Split large file into chunks
                        const chunks = Math.ceil(file.content.length / BATCH_SIZE_LIMIT);
                        for (let i = 0; i < chunks; i++) {
                            const start = i * BATCH_SIZE_LIMIT;
                            const end = Math.min(
                                (i + 1) * BATCH_SIZE_LIMIT,
                                file.content.length
                            );
                            const chunk = file.content.slice(start, end);
                            processedFiles.push({
                                ...file,
                                path: file.path,
                                content: chunk,
                                is_chunked: true,
                                chunk_id: BigInt(i),
                                batch_id: BigInt(batchCount),
                                is_last_chunk: i === chunks - 1,
                            });
                        }
                    } else {
                        processedFiles.push(file);
                    }
                }

                // Create batches based on cumulative file sizes
                const batches: StaticFile[][] = [];
                let currentBatch: StaticFile[] = [];
                let currentBatchSize = 0;

                for (const file of processedFiles) {
                    if (currentBatchSize + file.content.length > BATCH_SIZE_LIMIT) {
                        // Current batch would exceed limit, start a new batch
                        if (currentBatch.length > 0) {
                            batches.push(currentBatch);
                        }
                        currentBatch = [file];
                        currentBatchSize = file.content.length;
                    } else {
                        // Add to current batch
                        currentBatch.push(file);
                        currentBatchSize += file.content.length;
                    }
                }

                // Add the last batch if it's not empty
                if (currentBatch.length > 0) {
                    batches.push(currentBatch);
                }

                for (let i = 0; i < batches.length; i++) {
                    const files = batches[i];

                    const totalSize = this.calculateTotalSize(files);

                    const result = await this.storeAssetsInCanister(files, projectId, identity, workflowRunDetails, i + 1, batches.length, agent);
                    if (!result) {
                        console.log(`Error: Failed to store batch ${i + 1}`);
                    }

                    totalUploadedSize += result.uploadedSize ?? 0;

                }
            }

            return {
                status: true,
                message: "Successfully uploaded all files to canister",
            };
        } catch (error: any) {
            return {
                status: false,
                message: error.message as string,
            };
        }
    };

    private async storeAssetsInCanister(
        files: StaticFile[],
        projectId: bigint,
        identity: Identity | null,
        workflowRunDetails: WorkflowRunDetails,
        currentBatch: number,
        totalBatchCount: number,
        agent: HttpAgent
    ) {
        try {
            const sanitizedFiles = files.filter(
                (file) => !file.path.includes("MACOS")
            );

            const totalSize = this.calculateTotalSize(sanitizedFiles);

            // Handle paths
            sanitizedFiles.map((file) => {
                file.path = file.path.startsWith("/") ? file.path : `/${file.path}`;
            });

            const mainApi = await MainApi.create(identity, agent);
            const result = await mainApi?.storeInAssetCanister(
                projectId,
                sanitizedFiles,
                currentBatch,
                totalBatchCount,
                workflowRunDetails,
            );

            if (result) {
                return {
                    status: true,
                    message: `Upload file batch success.`,
                    uploadedSize: totalSize,
                };
            } else {
                return {
                    status: false,
                    message: result ?? "Failed to upload file batch.",
                };
            }
        } catch (error: any) {
            throw { status: false, message: error.message as string };
        }
    };


    private async processZipFile(zipFile: File) {
        let files: StaticFile[] = [];

        const unzippedFiles = await extractZip(zipFile);
        files = unzippedFiles;


        const sanitizedFiles = sanitizeUnzippedFiles(files);
        return sanitizedFiles;
    }

    private calculateTotalSize(files: StaticFile[]) {
        return files.reduce((acc, file) => acc + file.content.length, 0);
    };


}

export default FileUploadApi;
