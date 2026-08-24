import type {BaseAgent} from "./DeepSeek/BaseAgent.ts";
import {PlannerAgent} from "./DeepSeek/Agents/Planner/PlannerAgent.ts";
import {logAndInsertDataToDB, logger} from "./logger.ts";
import {prisma} from "./database/prisma-client.ts";



export class Session{
    private agent: BaseAgent;
    private workspacePath: string;
    private readonly sessionId: number;

    private constructor(baseAgent: BaseAgent, workspacePath: string, sessionId: number) {
        this.agent = baseAgent;
        this.workspacePath = workspacePath;
        this.sessionId = sessionId;

        logAndInsertDataToDB("new class Session()", "info", sessionId).catch((err) => {
            logger.error(`ModelClient DB Log Error: ${err}`);
        });
    }

    static async createNewSession(workspacePath: string) {
        const newSession = await prisma.session.create({
            data: {},
        });
        await logAndInsertDataToDB("class Session public createNewSession() start", "info", newSession.id);

        const plannerAgent = new PlannerAgent(workspacePath, newSession.id);

        await logAndInsertDataToDB("class Session public createNewSession() end", "info", newSession.id);
        return new Session(plannerAgent, workspacePath, newSession.id);
    }

    public async input(userInput: string) {
        await logAndInsertDataToDB("class Session public input() start.", "info", this.sessionId);

        await this.agent.loop(userInput);

        await logAndInsertDataToDB("class Session public input() end.", "info", this.sessionId);
    }
}