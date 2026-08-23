import {executeShellCommand} from "./Tools/execute-shell-command.ts";

async function main() {

    await executeShellCommand('ls', "/home/administrator/WebstormProjects/deep-forge/user-workspace");
}

await main();