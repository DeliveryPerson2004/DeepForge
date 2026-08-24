import type {BaseAgent} from "./DeepSeek/BaseAgent.ts";
import {PlannerAgent} from "./DeepSeek/Agents/Planner/PlannerAgent.ts";
import {logger} from "./logger.ts";



export class Session{
    private agentList: BaseAgent[] = [];
    private workspacePath: string;
    private sessionId: number;

    constructor(workspacePath: string, sessionId: number) {
        this.agentList.push(new PlannerAgent(workspacePath, sessionId));
        this.workspacePath = workspacePath;
        this.sessionId = sessionId;

        logger.info("new class Session()");
    }

    async input(userInput: string) {
        for(const agent of this.agentList){
            if(agent instanceof PlannerAgent){
                await agent.loop(userInput);
            }
        }
    }
}