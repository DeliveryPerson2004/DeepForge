import {ModelClient} from "./ModelClient.ts";
import {
    type InputType,
    type InstructionsType,
    MessageItemSchema,
    type ModelType,
    type ToolsType
} from "./API/responses/RequestSchema.ts";
import {ResponsesSchema} from "./API/responses/ResponsesSchema.ts";

export class BaseAgent{
    private readonly user: string;
    private readonly funcTools: ToolsType;
    private readonly model: ModelType;
    private modelClient = new ModelClient();
    private input: InputType = [];
    private readonly instructions: InstructionsType;

    constructor(user: string, funcTools: ToolsType, model: ModelType, instructions: InstructionsType, ) {
        this.user = user;
        this.funcTools = funcTools;
        this.model = model;
        this.instructions = instructions;
    }

    private createInputMessageItem(userInput: string){
        const messageItem = {
            type: "message",
            role: "user",
            content: userInput,
        };

        return MessageItemSchema.parse(messageItem);
    }

    private printLog(log: string){
        console.log(`\n\n\n\n\n${log}\n`);
    }

    async loop(userInput: string){
        if(this.input != null){
            this.input.push(this.createInputMessageItem(userInput));
            // console.log(this.input);
        }

        while(true){
            const response = await this.modelClient.requestResponsesAPI(
                this.model,
                this.input,
                this.instructions,
                this.funcTools,
                this.user,
            )
            const responseParsed = ResponsesSchema.parse(response);
            const output = responseParsed.output;

            let hasFunctionCall = false;
            for(const item of output){
                if(item.type == "message"){
                    // console.log(item.content);
                    this.printLog("message:");
                    for(const contentItem of item.content){
                        console.log(contentItem.text);
                    }
                    this.input.push(item);
                }else if(item.type == "reasoning"){
                    // console.log(item.type);
                    this.printLog("reasoning:")
                    for(const contentItem of item.content){
                        console.log(contentItem.text);
                    }
                    this.input.push(item);
                }else if(item.type == "function_call"){
                    hasFunctionCall = true;
                    this.printLog(`${item.type}`)
                    this.input.push(item);
                }else if(item.type == "web_search_call"){
                    this.printLog("web search")
                }
                // console.log(`input.length: ${this.input.length}`);
            }
            if(!hasFunctionCall){
                break;
            }
        }
    }
}