```typescript
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { logger } from "../../../logger.ts";
import { askDeveloper, type askDeveloperInput } from "../../../Tools/ask-developer.ts";
import { shellExecute, type ShellExecuteInputType } from "../../../Tools/shellCommand/shell-execute.ts";

import {
    ModelType,
    type InputFunctionCallItem,
    type ToolsType,
    type InputType
} from "../../API/responses.ts";
import { BaseAgent } from "../../BaseAgent.ts";
import {selectIdFromAgentTableStmt} from "../../../../database/database.ts";



const dirname = path.dirname(fileURLToPath(import.meta.url));

export class PlanAgent extends BaseAgent {
    private readonly workspacePath: string | undefined;

    constructor(workspacePath?: string) {
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

        //TODO 用agent name向数据库获取真实的agent id
        const agentId = 1;

        selectIdFromAgentTableStmt.run(agentId);

        const turn = 1;
        const input: InputType = [];
        super(
            ModelType.DeepSeekV4Flash,
            instructions,
            agentId,
            "Plan Agent",
            plannerFuncTools,
            turn,
        );

        this.workspacePath = workspacePath;
        this.input = input;

        logger.info("new class PlannerAgent()");
    }

    protected async requestFunctionCall(inputFunctionCallItem: InputFunctionCallItem): Promise<void> {
        if (inputFunctionCallItem.name === "execute_shell_command") {
            const argumentsJSONed: ShellExecuteInputType = JSON.parse(inputFunctionCallItem.arguments);
            const result = await shellExecute(argumentsJSONed.command, this.workspacePath);
            this.createFunctionCallOutputItemAndPush(inputFunctionCallItem, result);
        }else if(inputFunctionCallItem.name === "ask_developer"){
            const argumentsJSONed: askDeveloperInput = JSON.parse(inputFunctionCallItem.arguments);
            await askDeveloper(this.agentName, argumentsJSONed.question);
        }
    }
}
```