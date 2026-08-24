import {logAndInsertDataToDB, logger} from "./logger.ts";
import {Session} from "./Session.ts";
import {prisma} from "./database/prisma-client.ts";

async function main() {
    const workspacePath = process.cwd();
    const newSession = await prisma.session.create({
        data: {},
    });

    await logAndInsertDataToDB("function main() start", "info", newSession.id);
    const session = new Session(workspacePath, newSession.id);
    await session.input("你是谁？你能帮我做什么？调用网络搜索工具查询天津市北辰区明日天气。");

    logger.info("function main() end");
}

main().catch(console.error);