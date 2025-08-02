interface GitHubUser {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    user_view_type: string;
    site_admin: boolean;
}

interface GitHubRepository {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: GitHubUser;
    html_url: string;
    description: string | null;
    fork: boolean;
    url: string;
    // Add other repository URLs as needed
    forks_url: string;
    keys_url: string;
    collaborators_url: string;
    teams_url: string;
    hooks_url: string;
    deployments_url: string;
}

interface GitHubCommit {
    id: string;
    tree_id: string;
    message: string;
    timestamp: string;
    author: {
        name: string;
        email: string;
    };
    committer: {
        name: string;
        email: string;
    };
}

export interface GitHubWorkflowRun {
    id: number;
    name: string;
    node_id: string;
    head_branch: string;
    head_sha: string;
    path: string;
    display_title: string;
    run_number: number;
    event: string;
    status: 'completed' | 'in_progress' | 'queued' | 'failed';
    conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
    workflow_id: number;
    check_suite_id: number;
    check_suite_node_id: string;
    url: string;
    html_url: string;
    pull_requests: any[]; // Can be typed more specifically if needed
    created_at: string;
    updated_at: string;
    actor: GitHubUser;
    run_attempt: number;
    referenced_workflows: any[];
    run_started_at: string;
    triggering_actor: GitHubUser;
    jobs_url: string;
    logs_url: string;
    check_suite_url: string;
    artifacts_url: string;
    cancel_url: string;
    rerun_url: string;
    previous_attempt_url: string | null;
    workflow_url: string;
    head_commit: GitHubCommit;
    repository: GitHubRepository;
    head_repository: GitHubRepository;
}

interface WorkflowRunReference {
    id: number;
    repository_id: number;
    head_repository_id: number;
    head_branch: string;
    head_sha: string;
}

export interface GitHubArtifact {
    id: number;
    node_id: string;
    name: string;
    size_in_bytes: number;
    url: string;
    archive_download_url: string;
    expired: boolean;
    created_at: string;
    updated_at: string;
    expires_at: string;
    digest: string;
    workflow_run: WorkflowRunReference;
}

export interface GithubWorkflowRunResult {
    run: GitHubWorkflowRun;
    targetArtifact: GitHubArtifact;
}