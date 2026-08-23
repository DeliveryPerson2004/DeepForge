import type {BaseAgent} from "./DeepSeek/BaseAgent.ts";
import {PlannerAgent} from "./Agents/Planner/PlannerAgent.ts";
import {logger} from "./logger.ts";



export class Session{
    private agent: BaseAgent;
    private workspacePath: string;

    constructor(workspacePath: string) {
        this.agent = new PlannerAgent(workspacePath);
        this.workspacePath = workspacePath;

        logger.info("Instantiate class Session");
    }

    async input(userInput: string) {
        await this.agent.loop(userInput);
    }
}