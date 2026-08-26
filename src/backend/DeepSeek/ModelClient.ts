import "dotenv/config";
import type {InputType, ModelType, RequestBody, ToolsType} from "./API/responses.ts";
import {logger, type LogRecord} from "../logger.ts";
import type {Level} from "pino";



export class ModelClient {
    private API_KEY = process.env.DEEPSEEK_API_KEY;
    private baseURL: string = "https://api.deepseek.com";
    private logs: LogRecord[] = [];

    constructor() {
        this.printLogAndPushToLogs("new class ModelClient()", "info");
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

    public getLogs(){
        return this.logs;
    }

    public async requestResponsesAPI(
        model: ModelType,
        input: InputType,
        instructions: string,
        tools: ToolsType,
        user: string,
    ){
        const endPoint = "/responses";

        const requestBody: RequestBody = {
            model: model,
            input: input,
            instructions: instructions,
            tools: tools,
            user: user,
        }
        const requestBodyString = JSON.stringify(requestBody);

        const response = await fetch(
            `${this.baseURL}${endPoint}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${this.API_KEY}` // 此处传入实际的 API Token
                },
                body: requestBodyString,
            }
        );

        return await response.json();
    }
}