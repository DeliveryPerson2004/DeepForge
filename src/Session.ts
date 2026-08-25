import type {BaseAgent} from "./DeepSeek/BaseAgent.ts";
import type {InputItemType} from "./DeepSeek/API/responses.ts";
import {PlannerAgent} from "./DeepSeek/Agents/Planner/PlannerAgent.ts";
import {printLogAndSaveToDB, logger} from "./logger.ts";
import {prisma} from "./database/prisma-client.ts";
import {ContentLevel} from "../generated/prisma/enums.ts";



export class Session{
    private agent: BaseAgent;
    private workspacePath: string;
    private readonly sessionId: number;

    private constructor(baseAgent: BaseAgent, workspacePath: string, sessionId: number, turn = 1) {
        this.agent = baseAgent;
        this.workspacePath = workspacePath;
        this.sessionId = sessionId;

        printLogAndSaveToDB("new class Session()", "info", sessionId, turn).catch((err) => {
            logger.error(`ModelClient DB Log Error: ${err}`);
        });
    }

    private async logHistory(){
        const logs = await prisma.log.findMany({
            where: {
                session_id: this.sessionId,
            },
            orderBy: {
                created_at: "asc",
            },
        });

        for (const log of logs) {
            if (log.content_level === ContentLevel.info) {
                logger.info(log.content);
            } else if (log.content_level === ContentLevel.warn) {
                logger.warn(log.content);
            }
        }
    }

    private async saveInputToDB(input: InputItemType[]){
        await prisma.agentInput.create({
            data: {
                input: input,
                session_id: this.sessionId,
                turn: this.agent.getTurn(),
            }
        })
    }

    static async createNewSession(workspacePath: string) {
        const newSession = await prisma.session.create({
            data: {
                workspace_path: workspacePath,
                max_turn: 1,
            },
        });
        await printLogAndSaveToDB(
            "class Session public createNewSession() start",
            "info",
            newSession.id,
            1);

        const plannerAgent = new PlannerAgent(workspacePath, newSession.id, 1);

        await printLogAndSaveToDB(
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
            plannerAgent.setInput(inputHistory.flatMap(row => row.input as InputItemType[]));

            const session = new Session(plannerAgent, workspacePath, oldSession.id, oldSession.max_turn);

            await session.logHistory();

            return session;
        }

        return null;
    }

    public async input(userInput: string) {
        await printLogAndSaveToDB(
            "class Session public input() start.",
            "info",
            this.sessionId,
            this.agent.getTurn());

        const agentInput = this.agent.getInput();
        const turnStartInputLength = agentInput.length;
        await this.agent.loop(userInput);
        const newAgentInput = this.agent.getInput();
        await this.saveInputToDB(newAgentInput.slice(turnStartInputLength));
        await printLogAndSaveToDB(
            "class Session public input() end.",
            "info",
            this.sessionId,
            this.agent.getTurn());
    }
}