import path from "node:path";
import {fileURLToPath} from "node:url";
import {BaseAgent} from "../../DeepSeek/BaseAgent.ts";
import {type InputFunctionCallItem, ModelType, type ToolsType} from "../../DeepSeek/API/responses.ts";
import {logger} from "../../logger.ts";
import * as fs from "node:fs";
import {shellExecute, type shellExecuteInput} from "../../Tools/shell-command/shell-execute.ts";
import {askDeveloper, type askDeveloperInput} from "../../Tools/ask-developer.ts";



const dirname = path.dirname(fileURLToPath(import.meta.url));

export class PlannerAgent extends BaseAgent {
    private agentName = "planner";

    constructor(workspacePath: string, sessionId: number) {
        const plannerFuncTools: ToolsType = [
            {
                type: "web_search",
            },
            {
                type: "function",
                name: "execute_shell_command",
                description: "在指定的目录中执行 Shell 命令但是禁用sudo权限，并返回标准输出或错误信息（使用 bash 环境）。",
                parameters: {
                    "type": "object",
                    "properties": {
                        "command": {
                            "type": "string",
                            "description": "要执行的 Shell 命令字符串。"
                        },
                    },
                    "required": ["command"]
                },
            },
            {
                type: "function",
                name: "ask_developer",
                description: "如果有任何疑问，可以通过该tool询问你的开发者，包括但不限于用户让你调用一个你并没有的tool等。注意这和询问user是不同的。",
                parameters: {
                    "type": "object",
                    "properties": {
                        "question": {
                            "type": "string",
                            "description": "要询问的问题。"
                        },
                    },
                    "required": ["question"]
                }
            }
        ];

        // 同步读取同级目录下的 instructions.md
        const instructionsFilePath = path.join(dirname, "instructions.md");
        const instructions = fs.readFileSync(instructionsFilePath, "utf-8");

        super(ModelType.DeepSeekV4Flash, instructions, "Planner", plannerFuncTools, sessionId, workspacePath);

        logger.info("new class PlannerAgent()");
    }

    protected async requestFunctionCall(inputFunctionCallItem: InputFunctionCallItem): Promise<void> {
        if (inputFunctionCallItem.name === "execute_shell_command") {
            const argumentsJSONed: shellExecuteInput = JSON.parse(inputFunctionCallItem.arguments);
            const result = await shellExecute(argumentsJSONed.command, this.workspacePath);
            this.createFunctionCallOutputItemAndPush(inputFunctionCallItem, result);
        }else if(inputFunctionCallItem.name === "ask_developer"){
            const argumentsJSONed: askDeveloperInput = JSON.parse(inputFunctionCallItem.arguments);
            await askDeveloper(this.agentName, argumentsJSONed.question);
        }
    }
}