import { Principal } from "@dfinity/principal";
import { createActor } from "../../../../declarations/migrator-management-canister-backend";
import { ActorSubclass, HttpAgent, Identity } from "@dfinity/agent";
import { _SERVICE, DepositReceipt, WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { backend_canister_id, githubClientId, http_host, internetIdentityConfig } from "../../config/config";
import { StaticFile } from "../../utility/compression";
import { HttpAgentManager } from "../../agent/http_agent";

import { parse_get_device_code_response, parse_github_query_response, RequestCodeResponse } from "../../utility/url";




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
interface Artifact {
    id: number;
    name: string;
    size_in_bytes: number;
    archive_download_url: string;
    workflow_run: Run;
}

interface Run {
    id: number;
    repository_id: number;
    head_repository_id: number;
    head_branch: string;
    head_sha: string;
}

export type BackendActor = ActorSubclass<_SERVICE>;

class MainApi {
    private static instance: MainApi | null = null;
    private static currentIdentity: Identity | null = null;

    canisterId: string;
    actor: ActorSubclass<_SERVICE> | null;
    idenitified: boolean;
    identity: Identity | null;
    agent: HttpAgent | null;
    private constructor(identity: Identity | null, actor: ActorSubclass<_SERVICE> | null, isIdentified: boolean, agent: HttpAgent) {
        this.canisterId = backend_canister_id;
        this.actor = actor;
        this.identity = identity;
        this.idenitified = isIdentified;
        this.agent = agent;
    }

    static async create(identity: Identity | null, agent: HttpAgent) {
        try {

            // if (!identity || !agent) {
            //     throw new Error(`Identity and agent are requierd.`);
            // }
            // Clear instance if identity has changed
            if (this.currentIdentity !== identity) {
                this.instance = null;
                this.currentIdentity = identity;
            }

            // Return existing instance if already created
            if (this.instance) return this.instance;

            const actor = createActor(backend_canister_id, {
                agent: agent
            });
            let isIdentified = false;

            if (identity && identity.getPrincipal().toText() !== internetIdentityConfig.loggedOutPrincipal) {
                isIdentified = true;
            }
            else {
                isIdentified = false;
            }

            // Create new instance
            const mainApi = new MainApi(identity, actor, isIdentified, agent);
            this.instance = mainApi;

            return mainApi;
        } catch (error) {
            console.error(`Error creating actor:`, error);
            return null;
        }
    }

    async get_all_subscriptions() {
        const subscriptions = await this.actor?.get_all_subscriptions();
        return subscriptions;
    }

    // Get identity's derived public key
    async getPublicKey() {
        const publicKeyResult = await this.actor?.public_key();
        if (!publicKeyResult) {
            throw new Error(`Failed to get public key: ${publicKeyResult}`);
        }
        if ('Err' in publicKeyResult) {
            throw new Error(`Failed to get public key: ${publicKeyResult.Err}`);
        }
        const publicKey = publicKeyResult.Ok.public_key_hex;
        return publicKey;
    }

    // Sign message with identity's derived public key
    async signMessage(message: string) {
        const signResult = await this.actor?.sign(message);
        if (!signResult) {
            throw new Error(`Failed to sign message: ${signResult}`);
        }
        if ('Err' in signResult) {
            throw new Error(`Failed to sign message: ${signResult.Err}`);
        }
        const signature = signResult.Ok.signature_hex;
        return signature;
    }

    /**
     * Get the deposit address for a user from the ICP ledger canister.
     * @param identifiedActor - The identified ICP ledger actor.
     * @returns The deposit address for the user.
     */
    async getUserDepositAddress() {
        try {
            if (!this.identity) {
                throw new Error("Identity not initialized 2.");
            }
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const depositAddr = await this.actor.get_deposit_account_id(Principal.fromText(backend_canister_id), this.identity.getPrincipal());
            return depositAddr;

        } catch (error) {
            console.log(`Error getting deposit address:`, error)
            return null;
        }
    }

    async getPendingDeposits() {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }
            const pendingDeposits = await this.actor.getMyPendingDeposits();
            return pendingDeposits;
        } catch (error) {
            console.log(`Error getting pending deposits:`, error)
            return null;
        }
    }

    async getCreditsAvailable() {
        try {
            const credits = await this.actor?.getMyCredits();
            return credits;
        } catch (error) {
            return null;
        }
    }

    async getCanisterDeployments() {
        try {
            console.log("Getting canister deployments", this.agent);

            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            if (!this.idenitified) {
                throw new Error("Actor not identified.");
            }
            if (!this.identity) {
                throw new Error("Identity not initialized.");
            }
            console.log("Getting canister deployments", this.agent);
            const deployments = await this.actor.getCanisterDeployments();
            return deployments;
        } catch (error) {
            console.log(`Error getting canister deployments:`, error)
            return null;
        }
    }

    async getWorkflowHistory(canisterId: Principal) {
        const runsHistory = await this.actor?.getWorkflowRunHistory(
            canisterId
        );
        return runsHistory;
    }

    async getCanisterStatus(canisterId: Principal) {
        const result = await this.actor?.getCanisterStatus(canisterId);

        if (!result) {
            throw new Error("Failed to get canister status");
        }

        return result;
    }

    async uploadWasm(wasmBytes: number[]) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const result = await this.actor.uploadAssetCanisterWasm(
                wasmBytes
            );;
            return result;
        } catch (error) {
            console.log(`Error uploading WASM:`, error)
            return null;
        }
    }

    async deployAssetCanister() {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const result = await this.actor.deployAssetCanister();
            if ("Ok" in result || "ok" in result) {
                return { status: true, message: Object.values(result)[0] };
            }
            else {
                throw { status: false, message: "Error deploying asset canister: " + Object.values(result)[0] };
            }
        } catch (error) {
            console.log(`Error deploying asset canister:`, error)
            return null;
        }
    }

    async storeInAssetCanister(canisterId: Principal, files: StaticFile[], workflowRunDetails?: WorkflowRunDetails) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const result = await this.actor.storeInAssetCanister(canisterId, files, workflowRunDetails ? [workflowRunDetails] : []);
            if ("Ok" in result || "ok" in result) {
                return { status: true, message: "Stored files successfully." };
            }
            else {
                throw { status: false, message: "Error storing in asset canister: " + Object.values(result)[0] };
            }
        } catch (error: any) {
            console.log(`Error storing in asset canister:`, error)
            return { status: false, message: `Failed to upload file batch. ${error.message}` };
        }
    }

    // Updates the user balance in backend book after deposit to special address by user
    async deposit() {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const depositResult: DepositReceipt = await this.actor.depositIcp();
            if ("Ok" in depositResult) {
                return depositResult.Ok;
            }
            else {
                throw new Error("Error depositing ICP: " + depositResult.Err);
            }
        } catch (error) {
            console.log(`Error depositing ICP:`, error)
            return null;
        }
    }

    async auth_gh_request_code(): Promise<RequestCodeResponse> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }
            const request_code_result = await this.actor.auth_gh_request_device_code(githubClientId, "repo workflow");
            console.log(`Request code result form http outcall:`, request_code_result);

            const parsed = parse_get_device_code_response(request_code_result);
            return parsed as RequestCodeResponse;

        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }

    async auth_gh_request_access_token(device_code: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const grant_type = "urn:ietf:params:oauth:grant-type:device_code";
            const request_code_result = await this.actor.auth_gh_request_access_token(githubClientId, device_code, grant_type);
            console.log(`Request access token result form http outcall:`, request_code_result);

            const parsed = parse_github_query_response(request_code_result);
            return parsed;

        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }

    async gh_get_user(access_token: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_get_user([access_token]);
            console.log(`Response:`, response)

            const parsed = parse_github_query_response(response);
            return parsed;
        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }

    async gh_get_repositories(access_token: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_get_user([access_token]);
            console.log(`Response:`, response)

            const parsed = parse_github_query_response(response);
            return parsed;
        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }

    async gh_get_branches(access_token: string, repo: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_get_user([access_token]);
            console.log(`Response:`, response)

            const parsed = parse_github_query_response(response);
            return parsed;
        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }

    async gh_get_tree(access_token: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_get_user([access_token]);
            console.log(`Response:`, response)

            const parsed = parse_github_query_response(response);
            console.log(`parsed response`, parsed)

            const locations = (parsed.tree as string[])
                .filter((item: any) => item.path.endsWith("package.json"))
                .map((item: any) => {
                    const path = item.path.replace("/package.json", "");
                    // If package.json is in root, use "." as the path
                    return {
                        path: path === "package.json" ? "." : path,
                        hasPackageJson: true,
                    };
                });

            return locations;
        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }

    async gh_get_latest_workflow_run(access_token: string, repo_name: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_get_workflows([access_token], repo_name);
            console.log(`Response:`, response)

            const workflows = parse_github_query_response(response);

            if (!workflows || parseInt(workflows.total_count as string) === 0) {
                return '0';
            }

            const deployWorkflow = (workflows.workflows as any).find((workflow: any) => workflow.name === 'Build and Deploy to ICP');

            const workflowRuns = await this.gh_get_workflow(access_token, repo_name, deployWorkflow.id);

            return workflowRuns && workflowRuns.workflow_runs.length > 0 ? workflowRuns.workflow_runs[0].id : '0';

        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }


    async gh_get_workflow(access_token: string, repo_name: string, run_id: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_get_workflow_run([access_token], repo_name, run_id);
            console.log(`Response:`, response)

            const workflow = parse_github_query_response(response);
            return workflow;
        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }


    async gh_get_workflows(access_token: string, previous_run_id: string, repo_name: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_get_workflows([access_token], repo_name);
            console.log(`Response:`, response)

            // const parsed = parse_github_query_response(response);
            const parsed = JSON.parse(response);
            console.log(`Get workflows parsed: `, parsed)
            const workflowRuns: GithubWorkflowRunsResponse = await this.gh_get_workflow(access_token, repo_name, parsed.id);

            if (workflowRuns.workflow_runs.length === 0) {
                console.log(`No workflow runs found`);
                return null;
            }

            // Return if there are no new runs
            if (workflowRuns.workflow_runs[0].id === previous_run_id) {
                console.log(`No new runs found`);
                return null;
            }

            let newRuns = [];
            if (previous_run_id === '0') {
                newRuns = workflowRuns.workflow_runs;
            }
            else {
                // Find the index of the previous run (last run)
                const previousIndex = workflowRuns.workflow_runs.findIndex(
                    (run: any) => run.id === previous_run_id
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
                    const artifactsRes: GithubWorkflowArtifactResponse = await this.get_artifacts(
                        `/repos/${repo_name}/actions/runs/${relevantRun.id}/artifacts`, github_token
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




        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }


    async gh_get_artifact(access_token: string) {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_download_artifact([access_token]);
            console.log(`Response:`, response)

            const parsed = parse_github_query_response(response);
            return parsed;
        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }

    async gh_create_workflow(access_token: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_get_user([access_token]);
            console.log(`Response:`, response)

            const parsed = parse_github_query_response(response);
            return parsed;
        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }

    async gh_trigger_workflow(access_token: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_get_user([access_token]);
            console.log(`Response:`, response)

            const parsed = parse_github_query_response(response);
            return parsed;
        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }

    async gh_download_artifact(access_token: string): Promise<any> {
        try {
            if (!this.actor) {
                throw new Error("Actor not initialized.");
            }

            const response = await this.actor.gh_get_user([access_token]);
            console.log(`Response:`, response)

            const parsed = parse_github_query_response(response);
            return parsed;
        } catch (error) {
            console.error(`MainApi: failed to request github oauth device code`, error);
            throw error;
        }
    }

}


export default MainApi;