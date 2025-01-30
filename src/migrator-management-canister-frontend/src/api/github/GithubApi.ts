import { environment, githubClientId, ngrok_tunnel, reverse_proxy_url } from "../../config/config";
import { generateWorkflowTemplate } from "../../utility/workflowTemplate";

export interface Repository {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    default_branch: string;
    visibility: string;
}

interface Artifact {
    id: number;
    name: string;
    size_in_bytes: number;
    archive_download_url: string;
}

export class GithubApi {
    private static instance: GithubApi | null = null;
    public token: string | null = null;
    private baseUrl = 'https://api.github.com';

    private constructor() {
        const savedToken = localStorage.getItem('github_token');
        if (savedToken) {
            this.token = savedToken;
        }
    }

    static getInstance(): GithubApi {
        if (!this.instance) {
            this.instance = new GithubApi();
        }
        return this.instance;
    }

    isAuthenticated(): boolean {
        return !!this.token;
    }

    async authenticate() {
        console.log("Authenticating...");
        const clientId = githubClientId;
        if (!clientId) {
            throw new Error('GitHub client ID not configured');
        }

        // Generate random state for security
        const state = Math.random().toString(36).substring(7);
        console.log("state:", state);

        // Store state in localStorage
        localStorage.setItem('github_oauth_state', state);

        // TODO: remove this once we have a proper domain
        // Force browser to use ngrok URL
        if (window.location.hostname === 'localhost') {
            window.location.href = `${ngrok_tunnel}/github/callback?redirectToGithub=true&state=${state}`;
            return;
        }

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: `${window.location.origin}/github/callback`,
            scope: 'repo workflow',
            state: state
        });

        window.location.href = `https://github.com/login/oauth/authorize?${params}`;
    }

    async handleAuthCallback(code: string, state: string): Promise<void> {
        const savedState = localStorage.getItem('github_oauth_state');

        if (!savedState || savedState !== state) {
            throw new Error('Invalid state parameter');
        }

        // Use GitHub's API endpoint
        const response = await fetch(`${environment === 'production' ? '' : reverse_proxy_url}/https://github.com/login/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                "Accept-Encoding": "application/json",
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: githubClientId,
                code: code,
                redirect_uri: `${ngrok_tunnel}/github/callback`
            }),
        });

        if (response.status === 403) {
            this.logout();
            throw new Error("You are not authorized to use this app");
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error_description || 'Failed to get access token');
        }

        this.token = data.access_token;

        if (this.token) {
            localStorage.setItem('github_token', this.token);
        }
        localStorage.removeItem('github_oauth_state');
    }

    async logout(): Promise<void> {
        if (this.token) {
            try {
                // Revoke the token
                await fetch(`${environment === 'production' ? '' : reverse_proxy_url}/https://api.github.com/applications/${githubClientId}/token`, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `token ${this.token}`,
                    }
                });
            } catch (error) {
                console.error('Error revoking token:', error);
            }
        }

        // Clear the token
        this.token = null;
        localStorage.removeItem('github_token');

        // Redirect to GitHub logout to clear session cookies
        window.location.href = 'https://github.com/logout';
    }

    public setAccessToken(token: string) {
        this.token = token;
        localStorage.setItem('github_token', token);
    }

    async listRepositories(): Promise<Repository[]> {
        return this.request('/user/repos?sort=updated&visibility=all');
    }

    async createWorkflow(repo: string, workflowContent: string, branch: string) {
        console.log(`Creating workflow for ${repo} on branch ${branch}`);
        const content = btoa(workflowContent);
        // Keep a consistent name for the workflow file
        const workflowPath = `.github/workflows/icp-deploy.yml`;

        try {
            const fileSha = await this.getFileSha(repo, workflowPath, branch);
            console.log(`Creating/updating workflow on branch ${branch}`);

            await this.request(`/repos/${repo}/contents/${workflowPath}`, {
                method: 'PUT',
                body: JSON.stringify({
                    message: `${fileSha ? 'Update' : 'Add'} ICP deployment workflow`,
                    content,
                    branch,
                    sha: fileSha || undefined,
                }),
            });

            // Wait for GitHub to process the workflow
            await new Promise(resolve => setTimeout(resolve, 4000));

        } catch (error) {
            console.error(`Error creating/updating workflow for ${repo}:`, error);
            throw error;
        }
    }

    async triggerWorkflow(repo: string, branch: string) {
        try {
            // First verify the workflow file exists in the correct branch
            const workflowPath = `.github/workflows/icp-deploy.yml`;
            try {
                const workflowFile = await this.request(`/repos/${repo}/contents/${workflowPath}?ref=${branch}`);
                console.log(`Workflow file found on branch ${branch}:`, workflowFile);

                // Decode and verify the content
                const content = atob(workflowFile.content);
                if (!content.includes('workflow_dispatch')) {
                    console.log('Invalid workflow file found, updating with correct content...');

                    // Generate new workflow content
                    const newWorkflowContent = generateWorkflowTemplate('src', branch);

                    // Update the workflow file
                    await this.request(`/repos/${repo}/contents/${workflowPath}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            message: 'Update workflow to use workflow_dispatch trigger',
                            content: btoa(newWorkflowContent),
                            branch,
                            sha: workflowFile.sha
                        }),
                    });

                    // Wait for GitHub to process the update
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error(`Error verifying workflow file on branch ${branch}:`, error);
                throw new Error(`Workflow file not found or invalid on branch ${branch}`);
            }

            // Trigger the workflow
            await this.request(`/repos/${repo}/actions/workflows/icp-deploy.yml/dispatches`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ref: branch,
                    inputs: {
                        branch: branch
                    }
                })
            });

            console.log(`Workflow triggered for ${repo} on branch ${branch}`);
        } catch (error) {
            console.log(`Error triggering workflow for ${repo}:`, error);
            throw error;
        }
    }

    async getWorkflowRuns(repo: string) {
        return this.request(`/repos/${repo}/actions/runs?event=repository_dispatch`);
    }

    async getLatestArtifact(repo: string, branch: string): Promise<Artifact | null> {
        try {
            // First get the latest successful workflow run for this branch
            const runsResponse = await this.request(
                `/repos/${repo}/actions/runs?branch=${branch}&status=completed&conclusion=success`
            );

            if (!runsResponse.workflow_runs || runsResponse.workflow_runs.length === 0) {
                console.log(`No successful workflow runs found for branch ${branch}`);
                return null;
            }

            const latestRun = runsResponse.workflow_runs[0];
            console.log(`Latest successful run:`, latestRun);

            // Get artifacts for this specific run
            const { artifacts } = await this.request(
                `/repos/${repo}/actions/runs/${latestRun.id}/artifacts`
            );

            if (!artifacts || artifacts.length === 0) {
                console.log(`No artifacts found for run ${latestRun.id}`);
                return null;
            }

            console.log(`Found artifacts:`, artifacts);
            return artifacts[0];
        } catch (error) {
            console.error('Error getting latest artifact:', error);
            throw error;
        }
    }

    async downloadArtifact(downloadUrl: string): Promise<Blob> {
        const response = await fetch(downloadUrl, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to download artifact');
        }

        return response.blob();
    }

    async pollForArtifact(repo: string, branch: string, maxAttempts = 100): Promise<Artifact> {
        for (let i = 0; i < maxAttempts; i++) {
            const artifact = await this.getLatestArtifact(repo, branch);
            console.log(`Artifact:`, artifact);
            if (artifact) {
                return artifact;
            }
            console.log(`Waiting for artifact... ${i + 1} of ${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        }
        throw new Error('Timeout waiting for build artifact');
    }

    public async request(endpoint: string, options: RequestInit = {}) {
        if (!this.token) {
            throw new Error('GitHub token not set');
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            try {
                const error = await response.json();
                console.log(`encountered error:`, error);
                throw new Error(error.message || 'GitHub API request failed');
            } catch (e) {
                throw new Error(`GitHub API request failed with status ${response.status}`);
            }
        }

        // Check if there's content to parse
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const jsonRes = await response.json();
            console.log(`JSON response:`, jsonRes);
            return jsonRes;
        }

        // Return empty object for endpoints that don't return content
        return {};
    }

    private async getFileSha(repo: string, path: string, branch: string): Promise<string> {
        try {
            const response = await this.request(`/repos/${repo}/contents/${path}?ref=${branch}`);
            console.log(`File SHA response: ${response}`);
            return response.sha;
        } catch (error) {
            console.log(`Error getting file sha for ${repo} on branch ${branch}:`, error);
            return '';
        }
    }
    /*END*/
}
