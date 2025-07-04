import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import LandingPage from "./components/LandingPage/LandingPage";
import { HelmetProvider } from "react-helmet-async";

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
import { ProgressBarProvider } from "./context/ProgressBarContext/ProgressBarContext";
import { CyclesProvider } from "./context/CyclesContext/CyclesContext";
import { LedgerProvider } from "./context/LedgerContext/LedgerContext";
import { SubscriptionProvider } from "./context/SubscriptionContext/SubscriptionContext";
import BillingPage from "./components/BillingPage/BillingPage";
import { LoaderOverayProvider } from "./context/LoaderOverlayContext/LoaderOverlayContext";
import { ConfirmationModalProvider } from "./context/ConfirmationModalContext/ConfirmationModalContext";
import ThemeToggle from "./components/ThemeToggle/ThemeToggle";
import { HttpAgentProvider } from "./context/HttpAgentContext/HttpAgentContext";
import { AdminProvider } from "./context/AdminContext/AdminContext";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PricingProvider } from "./context/PricingContext/PricingContext";
import { FreemiumProvider } from "./context/FreemiumContext/FreemiumContext";
import CreateProjectForm from "./components/WebsitesComponent/CreateProjectForm";
import { ProjectProvider } from "./context/ProjectContext/ProjectContext";
import ProjectsComponent from "./components/ProjectsComponent/ProjectsComponent";
const queryClient = new QueryClient();
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
    <div className="app">
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <Router>
            <ThemeProvider>
              <ThemeToggle />

              <ProgressBarProvider>
                <LoaderOverayProvider>
                  <HttpAgentProvider>
                    <IdentityProvider>
                      <AdminProvider>
                        <GithubProvider>
                          <ToasterProvider>
                            <SideBarProvider>
                              <LoadBarProvider>
                                <ActionBarProvider>
                                  <PricingProvider>
                                    <Routes>
                                      <Route
                                        path="/"
                                        element={<LandingPage />}
                                      />
                                      <Route
                                        path="/github/callback"
                                        element={<GitHubCallback />}
                                      />
                                      <Route
                                        path="/gh-select-repo"
                                        element={<RepoSelector />}
                                      />
                                      <Route
                                        path="/dashboard/*"
                                        element={
                                          <AuthWrapper>
                                            <AuthorityProvider state={state}>
                                              <DeploymentsProvider>
                                                <CyclesProvider>
                                                  <SubscriptionProvider>
                                                    <FreemiumProvider>
                                                      <ProjectProvider>
                                                        <ConfirmationModalProvider>
                                                          <LedgerProvider>
                                                            <AppLayout
                                                              setState={
                                                                setState
                                                              }
                                                              state={state}
                                                            >
                                                              <Routes>
                                                                <Route
                                                                  index
                                                                  element={
                                                                    <HomePage />
                                                                  }
                                                                />
                                                                <Route
                                                                  path="billing"
                                                                  element={
                                                                    <BillingPage />
                                                                  }
                                                                />
                                                                <Route
                                                                  path="settings"
                                                                  element={
                                                                    <Settings />
                                                                  }
                                                                />
                                                                <Route
                                                                  path="new"
                                                                  element={
                                                                    <CreateProjectForm />
                                                                  }
                                                                />
                                                                <Route
                                                                  path="deploy/:canisterId?/:projectId"
                                                                  element={
                                                                    <ProjectDeployment />
                                                                  }
                                                                />
                                                                <Route
                                                                  path="websites"
                                                                  element={
                                                                    <WebsitesComponent />
                                                                  }
                                                                />
                                                                <Route
                                                                  path="projects"
                                                                  element={
                                                                    <ProjectsComponent />
                                                                  }
                                                                />
                                                                <Route
                                                                  path="admin"
                                                                  element={
                                                                    <AdminPanel />
                                                                  }
                                                                />
                                                                <Route
                                                                  path="canister/:canisterId"
                                                                  element={
                                                                    <CanisterOverview />
                                                                  }
                                                                />
                                                              </Routes>
                                                            </AppLayout>
                                                          </LedgerProvider>
                                                        </ConfirmationModalProvider>
                                                      </ProjectProvider>
                                                    </FreemiumProvider>
                                                  </SubscriptionProvider>
                                                </CyclesProvider>
                                              </DeploymentsProvider>
                                            </AuthorityProvider>
                                          </AuthWrapper>
                                        }
                                      />
                                    </Routes>
                                  </PricingProvider>
                                </ActionBarProvider>
                              </LoadBarProvider>
                            </SideBarProvider>
                          </ToasterProvider>
                        </GithubProvider>
                      </AdminProvider>
                    </IdentityProvider>
                  </HttpAgentProvider>
                </LoaderOverayProvider>
              </ProgressBarProvider>
            </ThemeProvider>
          </Router>
        </HelmetProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
