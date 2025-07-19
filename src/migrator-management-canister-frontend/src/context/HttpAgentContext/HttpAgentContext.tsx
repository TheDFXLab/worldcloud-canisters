import { HttpAgent, Identity } from "@dfinity/agent";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { HttpAgentManager } from "../../agent/http_agent";
import { environment } from "../../config/config";

interface HttpAgentContextType {
  agent: HttpAgent | null;
  fetchHttpAgent: (identity: Identity | null) => Promise<HttpAgent | null>;
  clearHttpAgent: () => void;
}

const HttpAgentContext = createContext<HttpAgentContextType | undefined>(
  undefined
);

export function HttpAgentProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<HttpAgent | null>(null);

  const fetchHttpAgent = async (identity: Identity | null) => {
    if (!identity) {
      return null;
    }
    const httpAgentManager = await HttpAgentManager.getInstance(identity);
    if (!httpAgentManager) {
      return null;
    }

    if (environment === "local") {
      if (!httpAgentManager.agent) {
        throw new Error(`Http Agent is not initialized`);
      }
      await httpAgentManager.agent.fetchRootKey();
    }
    setAgent(httpAgentManager.agent);
    return httpAgentManager.agent;
  };

  const clearHttpAgent = () => {
    if (agent) {
      setAgent(null);
    }
  };

  return (
    <HttpAgentContext.Provider
      value={{ agent, fetchHttpAgent, clearHttpAgent }}
    >
      {children}
    </HttpAgentContext.Provider>
  );
}
export function useHttpAgent() {
  const context = useContext(HttpAgentContext);
  if (context === undefined) {
    throw new Error("useHttpAgent must be used within a HttpAgentProvider");
  }
  return context;
}
