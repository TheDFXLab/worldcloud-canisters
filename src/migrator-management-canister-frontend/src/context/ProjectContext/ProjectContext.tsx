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

export interface ProjectData {
  id: bigint;
  canister_id: string | null;
  name: string;
  description: string;
  tags: string[];
  plan: Project["plan"];
  date_created: number;
  date_updated: number;
}

interface ProjectContextType {
  projects: ProjectData[] | null;
  isLoading: boolean;
  shouldRefetchProjects: boolean;
  setShouldRefetchProjects: (value: boolean) => void;
  refreshProjects: () => void;
  getProjects: () => Promise<ProjectData[] | null>;
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
        const storageData = {
          status: res,
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

      const { status, timestamp, principal } = JSON.parse(stored);
      const isExpired = Date.now() - timestamp > VERIFICATION_INTERVAL;
      if (isExpired) {
        localStorage.removeItem(queryNameProjects);
        return false;
      }

      if (identity && principal !== identity.getPrincipal().toText()) {
        localStorage.removeItem(queryNameProjects);
        return false;
      }
      return status;
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
        return sanitizeObject(projects) as ProjectData[];
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
