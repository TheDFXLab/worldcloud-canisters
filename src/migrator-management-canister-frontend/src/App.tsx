import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import LandingPage from "./components/LandingPage/LandingPage";

import "bootstrap/dist/css/bootstrap.min.css";
import AppLayout from "./components/AppLayout/AppLayout";
import { DeploymentsProvider } from "./context/DeploymentContext/DeploymentContext";
import { AuthWrapper } from "./components/AuthWrapper/AuthWrapper";
import { IdentityProvider } from "./context/IdentityContext/IdentityContext";
import { AuthorityProvider } from "./context/AuthorityContext/AuthorityContext";
import { backend_canister_id } from "./config/config";
import GitHubCallback from "./components/GithubCallback/GithubCallback";
import { GithubProvider } from "./context/GithubContext/GithubContext";
import RepoSelector from "./components/RepoSelector/RepoSelector";
import { Deployment } from "./components/AppLayout/interfaces";
import { ToasterData } from "./components/Toast/Toaster";
import { ActionBarConfig } from "./components/ActionBar/ActionBar";

export interface State {
  canister_id: string;
}
function App() {
  const [state, setState] = useState<State>({
    canister_id: backend_canister_id,
  });

  const [actionBar, setActionBar] = useState<ActionBarConfig | undefined>(
    undefined
  );

  const [selectedDeployment, setSelectedDeployment] =
    useState<Deployment | null>(null);

  const [showToaster, setShowToaster] = useState(false);
  const [toasterData, setToasterData] = useState<ToasterData>({
    headerContent: "Success",
    toastStatus: true,
    toastData: "Controller added",
    textColor: "green",
    timeout: 2000,
  });

  return (
    <Router>
      <IdentityProvider>
        <GithubProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/github/callback" element={<GitHubCallback />} />
            <Route
              path="/gh-select-repo"
              element={
                <RepoSelector
                  canisterId={
                    selectedDeployment?.canister_id.toText()
                      ? selectedDeployment.canister_id.toText()
                      : null
                  }
                  setActionBar={setActionBar}
                  setShowToaster={setShowToaster}
                  setToasterData={setToasterData}
                />
              }
            />
            <Route
              path="/app"
              element={
                <AuthWrapper>
                  <AuthorityProvider state={state}>
                    <DeploymentsProvider>
                      <AppLayout
                        setState={setState}
                        state={state}
                        actionBar={actionBar}
                        setActionBar={setActionBar}
                        selectedDeployment={selectedDeployment}
                        setSelectedDeployment={setSelectedDeployment}
                        showToaster={showToaster}
                        toasterData={toasterData}
                        setShowToaster={setShowToaster}
                        setToasterData={setToasterData}
                      />
                    </DeploymentsProvider>
                  </AuthorityProvider>
                </AuthWrapper>
              }
            />
          </Routes>
        </GithubProvider>
      </IdentityProvider>
    </Router>
  );
}

export default App;
