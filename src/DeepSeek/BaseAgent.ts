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
import {logger} from "../logger.ts";
import {askDeveloper} from "../Tools/ask-developer.ts";



export abstract class BaseAgent{
    private readonly user: string;
    private readonly functionTools: ToolsType;
    private readonly model: ModelType;
    private modelClient = new ModelClient();
    protected input: InputItemType[] = [];
    private readonly instructions: string;
    protected readonly workspacePath: string;

    protected constructor(
        user: string,
        functionTools: ToolsType,
        model: ModelType,
        instructions: string,
        workspacePath: string,
    ) {
        this.user = user;
        this.functionTools = functionTools;
        this.model = model;
        this.instructions = instructions;
        this.workspacePath = workspacePath;

        logger.info("Instantiate class BaseAgent");
    }

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

    protected abstract requestFunctionCall(inputFunctionCallItem: InputFunctionCallItem): Promise<void>;

    private createInputMessageItemAndPush(userInput: string){
        const inputMessageItem: InputMessageItem = {
            type: "message",
            role: "user",
            content: userInput,
        };

        this.input.push(inputMessageItem);
    }

    async loop(userInput: string){
        logger.info("class BaseAgent public loop() start");

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
                if(item.type == "message"){
                    logger.info(item.type);
                    for(const contentItem of item.content){
                        logger.info(contentItem.text);
                    }
                    this.input.push(item);
                }else if(item.type == "reasoning"){
                    logger.info(item.type);
                    for(const contentItem of item.content){
                        logger.info(contentItem.text);
                    }
                    this.input.push(item);
                }else if(item.type == "function_call"){
                    logger.info(item.type);
                    this.input.push(item);
                    await this.requestFunctionCall(item);

                    if(item.name == "ask_developer"){
                        break;
                    }else{
                        hasFunctionCall = true;
                    }
                }else if(item.type == "web_search_call"){
                    logger.info(item.type);
                }
            }
            if(!hasFunctionCall){
                break;
            }
        }

        logger.info("class BaseAgent public loop() end");
    }
}