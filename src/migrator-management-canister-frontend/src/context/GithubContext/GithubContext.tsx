import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { GithubApi } from "../../api/github/GithubApi";

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
  getGithubToken: () => string | null;
  setAccessToken: (token: string) => void;
}

const GithubContext = createContext<GithubContextType | undefined>(undefined);

export function GithubProvider({ children }: GithubProviderProps) {
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);

  useEffect(() => {
    fetchGithubUser();
  }, []);

  const fetchGithubUser = async () => {
    const githubApi = GithubApi.getInstance();
    const token = githubApi.token;

    if (token) {
      try {
        const response = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setGithubUser(userData);
          setIsGithubConnected(true);
        } else {
          // Token might be invalid
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
  };

  const getGithubToken = () => {
    const githubApi = GithubApi.getInstance();
    return githubApi.token;
  };

  const setAccessToken = (token: string) => {
    const githubApi = GithubApi.getInstance();
    githubApi.setAccessToken(token);
    setIsGithubConnected(true);
    // Fetch user data when token is set
    fetchGithubUser();
  };

  return (
    <GithubContext.Provider
      value={{ isGithubConnected, githubUser, getGithubToken, setAccessToken }}
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
