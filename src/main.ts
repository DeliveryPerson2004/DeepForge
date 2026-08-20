import { PlannerAgent } from "./Agents/Planner/PlannerAgent.ts";

async function main() {
    const planner = new PlannerAgent();

    await planner.loop("调用web search工具,搜索一下天津市北辰区的天气。");
}

main().catch(console.error);