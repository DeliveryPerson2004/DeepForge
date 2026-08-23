import {shellExecute} from "./Tools/shell-command/shell-execute.ts";
import {executeShellCommandPWD} from "./Tools/shell-command/shell-pwd.ts";
import {executeShellCommandLs} from "./Tools/shell-command/shell-ls.ts";



async function main() {

    // await executeShellCommandLs("/home/administrator/WebstormProjects/deep-forge/user-workspace");
    await shellExecute("ls", "/");
}

await main();