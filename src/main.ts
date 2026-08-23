import {logger} from "./logger.ts";
import {Session} from "./Session.ts";

async function main() {
    logger.info("function main() start");

    const workspacePath = process.cwd();
    const session = new Session(workspacePath);
    await session.input("你是谁？你能帮我做什么？你有哪些工具可以调用？");

    logger.info("function main() end");
}

main().catch(console.error);