import { BaseAgent } from "../DeepSeek/BaseAgent.ts";
import {
    ToolsSchema,
} from "../DeepSeek/API/responses/RequestSchema.ts";

export class PlannerAgent extends BaseAgent {
    constructor() {
        const plannerFuncTools = [{
            type: "web_search",
        }]
        const plannerFuncToolsParsed = ToolsSchema.parse(plannerFuncTools);

        super("Planner", plannerFuncToolsParsed, "deepseek-v4-flash", "你是智能助手。");
        console.log(`PlannerAgent实例化成功`)
    }
}