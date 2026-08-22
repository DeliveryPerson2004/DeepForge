import { PlannerAgent } from "./Agents/Planner/PlannerAgent.ts";
import {logger} from "./logger.ts";

async function main() {
    logger.info("function main() start");

    const planner = new PlannerAgent();

    await planner.loop("调用shell工具查看目录中有哪些文件。并新建一个.md文件");

    logger.info("function main() end");
}

main().catch(console.error);