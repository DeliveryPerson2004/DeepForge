import {exec, type ExecException} from 'node:child_process';
import {promisify} from 'node:util';
import {logger} from '../logger.ts';

const execAsync = promisify(exec);

interface ExecError extends ExecException {
    stdout?: string;
    stderr?: string;
}

export interface executeShellCommandInput {
    command: string,
}

export async function executeShellCommand(
    command: string,
    cwd: string
): Promise<string> {
    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd, // 指定执行命令所在的文件夹路径
            shell: '/bin/zsh',
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
        });

        if (stderr) {
            logger.info(`Tool ExecuteCommand() Command stderr: ${stderr}`);
        }

        const result = stdout.trim();
        logger.info(`Tool ExecuteCommand() Result:\n ${result}`);
        return result;
    } catch (err) {
        const error = err as ExecError;
        const stderr = error.stderr?.trim();
        const stdout = error.stdout?.trim();
        const message = error.message.trim();

        logger.info(`Tool ExecuteCommand() Command execution failed: ${stderr || message}`);
        return stderr || stdout || message;
    }
}