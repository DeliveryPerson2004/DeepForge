import {BaseAgent} from "#base-agent";
import {type InputFunctionCallItem, ModelType, type ToolsType} from "../../API/responses.ts";
import {loadInstructions} from "../../../Tools/loadInstructions.ts";
import {
    selectIdFromAgentTableStmt,
} from "../../../database/stmt.ts";
import path from "node:path";

const dirPath = import.meta.dirname;
const workspacePath = "";

export class JezehAgent extends BaseAgent{
    constructor() {
        const instructions = loadInstructions(dirPath);
        const agentName = path.basename(dirPath);
        const agentId = selectIdFromAgentTableStmt.get(agentName) as number;

        const funcTools: ToolsType = [
            {
                type: "function",
                name: "shell_execute",
                description: "可以使用该工具运行shell命令。",
                parameters: {
                    "type": "object",
                    "properties": {
                        "skillName": {
                            "type": "string",
                            "description": "要加载的skill名字"
                        },
                    },
                    "required": ["skillName"]
                },
            },
        ];

        super(
            ModelType.DeepSeekFlash,
            instructions,
            agentId,
            funcTools,
        );
    }

    protected async requestFunctionCall(inputFunctionCallItem: InputFunctionCallItem): Promise<void> {
    }
}