import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GithubApi } from "../../api/github/GithubApi";
import { githubClientId } from "../../config/config";
// import { useGithub } from "../../context/GithubContext/GithubContext";

const GitHubCallback: React.FC = () => {
  // const { setAccessToken } = useGithub();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      console.log(`Calling: ${window.location.search}`);
      const params = new URLSearchParams(window.location.search);

      // Check if this is the initial redirect from localhost
      const redirectToGithub = params.get("redirectToGithub");
      const state = params.get("state");

      console.log(`redirectToGithub: ${redirectToGithub}, state: ${state}`);
      if (redirectToGithub === "true" && state) {
        // Redirect to GitHub OAuth with ngrok URL
        const githubParams = new URLSearchParams({
          client_id: githubClientId,
          redirect_uri: window.location.origin + "/github/callback",
          scope: "repo workflow",
          state: state,
        });

        window.location.href = `https://github.com/login/oauth/authorize?${githubParams}`;
        return;
      }

      // Handle the actual GitHub callback
      const code = params.get("code");
      console.log(`Code: ${code}, State: ${state}`);

      if (!code || !state) {
        setError("Invalid callback parameters");
        return;
      }

      try {
        const github = GithubApi.getInstance();
        await github.handleAuthCallback(code, state);
        console.log(`Logged in with gh!`);
        navigate("/gh-select-repo");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return <div>Completing GitHub authentication...</div>;
};

export default GitHubCallback;
