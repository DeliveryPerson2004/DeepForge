import {logger} from "../../logger.ts";
import {shellExecute} from "./shell-execute.ts";



export async function executeShellCommandLs(
    cwd: string
): Promise<string>{
    logger.info(`Tool executeShellCommandPWD() input cwd: ${cwd}`);

    return shellExecute("ls", cwd);
}