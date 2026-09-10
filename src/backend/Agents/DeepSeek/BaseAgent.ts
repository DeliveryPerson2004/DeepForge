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
import {logger} from "../../logger.ts";
import {insertIntoMessageTableStmt} from "../../../database/init-database.ts";
import {existsSync, readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";



export abstract class BaseAgent{
    private readonly functionTools: ToolsType;
    private readonly instructions: string;
    private readonly model: ModelType;
    private modelClient: ModelClient;

    protected readonly agentId: number;
    protected readonly agentName: string;
    protected turn: number;
    protected input: InputItemType[] = [];

    protected constructor(
        model: ModelType,
        instructions: string,
        agentId: number,
        agentName: string,
        functionTools: ToolsType,
        turn: number,
    ) {
        this.functionTools = functionTools;
        this.instructions = instructions;
        this.model = model;
        this.modelClient = new ModelClient();
        this.agentId = agentId;
        this.agentName = agentName;
        this.turn = turn;

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

    protected loadSkillsMetaData(skillsDirPath: string): string {
        const skillMetaDataList: string[] = [];

        const dirents = readdirSync(skillsDirPath, {withFileTypes: true});
        for (const dirent of dirents) {
            if (!dirent.isDirectory()) {
                continue;
            }

            const skillFilePath = join(skillsDirPath, dirent.name, "SKILL.md");
            if (!existsSync(skillFilePath)) {
                continue;
            }

            const content = readFileSync(skillFilePath, "utf-8");
            const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            const frontMatter = frontMatterMatch?.[1];
            if (frontMatter === undefined) {
                continue;
            }

            const metaData: Record<string, string> = {};
            let currentKey: string | null = null;
            for (const rawLine of frontMatter.split(/\r?\n/)) {
                if (currentKey !== null && /^\s+\S/.test(rawLine)) {
                    metaData[currentKey] = `${metaData[currentKey] ?? ""} ${rawLine.trim()}`.trim();
                    continue;
                }

                const separatorIndex = rawLine.indexOf(":");
                if (separatorIndex === -1) {
                    continue;
                }
                currentKey = rawLine.slice(0, separatorIndex).trim();
                metaData[currentKey] = rawLine.slice(separatorIndex + 1).trim();
            }

            const name = metaData["name"];
            const description = metaData["description"];
            if (name === undefined || description === undefined) {
                continue;
            }

            skillMetaDataList.push(`- name: ${name}\n  description: ${description}`);
        }

        return skillMetaDataList.join("\n");
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

        const inputDeltaAfterLoop = this.input.slice(inputLengthBeforeLoop);

        insertIntoMessageTableStmt.run(this.agentId, this.turn, JSON.stringify(inputDeltaAfterLoop));

        logger.info("class BaseAgent public loop() end");
    }
}