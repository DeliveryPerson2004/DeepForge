import { PlannerAgent } from "./Agents/Planner/PlannerAgent.ts";
import {logger} from "./logger.ts";

async function main() {
    logger.info("function main() start");

    const planner = new PlannerAgent();

    await planner.loop("调用web search工具,搜索一下天津市北辰区的天气。");

    logger.info("function main() end");
}

main().catch(console.error);