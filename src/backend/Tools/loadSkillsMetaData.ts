import {existsSync, readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";

function loadSkillsMetaData(skillsDirPath: string): string {
    const skillMetaDataList: string[] = [];

    const directs = readdirSync(skillsDirPath, {withFileTypes: true});
    for (const dirent of directs) {
        if (!dirent.isDirectory()) {
            continue;
        }

        const skillFilePath = join(skillsDirPath, dirent.name, "SKILL.md");
        if (!existsSync(skillFilePath)) {
            continue;
        }

        const content = readFileSync(skillFilePath, "utf-8");
        const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        const frontMatter = frontMatterMatch?.[1];
        if (frontMatter === undefined) {
            continue;
        }

        const metaData: Record<string, string> = {};
        let currentKey: string | null = null;
        for (const rawLine of frontMatter.split(/\r?\n/)) {
            if (currentKey !== null && /^\s+\S/.test(rawLine)) {
                metaData[currentKey] = `${metaData[currentKey] ?? ""} ${rawLine.trim()}`.trim();
                continue;
            }

            const separatorIndex = rawLine.indexOf(":");
            if (separatorIndex === -1) {
                continue;
            }
            currentKey = rawLine.slice(0, separatorIndex).trim();
            metaData[currentKey] = rawLine.slice(separatorIndex + 1).trim();
        }

        const name = metaData["name"];
        const description = metaData["description"];
        if (name === undefined || description === undefined) {
            continue;
        }

        skillMetaDataList.push(`- name: ${name}\n  description: ${description}`);
    }

    return skillMetaDataList.join("\n");
}