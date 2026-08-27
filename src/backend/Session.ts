import type {BaseAgent} from "./DeepSeek/BaseAgent.ts";
import {
    type InputItemType,
    type InputMessageItem,
    ModelType,
    type RequestBody,
    type ResponseSchema
} from "./DeepSeek/API/responses.ts";
import {PlanAgent} from "./DeepSeek/Agents/Planner/PlanAgent.ts";
import {logger, type LogRecord} from "./logger.ts";
import {prisma} from "./prisma-client.ts";
import {ContentLevel} from "../../generated/prisma/enums.ts";
import type {Level} from "pino";



export class Session{
    private agent: BaseAgent;
    private readonly sessionId: number;
    private sessionName: string = "";
    private logs: LogRecord[] = [];

    private constructor(baseAgent: BaseAgent, sessionId: number) {
        this.agent = baseAgent;
        this.sessionId = sessionId;

        this.printLogAndPushToLogs("new class Session()", "info");
    }

    private printLogAndPushToLogs(log: string, logLevel: Level){
        const logRecord: LogRecord = {
            content: log,
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

    public async createSessionName(input: InputItemType[], newUserInput: string){
        const inputMessageItem: InputMessageItem = {
            type: "message",
            role: "user",
            content: newUserInput,
        }

        input.push(inputMessageItem)
        const requestBody: RequestBody = {
            model: ModelType.DeepSeekV4Flash,
            input: input,
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
    }

    public async input(userInput: string) {
        this.printLogAndPushToLogs("class Session public input() start.", "info");

        const agentInput = this.agent.getInput();
        const turnStartInputLength = agentInput.length;
        await this.createSessionName(agentInput, userInput);
        await this.agent.loop(userInput);
        const newAgentInput = this.agent.getInput();
        await this.saveInputToDB(newAgentInput.slice(turnStartInputLength));
        await prisma.session.update({
            where: {id: this.sessionId},
            data: {session_name: this.sessionName},
        });

        this.printLogAndPushToLogs("class Session public input() end.", "info");
    }
}