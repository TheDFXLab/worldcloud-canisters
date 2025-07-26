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
  refreshGithubUser: () => Promise<void>;
  getGithubToken: () => string | null;
  setAccessToken: (token: string) => void;
  setGithubUser: (user: GithubUser | null) => void;
  handleGithubConnect: () => Promise<void>;
  handleGithubDisconnect: () => Promise<void>;
}

const GithubContext = createContext<GithubContextType | undefined>(undefined);

export function GithubProvider({ children }: GithubProviderProps) {
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);

  const { identity } = useIdentity();

  const handleGithubConnect = async () => {
    const github = GithubApi.getInstance();
    await github.authenticate();
  };

  const handleGithubDisconnect = async () => {
    const github = GithubApi.getInstance();
    await github.logout();
    setGithubUser(null);
  };

  const refreshGithubUser = useCallback(async () => {
    const jwt = AuthState.getInstance().getAccessToken();
    if (jwt) {
      try {
        console.log(`Getting github user data with jwt`, jwt);

        const githubApi = GithubApi.getInstance();
        const data = await githubApi.getUser();
        if (!data) {
          return;
        }
        if (data) {
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
      }
    } else {
      setIsGithubConnected(false);
      setGithubUser(null);
    }
  }, []);

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
        refreshGithubUser,
        getGithubToken,
        setAccessToken,
        setGithubUser,
        handleGithubConnect,
        handleGithubDisconnect,
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
