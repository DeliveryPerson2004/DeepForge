import path from "node:path";
import {fileURLToPath} from "node:url";
import {BaseAgent} from "../../DeepSeek/BaseAgent.ts";
import {type InputFunctionCallItem, ModelType, type ToolsType} from "../../DeepSeek/API/responses.ts";
import {logger} from "../../logger.ts";
import * as fs from "node:fs";
import {executeShellCommand, type executeShellCommandInput} from "../../Tools/execute-shell-command.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export class PlannerAgent extends BaseAgent {
    constructor() {
        const plannerFuncTools: ToolsType = [
            {
                type: "web_search",
            },
            {
                type: "function",
                name: "execute_shell_command",
                description: "在指定的目录中执行 Shell 命令，并返回标准输出或错误信息（使用 zsh 环境）。",
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
        ];

        // 同步读取同级目录下的 instructions.md
        const instructionsFilePath = path.join(dirname, "instructions.md");
        const instructions = fs.readFileSync(instructionsFilePath, "utf-8");

        super("Planner", plannerFuncTools, ModelType.DeepSeekV4Flash, instructions);

        logger.info("Instantiate class PlannerAgent");
    }

    async requestFunctionCall(inputFunctionCallItem: InputFunctionCallItem): Promise<void> {
        if (inputFunctionCallItem.name === "execute_shell_command") {
            const argumentsJSONed: executeShellCommandInput = JSON.parse(inputFunctionCallItem.arguments);
            const result = await executeShellCommand(argumentsJSONed.command, "/home/administrator/WebstormProjects/deep-forge/user-workspace");
            this.createFunctionCallOutputItemAndPush(inputFunctionCallItem, result);
        }
    }
}