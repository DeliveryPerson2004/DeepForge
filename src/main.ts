import { PlannerAgent } from "./Agents/PlannerAgent/PlannerAgent.ts";
import {ToolsSchema, type ToolsType} from "./DeepSeek/API/responses/RequestSchema.ts";

async function main() {
    const plannerFuncTools = [{
        type: "web_search",
    }]
    const plannerFuncToolsParsed = ToolsSchema.parse(plannerFuncTools);
    const planner = new PlannerAgent(
        plannerFuncToolsParsed,
        "deepseek-v4-flash",
        "你是智能助手。"
    );

    await planner.loop("调用web search工具,搜索一下天津市北辰区的天气。");
}

main().catch(console.error);