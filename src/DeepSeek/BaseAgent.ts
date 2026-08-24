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
import {printLogAndSaveDataToDB, logger} from "../logger.ts";
import {prisma} from "../database/prisma-client.ts";
import type {Prisma} from "../../generated/prisma/client.ts";



export abstract class BaseAgent{
    private readonly functionTools: ToolsType;
    private readonly instructions: string;
    private readonly model: ModelType;
    private modelClient: ModelClient;
    private readonly user: string;
    protected turn: number;

    protected sessionId: number;
    public input: InputItemType[] = [];
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

        printLogAndSaveDataToDB("new class BaseAgent()", "info", sessionId, turn).catch((err) => {
            logger.error(`ModelClient DB Log Error: ${err}`);
        });
    }

    private async saveInputToDB(input: InputItemType[]){
        await prisma.agentInput.create({
            data: {
                input: input as unknown as Prisma.InputJsonValue,
                session_id: this.sessionId,
                turn: this.turn,
            }
        })
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
        await printLogAndSaveDataToDB("class BaseAgent public loop() start", "info", this.sessionId, this.turn);

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
                    await printLogAndSaveDataToDB(item.type, "info", this.sessionId, this.turn);
                    for(const contentItem of item.content){
                        await printLogAndSaveDataToDB("\n" + contentItem.text, "info", this.sessionId, this.turn);
                    }
                }else if(item.type == "reasoning"){
                    await printLogAndSaveDataToDB(item.type, "info", this.sessionId, this.turn);
                    for(const contentItem of item.content){
                        await printLogAndSaveDataToDB("\n" + contentItem.text, "info", this.sessionId, this.turn);
                    }
                }else if(item.type == "function_call"){
                    await printLogAndSaveDataToDB(item.type, "info", this.sessionId, this.turn);
                    await this.requestFunctionCall(item);

                    if(item.name == "ask_developer"){
                        break;
                    }else{
                        hasFunctionCall = true;
                    }
                }else if(item.type == "web_search_call"){
                    await printLogAndSaveDataToDB(item.type, "info", this.sessionId, this.turn);
                }
            }
            if(!hasFunctionCall){
                break;
            }
        }
        await printLogAndSaveDataToDB("class BaseAgent public loop() end", "info", this.sessionId, this.turn);
        await this.saveInputToDB(this.input);
        this.turn += 1;
    }
}