import "dotenv/config";
import type {InputType, ModelType, RequestBody, ToolsType} from "./API/responses.ts";

export class ModelClient {
    private baseURL: string = "https://api.deepseek.com";
    private API_KEY = process.env.DEEPSEEK_API_KEY;

    constructor() {
        console.log(`ModelClient实例化成功`);
    }

    async requestResponsesAPI(
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

        const responses = await fetch(
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

        return await responses.json();
    }
}