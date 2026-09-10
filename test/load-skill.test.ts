import {after, describe, it} from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {loadSkill} from "../src/backend/Tools/loadSkill.ts";


const tempDirs: string[] = [];

function createSkillsDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deep-forge-test-"));
    tempDirs.push(dir);
    return dir;
}

function writeSkill(skillsDirPath: string, dirName: string, content: string): void {
    const skillDir = path.join(skillsDirPath, dirName);
    fs.mkdirSync(skillDir, {recursive: true});
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), content);
}

after(() => {
    for (const dir of tempDirs) {
        fs.rmSync(dir, {recursive: true, force: true});
    }
});

describe("loadSkill()", () => {
    it("按 front matter 中的 name 命中并剥离 front matter 返回正文", async () => {
        const skillsDirPath = createSkillsDir();
        writeSkill(skillsDirPath, "alpha", "---\nname: alpha\ndescription: first\n---\n\n# Alpha 正文\n内容\n");

        assert.equal(await loadSkill(skillsDirPath, "alpha"), "# Alpha 正文\n内容");
    });

    it("存在多个 skill 时按 name 选择正确的一个", async () => {
        const skillsDirPath = createSkillsDir();
        writeSkill(skillsDirPath, "alpha", "---\nname: alpha\ndescription: first\n---\n\nAlpha body\n");
        writeSkill(skillsDirPath, "beta", "---\nname: beta\ndescription: second\n---\n\nBeta body\n");

        assert.equal(await loadSkill(skillsDirPath, "beta"), "Beta body");
    });

    it("未找到时返回提示信息", async () => {
        const skillsDirPath = createSkillsDir();
        writeSkill(skillsDirPath, "alpha", "---\nname: alpha\ndescription: first\n---\n\nAlpha body\n");

        assert.equal(await loadSkill(skillsDirPath, "nope"), "未找到名为“nope”的 skill。");
    });

    it("skills 目录不存在时返回错误信息", async () => {
        const missingDir = path.join(createSkillsDir(), "does-not-exist");

        assert.equal(await loadSkill(missingDir, "alpha"), `加载 skill 失败：无法读取 skills 目录 ${missingDir}`);
    });

    it("跳过没有 SKILL.md 的目录", async () => {
        const skillsDirPath = createSkillsDir();
        fs.mkdirSync(path.join(skillsDirPath, "no-skill-file"), {recursive: true});

        assert.equal(await loadSkill(skillsDirPath, "alpha"), "未找到名为“alpha”的 skill。");
    });

    it("跳过没有 front matter 的 SKILL.md", async () => {
        const skillsDirPath = createSkillsDir();
        writeSkill(skillsDirPath, "alpha", "# 没有 front matter\n");

        assert.equal(await loadSkill(skillsDirPath, "alpha"), "未找到名为“alpha”的 skill。");
    });
});
