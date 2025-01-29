import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { GithubApi } from "../../api/github/GithubApi";

interface GithubProviderProps {
  children: ReactNode;
}

interface GithubContextType {
  isGithubConnected: boolean;
  getGithubToken: () => string | null;
  setAccessToken: (token: string) => void;
}

const GithubContext = createContext<GithubContextType | undefined>(undefined);

const setAccessToken = (token: string) => {
  localStorage.setItem("github_token", token);
};

export function GithubProvider({ children }: GithubProviderProps) {
  const [isGithubConnected, setIsGithubConnected] = useState(false);

  useEffect(() => {
    const githubApi = GithubApi.getInstance();
    const token = githubApi.token;
    setIsGithubConnected(!!token);
  }, []);

  const getGithubToken = () => {
    const githubApi = GithubApi.getInstance();
    const token = githubApi.token;

    return token;
  };

  return (
    <GithubContext.Provider
      value={{ isGithubConnected, getGithubToken, setAccessToken }}
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
