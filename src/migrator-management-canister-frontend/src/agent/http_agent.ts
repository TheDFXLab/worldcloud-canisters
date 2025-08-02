import { HttpAgent, Identity } from "@dfinity/agent";
import { http_host } from "../config/config";

export class HttpAgentManager {
    private static instance: HttpAgentManager;
    public agent: HttpAgent | null;
    private static isConstructing: boolean = false;

    private constructor(agent: HttpAgent) {
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
            if (!this.instance.agent) {
                return this.instance;
            }

            if (this.instance.agent && identity) {
                if ((await this.instance.agent.getPrincipal()).toString() !== identity?.getPrincipal().toString()) {
                    this.instance.agent.replaceIdentity(identity);
                }
            }
        }
        return this.instance;
    }

    clear() {
        if (this.agent) {
            this.agent = null;
        }
    }

}