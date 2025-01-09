import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { migrator_management_canister_backend } from "../../declarations/migrator-management-canister-backend";
import { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage/LandingPage";

import "bootstrap/dist/css/bootstrap.min.css";
import AppLayout from "./components/AppLayout/AppLayout";
import { DeploymentsProvider } from "./context/DeploymentContext/DeploymentContext";
import { AuthWrapper } from "./components/AuthWrapper/AuthWrapper";
import { IdentityProvider } from "./context/IdentityContext/IdentityContext";
import { AuthorityProvider } from "./context/AuthorityContext/AuthorityContext";
import { Principal } from "@dfinity/principal";
import { backend_canister_id } from "./config/config";

export interface State {
  canister_id: string;
}
function App() {
  const [state, setState] = useState<State>({
    canister_id: backend_canister_id,
  });

  useEffect(() => {
    const fetchWasmModule = async () => {
      const wasmModule =
        await migrator_management_canister_backend.getWasmModule();
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
            <IdentityProvider>
              <AuthWrapper>
                <AuthorityProvider state={state}>
                  <DeploymentsProvider>
                    <AppLayout setState={setState} state={state} />
                  </DeploymentsProvider>
                </AuthorityProvider>
              </AuthWrapper>
            </IdentityProvider>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
