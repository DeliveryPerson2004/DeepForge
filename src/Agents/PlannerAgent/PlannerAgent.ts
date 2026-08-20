import { BaseAgent } from "../../DeepSeek/BaseAgent.ts";
import type { InstructionsType, ModelType, ToolsType } from "../../DeepSeek/API/responses/RequestSchema.ts";

export class PlannerAgent extends BaseAgent {
    constructor(
        funcTools: ToolsType = null,
        model: ModelType = "deepseek-v4-flash",
        instructions: InstructionsType = "You are a helpful planner agent."
    ) {
        super(funcTools, model, instructions);
    }

    async plan(taskDescription: string): Promise<void> {
        await this.loop(taskDescription);
    }
}