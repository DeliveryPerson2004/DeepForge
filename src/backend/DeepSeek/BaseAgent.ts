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
import {printLogAndSaveToDB, logger} from "../logger.ts";
import {prisma} from "../prisma-client.ts";



export abstract class BaseAgent{
    private readonly functionTools: ToolsType;
    private readonly instructions: string;
    private readonly model: ModelType;
    private modelClient: ModelClient;
    private readonly user: string;
    protected turn: number;

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
        turn: number,
    ) {
        this.functionTools = functionTools;
        this.instructions = instructions;
        this.model = model;
        this.modelClient = new ModelClient(sessionId, turn);
        this.user = user;
        this.sessionId = sessionId;
        this.workspacePath = workspacePath;
        this.turn = turn;

        printLogAndSaveToDB("new class BaseAgent()", "info", sessionId, turn).catch((err) => {
            logger.error(`ModelClient DB Log Error: ${err}`);
        });
    }

    private async createInputMessageItemAndPush(userInput: string) {
        const inputMessageItem: InputMessageItem = {
            type: "message",
            role: "user",
            content: userInput,
        };
        await printLogAndSaveToDB(inputMessageItem.type, "info", this.sessionId, this.turn);
        await printLogAndSaveToDB(inputMessageItem.content, "info", this.sessionId, this.turn);
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

    public setInput(input: InputItemType[]){
        this.input = input;
    }

    public getTurn(){
        return this.turn;
    }

    public async loop(userInput: string){
        await printLogAndSaveToDB("class BaseAgent public loop() start", "info", this.sessionId, this.turn);

        await this.createInputMessageItemAndPush(userInput);

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
                    await printLogAndSaveToDB(item.type, "info", this.sessionId, this.turn);
                    for(const contentItem of item.content){
                        await printLogAndSaveToDB("\n" + contentItem.text, "info", this.sessionId, this.turn);
                    }
                }else if(item.type == "reasoning"){
                    await printLogAndSaveToDB(item.type, "info", this.sessionId, this.turn);
                    for(const contentItem of item.content){
                        await printLogAndSaveToDB("\n" + contentItem.text, "info", this.sessionId, this.turn);
                    }
                }else if(item.type == "function_call"){
                    await printLogAndSaveToDB(item.type, "info", this.sessionId, this.turn);
                    await this.requestFunctionCall(item);

                    if(item.name == "ask_developer"){
                        break;
                    }else{
                        hasFunctionCall = true;
                    }
                }else if(item.type == "web_search_call"){
                    await printLogAndSaveToDB(item.type, "info", this.sessionId, this.turn);
                }
            }
            if(!hasFunctionCall){
                break;
            }
        }
        await printLogAndSaveToDB("class BaseAgent public loop() end", "info", this.sessionId, this.turn);

        this.turn += 1;
        await prisma.session.update({
            where: {id: this.sessionId},
            data: {max_turn: this.turn},
        });
    }
}