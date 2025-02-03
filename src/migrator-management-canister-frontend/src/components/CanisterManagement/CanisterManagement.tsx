import React from "react";
import "./CanisterManagement.css";
import { AuthorityManager } from "../AuthorityManager/AuthorityManager";
import { AssetManager } from "../AssetManager/AssetManager";
import { DangerZone } from "../DangerZone/DangerZone";
import { Button, Tab, Tabs } from "react-bootstrap";
import { Deployment } from "../AppLayout/interfaces";
import { CanisterOverview } from "../CanisterOverview/CanisterOverview";
import { getCanisterUrl } from "../../config/config";
import { AuthorityProvider } from "../../context/AuthorityContext/AuthorityContext";
import { AssetProvider } from "../../context/AssetContext/AssetContext";
import { State } from "../../App";
import { LedgerProvider } from "../../context/LedgerContext/LedgerContext";

interface CanisterManagementProps {
  deployment: Deployment | null;
  setShowDetails: (showDetails: boolean) => void;
  setShowLoadBar: (showLoadBar: boolean) => void;
  setCompleteLoadbar: (completeLoadbar: boolean) => void;
  state: State;
}

export const CanisterManagement: React.FC<CanisterManagementProps> = ({
  deployment,
  setShowDetails,
  setShowLoadBar,
  setCompleteLoadbar,
  state,
}) => {
  const tabs = [
    {
      label: "Overview",
      content: deployment && (
        <AuthorityProvider state={state}>
          <LedgerProvider>
            <CanisterOverview />
          </LedgerProvider>
        </AuthorityProvider>
      ),
    },
    {
      label: "Authority",
      content: deployment && (
        <AuthorityProvider state={state}>
          <AuthorityManager />
        </AuthorityProvider>
      ),
    },
    {
      label: "Assets",
      content: deployment && (
        <AssetProvider canisterId={deployment.canister_id}>
          <AssetManager canisterId={deployment?.canister_id.toText() || ""} />
        </AssetProvider>
      ),
    },
    {
      label: "Danger Zone",
      content: (
        <DangerZone canisterId={deployment?.canister_id.toText() || ""} />
      ),
    },
  ];

  return (
    <div className="canister-management">
      <header className="canister-management__header">
        <h1>Canister Management</h1>
        <div className="canister-management__id">
          ID:
          <a
            href={getCanisterUrl(deployment?.canister_id.toText() || "")}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            {deployment?.canister_id.toText() || ""}
          </a>
        </div>
      </header>
      <Button
        onClick={() => setShowDetails(false)}
        style={{ position: "absolute", top: "1rem", right: "1rem" }}
      >
        Back
      </Button>
      <Tabs defaultActiveKey="Overview" className="mb-3">
        {tabs.map((tab, index) => (
          <Tab key={index} eventKey={tab.label} title={tab.label}>
            {tab.content}
          </Tab>
        ))}
      </Tabs>
    </div>
  );
};
