import {
    type InputItemType,
    type InputMessageItem,
    ModelType,
    type ResponseSchema,
    type ToolsType
} from "./API/responses.ts";
import {ModelClient} from "./ModelClient.ts";


export class BaseAgent{
    private readonly user: string;
    private readonly functionTools: ToolsType;
    private readonly model: ModelType;
    private modelClient = new ModelClient();
    private input: InputItemType[] = [];
    private readonly instructions: string;

    constructor(user: string, functionTools: ToolsType, model: ModelType, instructions: string) {
        this.user = user;
        this.functionTools = functionTools;
        this.model = model;
        this.instructions = instructions;
    }

    private createInputMessageItemAndPush(userInput: string){
        const inputMessageItem: InputMessageItem = {
            type: "message",
            role: "user",
            content: userInput,
        };

        this.input.push(inputMessageItem);
    }

    private printLog(log: string){
        console.log(`\n\n\n\n\n${log}\n`);
    }

    async loop(userInput: string){
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