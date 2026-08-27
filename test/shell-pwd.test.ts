import {after, describe, it} from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {executeShellCommandPWD} from "../src/backend/Tools/shell-command/shell-pwd.ts";


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

describe("executeShellCommandPWD()", () => {
    it("返回指定 cwd 的路径", async () => {
        const cwd = createTempDir();
        assert.equal(await executeShellCommandPWD(cwd), cwd);
    });

    it("返回绝对路径", async () => {
        const cwd = createTempDir();
        const result = await executeShellCommandPWD(cwd);
        assert.ok(path.isAbsolute(result));
    });
});
