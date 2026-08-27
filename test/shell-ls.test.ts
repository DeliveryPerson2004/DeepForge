import {after, describe, it} from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {executeShellCommandLs} from "../src/backend/Tools/shell-command/shell-ls.ts";


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

describe("executeShellCommandLs()", () => {
    it("列出指定目录下的文件", async () => {
        const cwd = createTempDir();
        fs.writeFileSync(path.join(cwd, "a.txt"), "a");
        fs.writeFileSync(path.join(cwd, "b.txt"), "b");
        fs.mkdirSync(path.join(cwd, "sub"));

        const result = await executeShellCommandLs(cwd);
        assert.ok(result.includes("a.txt"));
        assert.ok(result.includes("b.txt"));
        assert.ok(result.includes("sub"));
    });

    it("空目录返回空字符串", async () => {
        const cwd = createTempDir();
        assert.equal(await executeShellCommandLs(cwd), "");
    });
});
