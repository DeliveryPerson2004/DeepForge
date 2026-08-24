import {Session} from "./Session.ts";



async function main() {
    const workspacePath = "/home/administrator/WebstormProjects/user-workspace";

    const session = await Session.resumeSession(workspacePath, 1);
    // const session = await Session.createNewSession(workspacePath);
    if(session == null)
        return;
    // await session.input("请记住我最喜欢吃的水果是苹果。");
    await session.input("我最喜欢吃的水果是什么？");
}

main().catch(console.error);