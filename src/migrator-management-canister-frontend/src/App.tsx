import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { migrator_management_canister_backend } from "../../declarations/migrator-management-canister-backend";
import { useState, useEffect } from "react";
import FileUploader from "./components/FileUploader/FileUploader";
import CanisterDeployer from "./components/CanisterDeployer/CanisterDeployer";
import WasmUploader from "./components/WasmUploader/WasmUploader";
import LandingPage from "./components/LandingPage/LandingPage";
import AppLayout from "./components/AppLayout/AppLayout";
import "bootstrap/dist/css/bootstrap.min.css";
import { DeploymentsProvider } from "./components/DeploymentContext/DeploymentContext";
import { CanisterManagement } from "./components/CanisterManagement/CanisterManagement";

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
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/app"
          element={
            <DeploymentsProvider>
              <AppLayout />
            </DeploymentsProvider>
          }
        />
        <Route path="/" element={<AppLayout />}>
          {/* <Route path="canister/:canisterId" element={<CanisterManagement />} /> */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
