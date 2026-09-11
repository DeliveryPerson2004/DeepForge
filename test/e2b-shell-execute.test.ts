import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {
    executeE2BShell,
    executeE2BShellInputSchema,
    type ExecuteE2BShellDependencies,
} from "../src/backend/Tools/executeE2BShell.ts";


describe("executeE2BShellInputSchema", () => {
    it("接受非空命令并拒绝空命令", () => {
        assert.equal(executeE2BShellInputSchema.safeParse({command: "ls -la"}).success, true);
        assert.equal(executeE2BShellInputSchema.safeParse({command: "   "}).success, false);
    });
});

describe("executeE2BShell()", () => {
    it("固定在 E2B 的 /memos 目录执行命令", async () => {
        let createdDirectory: string | undefined;
        let receivedCommand: string | undefined;
        let receivedOptions: {cwd: string; timeoutMs: number} | undefined;
        const dependencies: ExecuteE2BShellDependencies = {
            getSandbox: async () => ({
                files: {
                    async makeDir(directory) {
                        createdDirectory = directory;
                        return true;
                    },
                },
                commands: {
                    async run(command, options) {
                        receivedCommand = command;
                        receivedOptions = options;
                        return {exitCode: 0, stdout: "created memo.md\n", stderr: ""};
                    },
                },
            }),
        };

        const result = await executeE2BShell({command: "touch memo.md"}, dependencies);

        assert.equal(createdDirectory, "/memos");
        assert.equal(receivedCommand, "touch memo.md");
        assert.deepEqual(receivedOptions, {cwd: "/memos", timeoutMs: 30_000});
        assert.match(result, /exitCode: 0/);
        assert.match(result, /created memo\.md/);
    });

    it("回填非零退出码及标准错误", async () => {
        const result = await executeE2BShell({command: "false"}, {
            getSandbox: async () => ({
                files: {async makeDir() { return false; }},
                commands: {
                    async run() {
                        throw Object.assign(new Error("exit 2"), {
                            exitCode: 2,
                            stdout: "",
                            stderr: "file not found",
                        });
                    },
                },
            }),
        });

        assert.match(result, /exitCode: 2/);
        assert.match(result, /file not found/);
    });

    it("连接 E2B 失败时返回错误而不是抛出", async () => {
        const result = await executeE2BShell({command: "pwd"}, {
            getSandbox: async () => {
                throw new Error("sandbox unavailable");
            },
        });

        assert.equal(result, "E2B Shell 执行失败：sandbox unavailable");
    });
});
