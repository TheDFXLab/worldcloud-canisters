import React, { useState } from "react";
import { Principal } from "@dfinity/principal";
import "./FileUploader.css";
import {
  extractZip,
  StaticFile,
  toStaticFiles,
} from "../../utility/compression";
import { sanitizeUnzippedFiles } from "../../utility/sanitize";
import CompleteDeployment from "../CompleteDeployment/CompleteDeployment";
import ProgressBar from "../ProgressBar/ProgressBar";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { ToasterData } from "../Toast/Toaster";
import AssetApi from "../../api/assets/AssetApi";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import MainApi from "../../api/main";
import { Form } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useToaster } from "../../context/ToasterContext/ToasterContext";

interface FileUploaderProps {}

type CanisterType = "website" | "drive";

function FileUploader() {
  /** Hooks */
  const { updateDeployment, refreshDeployments } = useDeployments();
  const { toasterData, setToasterData, setShowToaster } = useToaster();
  const { canisterId } = useParams();
  const { identity } = useIdentity();
  const navigate = useNavigate();

  /** State */
  const [currentBytes, setCurrentBytes] = useState(0);
  const [state, setState] = useState({
    selectedFile: null,
    uploadProgress: 0,
    message: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [totalSize, setTotalSize] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isError, setIsError] = useState(false);

  const [uploadedSize, setUploadedSize] = useState(0);
  const [currentFiles, setCurrentFiles] = useState<StaticFile[] | null>(null);
  const [canisterType, setCanisterType] = useState<CanisterType>("website");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (canisterType === "website") {
      const file = event.target.files?.[0];
      if (file) {
        console.log(`uploaded ${file.name}`);
        setSelectedFile(file);
      }
    } else {
      const files = event.target.files;
      console.log(`all files`, files);
      if (!files) return;
      if (files) {
        console.log(`uploaded ${files.length} files`);
        setSelectedFiles(Array.from(files));
      }
    }
  };

  const handleUploadToCanister = async (unzippedFiles: StaticFile[]) => {
    try {
      const totalSize = unzippedFiles.reduce(
        (acc, file) => acc + file.content.length,
        0
      );

      setTotalSize(totalSize);
      console.log(`Total size of unzipped files: ${totalSize} bytes`);

      let totalUploadedSize = 0;
      // 2MB limit
      if (totalSize < 2000000) {
        const result = await storeAssetsInCanister(unzippedFiles);
        totalUploadedSize += result.uploadedSize ?? 0;
        setUploadedSize(totalUploadedSize);
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

          const totalSize = calculateTotalSize(files);

          setCurrentBytes(currentBytes + totalSize);

          const result = await storeAssetsInCanister(files);
          if (!result) {
            setStatus(`Error: Failed to store batch ${i + 1}`);
          }

          totalUploadedSize += result.uploadedSize ?? 0;

          setUploadedSize(totalUploadedSize);
        }
      }

      await refreshDeployments();
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
      if (!canisterId) {
        throw new Error("Canister ID is required");
      }

      const sanitizedFiles = files.filter(
        (file) => !file.path.includes("MACOS")
      );

      const totalSize = calculateTotalSize(sanitizedFiles);

      // Handle paths
      sanitizedFiles.map((file) => {
        file.path = file.path.startsWith("/") ? file.path : `/${file.path}`;
      });

      setCurrentFiles(sanitizedFiles);

      console.log(
        `Storing files in asset canister ${canisterId} for user: ${identity
          ?.getPrincipal()
          .toText()}`
      );

      const mainApi = await MainApi.create(identity);
      const result = await mainApi?.storeInAssetCanister(
        Principal.fromText(canisterId),
        sanitizedFiles
      );

      if (result && result.status) {
        setUploadedSize(uploadedSize + totalSize);
        return {
          status: true,
          message: `Upload file batch success.`,
          uploadedSize: totalSize,
        };
      } else {
        return {
          status: false,
          message: result?.message ?? "Failed to upload file batch.",
        };
      }
    } catch (error: any) {
      throw { status: false, message: error.message as string };
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const assetApi = new AssetApi();

    if (!(await assetApi.isIdentified(identity))) {
      setIsError(true);
      setStatus("Please connect your wallet first");
      setToasterData({
        headerContent: "Error",
        toastStatus: true,
        toastData: "Please connect your wallet first",
        textColor: "red",
      });
      setShowToaster(true);
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setStatus("Reading zip file...");

    try {
      if (!selectedFile && canisterType === "website") {
        setIsError(true);
        setStatus("Please select a zip file first");
        setToasterData({
          headerContent: "Error",
          toastStatus: true,
          toastData: "Please select a zip file first",
          textColor: "red",
        });
        setShowToaster(true);
        return;
      }

      if (selectedFiles.length === 0 && canisterType === "drive") {
        setIsError(true);
        setStatus("Please select at least one file");
        setToasterData({
          headerContent: "Error",
          toastStatus: true,
          toastData: "Please select at least one file",
          textColor: "red",
        });
        setShowToaster(true);
        return;
      }

      setToasterData({
        headerContent: "Uploading",
        toastStatus: true,
        toastData: "Uploading zip file. Do not refresh the page.",
        textColor: "green",
        timeout: 5000,
      });
      setShowToaster(true);

      // Simulate file reading progress
      setProgress(10);
      let files: StaticFile[] = [];
      if (canisterType === "website") {
        if (!selectedFile) {
          throw new Error("No file selected");
        }
        const unzippedFiles = await extractZip(selectedFile);
        files = unzippedFiles;
      } else {
        if (selectedFiles.length === 0) {
          throw new Error("No files selected");
        }
        const staticFiles = await toStaticFiles(selectedFiles);
        files = staticFiles;
      }

      setProgress(30);
      setStatus("Processing files...");

      const sanitizedFiles =
        canisterType === "website" ? sanitizeUnzippedFiles(files) : files;
      console.log(`Sanitized files: `, sanitizedFiles);
      setProgress(50);
      setStatus("Uploading to canister...");

      const result = await handleUploadToCanister(sanitizedFiles);

      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Upload complete!`,
        textColor: "green",
      });
      setShowToaster(true);

      if (result.status) {
        setProgress(100);
        setStatus("Upload complete!");
        setIsComplete(true);
      } else {
        setIsError(true);
        setStatus(`Error: ${result.message}`);
      }
    } catch (error: any) {
      setIsError(true);
      setStatus(`Error: ${error.message}`);
      setToasterData({
        headerContent: "Error",
        toastStatus: true,
        toastData: `Error: ${error.message}`,
        textColor: "red",
        timeout: 5000,
      });
      setShowToaster(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSummary = () => {
    setIsComplete(true);
    navigate("/");
    // setCanisterId("");
  };

  if (isComplete) {
    return (
      <CompleteDeployment
        canisterId={canisterId}
        totalSize={totalSize}
        dateCreated={new Date()}
        // setCanisterId={setCanisterId}
        onCloseModal={handleCloseSummary}
      />
    );
  }

  return (
    <div className="zip-uploader">
      <p className="step-title">
        Your canister is deployed with principal:{" "}
        <span style={{ fontWeight: "bold" }}>{canisterId}</span>
      </p>

      <div className="type-selector mb-4">
        <Form.Select
          value={canisterType}
          onChange={(e) => setCanisterType(e.target.value as CanisterType)}
        >
          <option value="website">Website Canister</option>
          <option value="drive">Drive Canister</option>
        </Form.Select>
      </div>

      <p className="step-title">
        {canisterType === "website"
          ? "Upload the zip file containing your website assets."
          : "Upload files to your drive canister."}
      </p>

      <form onSubmit={handleUpload}>
        <div className="upload-container">
          <div className="file-input-group">
            <input
              type="file"
              accept={canisterType === "website" ? ".zip" : "*"}
              onChange={handleFileSelect}
              disabled={isLoading}
              multiple={canisterType === "drive"}
            />
          </div>
          <div className="button-container">
            <button
              type="submit"
              disabled={
                (!selectedFile && canisterType === "website") ||
                (selectedFiles.length === 0 && canisterType === "drive") ||
                isLoading
              }
            >
              {isLoading
                ? "Uploading..."
                : `Upload ${canisterType === "website" ? "Zip" : "Files"}`}
            </button>
          </div>
        </div>

        <ProgressBar
          progress={progress}
          status={status}
          isLoading={isLoading}
          isError={isError}
          showPercentage={true}
          files={currentFiles}
          totalBytes={totalSize}
          uploadedSize={uploadedSize}
        />
      </form>
    </div>
  );
}

export default FileUploader;
