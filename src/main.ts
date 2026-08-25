import {Session} from "./Session.ts";
import {UserClient} from "./UserClient.ts";
import {logger} from "./logger.ts";



async function main() {
    const workspacePath = "/home/administrator/WebstormProjects/user-workspace";

    const client = new UserClient();
    const allSession = await client.getSessionList();
    for(const session of allSession){
        logger.info(session.id);
        logger.info(session.max_turn);
        logger.info(session.workspace_path);
    }
    // logger.info(allSession);

    // const session = await Session.resumeSession(workspacePath, 1);
    const session = await Session.createNewSession(workspacePath);
    await session!.input("我最喜欢的水果是什么？？？我记得是西瓜？");
}

main().catch(console.error);