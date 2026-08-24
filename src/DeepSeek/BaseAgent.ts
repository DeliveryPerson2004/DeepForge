import {
    type InputFunctionCallItem,
    type InputFunctionCallOutputItem,
    type InputItemType,
    type InputMessageItem,
    ModelType,
    type ResponseSchema,
    type ToolsType
} from "./API/responses.ts";
import {ModelClient} from "./ModelClient.ts";
import {logAndInsertDataToDB, logger} from "../logger.ts";



export abstract class BaseAgent{
    private readonly functionTools: ToolsType;
    private readonly instructions: string;
    private readonly model: ModelType;
    private modelClient: ModelClient;
    private readonly user: string;

    protected sessionId: number;
    protected input: InputItemType[] = [];
    protected readonly workspacePath: string;

    protected constructor(
        model: ModelType,
        instructions: string,
        user: string,
        functionTools: ToolsType,
        sessionId: number,
        workspacePath: string,
    ) {
        this.functionTools = functionTools;
        this.instructions = instructions;
        this.model = model;
        this.modelClient = new ModelClient(sessionId);
        this.user = user;
        this.sessionId = sessionId;
        this.workspacePath = workspacePath;

        logAndInsertDataToDB("new class BaseAgent()", "info", sessionId).catch((err) => {
            logger.error(`ModelClient DB Log Error: ${err}`);
        });
    }

    protected abstract requestFunctionCall(inputFunctionCallItem: InputFunctionCallItem): Promise<void>;

    protected createFunctionCallOutputItemAndPush(inputFunctionCallItem: InputFunctionCallItem, output: string){
        const functionCallOutputItem: InputFunctionCallOutputItem = {
            type: "function_call_output",
            call_id: inputFunctionCallItem.call_id,
            name: inputFunctionCallItem.name,
            arguments: inputFunctionCallItem.arguments,
            output: output,
        };

        this.input.push(functionCallOutputItem);
    }

    private createInputMessageItemAndPush(userInput: string){
        const inputMessageItem: InputMessageItem = {
            type: "message",
            role: "user",
            content: userInput,
        };

        this.input.push(inputMessageItem);
    }

    public async loop(userInput: string){
        await logAndInsertDataToDB("class BaseAgent public loop() start", "info", this.sessionId);

        this.createInputMessageItemAndPush(userInput);

        while(true){
            const response: ResponseSchema = await this.modelClient.requestResponsesAPI(
                this.model,
                this.input,
                this.instructions,
                this.functionTools,
                this.user,
            )

            let hasFunctionCall = false;
            for(const item of response.output){
                this.input.push(item);
                if(item.type == "message"){
                    await logAndInsertDataToDB(item.type, "info", this.sessionId);
                    for(const contentItem of item.content){
                        await logAndInsertDataToDB("\n" + contentItem.text, "info", this.sessionId);
                    }
                }else if(item.type == "reasoning"){
                    await logAndInsertDataToDB(item.type, "info", this.sessionId);
                    for(const contentItem of item.content){
                        await logAndInsertDataToDB("\n" + contentItem.text, "info", this.sessionId);
                    }
                }else if(item.type == "function_call"){
                    await logAndInsertDataToDB(item.type, "info", this.sessionId);
                    await this.requestFunctionCall(item);

                    if(item.name == "ask_developer"){
                        break;
                    }else{
                        hasFunctionCall = true;
                    }
                }else if(item.type == "web_search_call"){
                    await logAndInsertDataToDB(item.type, "info", this.sessionId);
                }
            }
            if(!hasFunctionCall){
                break;
            }
        }

        await logAndInsertDataToDB("class BaseAgent public loop() end", "info", this.sessionId);
    }
}