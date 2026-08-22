import {exec, type ExecException} from 'node:child_process';
import {promisify} from 'node:util';
import {logger} from '../logger.ts';

const execAsync = promisify(exec);

interface ExecError extends ExecException {
    stdout?: string;
    stderr?: string;
}

export async function executeShellCommand(command: string): Promise<string> {
    try {
        const { stdout, stderr } = await execAsync(command, {
            shell: '/bin/zsh', // 如需使用 bash，可替换为 '/bin/bash'
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024, // 设置缓冲区为 10MB，防止输出过大报错
        });

        if (stderr) {
            logger.info(`Tool ExecuteCommand() Command stderr: ${stderr}`);
        }

        const result = stdout.trim();

        logger.info(`Tool ExecuteCommand() Result:\n ${result}`)
        return result;
    } catch (err) {
        const error = err as ExecError;
        const stderr = error.stderr?.trim();
        const stdout = error.stdout?.trim();
        const message = error.message.trim();

        // 记录错误日志
        logger.info(`Tool ExecuteCommand() Command execution failed: ${stderr || message}`);

        // 优先返回 stderr 或 stdout，若无则返回错误信息本身
        return stderr || stdout || message;
    }
}