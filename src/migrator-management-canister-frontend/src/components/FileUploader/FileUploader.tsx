import React, { useState } from "react";
import { migrator_management_canister_backend } from "../../../../declarations/migrator-management-canister-backend";

import { Principal } from "@dfinity/principal";

import "./FileUploader.css";
import { extractZip, StaticFile } from "../../utility/compression";

function FileUploader() {
  const [state, setState] = useState({
    selectedFile: null,
    uploadProgress: 0,
    message: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [canisterId, setCanisterId] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus(`Selected file: ${file.name}`);
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
        console.log(`File length under threhsold`);
        return await storeAssetsInCanister(unzippedFiles);
      } else {
        const totalBatches = Math.ceil(totalSize / 2000000);
        console.log(`total batches`, totalBatches);
        const BATCH_SIZE_LIMIT = 2000000; // 2MB

        // Create batches based on cumulative file sizes
        const batches: StaticFile[][] = [];
        let currentBatch: StaticFile[] = [];
        let currentBatchSize = 0;

        for (const file of unzippedFiles) {
          if (file.path == "index.html") {
            file.path = "/index.html";
          }
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
          console.log(`Files: `, files);

          const result = await storeAssetsInCanister(files);
          if (!result) {
            setStatus(`Error: Failed to store batch ${i + 1}`);
            // throw { status: false, message: `Failed to store batch ${i + 1}` };
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

  const storeAssetsInCanister = async (files: StaticFile[]) => {
    try {
      console.log(`Storing ${files.length} files in canister`, files);
      const sanitizedFiles = files.filter(
        (file) => !file.path.includes("MACOS")
      );

      // Handle paths
      sanitizedFiles.map((file) => {
        file.path = file.path.startsWith("/") ? file.path : `/${file.path}`;
      });

      console.log(`sanitized files`, sanitizedFiles);
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
      console.log(`Unzipped ${unzippedFiles.length} files`);

      setStatus("Uploading files to canister...");

      const result = await handleUploadToCanister(unzippedFiles);

      if (result) {
        setStatus(result.message);
        // Update progress
        setState((prev) => ({
          ...prev,
          uploadProgress: 100,
          message: `Uploading files: 100%`,
        }));
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

  return (
    <div className="zip-uploader">
      <h2>Upload Zip Folder</h2>
      <form onSubmit={handleUpload}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Canister ID"
            value={canisterId}
            onChange={(e) => setCanisterId(e.target.value)}
          />
          <input
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            disabled={isLoading}
          />
        </div>
        <div className="form-group">
          <button type="submit" disabled={!selectedFile || isLoading}>
            {isLoading ? "Uploading..." : "Upload Zip"}
          </button>
        </div>
        {status && (
          <div
            className={`status ${
              status.includes("Error") ? "error" : "success"
            }`}
          >
            {status}
          </div>
        )}
      </form>
      <div className="progress">
        {state.uploadProgress > 0 && (
          <progress value={state.uploadProgress} max="100" />
        )}
      </div>
      <div className="message">{state.message}</div>
    </div>
  );
}

export default FileUploader;
