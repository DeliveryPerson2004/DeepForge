import {exec, type ExecException} from 'node:child_process';
import {promisify} from 'node:util';
import {logger} from '../../logger.ts';

const execAsync = promisify(exec);

interface ExecError extends ExecException {
    stdout?: string;
    stderr?: string;
}

export interface shellExecuteInput {
    command: string,
}

export async function shellExecute(
    command: string,
    cwd: string
): Promise<string> {
    // 校验是否包含 sudo 命令（匹配独立单词）
    if (/\bsudo\b/i.test(command)) {
        const errorMsg = '不允许使用sudo权限';
        logger.warn(`Tool ExecuteCommand() Rejected: ${errorMsg}`);
        return errorMsg;
    }

    try {
        logger.info(`Tool ExecuteCommand() input command: ${command}`);
        const { stdout, stderr } = await execAsync(command, {
            cwd,
            shell: '/bin/bash',
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