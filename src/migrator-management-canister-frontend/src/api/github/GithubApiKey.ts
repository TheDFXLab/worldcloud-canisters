import { Principal } from "@dfinity/principal";
import { createActor } from "../../../../declarations/migrator-management-canister-backend";
import { ActorSubclass, HttpAgent, Identity } from "@dfinity/agent";
import { _SERVICE, DepositReceipt, WorkflowRunDetails } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { backend_canister_id, http_host, internetIdentityConfig } from "../../config/config";
import { StaticFile } from "../../utility/compression";
import { HttpAgentManager } from "../../agent/http_agent";

export type BackendActor = ActorSubclass<_SERVICE>;

class GithubApiKeyManagement {
    private static instance: GithubApiKeyManagement | null = null;
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
            const githubApiKeyManagement = new GithubApiKeyManagement(identity, actor, isIdentified, agent);
            this.instance = githubApiKeyManagement;

            return githubApiKeyManagement;
        } catch (error) {
            console.error(`Error creating actor:`, error);
            return null;
        }
    }

    async get(): Promise<string | null> {
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
            const apiKey = await this.actor.get_github_api_key();
            return apiKey.encrypted_text;
        } catch (error) {
            console.log(`GithubApiKeyManagement: Failed to get api key:`, error)
            return null;
        }
    }

    async create(encryptedApiKey: string): Promise<bigint | null> {
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
            const id = await this.actor.create_github_api_key(encryptedApiKey);
            return id;
        } catch (error) {
            console.log(`GithubApiKeyManagement: Failed to create api key:`, error)
            return null;
        }
    }

    async update(encryptedApiKey: string): Promise<Boolean> {
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
            if (!encryptedApiKey) {
                throw new Error("Encrypted api key cannot be empty.");
            }

            const isUpdated = await this.actor.update_github_api_key(encryptedApiKey);
            return isUpdated;
        } catch (error) {
            console.error(`GithubApiKeyManagement: Failed to update api key`);
            return false;
        }
    }

    async delete(): Promise<Boolean> {
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

            const isDeleted = await this.actor.delete_github_api_key();
            return isDeleted;
        } catch (error) {
            console.error(`GithubApiKeyManagement: Failed to delete api key`);
            return false;
        }
    }
}


export default GithubApiKeyManagement;