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
import { ActionBarProvider } from "./context/ActionBarContext/ActionBarContext";
import HomePage from "./components/HomePage/HomePage";
import Settings from "./components/SettingsPage/Settings";
import ProjectDeployment from "./components/ProjectDeployment/ProjectDeployment";
import { ToasterProvider } from "./context/ToasterContext/ToasterContext";
import { CanisterOverview } from "./components/CanisterOverview/CanisterOverview";
import WebsitesComponent from "./components/WebsitesComponent/WebsitesComponent";
import WasmUploader from "./components/WasmUploader/WasmUploader";
import CanisterDeployer from "./components/CanisterDeployer/CanisterDeployer";
import { LoadBarProvider } from "./context/LoadBarContext/LoadBarContext";
import { SideBarProvider } from "./context/SideBarContext/SideBarContext";
import { AdminPanel } from "./components/AdminPanel/AdminPanel";
import { ThemeProvider } from "./context/ThemeContext/ThemeContext";

export interface State {
  canister_id: string;
}
function App() {
  const [state, setState] = useState<State>({
    canister_id: backend_canister_id,
  });

  // const [selectedDeployment, setSelectedDeployment] =
  // useState<Deployment | null>(null);
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
      <ThemeProvider>
        <IdentityProvider>
          <GithubProvider>
            <ToasterProvider>
              <SideBarProvider>
                <LoadBarProvider>
                  <ActionBarProvider>
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route
                        path="/github/callback"
                        element={<GitHubCallback />}
                      />
                      <Route
                        path="/gh-select-repo"
                        element={<RepoSelector />}
                      />
                      <Route
                        path="/app/*"
                        element={
                          <AuthWrapper>
                            <AuthorityProvider state={state}>
                              <DeploymentsProvider>
                                <AppLayout setState={setState} state={state}>
                                  <Routes>
                                    <Route index element={<HomePage />} />
                                    <Route
                                      path="settings"
                                      element={<Settings />}
                                    />
                                    <Route
                                      path="new"
                                      element={<CanisterDeployer />}
                                    />
                                    <Route
                                      path="deploy/:canisterId?"
                                      element={<ProjectDeployment />}
                                    />
                                    <Route
                                      path="websites"
                                      element={<WebsitesComponent />}
                                    />
                                    <Route
                                      path="admin"
                                      element={<AdminPanel />}
                                    />
                                    <Route
                                      path="canister/:canisterId"
                                      element={<CanisterOverview />}
                                    />
                                  </Routes>
                                </AppLayout>
                              </DeploymentsProvider>
                            </AuthorityProvider>
                          </AuthWrapper>
                        }
                      />
                    </Routes>
                  </ActionBarProvider>
                </LoadBarProvider>
              </SideBarProvider>
            </ToasterProvider>
          </GithubProvider>
        </IdentityProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
