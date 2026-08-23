import {logger} from "./logger.ts";
import {Session} from "./Session.ts";

async function main() {
    logger.info("function main() start");

    const workspacePath = process.cwd();
    const session = new Session(workspacePath);
    await session.input("使用shell工具查看一下上级目录中有哪些文件夹，并在上级目录中尝试创建一个新的.md文件");

    logger.info("function main() end");
}

main().catch(console.error);