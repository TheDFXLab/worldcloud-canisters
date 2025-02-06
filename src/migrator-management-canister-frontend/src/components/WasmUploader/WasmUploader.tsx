import React, { useState, useRef } from "react";
import "./WasmUploader.css";
import { migrator_management_canister_backend } from "../../../../declarations/migrator-management-canister-backend";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import DeleteIcon from "@mui/icons-material/Delete";

function WasmUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".wasm")) {
        setSelectedFile(file);
        setStatus("ready");
      } else {
        setStatus("error");
        setSelectedFile(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".wasm")) {
      setSelectedFile(file);
      setStatus("ready");
    } else {
      setStatus("error");
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      setStatus("uploading");
      setUploadProgress(0);

      const arrayBuffer = await selectedFile.arrayBuffer();
      const wasmBytes = Array.from(new Uint8Array(arrayBuffer));

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) clearInterval(progressInterval);
          return Math.min(prev + 10, 90);
        });
      }, 500);

      const result =
        await migrator_management_canister_backend.uploadAssetCanisterWasm(
          wasmBytes
        );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if ("ok" in result) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setStatus("");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="wasm-uploader">
      <div
        className={`upload-zone ${status}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".wasm"
          style={{ display: "none" }}
        />

        {!selectedFile && (
          <div className="upload-prompt">
            <CloudUploadIcon className="upload-icon" />
            <p>Drag and drop your WASM file here or click to browse</p>
            <span className="file-hint">.wasm files only</span>
          </div>
        )}

        {selectedFile && (
          <div className="file-info">
            <div className="file-details">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
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
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="progress-text">{uploadProgress}%</span>
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

      {selectedFile && status !== "success" && !isLoading && (
        <button
          className="upload-button"
          onClick={handleUpload}
          disabled={isLoading}
        >
          {isLoading ? "Uploading..." : "Upload WASM"}
        </button>
      )}
    </div>
  );
}

export default WasmUploader;
