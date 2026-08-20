import { BaseAgent } from "../../DeepSeek/BaseAgent.ts";
import type { InstructionsType, ModelType, ToolsType } from "../../DeepSeek/API/responses/RequestSchema.ts";

export class PlannerAgent extends BaseAgent {
    constructor(
        funcTools: ToolsType,
        model: ModelType,
        instructions: InstructionsType
    ) {
        super("Planner", funcTools, model, instructions);
        console.log(`PlannerAgent实例化成功`)
    }
}