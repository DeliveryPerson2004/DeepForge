import * as fs from "node:fs/promises";
import path from "node:path";
import {z} from "zod";
import {
    getJezehMemoStore,
    type JezehMemoStore,
} from "../E2B/jezehMemoSandbox.ts";
import {logger} from "../logger.ts";


const MEMO_ROOT = "/memos";
const MAX_MEMO_BYTES = 5 * 1024 * 1024;
export const JEZEH_HOST_MEMO_ROOT = "/home/gxp/Projects/MyMemo";

export const downloadMemoInputSchema = z.object({
    memoPath: z.string()
        .min(1)
        .max(1_024)
        .refine((value) => value.trim().length > 0, "备忘录路径不能为空"),
});

export type DownloadMemoInputType = z.infer<typeof downloadMemoInputSchema>;

export interface DownloadMemoDependencies {
    getMemoStore?: () => Promise<JezehMemoStore>;
    hostMemoRoot?: string;
}

function formatZodError(error: z.ZodError): string {
    return error.issues
        .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
        .join("；");
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

interface ResolvedMemoPath {
    volumePath: string;
    relativePath: string;
}

function resolveMemoPath(memoPath: string): ResolvedMemoPath {
    if (memoPath.includes("\0")) {
        throw new Error("备忘录路径不能包含空字符");
    }
    if (memoPath.includes("\\")) {
        throw new Error("备忘录路径必须使用正斜杠");
    }
    if (path.posix.isAbsolute(memoPath)) {
        throw new Error("备忘录路径必须是 memos 目录内的相对路径");
    }

    let normalizedPath = path.posix.normalize(memoPath);
    if (normalizedPath === "memos") {
        throw new Error("备忘录路径必须指向具体文件");
    }
    if (normalizedPath.startsWith("memos/")) {
        normalizedPath = normalizedPath.slice("memos/".length);
    }
    if (
        normalizedPath === "."
        || normalizedPath === ".."
        || normalizedPath.startsWith("../")
    ) {
        throw new Error("备忘录路径不能离开 memos 目录");
    }
    if (path.posix.extname(normalizedPath).toLowerCase() !== ".md") {
        throw new Error("只能下载 Markdown 备忘录文件");
    }

    return {
        volumePath: path.posix.join(MEMO_ROOT, normalizedPath),
        relativePath: normalizedPath,
    };
}

async function prepareHostDestination(
    hostAbsolutePath: string,
    memoRelativePath: string,
): Promise<string> {
    if (hostAbsolutePath.includes("\0")) {
        throw new Error("宿主机目标路径不能包含空字符");
    }

    const normalizedRootPath = path.normalize(hostAbsolutePath);
    if (!path.isAbsolute(normalizedRootPath)) {
        throw new Error("宿主机目标路径必须是绝对路径");
    }
    if (normalizedRootPath === path.parse(normalizedRootPath).root) {
        throw new Error("不能把文件系统根目录作为备忘录下载目录");
    }

    const rootStat = await fs.lstat(normalizedRootPath);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
        throw new Error("宿主机目标路径必须是已存在的普通目录");
    }

    const realRootPath = await fs.realpath(normalizedRootPath);
    if (realRootPath !== normalizedRootPath) {
        throw new Error("宿主机目标目录不能经过符号链接");
    }

    const relativeParts = memoRelativePath.split("/");
    const fileName = relativeParts.pop();
    if (fileName === undefined) {
        throw new Error("备忘录路径必须指向具体文件");
    }

    let currentDirectory = normalizedRootPath;
    for (const directoryName of relativeParts) {
        currentDirectory = path.join(currentDirectory, directoryName);
        try {
            const directoryStat = await fs.lstat(currentDirectory);
            if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
                throw new Error("宿主机目标子路径不能经过符号链接或非目录文件");
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                throw error;
            }
            await fs.mkdir(currentDirectory, {mode: 0o700});
        }
    }

    const destinationPath = path.join(currentDirectory, fileName);
    try {
        await fs.lstat(destinationPath);
        throw new Error("宿主机目标文件已存在，工具不会覆盖它");
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
        }
    }

    return destinationPath;
}

/**
 * Copy one Markdown memo from Jezeh's E2B sandbox into its fixed host directory.
 * The memo's relative path is preserved below that directory, and an existing
 * host file is never overwritten.
 */
export async function downloadMemo(
    input: DownloadMemoInputType,
    dependencies: DownloadMemoDependencies = {},
): Promise<string> {
    const inputParseResult = downloadMemoInputSchema.safeParse(input);
    if (!inputParseResult.success) {
        return `下载备忘录失败：参数校验失败：${formatZodError(inputParseResult.error)}`;
    }

    try {
        const memoPath = resolveMemoPath(inputParseResult.data.memoPath);
        const getMemoStore = dependencies.getMemoStore ?? getJezehMemoStore;
        const memoStore = await getMemoStore();

        const memoInfo = await memoStore.getInfo(memoPath.volumePath);
        if (memoInfo.type !== "file") {
            return "下载备忘录失败：E2B 中的源路径不是普通文件。";
        }

        const memoBytes = await memoStore.readFile(memoPath.volumePath, {format: "bytes"});
        if (memoBytes.byteLength > MAX_MEMO_BYTES) {
            return `下载备忘录失败：文件超过 ${MAX_MEMO_BYTES / 1024 / 1024} MiB 限制。`;
        }

        const hostDestination = await prepareHostDestination(
            dependencies.hostMemoRoot ?? JEZEH_HOST_MEMO_ROOT,
            memoPath.relativePath,
        );
        await fs.writeFile(hostDestination, memoBytes, {
            flag: "wx",
            mode: 0o600,
        });
        logger.info("Tool downloadMemo() copied a memo from E2B to the requested host path.");
        return `备忘录已下载到宿主机：${hostDestination}`;
    } catch (error) {
        const message = formatError(error);
        logger.warn(`Tool downloadMemo() failed: ${message}`);
        return `下载备忘录失败：${message}`;
    }
}
