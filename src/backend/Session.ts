import type {BaseAgent} from "./DeepSeek/BaseAgent.ts";
import {
    type InputItemType,
    type InputMessageItem,
    ModelType,
    type RequestBody,
    type ResponseSchema
} from "./DeepSeek/API/responses.ts";
import {PlanAgent} from "./DeepSeek/Agents/Planner/PlanAgent.ts";
import {logger, type Log} from "./logger.ts";
import {prisma} from "./prisma-client.ts";
import type {Level} from "pino";
import {LogLevel} from "../../generated/prisma/enums.ts";



export class Session{
    private agent: BaseAgent;
    private readonly sessionId: number;
    private sessionName: string = "";
    private logs: Log[] = [];

    private constructor(baseAgent: BaseAgent, sessionId: number) {
        this.agent = baseAgent;
        this.sessionId = sessionId;

        this.printLogAndPushToLogs("new class Session()", "info");
    }

    private getLogs(){
        const agentLogs = this.agent.getLogs();
        this.logs.push(...agentLogs);
        const sessionLogs = this.logs;
        this.logs = [];

        return sessionLogs;
    }

    private async updateSessionName(userInput: string, agentInputAfterLoop: InputItemType[]){
        const inputMessageItem: InputMessageItem = {
            type: "message",
            role: "user",
            content: userInput,
        }

        agentInputAfterLoop.push(inputMessageItem)
        const requestBody: RequestBody = {
            model: ModelType.DeepSeekV4Flash,
            input: agentInputAfterLoop,
            instructions: "参考上述内容和格式化输出，生成会话名称",
            user: "create_session_name",
            text: {
                format: {
                    type: "json_schema",
                    name: "session的名字",
                    schema: {
                        type: "object",
                        properties: {
                            sessionName: {
                                type: "string",
                                description: "生成的会话名称"
                            }
                        },
                        required: ["sessionName"]
                    }
                }
            }
        }

        const requestBodyString = JSON.stringify(requestBody);

        const response = await fetch(
            `https://api.deepseek.com/responses`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}` // 此处传入实际的 API Token
                },
                body: requestBodyString,
            }
        );

        const responseJSONed: ResponseSchema = await response.json();
        for(const item of responseJSONed.output){
            if(item.type == "message"){
                for(const contentItem of item.content){
                    const output = contentItem.text;
                    const outputJSONed = JSON.parse(output);
                    this.sessionName = outputJSONed.sessionName;
                }
            }
        }

        await prisma.session.update({
            where: {id: this.sessionId},
            data: {session_name: this.sessionName},
        });
    }

    private async saveLogToDB(){
        const logs = this.getLogs();

        const logMapped = logs.map((log) => ({
            session_id: this.sessionId,
            content: log.content,
            log_level: log.level as LogLevel,
            created_at: log.createdAt,
        }));

        await prisma.log.createMany({
            data: logMapped,
        })
    }

    private async saveAgentInputToDB(agentInputBeforeLoop: InputItemType[], agentInputAfterLoop: InputItemType[]){
        const inputDelta = agentInputAfterLoop.slice(agentInputBeforeLoop.length);

        await prisma.agentInput.create({
            data: {
                input: inputDelta,
                session_id: this.sessionId,
                turn: this.agent.getTurn(),
            }
        })
    }

    private async updateAndSaveDataToDB(userInput: string, agentInputBeforeLoop: InputItemType[], agentInputAfterLoop: InputItemType[]) {
        await Promise.all([
            this.updateSessionName(userInput, agentInputAfterLoop),
            this.saveLogToDB(),
            this.saveAgentInputToDB(agentInputBeforeLoop, agentInputAfterLoop),
        ]);
    }

    private printLogAndPushToLogs(log: string, logLevel: Level){
        const logRecord: Log = {
            content: log,
            level: logLevel,
            createdAt: new Date(),
        }

        this.logs.push(logRecord);

        if(logLevel === "info")
            logger.info(log);
    }

    private async printLogHistory(){
        const logs = await prisma.log.findMany({
            where: {
                session_id: this.sessionId,
            },
            orderBy: {
                created_at: "asc",
            },
        });

        for (const log of logs) {
            if (log.log_level === LogLevel.info) {
                logger.info(log.content);
            } else if (log.log_level === LogLevel.warn) {
                logger.warn(log.content);
            }
        }
    }

    static async createSession(workspacePath: string) {
        const newSession = await prisma.session.create({
            data: {
                workspace_path: workspacePath,
                max_turn: 1,
                session_name: "会话名称未确定",
            },
        });

        logger.info("class Session public createNewSession() start");

        const agentInput: InputItemType[] = [];
        const plannerAgent = new PlanAgent(workspacePath, newSession.id, agentInput);

        logger.info("class Session public createNewSession() end");
        return new Session(plannerAgent, newSession.id);
    }

    static async resumeSession(sessionId: number){
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

            const agentInput = inputHistory.flatMap(row => row.input as InputItemType[]);
            const plannerAgent = new PlanAgent(oldSession.workspace_path, oldSession.max_turn, agentInput);

            const session = new Session(plannerAgent, oldSession.id);

            await session.printLogHistory();

            return session;
        }

        return null;
    }

    public async input(userInput: string) {
        this.printLogAndPushToLogs("class Session public input() start.", "info");

        const agentInputBeforeLoop = this.agent.getInput();
        await this.agent.loop(userInput);
        const agentInputAfterLoop = this.agent.getInput();

        this.printLogAndPushToLogs("class Session public input() end.", "info");

        await this.updateAndSaveDataToDB(userInput, agentInputBeforeLoop, agentInputAfterLoop);
    }
}