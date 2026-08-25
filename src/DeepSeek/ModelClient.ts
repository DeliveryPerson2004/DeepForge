import "dotenv/config";
import type {InputType, ModelType, RequestBody, ToolsType} from "./API/responses.ts";
import {printLogAndSaveToDB, logger} from "../logger.ts";



export class ModelClient {
    private API_KEY = process.env.DEEPSEEK_API_KEY;
    private baseURL: string = "https://api.deepseek.com";
    private readonly sessionId: number;
    private readonly turn: number;

    constructor(sessionId: number, turn: number) {
        this.sessionId = sessionId;
        this.turn = turn;
        printLogAndSaveToDB("new class ModelClient()", "info", this.sessionId, this.turn).catch((err) => {
            logger.error(`ModelClient DB Log Error: ${err}`);
        });
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