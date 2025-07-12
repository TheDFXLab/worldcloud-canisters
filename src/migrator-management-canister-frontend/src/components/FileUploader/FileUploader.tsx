import React, { useState, useRef, useEffect } from "react";
import { Principal } from "@dfinity/principal";
import "./FileUploader.css";
import {
  extractZip,
  StaticFile,
  toStaticFiles,
} from "../../utility/compression";
import { sanitizeUnzippedFiles } from "../../utility/sanitize";
import CompleteDeployment from "../CompleteDeployment/CompleteDeployment";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import AssetApi from "../../api/assets/AssetApi";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import MainApi from "../../api/main";
import { Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { useProgress } from "../../context/ProgressBarContext/ProgressBarContext";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import DeleteIcon from "@mui/icons-material/Delete";
import HeaderCard from "../HeaderCard/HeaderCard";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { useHeaderCard } from "../../context/HeaderCardContext/HeaderCardContext";

interface FileUploaderProps {}

type CanisterType = "website" | "drive";

function FileUploader({ project_id }: { project_id: bigint }) {
  /** Hooks */
  const { updateDeployment, refreshDeployments } = useDeployments();
  const { toasterData, setToasterData, setShowToaster } = useToaster();
  const { canisterId } = useParams();
  const { identity } = useIdentity();
  const navigate = useNavigate();
  const { setIsLoadingProgress, setIsEnded } = useProgress();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setActionBar } = useActionBar();
  const { agent } = useHttpAgent();
  const { setHeaderCard } = useHeaderCard();

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
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setHeaderCard({
      description: `Your canister is deployed with principal ${canisterId}`,
      title: "Upload the zip file containing your website assets.",
      className: "deployment-header",
    });
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (canisterType === "website") {
      const file = event.target.files?.[0];
      if (file) {
        if (file.name.endsWith(".zip")) {
          setSelectedFile(file);
          setStatus("ready");
        } else {
          setStatus("error");
          setSelectedFile(null);
        }
      }
    } else {
      const files = event.target.files;
      if (!files) return;
      setSelectedFiles(Array.from(files));
      setStatus("ready");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (canisterType === "website") {
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".zip")) {
        setSelectedFile(file);
        setStatus("ready");
      } else {
        setStatus("error");
        setSelectedFile(null);
      }
    } else {
      const files = e.dataTransfer.files;
      setSelectedFiles(Array.from(files));
      setStatus("ready");
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionBar(null);
    setSelectedFile(null);
    setSelectedFiles([]);
    setStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadToCanister = async (unzippedFiles: StaticFile[]) => {
    try {
      const totalSize = unzippedFiles.reduce(
        (acc, file) => acc + file.content.length,
        0
      );

      setTotalSize(totalSize);

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

      if (!agent) {
        throw new Error("Agent not found");
      }

      const mainApi = await MainApi.create(identity, agent);
      const result = await mainApi?.storeInAssetCanister(
        project_id,
        sanitizedFiles,
        undefined // since we are uploading files directly from zip
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

  const handleUpload = async () => {
    const assetApi = new AssetApi();
    if (!agent) {
      throw new Error("Agent not found");
    }

    if (!(await assetApi.isIdentified(identity, agent))) {
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
    setIsLoadingProgress(true);

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

      setStatus("Processing files...");

      const sanitizedFiles =
        canisterType === "website" ? sanitizeUnzippedFiles(files) : files;
      setStatus("Uploading to canister...");

      const result = await handleUploadToCanister(sanitizedFiles);

      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Upload complete!`,
        textColor: "green",
      });
      setShowToaster(true);

      setActionBar(null);

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
      setIsLoadingProgress(false);
      setIsEnded(true);
      setActionBar(null);
      setStatus("");
      setSelectedFile(null);
      setSelectedFiles([]);
    }
  };

  const handleCloseSummary = () => {
    setIsComplete(true);
    navigate("/dashboard/websites");
  };

  useEffect(() => {
    if (selectedFile || selectedFiles.length > 0) {
      setActionBar({
        icon: "🚀",
        text: "Ready to deploy your canister",
        buttonText: "Deploy Canister",
        onButtonClick: handleUpload,
        isButtonDisabled: isLoading,
        isHidden: false,
        customButton: renderDeployButton(),
      });
    } else {
      setActionBar(null);
    }
  }, [selectedFile, selectedFiles, isLoading]);

  const renderDeployButton = () => {
    return (
      <div className="button-container">
        <button
          className="next-button"
          onClick={handleUpload}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="loading-container">
              <Spinner animation="border" style={{ color: "white" }} />
              <span className="upload-text">Uploading</span>
            </div>
          ) : (
            `Upload ${canisterType === "website" ? "ZIP" : "Files"}`
          )}
        </button>
      </div>
    );
  };

  if (isComplete) {
    return (
      <CompleteDeployment
        canisterId={canisterId}
        totalSize={totalSize}
        dateCreated={new Date()}
        onCloseModal={handleCloseSummary}
      />
    );
  }

  return (
    <div className="zip-uploader">
      {/* <HeaderCard
        description={`Your canister is deployed with principal ${canisterId}`}
        title="Upload the zip file containing your website assets."
        className="deployment-header"
      /> */}
      <p className="step-title">
        {canisterType === "website"
          ? "Upload the zip file containing your website assets."
          : "Upload files to your drive canister."}
      </p>

      <div
        className={`upload-container ${isDragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={canisterType === "website" ? ".zip" : "*"}
          multiple={canisterType === "drive"}
          style={{ display: "none" }}
        />

        {!selectedFile && selectedFiles.length === 0 && (
          <div className="upload-prompt">
            <CloudUploadIcon className="upload-icon" />
            <p>
              Drag and drop your{" "}
              {canisterType === "website" ? "ZIP file" : "files"} here or click
              to browse
            </p>
            <span className="file-hint">
              {canisterType === "website" ? ".zip files only" : "Any file type"}
            </span>
          </div>
        )}

        {(selectedFile || selectedFiles.length > 0) && (
          <div className="file-info">
            <div className="file-details">
              <span className="file-name">
                {selectedFile?.name || `${selectedFiles.length} files selected`}
              </span>
              <span className="file-size">
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                  : `${
                      selectedFiles.reduce((acc, file) => acc + file.size, 0) /
                      1024 /
                      1024
                    } MB total`}
              </span>
            </div>
            {!isLoading && (
              <button className="remove-file" onClick={clearFile}>
                <DeleteIcon />
              </button>
            )}
          </div>
        )}

        {status === "uploading" && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}

        {status === "success" && (
          <div className="status-message success">
            <CheckCircleIcon />
            <span>Upload successful!</span>
          </div>
        )}

        {status === "error" && (
          <div className="status-message error">
            <ErrorIcon />
            <span>Upload failed. Please try again.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUploader;
