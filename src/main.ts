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
}

main().catch(console.error);