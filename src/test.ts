import {shellExecute} from "./Tools/shell-command/shell-execute.ts";



async function main() {

    // await executeShellCommandLs("/home/administrator/WebstormProjects/deep-forge/user-workspace");
    await shellExecute("ls", "/");
}

await main();