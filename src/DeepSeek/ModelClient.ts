import {
    InputSchema,
    type InputType,
    InstructionsSchema,
    type InstructionsType, MessageItemSchema,
    ModelSchema,
    type ModelType,
    type ReasoningType, RequestBodySchema,
    type StreamType,
    type TextType, ToolsSchema,
    type ToolsType, UserSchema,
    type UserType
} from "./API/responses/RequestSchema.ts";
import "dotenv/config";
import {ResponsesSchema} from "./API/responses/ResponsesSchema.ts";

export class ModelClient {
    private baseURL: string = "https://api.deepseek.com";
    private API_KEY = process.env.DEEPSEEK_API_KEY;

    constructor() {
        console.log(`ModelClient实例化成功`);
    }

    async requestResponsesAPI(
        model: ModelType,
        input: InputType,
        instructions: InstructionsType,
        tools: ToolsType,
        user: UserType,
        reasoning?: ReasoningType,
        stream?: StreamType,
        text?: TextType,
    ){
        const endPoint = "/responses";

        const playLoad = RequestBodySchema.parse({
            model,
            input,
            instructions,
            tools,
            user,
        })

        const responses = await fetch(
            `${this.baseURL}${endPoint}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${this.API_KEY}` // 此处传入实际的 API Token
                },
                body: JSON.stringify(playLoad),
            }
        );

        const responsesJSONed = await responses.json();

        return ResponsesSchema.parse(responsesJSONed);
    }
}