import fs from "node:fs";
import path from "node:path";
import {z} from "zod";


export const loadSkillInputSchema = z.object({
    skillName: z.string(),
});

export type loadSkillInputType = z.infer<typeof loadSkillInputSchema>;

function parseSkillName(content: string): string | undefined {
    const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const frontMatter = frontMatterMatch?.[1];
    if (frontMatter === undefined) {
        return undefined;
    }

    for (const rawLine of frontMatter.split(/\r?\n/)) {
        const separatorIndex = rawLine.indexOf(":");
        if (separatorIndex === -1) {
            continue;
        }

        if (rawLine.slice(0, separatorIndex).trim() === "name") {
            return rawLine.slice(separatorIndex + 1).trim();
        }
    }

    return undefined;
}

export function loadSkill(skillsDirPath: string, skillName: string): string {
    let directs;
    try {
        directs = fs.readdirSync(skillsDirPath, {withFileTypes: true});
    } catch {
        return `加载 skill 失败：无法读取 skills 目录 ${skillsDirPath}`;
    }

    for (const dirent of directs) {
        if (!dirent.isDirectory()) {
            continue;
        }

        const skillFilePath = path.join(skillsDirPath, dirent.name, "SKILL.md");
        if (!fs.existsSync(skillFilePath)) {
            continue;
        }

        const content = fs.readFileSync(skillFilePath, "utf-8");
        if (parseSkillName(content) !== skillName) {
            continue;
        }

        return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
    }

    return `未找到名为“${skillName}”的 skill。`;
}
