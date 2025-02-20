import { HttpAgent, Identity } from "@dfinity/agent";
import { WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { environment, frontend_url, githubClientId, reverse_proxy_url } from "../../config/config";
import { generateWorkflowTemplate } from "../../utility/workflowTemplate";
import MainApi from "../main";
import { Principal } from "@dfinity/principal";

interface GithubWorkflowRunsResponse {
    workflow_runs: GithubWorkflowRunPartial[];
}

interface GithubWorkflowArtifactResponse {
    total_count: number;
    artifacts: Artifact[];
}


export interface GithubWorkflowRunPartial {
    id: string;
    name: string;
    status: string;
    workflow_id: number;
    head_branch: string;
    run_number: number;
    head_sha: string;
    created_at: string;
    path: string; // workflow file path
}

export interface Repository {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    default_branch: string;
    visibility: string;
}

interface Run {
    id: number;
    repository_id: number;
    head_repository_id: number;
    head_branch: string;
    head_sha: string;
}
interface Artifact {
    id: number;
    name: string;
    size_in_bytes: number;
    archive_download_url: string;
    workflow_run: Run;
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
        const clientId = githubClientId;
        if (!clientId) {
            throw new Error('GitHub client ID not configured');
        }

        // Generate random state for security
        const state = Math.random().toString(36).substring(7);

        // Store state in localStorage
        localStorage.setItem('github_oauth_state', state);

        // TODO: remove this once we have a proper domain
        // Force browser to use ngrok URL
        if (window.location.hostname === 'localhost') {
            window.location.href = `${frontend_url}/github/callback?redirectToGithub=true&state=${state}`;
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

    async requestAccessToken(deviceCode: string) {
        try {
            const response = await fetch(
                `${environment === "ic" ? reverse_proxy_url : reverse_proxy_url
                }/login/oauth/access_token`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        client_id: githubClientId,
                        device_code: deviceCode,
                        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                    }),
                }
            );

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error requesting access token:', error);
            throw error;
        }
    }

    async requestCode() {
        try {
            const response = await fetch(
                `${environment === "ic" ? reverse_proxy_url : reverse_proxy_url
                }/login/device/code`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        client_id: githubClientId,
                        scope: "repo workflow",
                    }),
                }
            );

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error requesting code:', error);
            throw error;
        }

    }

    async logout(): Promise<void> {
        if (this.token) {
            try {
                // Revoke the token
                await fetch(`https://api.github.com/applications/${githubClientId}/token`, {
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
    }

    public setAccessToken(token: string) {
        this.token = token;
        localStorage.setItem('github_token', token);
    }

    async listRepositories(): Promise<Repository[]> {
        return this.request('/user/repos?sort=updated&visibility=all');
    }

    private async verifyAndCreateWorkflow(repo: string, workflowPath: string, branch: string, content: any, repoInfo: Repository) {
        // Check if .github/workflows directory exists in default branch
        try {
            await this.request(`/repos/${repo}/contents/.github/workflows?ref=${repoInfo.default_branch}`);
            // If the target branch is not the default, create/update the workflow file there
            if (branch !== repoInfo.default_branch) {
                // Check if .github/workflows directory exists in target branch
                try {
                    await this.request(`/repos/${repo}/contents/.github/workflows?ref=${branch}`);
                } catch (error) {
                    // Directory doesn't exist, create it with a README
                    await this.createWorkflowFile(repo, branch);
                }
            }
            await this.updateWorkflowFile(repo, workflowPath, branch, content);

        } catch (error) {
            // Directory doesn't exist, create it with a README
            await this.createWorkflowFile(repo, repoInfo.default_branch);

            // Create/update workflow in the default branch first
            await this.updateWorkflowFile(repo, workflowPath, repoInfo.default_branch, content);
        }
    }

    private async verifyWorkflowExists(repo: string) {

        // Wait and verify the workflow is registered
        const maxAttempts = 5;
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                const workflows = await this.request(`/repos/${repo}/actions/workflows`);
                const deployWorkflow = workflows.workflows?.find((w: any) => w.name === 'Build and Deploy to ICP');

                if (deployWorkflow) {
                    return;
                }
            } catch (e) {
                console.log(`Attempt ${i + 1}: Error checking workflow status:`, e);
            }
        }

        throw new Error('Workflow file was created but not registered in GitHub Actions. Please check the repository settings to ensure Actions are enabled.');

    }

    private async createWorkflowFile(repo: string, branch: string) {
        await this.request(`/repos/${repo}/contents/.github/workflows/README.md`, {
            method: 'PUT',
            body: JSON.stringify({
                message: 'Create .github/workflows directory',
                content: btoa('# GitHub Workflows\nThis directory contains GitHub Actions workflow files.'),
                branch: branch
            }),
        });
    }

    async createWorkflow(repo: string, workflowContent: string, branch: string) {
        const content = btoa(workflowContent);
        const workflowPath = `.github/workflows/icp-deploy.yml`;

        try {
            // First, get the default branch
            const repoInfo = await this.request(`/repos/${repo}`);
            const defaultBranch = repoInfo.default_branch;

            // Create workflow file in default branch if it doesn't exist
            await this.verifyAndCreateWorkflow(repo, workflowPath, branch, content, repoInfo);

            await this.verifyWorkflowExists(repo);
        } catch (error) {
            console.error(`Error creating/updating workflow for ${repo}:`, error);
            throw error;
        }
    }

    private async updateWorkflowFile(repo: string, workflowPath: string, branch: string, content: any) {
        const targetBranchSha = await this.getFileSha(repo, workflowPath, branch);
        await this.request(`/repos/${repo}/contents/${workflowPath}`, {
            method: 'PUT',
            body: JSON.stringify({
                message: `${targetBranchSha ? 'Update' : 'Add'} ICP deployment workflow`,
                content,
                branch: branch,
                sha: targetBranchSha || undefined,
            }),
        });
    }

    async triggerWorkflow(repo: string, branch: string) {
        try {
            // First verify the workflow file exists in the correct branch
            const workflowPath = `.github/workflows/icp-deploy.yml`;
            try {
                const workflowFile = await this.request(`/repos/${repo}/contents/${workflowPath}?ref=${branch}`);

                // Decode and verify the content
                const content = atob(workflowFile.content);
                if (!content.includes('workflow_dispatch')) {

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

        } catch (error) {
            console.log(`Error triggering workflow for ${repo}:`, error);
            throw error;
        }
    }

    async getWorkflowRuns(repo: string) {
        return this.request(`/repos/${repo}/actions/runs?event=workflow_dispatch`);
    }

    async getLatestWorkflowRunId(repo_name: string) {
        // First get the workflow ID for our specific workflow file
        const workflows = await this.request(
            `/repos/${repo_name}/actions/workflows`
        );

        if (!workflows || workflows.total_count === 0) {
            return '0';
        }

        const deployWorkflow = workflows.workflows.find((workflow: any) => workflow.name === 'Build and Deploy to ICP');

        const workflowRuns = await this.request(`/repos/${repo_name}/actions/workflows/${deployWorkflow.id}/runs?per_page=5`);
        return workflowRuns && workflowRuns.workflow_runs.length > 0 ? workflowRuns.workflow_runs[0].id : '0';
    }

    // Find the latest workflow run and the latest artifact file
    async getWorkflows(repo_name: string, previousRunId: string) {
        // First get the workflow ID for our specific workflow file
        const workflows = await this.request(
            `/repos/${repo_name}/actions/workflows`
        );

        // Find the workflow file that matches our job
        const deployWorkflow = workflows.workflows.find((workflow: any) => workflow.name === 'Build and Deploy to ICP');

        // Get list of recent workflow runs
        const workflowRuns: GithubWorkflowRunsResponse = await this.request(`/repos/${repo_name}/actions/workflows/${deployWorkflow.id}/runs?per_page=5`);

        if (workflowRuns.workflow_runs.length === 0) {
            return null;
        }

        // Return if there are no new runs
        if (workflowRuns.workflow_runs[0].id === previousRunId) {
            return null;
        }

        let newRuns = [];
        if (previousRunId === '0') {
            newRuns = workflowRuns.workflow_runs;
        }
        else {
            // Find the index of the previous run (last run)
            const previousIndex = workflowRuns.workflow_runs.findIndex(
                (run: any) => run.id === previousRunId
            );

            // Return if there are no new runs
            if (previousIndex === 0) {
                return null;
            }

            // New runs since previous run
            newRuns = workflowRuns.workflow_runs.slice(0, previousIndex);
        }



        // Sort new runs chronologically
        const inProgressRunsChronologicallySorted = newRuns.sort((a: any, b: any) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });


        // Ensure relevant run
        const relevantRun = inProgressRunsChronologicallySorted[0];
        if (!relevantRun) {
            return null;
        }

        if (relevantRun) {
            if (relevantRun.status !== 'completed') {
                return null;
            }

            try {
                // Get artifacts for given run id
                const artifactsRes: GithubWorkflowArtifactResponse = await this.request(
                    `/repos/${repo_name}/actions/runs/${relevantRun.id}/artifacts`
                );

                if (artifactsRes && artifactsRes.artifacts) {
                    // Find the artifact that matches the run id
                    const targetArtifact: Artifact | undefined = artifactsRes.artifacts.find((artifact: any) => artifact.workflow_run.id === relevantRun.id);
                    return { targetArtifact, run: relevantRun };
                }
            } catch (error) {
                console.log(`Error getting artifacts for run ${relevantRun.id}:`, error);
                return null;
            }


        }
        else {
            return null;
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

    async pollForArtifact(identity: Identity | null, agent: HttpAgent, canisterId: Principal, repo: string, branch: string, previousRunId: string, maxAttempts = 100): Promise<{ artifact: Artifact, workflowRunDetails: WorkflowRunDetails }> {
        for (let i = 0; i < maxAttempts; i++) {
            const workflowRunResult = await this.getWorkflows(repo, previousRunId);

            if (workflowRunResult && workflowRunResult.targetArtifact) {
                const mainApi = await MainApi.create(identity, agent);
                if (!mainApi) {
                    throw new Error("Failed to create main api instance.");
                }

                const workflowRunDetails: WorkflowRunDetails = {
                    workflow_run_id: BigInt(workflowRunResult.targetArtifact.id),
                    repo_name: repo,
                    branch: [branch],
                    status: { completed: null },
                    date_created: BigInt(Date.parse(workflowRunResult.run.created_at)),
                    error_message: [],
                    size: [BigInt(workflowRunResult.targetArtifact.size_in_bytes)],
                    commit_hash: [workflowRunResult.targetArtifact.workflow_run.head_sha],
                }

                return { artifact: workflowRunResult.targetArtifact, workflowRunDetails };
            }
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
                throw new Error(error.message || 'GitHub API request failed');
            } catch (e) {
                throw new Error(`GitHub API request failed with status ${response.status}`);
            }
        }

        // Check if there's content to parse
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const jsonRes = await response.json();
            return jsonRes;
        }

        // Return empty object for endpoints that don't return content
        return {};
    }

    private async getFileSha(repo: string, path: string, branch: string): Promise<string> {
        try {
            const response = await this.request(`/repos/${repo}/contents/${path}?ref=${branch}`);
            return response.sha;
        } catch (error) {
            console.log(`Error getting file sha for ${repo} on branch ${branch}:`, error);
            return '';
        }
    }

    /*END*/
}
