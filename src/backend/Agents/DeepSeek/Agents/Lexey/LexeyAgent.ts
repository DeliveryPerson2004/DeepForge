import {BaseAgent} from "../BaseAgent.ts";
import {type InputFunctionCallItem, type InputItemType, ModelType, type ToolsType} from "../../API/responses.ts";
import {loadInstructions} from "../../../../Tools/loadInstructions.ts";
import {
    selectIdFromAgentTableStmt,
    selectMaxTurnFromAgentTableStmt,
    selectMessageFromMessageTableStmt
} from "../../../../database/stmt.ts";
import {loadSkill, loadSkillInputSchema, type loadSkillInputType} from "../../../../Tools/loadSkill.ts";
import {logger} from "../../../../logger.ts";
import path from "node:path";

const dirPath = import.meta.dirname;
const skillsDirPath = path.join(dirPath, "skills");

export class LexeyAgent extends BaseAgent{
    constructor() {
        const instructions = loadInstructions(dirPath);
        const agentName = "Lexey";
        const agentId = selectIdFromAgentTableStmt.get(agentName) as number;

        const funcTools: ToolsType = [
            {
                type: "web_search",
            },
            {
                type: "function",
                name: "load_skill",
                description: "可以使用该工具加载skill的详细内容。",
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

        const max_turn = selectMaxTurnFromAgentTableStmt.get(agentId) as number;

        const messageRows = selectMessageFromMessageTableStmt.all(agentId);
        const input: InputItemType[] = [];
        for (const row of messageRows) {
            try {
                input.push(...(JSON.parse(row.content) as InputItemType[]));
            } catch {
                logger.warn(`跳过无法解析的 message 行: ${row.content}`);
            }
        }

        super(
            ModelType.DeepSeekFlash,
            instructions,
            agentId,
            agentName,
            funcTools,
            max_turn,
            input,
        );
    }

    protected async requestFunctionCall(inputFunctionCallItem: InputFunctionCallItem): Promise<void> {
        if (inputFunctionCallItem.name === "load_skill") {
            let loadSkillInputJSONed: loadSkillInputType;
            try {
                loadSkillInputJSONed = JSON.parse(inputFunctionCallItem.arguments);
            } catch {
                this.createFunctionCallOutputItemAndPush(inputFunctionCallItem, "load_skill 参数解析失败：arguments 不是合法的 JSON。");
                return;
            }

            const schemaParseResult = loadSkillInputSchema.safeParse(loadSkillInputJSONed);

            if(schemaParseResult.success){
                const output = loadSkill(skillsDirPath, schemaParseResult.data.skillName);
                this.createFunctionCallOutputItemAndPush(inputFunctionCallItem, output);
            }else{
                this.createFunctionCallOutputItemAndPush(inputFunctionCallItem, `load_skill 参数校验失败：${schemaParseResult.error.message}`);
            }
        }
    }
}