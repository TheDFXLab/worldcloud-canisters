import { HttpAgent, Identity } from "@dfinity/agent";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { HttpAgentManager } from "../../agent/http_agent";

interface HttpAgentContextType {
  agent: HttpAgent | null;
  fetchHttpAgent: (identity: Identity | null) => Promise<HttpAgent | null>;
}

const HttpAgentContext = createContext<HttpAgentContextType | undefined>(
  undefined
);

export function HttpAgentProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<HttpAgent | null>(null);
  // const { identity } = useIdentity();

  const fetchHttpAgent = async (identity: Identity | null) => {
    if (!identity) {
      return null;
    }
    const httpAgentManager = await HttpAgentManager.getInstance(identity);
    if (!httpAgentManager) {
      return null;
    }
    console.log("HttpAgentProvider: Setting agent", httpAgentManager.agent);
    setAgent(httpAgentManager.agent);
    return httpAgentManager.agent;
  };

  // useEffect(() => {
  //   if (!identity) {
  //     return;
  //   }
  //   const fetchHttpAgent = async () => {
  //     const httpAgentManager = await HttpAgentManager.getInstance(identity);
  //     if (!httpAgentManager) {
  //       return;
  //     }
  //     console.log("HttpAgentProvider: Setting agent", httpAgentManager.agent);
  //     setAgent(httpAgentManager.agent);
  //   };
  //   fetchHttpAgent();
  // }, [identity]);
  return (
    <HttpAgentContext.Provider value={{ agent, fetchHttpAgent }}>
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
