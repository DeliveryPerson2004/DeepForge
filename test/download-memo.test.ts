import assert from "node:assert/strict";
import {afterEach, describe, it} from "node:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import path from "node:path";
import {
    downloadMemo,
    downloadMemoInputSchema,
} from "../src/backend/Tools/downloadMemo.ts";
import type {JezehMemoStore} from "../src/backend/E2B/jezehMemoSandbox.ts";


const tempDirectories: string[] = [];

async function createTempDirectory(): Promise<string> {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "deep-forge-memo-test-"));
    tempDirectories.push(directory);
    return directory;
}

function createMemoStore(
    content = "# 测试备忘录\n",
    type = "file",
    receivedPaths: string[] = [],
): JezehMemoStore {
    return {
        async getInfo(memoPath) {
            receivedPaths.push(memoPath);
            return {type};
        },
        async readFile(memoPath) {
            receivedPaths.push(memoPath);
            return new TextEncoder().encode(content);
        },
    };
}

afterEach(async () => {
    await Promise.all(tempDirectories.splice(0).map((directory) => (
        fs.rm(directory, {recursive: true, force: true})
    )));
});

describe("downloadMemoInputSchema", () => {
    it("只要求 E2B 备忘录路径", () => {
        assert.equal(downloadMemoInputSchema.safeParse({
            memoPath: "todo.md",
        }).success, true);
        assert.equal(downloadMemoInputSchema.safeParse({}).success, false);
    });
});

describe("downloadMemo()", () => {
    it("从 E2B 的 memos 根目录读取并新建宿主文件", async () => {
        const tempDirectory = await createTempDirectory();
        const destination = path.join(tempDirectory, "projects", "todo.md");
        const receivedPaths: string[] = [];
        const result = await downloadMemo({
            memoPath: "memos/projects/todo.md",
        }, {
            getMemoStore: async () => createMemoStore("# Todo\n- 测试\n", "file", receivedPaths),
            hostMemoRoot: tempDirectory,
        });

        assert.equal(await fs.readFile(destination, "utf8"), "# Todo\n- 测试\n");
        assert.deepEqual(receivedPaths, ["/memos/projects/todo.md", "/memos/projects/todo.md"]);
        assert.equal(result, `备忘录已下载到宿主机：${destination}`);
    });

    it("拒绝逃离 E2B memos 根目录", async () => {
        const tempDirectory = await createTempDirectory();
        let volumeRequested = false;
        const result = await downloadMemo({
            memoPath: "../secret.md",
        }, {
            getMemoStore: async () => {
                volumeRequested = true;
                return createMemoStore();
            },
            hostMemoRoot: tempDirectory,
        });

        assert.match(result, /不能离开 memos 目录/);
        assert.equal(volumeRequested, false);
    });

    it("拒绝覆盖宿主机已有文件", async () => {
        const tempDirectory = await createTempDirectory();
        const destination = path.join(tempDirectory, "todo.md");
        await fs.writeFile(destination, "原内容", "utf8");
        let volumeRequested = false;

        const result = await downloadMemo({
            memoPath: "todo.md",
        }, {
            getMemoStore: async () => {
                volumeRequested = true;
                return createMemoStore();
            },
            hostMemoRoot: tempDirectory,
        });

        assert.match(result, /不会覆盖/);
        assert.equal(await fs.readFile(destination, "utf8"), "原内容");
        assert.equal(volumeRequested, true);
    });

    it("拒绝 E2B 中的目录或符号链接", async () => {
        const tempDirectory = await createTempDirectory();
        const result = await downloadMemo({
            memoPath: "todo.md",
        }, {
            getMemoStore: async () => createMemoStore("", "symlink"),
            hostMemoRoot: tempDirectory,
        });

        assert.match(result, /源路径不是普通文件/);
    });
});
