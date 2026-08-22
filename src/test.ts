import {executeCommand} from "./Tools/shell.ts";

async function main() {

    await executeCommand('ls');
}

await main();