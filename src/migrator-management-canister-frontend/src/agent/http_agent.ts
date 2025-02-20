import { HttpAgent, Identity } from "@dfinity/agent";
import { http_host } from "../config/config";

export class HttpAgentManager {
    private static instance: HttpAgentManager;
    public agent: HttpAgent;
    private static isConstructing: boolean = false;

    private constructor(agent: HttpAgent) {
        console.log("HttpAgentManager: Constructing HttpAgentManager ");
        this.agent = agent;
    }

    static async getInstance(identity: Identity | null) {
        if (!this.instance) {
            if (this.isConstructing) {
                return null;
            }
            this.isConstructing = true;
            const agent = await HttpAgent.create({ identity: identity ? identity : undefined, host: http_host });
            this.instance = new HttpAgentManager(agent);
            this.isConstructing = false;

        }
        else {
            console.log("HttpAgentManager: Returning existing HttpAgentManager instance", this.instance.agent);
        }
        return this.instance;
    }
}