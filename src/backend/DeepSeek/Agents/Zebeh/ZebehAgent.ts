import {BaseAgent} from "../BaseAgent.ts";
import {type InputFunctionCallItem, type InputItemType, ModelType, type ToolsType} from "../../API/responses.ts";
import {loadInstructions} from "../../../Tools/loadInstructions.ts";
import {
    selectIdFromAgentTableStmt,
    selectMaxTurnFromAgentTableStmt,
    selectMessageFromMessageTableStmt
} from "../../../database/stmt.ts";
import {loadSkill, loadSkillInputSchema, type loadSkillInputType} from "../../../Tools/loadSkill.ts";
import {logger} from "../../../logger.ts";
import path from "node:path";

const dirPath = import.meta.dirname;

export class LexeyAgent extends BaseAgent{
    constructor() {
        const instructions = loadInstructions(dirPath);
        const agentName = path.basename(dirPath);
        const agentId = selectIdFromAgentTableStmt.get(agentName) as number;

        const funcTools: ToolsType = [
            {
                type: "web_search",
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