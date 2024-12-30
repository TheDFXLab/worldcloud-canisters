import React, { useState } from "react";
import { migrator_management_canister_backend } from "../../../../declarations/migrator-management-canister-backend";

import { Principal } from "@dfinity/principal";

import "./FileUploader.css";
import { extractZip, StaticFile } from "../../utility/compression";
import { sanitizeUnzippedFiles } from "../../utility/sanitize";
import CompleteDeployment from "../CompleteDeployment/CompleteDeployment";

function FileUploader({ canisterId }: { canisterId: string }) {
  const [state, setState] = useState({
    selectedFile: null,
    uploadProgress: 0,
    message: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // const [canisterId, setCanisterId] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [totalSize, setTotalSize] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadToCanister = async (unzippedFiles: StaticFile[]) => {
    try {
      console.log(`Unzipped files`, unzippedFiles);

      const totalSize = unzippedFiles.reduce(
        (acc, file) => acc + file.content.length,
        0
      );
      console.log(`Total size of unzipped files: ${totalSize} bytes`);

      // 2MB limit
      if (totalSize < 2000000) {
        return await storeAssetsInCanister(unzippedFiles);
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
          console.log(`Storing batch ${i + 1} of ${batches.length}`);
          const files = batches[i];

          const totalSize = calculateTotalSize(files);
          console.log(`Total size of files: ${totalSize / 1000000} MBytes`);

          const result = await storeAssetsInCanister(files);
          if (!result) {
            setStatus(`Error: Failed to store batch ${i + 1}`);
          }
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

  const calculateTotalSize = (files: StaticFile[]) => {
    return files.reduce((acc, file) => acc + file.content.length, 0);
  };

  const storeAssetsInCanister = async (files: StaticFile[]) => {
    try {
      console.log(`Storing ${files.length} files in canister`);

      const sanitizedFiles = files.filter(
        (file) => !file.path.includes("MACOS")
      );

      const totalSize = calculateTotalSize(sanitizedFiles);
      console.log(`Total size of files: ${totalSize / 1000000} MBytes`);

      // Handle paths
      sanitizedFiles.map((file) => {
        file.path = file.path.startsWith("/") ? file.path : `/${file.path}`;
      });

      console.log(`Target canister: ${canisterId}`);
      const result =
        await migrator_management_canister_backend.storeInAssetCanister(
          Principal.fromText(canisterId),
          sanitizedFiles
        );

      if ("ok" in result) {
        return { status: true, message: `Success ${result.ok}` };
      } else {
        return { status: false, message: `Error: ${result.err}` };
      }
    } catch (error: any) {
      throw { status: false, message: error.message as string };
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setStatus("Please select a zip file first");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("Reading zip file...");

      // Update progress
      setState((prev) => ({
        ...prev,
        uploadProgress: 0,
        message: `Uploading files: 0%`,
      }));

      const unzippedFiles = await extractZip(selectedFile);

      const sanitizedFiles = sanitizeUnzippedFiles(unzippedFiles);

      console.log(`Unzipped ${unzippedFiles.length} files`, unzippedFiles);
      console.log(`Sanitized files`, sanitizedFiles);

      setStatus("Uploading files to canister...");

      const result = await handleUploadToCanister(sanitizedFiles);

      if (result) {
        setStatus(result.message);
        // Update progress
        setState((prev) => ({
          ...prev,
          uploadProgress: 100,
          message: `Uploading files: 100%`,
        }));

        // Calculate total size from unzipped files
        const totalSize = unzippedFiles.reduce(
          (acc, file) => acc + file.content.length,
          0
        );
        setTotalSize(totalSize);
        setIsComplete(true);
      } else {
        setStatus(`Error: ${result}`);
        // Update progress
        setState((prev) => ({
          ...prev,
          uploadProgress: 0,
          message: `Upload failed.`,
        }));
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isComplete) {
    return (
      <CompleteDeployment
        canisterId={canisterId}
        totalSize={totalSize}
        dateCreated={new Date()}
      />
    );
  }

  return (
    <div className="zip-uploader">
      <h2>Website Assets</h2>
      <p className="step-title">
        Your website canister is deployed with principal:{" "}
        <span style={{ fontWeight: "bold" }}>{canisterId}</span>
      </p>
      <p className="step-title">
        Upload the zip file containing your website assets.
      </p>
      <form onSubmit={handleUpload}>
        <div className="upload-container">
          <div className="file-input-group">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              disabled={isLoading}
            />
          </div>
          <div className="button-container">
            <button type="submit" disabled={!selectedFile || isLoading}>
              {isLoading ? "Uploading..." : "Upload Zip"}
            </button>
          </div>
        </div>
        <div className="status-container">
          {status && (
            <div
              className={`status ${
                status.includes("Error") ? "error" : "success"
              }`}
            >
              {status}
            </div>
          )}
          <div className="progress">
            {state.uploadProgress > 0 && (
              <progress value={state.uploadProgress} max="100" />
            )}
          </div>
          <div className="message">{state.message}</div>
        </div>
      </form>
    </div>
  );
}

export default FileUploader;
