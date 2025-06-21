import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { GithubApi } from "../../api/github/GithubApi";
import { environment } from "../../config/config";
import AuthState from "../../state/AuthState";
import { useIdentity } from "../IdentityContext/IdentityContext";
import MainApi from "../../api/main";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";

interface GithubUser {
  login: string;
  email: string;
  name: string;
  avatar_url: string;
}

interface GithubProviderProps {
  children: ReactNode;
}

interface GithubContextType {
  isGithubConnected: boolean;
  githubUser: GithubUser | null;
  isLoadingGithubUser: boolean;
  isAuthenticated: boolean;
  refreshGithubUser: () => Promise<void>;
  getGithubToken: () => string | null;
  setAccessToken: (token: string) => void;
  setGithubUser: (user: GithubUser | null) => void;
}

const GithubContext = createContext<GithubContextType | undefined>(undefined);

export function GithubProvider({ children }: GithubProviderProps) {
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [isLoadingGithubUser, setIsLoadingGithubUser] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { identity } = useIdentity();
  const { agent } = useHttpAgent();

  useEffect(() => {
    const github_token = AuthState.getInstance().getAccessToken("github_token");
    if (github_token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const refreshGithubUser = useCallback(async () => {
    try {
      if (!agent) {
        return;
      }

      setIsLoadingGithubUser(true);
      const authStore = AuthState.getInstance();

      const access_token = authStore.getAccessToken("github_token");
      if (!access_token) {
        return;
      }

      const githubApi = GithubApi.getInstance();
      if (!agent) {
        throw new Error(`Failed to create main api instance.`);
      }
      // const data = await githubApi.getUser();
      const mainApi = await MainApi.create(identity, agent);
      const data = await mainApi?.gh_get_user(access_token);

      if (!data) {
        console.log(`Failed to get gituhb user data....`);
        return;
      }
      if (data) {
        console.log(`Retreived github user....`, data);
        setGithubUser(data);
        setIsGithubConnected(true);
      } else {
        setIsGithubConnected(false);
        setGithubUser(null);
        githubApi.logout();
      }
    } catch (error) {
      console.error("Failed to fetch GitHub user:", error);
      setIsGithubConnected(false);
      setGithubUser(null);
    } finally {
      setIsLoadingGithubUser(false);
    }
    // } else {
    //   setIsGithubConnected(false);
    //   setGithubUser(null);
    // }
  }, [agent]);

  useEffect(() => {
    if (!identity) return;
    refreshGithubUser();
  }, [identity]);

  useEffect(() => {
    const checkRateLimit = async () => {
      try {
        const response = await fetch(`https://api.github.com/rate_limit`, {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        console.log("GitHub Rate Limit Status:", {
          core: data.resources.core,
          search: data.resources.search,
          graphql: data.resources.graphql,
          integration_manifest: data.resources.integration_manifest,
          source_import: data.resources.source_import,
        });
      } catch (err) {
        console.error("Failed to check rate limit:", err);
      }
    };

    if (environment === "local") checkRateLimit();
  }, []);

  const getGithubToken = () => {
    const githubApi = GithubApi.getInstance();
    return githubApi.token;
  };

  const setAccessToken = (token: string) => {
    const githubApi = GithubApi.getInstance();
    githubApi.setAccessToken(token);
    setIsGithubConnected(true);
    // Fetch user data when token is set
    refreshGithubUser();
  };

  return (
    <GithubContext.Provider
      value={{
        isGithubConnected,
        githubUser,
        isLoadingGithubUser,
        isAuthenticated,
        refreshGithubUser,
        getGithubToken,
        setAccessToken,
        setGithubUser,
      }}
    >
      {children}
    </GithubContext.Provider>
  );
}

export function useGithub() {
  const context = useContext(GithubContext);
  if (context === undefined) {
    throw new Error("useGithub must be used within a GithubProvider");
  }
  return context;
}
