import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BaseAgent } from "../../DeepSeek/BaseAgent.ts";
import {
    ToolsSchema,
} from "../../DeepSeek/API/responses/RequestSchema.ts";

// 获取当前文件所在目录路径（兼容 ESM 模块环境）
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PlannerAgent extends BaseAgent {
    constructor() {
        const plannerFuncTools = [{
            type: "web_search",
        }];
        const plannerFuncToolsParsed = ToolsSchema.parse(plannerFuncTools);

        // 同步读取同级目录下的 instructions.md
        const instructionsPath = path.join(__dirname, "instructions.md");
        const instructions = fs.readFileSync(instructionsPath, "utf-8");

        // 将读取到的 instructions 内容传入 super
        super("Planner", plannerFuncToolsParsed, "deepseek-v4-flash", instructions);
        console.log(`PlannerAgent实例化成功`);
    }
}