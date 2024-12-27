import { migrator_management_canister_backend } from "declarations/migrator-management-canister-backend";
import { useState, useEffect } from "react";
import WasmUploader from "./components/WasmUploader/WasmUploader";
import FileUploader from "./components/FileUploader/FileUploader";
import CanisterDeployer from "./components/CanisterDeployer/CanisterDeployer";

function App() {
  const [state, setState] = useState({
    selectedFile: null,
    uploadProgress: 0,
    message: "",
  });

  useEffect(() => {
    const fetchWasmModule = async () => {
      const wasmModule =
        await migrator_management_canister_backend.getWasmModule();
      console.log("WASM module: ", wasmModule);
    };
    fetchWasmModule();
  }, []);

  return (
    <main>
      <h1>Asset Canister</h1>
      <WasmUploader />

      <h1>Deploy Asset Canister</h1>
      <CanisterDeployer />
      <h1>File Uploader</h1>
      <FileUploader />

      <h1>Upload file to canister</h1>
    </main>
  );
}

export default App;
