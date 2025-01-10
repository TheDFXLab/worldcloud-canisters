import React, { useState } from "react";
import { migrator_management_canister_backend } from "../../../../declarations/migrator-management-canister-backend";
import "./WasmUploader.css";
interface WasmUploaderProps {
  onClick: () => void;
}
function WasmUploader({ onClick }: WasmUploaderProps) {
  const [state, setState] = useState({
    selectedFile: null,
    uploadProgress: 0,
    message: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus(`Selected file: ${file.name}`);
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setStatus("Please select a WASM file first");
      return;
    }

    onClick();

    try {
      setIsLoading(true);
      setStatus("Reading WASM file...");

      // Update progress
      setState((prev) => ({
        ...prev,
        uploadProgress: 0 / 100,
        message: `Uploading: 0%`,
      }));

      // Read the file as ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      // Convert ArrayBuffer to Uint8Array
      const wasmBytes = Array.from(new Uint8Array(arrayBuffer));

      setStatus("Uploading WASM to canister...");

      const result =
        await migrator_management_canister_backend.uploadAssetCanisterWasm(
          wasmBytes
        );

      if ("ok" in result) {
        setStatus(`Success: ${result.ok}`);
      } else {
        setStatus(`Error: ${result.err}`);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }

    // Update progress
    setState((prev) => ({
      ...prev,
      uploadProgress: 100,
      message: `Uploading: 100%`,
    }));
  };

  return (
    <div className="wasm-uploader">
      <h2>Upload Asset Canister WASM</h2>
      <form onSubmit={handleUpload}>
        <div className="form-group">
          <input
            type="file"
            accept=".wasm"
            onChange={handleFileSelect}
            disabled={isLoading}
          />
        </div>
        <div className="form-group">
          <button type="submit" disabled={!selectedFile || isLoading}>
            {isLoading ? "Uploading..." : "Upload WASM"}
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

export default WasmUploader;
