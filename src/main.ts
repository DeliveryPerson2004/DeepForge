import {logger} from "./logger.ts";
import {Session} from "./Session.ts";
import {prisma} from "./database/prisma-client.ts";

async function main() {
    logger.info("function main() start");

    const workspacePath = process.cwd();
    const newSession = await prisma.session.create({
        data: {},
    });
    const session = new Session(workspacePath, newSession.id);
    await session.input("你是谁？你能帮我做什么？你有哪些工具可以调用？");

    logger.info("function main() end");
}

main().catch(console.error);