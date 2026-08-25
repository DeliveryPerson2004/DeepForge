import {UserClient} from "./UserClient.ts";



async function main() {
    const workspacePath = "/home/administrator/WebstormProjects/user-workspace";

    const client = new UserClient("deepseek");
}

main().catch(console.error);