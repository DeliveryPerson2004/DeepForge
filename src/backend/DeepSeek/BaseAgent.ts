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



export abstract class BaseAgent{
    private readonly functionTools: ToolsType;
    private readonly instructions: string;
    private readonly model: ModelType;
    private modelClient: ModelClient;
    private readonly name: string;
    private readonly workspacePath: string;
    private logs: string[] = [];

    protected turn: number;
    protected input: InputItemType[] = [];

    protected constructor(
        model: ModelType,
        instructions: string,
        user: string,
        functionTools: ToolsType,
        workspacePath: string,
        turn: number,
    ) {
        this.functionTools = functionTools;
        this.instructions = instructions;
        this.model = model;
        this.modelClient = new ModelClient();
        this.name = user;
        this.workspacePath = workspacePath;
        this.turn = turn;

        this.printLogAndPush("new class BaseAgent()");
    }

    private createInputMessageItemAndPush(userInput: string) {
        const inputMessageItem: InputMessageItem = {
            type: "message",
            role: "user",
            content: userInput,
        };
        this.printLogAndPush(inputMessageItem.type);
        this.printLogAndPush(inputMessageItem.content)
        this.input.push(inputMessageItem);
    }

    protected printLogAndPush(loggerString: string){
        logger.info(loggerString);
        this.logs.push(loggerString);
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

    public getInput(){
        return this.input;
    }

    public setInput(input: InputItemType[]){
        this.input = input;
    }

    public getTurn(){
        return this.turn;
    }

    public async loop(userInput: string){
        this.printLogAndPush("class BaseAgent public loop() start");

        this.createInputMessageItemAndPush(userInput);

        while(true){
            const response: ResponseSchema = await this.modelClient.requestResponsesAPI(
                this.model,
                this.input,
                this.instructions,
                this.functionTools,
                this.name,
            )

            let hasFunctionCall = false;
            for(const item of response.output){
                this.input.push(item);
                if(item.type == "message"){
                    this.printLogAndPush(item.type);
                    for(const contentItem of item.content){
                        this.printLogAndPush("\n" + contentItem.text);
                    }
                }else if(item.type == "reasoning"){
                    this.printLogAndPush(item.type);
                    for(const contentItem of item.content){
                        this.printLogAndPush("\n" + contentItem.text);
                    }
                }else if(item.type == "function_call"){
                    this.printLogAndPush(item.type);
                    await this.requestFunctionCall(item);

                    if(item.name == "ask_developer"){
                        break;
                    }else{
                        hasFunctionCall = true;
                    }
                }else if(item.type == "web_search_call"){
                    this.printLogAndPush(item.type);
                }
            }
            if(!hasFunctionCall){
                break;
            }
        }

        this.printLogAndPush("class BaseAgent public loop() end");
    }
}