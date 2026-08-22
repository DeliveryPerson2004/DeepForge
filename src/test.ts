import {executeCommand} from "./Tools/shell.ts";

async function main() {

    const result = await executeCommand('ls');
}

await main();