import {BaseAgent} from "#base-agent";
import {type InputFunctionCallItem, ModelType, type ToolsType} from "../../API/responses.ts";
import {loadInstructions} from "../../../Tools/loadInstructions.ts";
import {
    downloadMemo,
    downloadMemoInputSchema,
    type DownloadMemoInputType,
} from "../../../Tools/downloadMemo.ts";
import {selectIdFromAgentTableStmt} from "../../../database/stmt.ts";
import path from "node:path";

const dirPath = import.meta.dirname;

export type DownloadMemoFunction = (input: DownloadMemoInputType) => Promise<string>;

export class JezehAgent extends BaseAgent {
    private readonly downloadMemoFunction: DownloadMemoFunction;

    constructor(downloadMemoFunction: DownloadMemoFunction = downloadMemo) {
        const instructions = loadInstructions(dirPath);
        const agentName = path.basename(dirPath);
        const agentId = selectIdFromAgentTableStmt.get(agentName) as number;

        const funcTools: ToolsType = [
            {
                type: "function",
                name: "download_memo",
                description: "将 E2B 沙箱备忘录区中的一份 Markdown 备忘录下载到预先配置的固定宿主机目录，并保留备忘录的相对路径。只创建新文件，不覆盖已有文件。",
                parameters: {
                    "type": "object",
                    "properties": {
                        "memoPath": {
                            "type": "string",
                            "description": "E2B 备忘录区 memos/ 下的相对 Markdown 路径，例如 notes/today.md。"
                        }
                    },
                    "required": ["memoPath"]
                },
            },
        ];

        super(
            ModelType.DeepSeekFlash,
            instructions,
            agentId,
            funcTools,
        );

        this.downloadMemoFunction = downloadMemoFunction;
    }

    protected async requestFunctionCall(inputFunctionCallItem: InputFunctionCallItem): Promise<void> {
        if (inputFunctionCallItem.name !== "download_memo") {
            return;
        }

        let downloadMemoInputJSONed: unknown;
        try {
            downloadMemoInputJSONed = JSON.parse(inputFunctionCallItem.arguments);
        } catch {
            this.createFunctionCallOutputItemAndPush(
                inputFunctionCallItem,
                "download_memo 参数解析失败：arguments 不是合法的 JSON。",
            );
            return;
        }

        const schemaParseResult = downloadMemoInputSchema.safeParse(downloadMemoInputJSONed);
        if (!schemaParseResult.success) {
            this.createFunctionCallOutputItemAndPush(
                inputFunctionCallItem,
                `download_memo 参数校验失败：${schemaParseResult.error.message}`,
            );
            return;
        }

        const output = await this.downloadMemoFunction(schemaParseResult.data);
        this.createFunctionCallOutputItemAndPush(inputFunctionCallItem, output);
    }
}
