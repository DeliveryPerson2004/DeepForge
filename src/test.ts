import {executeShellCommand} from "./Tools/execute-shell-command.ts";

async function main() {

    await executeShellCommand('ls');
}

await main();