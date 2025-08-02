import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Project } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import MainApi from "../../api/main";
import { useIdentity } from "../IdentityContext/IdentityContext";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";
import { useQuery } from "@tanstack/react-query";
import { sanitizeObject } from "../../utility/sanitize";
import { useLoadBar } from "../LoadBarContext/LoadBarContext";
import {
  DeserializedProject,
  SerializedProject,
  serializeProjects,
  deserializeProjects,
} from "../../utility/bigint";

interface ProjectContextType {
  projects: DeserializedProject[] | null;
  isLoading: boolean;
  shouldRefetchProjects: boolean;
  setShouldRefetchProjects: (value: boolean) => void;
  refreshProjects: () => void;
  getProjects: () => Promise<DeserializedProject[] | null>;
}

interface StorageData {
  status: SerializedProject[];
  timestamp: number;
  principal: string;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(
  undefined
);

export function ProjectProvider({ children }: { children: ReactNode }) {
  /** Hooks */
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const { setShowLoadBar, setCompleteLoadBar } = useLoadBar();

  /** States */
  const [shouldRefetchProjects, setShouldRefetchProjects] =
    useState<boolean>(true);
  const VERIFICATION_INTERVAL = 10 * 60 * 1000; // 10mins
  let queryNameProjects = "projects";

  const { data: projects = null, isLoading } = useQuery({
    queryKey: [queryNameProjects, identity?.getPrincipal().toText()],
    queryFn: async () => {
      try {
        setShowLoadBar(true);
        const res = await getProjects();

        if (!res) {
          console.log("No projects found");
          return null;
        }

        if (!identity) {
          console.log("No identity found");
          return null;
        }

        // save to local storage
        const storageData: StorageData = {
          status: serializeProjects(res),
          timestamp: Date.now(),
          principal: identity.getPrincipal().toText(),
        };

        localStorage.setItem(queryNameProjects, JSON.stringify(storageData));

        return res;
      } catch (error) {
        console.error("Error in queryFn getProjects:", error);
        throw error;
      } finally {
        setCompleteLoadBar(true);
        setShouldRefetchProjects(false);
      }
    },
    initialData: () => {
      const stored = localStorage.getItem(queryNameProjects);
      if (!stored) {
        return null;
      }

      const { status, timestamp, principal } = JSON.parse(
        stored
      ) as StorageData;
      const isExpired = Date.now() - timestamp > VERIFICATION_INTERVAL;
      if (isExpired) {
        localStorage.removeItem(queryNameProjects);
        return null;
      }

      if (identity && principal !== identity.getPrincipal().toText()) {
        localStorage.removeItem(queryNameProjects);
        return null;
      }
      return deserializeProjects(status);
    },
    staleTime: 0,
    refetchInterval: VERIFICATION_INTERVAL,
    refetchOnMount: true,
    enabled: !!identity && !!agent && shouldRefetchProjects,
  });

  // Function to trigger manual refetch
  const refreshProjects = () => {
    setShouldRefetchProjects(true);
  };

  const getProjects = async () => {
    try {
      if (!agent) {
        console.log(`no agent..`);
        return null;
      }
      const mainApi = await MainApi.create(identity, agent);
      if (!mainApi) {
        console.log(`Failed to create main api`);
        return null;
      }
      const projects = await mainApi.getUserProjects();
      if (!projects) {
        return null;
      } else {
        return sanitizeObject(projects) as DeserializedProject[];
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        isLoading,
        getProjects,
        refreshProjects,
        shouldRefetchProjects,
        setShouldRefetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
}
