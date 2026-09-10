import {BaseAgent} from "../../BaseAgent.ts";
import {type InputFunctionCallItem, ModelType, type ToolsType} from "../../API/responses.ts";
import {loadInstructions} from "../../../../Tools/loadInstructions.ts";
import {selectIdFromAgentTableStmt, selectMaxTurnFromAgentTableStmt} from "../../../../database/init-database.ts";

const dirPath = import.meta.dirname;

class LexeyAgent extends BaseAgent{
    constructor() {
        const instructions = loadInstructions(dirPath);
        const agentName = "Lexey";
        const agentId = selectIdFromAgentTableStmt.get(agentName) as number;

        const funcTools: ToolsType = [
            {
                type: "web_search",
            },
        ];

        const max_turn = selectMaxTurnFromAgentTableStmt.get(agentId) as number;

        super(
            ModelType.DeepSeekFlash,
            instructions,
            agentId,
            agentName,
            funcTools,
            max_turn,
        );
    }

    protected requestFunctionCall(inputFunctionCallItem: InputFunctionCallItem): Promise<void> {
        return Promise.resolve(undefined);
    }
}