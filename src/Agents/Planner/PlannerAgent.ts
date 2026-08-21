import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {BaseAgent} from "../../DeepSeek/BaseAgent.ts";
import {ModelType, type ToolsType} from "../../DeepSeek/API/responses.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export class PlannerAgent extends BaseAgent {
    constructor() {
        const plannerFuncTools: ToolsType = [{
            type: "web_search",
        }];

        // 同步读取同级目录下的 instructions.md
        const instructionsFilePath = path.join(dirname, "instructions.md");
        const instructions = fs.readFileSync(instructionsFilePath, "utf-8");

        super("Planner", plannerFuncTools, ModelType.DeepSeekV4Flash, instructions);
        console.log(`PlannerAgent实例化成功`);
    }
}