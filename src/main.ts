import {Session} from "./Session.ts";



async function main() {
    const workspacePath = "/home/administrator/WebstormProjects/user-workspace";

    const session = await Session.createNewSession(workspacePath);
    await session.input("你是谁？你能帮我做什么？调用网络搜索工具查询天津市北辰区明日天气。");
}

main().catch(console.error);