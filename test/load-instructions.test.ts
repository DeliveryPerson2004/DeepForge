import {after, describe, it} from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {loadInstructions} from "../src/backend/Tools/loadInstructions.ts";


const tempDirs: string[] = [];

function createAgentDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deep-forge-test-"));
    tempDirs.push(dir);
    return dir;
}

function writeInstructions(agentDir: string, content: string): void {
    fs.writeFileSync(path.join(agentDir, "instructions.md"), content);
}

function writeSkill(agentDir: string, dirName: string, content: string): void {
    const skillDir = path.join(agentDir, "skills", dirName);
    fs.mkdirSync(skillDir, {recursive: true});
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), content);
}

after(() => {
    for (const dir of tempDirs) {
        fs.rmSync(dir, {recursive: true, force: true});
    }
});

describe("loadInstructions()", () => {
    it("返回 instructions.md 内容并追加 skills 元数据", async () => {
        const agentDir = createAgentDir();
        writeInstructions(agentDir, "# 指令\n");
        writeSkill(agentDir, "alpha", "---\nname: alpha\ndescription: first\n---\n\nbody\n");

        assert.equal(
            await loadInstructions(agentDir),
            "# 指令\n- name: alpha\n  description: first",
        );
    });

    it("合并 description 的续行", async () => {
        const agentDir = createAgentDir();
        writeInstructions(agentDir, "INSTR");
        writeSkill(agentDir, "alpha", "---\nname: alpha\ndescription: first line\n  second line\n---\n\nbody\n");

        assert.equal(
            await loadInstructions(agentDir),
            "INSTR- name: alpha\n  description: first line second line",
        );
    });

    it("列出多个 skill 的元数据", async () => {
        const agentDir = createAgentDir();
        writeInstructions(agentDir, "INSTR");
        writeSkill(agentDir, "alpha", "---\nname: alpha\ndescription: first\n---\n\nbody\n");
        writeSkill(agentDir, "beta", "---\nname: beta\ndescription: second\n---\n\nbody\n");

        assert.equal(
            await loadInstructions(agentDir),
            "INSTR- name: alpha\n  description: first\n- name: beta\n  description: second",
        );
    });

    it("跳过缺少 name 或 description 的 skill", async () => {
        const agentDir = createAgentDir();
        writeInstructions(agentDir, "INSTR");
        writeSkill(agentDir, "no-name", "---\ndescription: only description\n---\n\nbody\n");
        writeSkill(agentDir, "no-description", "---\nname: only-name\n---\n\nbody\n");

        assert.equal(await loadInstructions(agentDir), "INSTR");
    });

    it("跳过没有 SKILL.md 的目录", async () => {
        const agentDir = createAgentDir();
        writeInstructions(agentDir, "INSTR");
        fs.mkdirSync(path.join(agentDir, "skills", "empty"), {recursive: true});

        assert.equal(await loadInstructions(agentDir), "INSTR");
    });

    it("skills 目录不存在时抛错", () => {
        const agentDir = createAgentDir();
        writeInstructions(agentDir, "INSTR");

        assert.throws(() => loadInstructions(agentDir));
    });
});
