import type {BaseAgent} from "./DeepSeek/BaseAgent.ts";
import {PlannerAgent} from "./DeepSeek/Agents/Planner/PlannerAgent.ts";
import {logAndInsertDataToDB, logger} from "./logger.ts";



export class Session{
    private agentList: BaseAgent[] = [];
    private workspacePath: string;
    private sessionId: number;

    constructor(workspacePath: string, sessionId: number) {
        this.agentList.push(new PlannerAgent(workspacePath, sessionId));
        this.workspacePath = workspacePath;
        this.sessionId = sessionId;

        logAndInsertDataToDB("new class Session()", "info", sessionId).catch((err) => {
            logger.error(`ModelClient DB Log Error: ${err}`);
        });
    }

    async input(userInput: string) {
        for(const agent of this.agentList){
            if(agent instanceof PlannerAgent){
                await agent.loop(userInput);
            }
        }
    }
}