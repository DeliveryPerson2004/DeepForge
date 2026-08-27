import {after, describe, it} from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {shellExecute} from "../src/backend/Tools/shell-command/shell-execute.ts";


const tempDirs: string[] = [];

function createTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deep-forge-test-"));
    tempDirs.push(dir);
    return dir;
}

after(() => {
    for (const dir of tempDirs) {
        fs.rmSync(dir, {recursive: true, force: true});
    }
});

describe("shellExecute()", () => {
    describe("sudo 拦截", () => {
        it("拦截 sudo 开头的命令", async () => {
            assert.equal(await shellExecute("sudo ls", createTempDir()), "不允许使用sudo权限");
        });

        it("拦截命令中嵌入的 sudo", async () => {
            assert.equal(await shellExecute("ls && sudo rm -rf /", createTempDir()), "不允许使用sudo权限");
        });

        it("拦截管道后的 sudo", async () => {
            assert.equal(await shellExecute("echo hello | sudo cat", createTempDir()), "不允许使用sudo权限");
        });

        it("拦截大写 SUDO（大小写不敏感）", async () => {
            assert.equal(await shellExecute("SUDO apt-get install vim", createTempDir()), "不允许使用sudo权限");
        });

        it("拦截被引号包裹的 sudo", async () => {
            assert.equal(await shellExecute('echo "sudo"', createTempDir()), "不允许使用sudo权限");
        });

        it("不误伤包含 sudo 子串的单词", async () => {
            const result = await shellExecute("echo csudo", createTempDir());
            assert.equal(result, "csudo");
        });
    });

    describe("命令成功执行", () => {
        it("执行简单命令并返回 trim 后的 stdout", async () => {
            assert.equal(await shellExecute("echo hello world", createTempDir()), "hello world");
        });

        it("多行输出会被 trim", async () => {
            const result = await shellExecute("printf 'line1\nline2\n\n'", createTempDir());
            assert.equal(result, "line1\nline2");
        });

        it("空输出返回空字符串", async () => {
            assert.equal(await shellExecute("true", createTempDir()), "");
        });

        it("在指定 cwd 中执行命令", async () => {
            const cwd = createTempDir();
            fs.writeFileSync(path.join(cwd, "target.txt"), "content");
            assert.equal(await shellExecute("ls", cwd), "target.txt");
        });
    });

    describe("命令执行失败", () => {
        it("不存在的命令返回错误信息而非抛异常", async () => {
            const result = await shellExecute("nonexistent_command_xyz", createTempDir());
            assert.ok(result.length > 0);
            assert.ok(!result.includes("Command execution failed"));
        });

        it("访问不存在的目录返回错误信息", async () => {
            const result = await shellExecute("ls /nonexistent_deep_forge_dir", createTempDir());
            assert.ok(result.length > 0);
        });
    });
});
