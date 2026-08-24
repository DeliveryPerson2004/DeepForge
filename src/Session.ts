import type {BaseAgent} from "./DeepSeek/BaseAgent.ts";
import type {InputItemType} from "./DeepSeek/API/responses.ts";
import {PlannerAgent} from "./DeepSeek/Agents/Planner/PlannerAgent.ts";
import {printLogAndSaveDataToDB, logger} from "./logger.ts";
import {prisma} from "./database/prisma-client.ts";



export class Session{
    private agent: BaseAgent;
    private workspacePath: string;
    private readonly sessionId: number;

    private constructor(baseAgent: BaseAgent, workspacePath: string, sessionId: number) {
        this.agent = baseAgent;
        this.workspacePath = workspacePath;
        this.sessionId = sessionId;

        printLogAndSaveDataToDB("new class Session()", "info", sessionId, 1).catch((err) => {
            logger.error(`ModelClient DB Log Error: ${err}`);
        });
    }

    private logHistory(){

    }

    private saveAgentInputToDB(){

    }

    static async createNewSession(workspacePath: string) {
        const newSession = await prisma.session.create({
            data: {
                workspace_path: workspacePath,
                max_turn: 1,
            },
        });
        await printLogAndSaveDataToDB(
            "class Session public createNewSession() start",
            "info",
            newSession.id,
            1);

        const plannerAgent = new PlannerAgent(workspacePath, newSession.id, 1);

        await printLogAndSaveDataToDB(
            "class Session public createNewSession() end",
            "info",
            newSession.id,
            1);
        return new Session(plannerAgent, workspacePath, newSession.id);
    }

    static async resumeSession(workspacePath: string, sessionId: number){
        const oldSession = await prisma.session.findUnique({
            where: {
                id: sessionId,
            }
        })
        if(oldSession != null){
            const inputHistory = await prisma.agentInput.findMany({
                where: {
                    session_id: oldSession.id,
                },
                orderBy: {
                    turn: "asc",
                }
            })
            const plannerAgent = new PlannerAgent(workspacePath, oldSession.id, oldSession.max_turn);
            plannerAgent.input = inputHistory.flatMap(row => row.input as unknown as InputItemType[]);

            return new Session(plannerAgent, workspacePath, oldSession.id);
        }

        return null;
    }

    public async input(userInput: string) {
        await printLogAndSaveDataToDB(
            "class Session public input() start.",
            "info",
            this.sessionId,
            1);

        await this.agent.loop(userInput);

        await printLogAndSaveDataToDB(
            "class Session public input() end.",
            "info",
            this.sessionId,
            1);
    }
}