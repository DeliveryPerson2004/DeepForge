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
import {type Log, printLogAndReturnNewLogs} from "../logger.ts";



export abstract class BaseAgent{
    private readonly functionTools: ToolsType;
    private readonly instructions: string;
    private readonly model: ModelType;
    private modelClient: ModelClient;
    protected logs: Log[] = [];

    protected readonly agentName: string;
    protected readonly workspacePath: string;
    protected turn: number;
    protected input: InputItemType[] = [];

    protected constructor(
        model: ModelType,
        instructions: string,
        agentName: string,
        functionTools: ToolsType,
        workspacePath: string,
        turn: number,
    ) {
        this.functionTools = functionTools;
        this.instructions = instructions;
        this.model = model;
        this.modelClient = new ModelClient();
        this.agentName = agentName;
        this.workspacePath = workspacePath;
        this.turn = turn;

        this.logs = printLogAndReturnNewLogs(this.logs, "new class BaseAgent()", "info");
    }

    private createInputMessageItemAndPush(userInput: string) {
        const inputMessageItem: InputMessageItem = {
            type: "message",
            role: "user",
            content: userInput,
        };
        this.logs = printLogAndReturnNewLogs(this.logs, inputMessageItem.type, "info");
        this.logs = printLogAndReturnNewLogs(this.logs, inputMessageItem.content, "info")
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

    public getInput(){
        return this.input;
    }

    public getTurn(){
        return this.turn;
    }

    public getLogs(){
        const modelLogs = this.modelClient.getLogs();
        this.logs.push(...modelLogs);

        const logs = this.logs;
        this.logs = [];

        return logs;
    }

    public async loop(userInput: string){
        this.logs = printLogAndReturnNewLogs(this.logs, "class BaseAgent public loop() start", "info");

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
                    this.logs = printLogAndReturnNewLogs(this.logs, item.type, "info");
                    for(const contentItem of item.content){
                        this.logs = printLogAndReturnNewLogs(this.logs, "\n" + contentItem.text, "info");
                    }
                }else if(item.type == "reasoning"){
                    this.logs = printLogAndReturnNewLogs(this.logs, item.type, "info");
                    for(const contentItem of item.content){
                        this.logs = printLogAndReturnNewLogs(this.logs, "\n" + contentItem.text, "info");
                    }
                }else if(item.type == "function_call"){
                    this.logs = printLogAndReturnNewLogs(this.logs, item.type, "info");
                    await this.requestFunctionCall(item);

                    if(item.name == "ask_developer"){
                        break;
                    }else{
                        hasFunctionCall = true;
                    }
                }else if(item.type == "web_search_call"){
                    this.logs = printLogAndReturnNewLogs(this.logs, item.type, "info");
                }
            }
            if(!hasFunctionCall){
                break;
            }
        }

        this.logs = printLogAndReturnNewLogs(this.logs, "class BaseAgent public loop() end", "info");
    }
}