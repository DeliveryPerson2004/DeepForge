import {
    type InputFunctionCallItem,
    type InputFunctionCallOutputItem,
    type InputItemType,
    type InputMessageItem,
    ModelType,
    type ResponseSchema,
    type ToolsType
} from "../API/responses.ts";
import {ModelClient} from "../ModelClient.ts";
import {logger} from "../../logger.ts";
import {insertIntoMessageTableStmt} from "../../database/stmt.ts";



export abstract class BaseAgent{
    private readonly functionTools: ToolsType;
    private readonly instructions: string;
    private readonly model: ModelType;
    private modelClient: ModelClient;

    protected readonly agentId: number;
    protected readonly agentName: string;
    protected turn: number;
    protected input: InputItemType[];

    protected constructor(
        model: ModelType,
        instructions: string,
        agentId: number,
        agentName: string,
        functionTools: ToolsType,
        turn: number,
        input: InputItemType[],
    ) {
        this.functionTools = functionTools;
        this.instructions = instructions;
        this.model = model;
        this.modelClient = new ModelClient();
        this.agentId = agentId;
        this.agentName = agentName;
        this.turn = turn;
        this.input = input;

        logger.info("new class BaseAgent()");
    }

    private createInputMessageItemAndPush(userInput: string) {
        const inputMessageItem: InputMessageItem = {
            type: "message",
            role: "user",
            content: userInput,
        };
        logger.info(inputMessageItem.type);
        logger.info(inputMessageItem.content);
        this.input.push(inputMessageItem);
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

    public async ask(userInput: string){
        logger.info("class BaseAgent public loop() start");

        const inputLengthBeforeLoop = this.input.length;

        this.createInputMessageItemAndPush(userInput);

        while(true){
            const response: ResponseSchema = await this.modelClient.requestResponsesAPI(
                this.model,
                this.input,
                this.instructions,
                this.functionTools,
                this.agentName,
            )

            let hasFunctionCall = false;
            for(const item of response.output){
                this.input.push(item);
                if(item.type == "message"){
                    logger.info(item.type);
                    for(const contentItem of item.content){
                        logger.info("\n" + contentItem.text);
                    }
                }else if(item.type == "reasoning"){
                    logger.info(item.type);
                    for(const contentItem of item.content){
                        logger.info("\n" + contentItem.text);
                    }
                }else if(item.type == "function_call"){
                    logger.info(item.type);
                    await this.requestFunctionCall(item);
                    hasFunctionCall = true;
                }else if(item.type == "web_search_call"){
                    logger.info(item.type);
                }
            }
            if(!hasFunctionCall){
                break;
            }
        }

        const inputDeltaAfterLoop = this.input.slice(inputLengthBeforeLoop);

        insertIntoMessageTableStmt.run(this.agentId, this.turn, JSON.stringify(inputDeltaAfterLoop), 1);

        logger.info("class BaseAgent public loop() end");
    }
}