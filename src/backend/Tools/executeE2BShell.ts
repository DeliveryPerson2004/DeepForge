import {z} from "zod";
import {getJezehMemoSandbox} from "../E2B/jezehMemoSandbox.ts";
import {logger} from "../logger.ts";


const E2B_MEMO_WORKDIR = "/memos";
const COMMAND_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARACTERS = 100_000;

export const executeE2BShellInputSchema = z.object({
    command: z.string().trim().min(1).max(20_000),
});

export type ExecuteE2BShellInputType = z.infer<typeof executeE2BShellInputSchema>;

interface E2BShellSandbox {
    files: {
        makeDir(path: string): Promise<boolean>;
    };
    commands: {
        run(command: string, options: {
            cwd: string;
            timeoutMs: number;
        }): Promise<{
            exitCode: number;
            stdout: string;
            stderr: string;
        }>;
    };
}

export interface ExecuteE2BShellDependencies {
    getSandbox?: () => Promise<E2BShellSandbox>;
}

function formatZodError(error: z.ZodError): string {
    return error.issues
        .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
        .join("；");
}

function truncateOutput(output: string): string {
    if (output.length <= MAX_OUTPUT_CHARACTERS) {
        return output;
    }
    return `${output.slice(0, MAX_OUTPUT_CHARACTERS)}\n...[输出已截断]`;
}

function formatCommandResult(result: {
    exitCode: number;
    stdout: string;
    stderr: string;
}): string {
    return [
        `exitCode: ${result.exitCode}`,
        `stdout:\n${truncateOutput(result.stdout)}`,
        `stderr:\n${truncateOutput(result.stderr)}`,
    ].join("\n");
}

function isCommandResult(error: unknown): error is {
    exitCode: number;
    stdout: string;
    stderr: string;
} {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    const candidate = error as Record<string, unknown>;
    return typeof candidate.exitCode === "number"
        && typeof candidate.stdout === "string"
        && typeof candidate.stderr === "string";
}

/** Execute a shell command only inside Jezeh's network-disabled E2B sandbox. */
export async function executeE2BShell(
    input: ExecuteE2BShellInputType,
    dependencies: ExecuteE2BShellDependencies = {},
): Promise<string> {
    const inputParseResult = executeE2BShellInputSchema.safeParse(input);
    if (!inputParseResult.success) {
        return `E2B Shell 执行失败：参数校验失败：${formatZodError(inputParseResult.error)}`;
    }

    try {
        const getSandbox = dependencies.getSandbox ?? getJezehMemoSandbox;
        const sandbox = await getSandbox();
        await sandbox.files.makeDir(E2B_MEMO_WORKDIR);
        const result = await sandbox.commands.run(inputParseResult.data.command, {
            cwd: E2B_MEMO_WORKDIR,
            timeoutMs: COMMAND_TIMEOUT_MS,
        });
        logger.info("Tool executeE2BShell() executed a command inside E2B.");
        return formatCommandResult(result);
    } catch (error) {
        if (isCommandResult(error)) {
            logger.warn(`Tool executeE2BShell() command exited with code ${error.exitCode}.`);
            return formatCommandResult(error);
        }
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Tool executeE2BShell() failed: ${message}`);
        return `E2B Shell 执行失败：${message}`;
    }
}
