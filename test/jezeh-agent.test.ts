import assert from "node:assert/strict";
import {after, afterEach, describe, it, mock} from "node:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type {
    InputFunctionCallItem,
    InputFunctionCallOutputItem,
    InputItemType,
} from "../src/backend/DeepSeek/API/responses.ts";
import type {DownloadMemoInputType} from "../src/backend/Tools/downloadMemo.ts";


const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "deep-forge-jezeh-test-"));
process.chdir(tempDir);

mock.method(console, "log", () => {});
process.env.DEEPSEEK_API_KEY = "test-api-key";

const {db} = await import("../src/backend/database/db.ts");
await import("../src/backend/database/initDatabase.ts");
const {selectIdFromAgentTableStmt} = await import("../src/backend/database/stmt.ts");
const {JezehAgent} = await import("../src/backend/DeepSeek/Agents/Jezeh/JezehAgent.ts");

const dbAgentId = selectIdFromAgentTableStmt.get("Jezeh") as number;

class TestableJezehAgent extends JezehAgent {
    public getInput(): InputItemType[] {
        return this.input;
    }

    public getAgentId(): number {
        return this.agentId;
    }

    public getAgentName(): string {
        return this.agentName;
    }

    public testRequestFunctionCall(item: InputFunctionCallItem): Promise<void> {
        return this.requestFunctionCall(item);
    }
}

function createFunctionCallItem(name: string, args: string): InputFunctionCallItem {
    return {
        type: "function_call",
        call_id: "call_1",
        name,
        arguments: args,
    };
}

function getLastOutputItem(input: InputItemType[]): InputFunctionCallOutputItem {
    const item = input[input.length - 1];
    assert.ok(item !== undefined, "input 应包含回填项");
    assert.equal((item as {type?: string}).type, "function_call_output");
    return item as InputFunctionCallOutputItem;
}

afterEach(() => {
    mock.restoreAll();
    mock.method(console, "log", () => {});
});

after(() => {
    db.close();
    fs.rmSync(tempDir, {recursive: true, force: true});
});

describe("JezehAgent 构造函数", () => {
    it("从数据库读取 Jezeh 的身份", () => {
        const agent = new TestableJezehAgent(async () => "已下载");

        assert.equal(agent.getAgentId(), dbAgentId);
        assert.equal(agent.getAgentName(), "Jezeh");
    });
});

describe("JezehAgent.requestFunctionCall()", () => {
    it("download_memo 正常调用后回填结果", async () => {
        let receivedInput: DownloadMemoInputType | undefined;
        const agent = new TestableJezehAgent(async (input) => {
            receivedInput = input;
            return "已下载";
        });
        const toolInput = {
            memoPath: "memos/todo.md",
        };

        await agent.testRequestFunctionCall(createFunctionCallItem(
            "download_memo",
            JSON.stringify(toolInput),
        ));

        assert.deepEqual(receivedInput, toolInput);
        assert.equal(getLastOutputItem(agent.getInput()).output, "已下载");
    });

    it("拒绝非法 JSON 和缺失的备忘录路径", async () => {
        const agent = new TestableJezehAgent(async () => "不应调用");

        await agent.testRequestFunctionCall(createFunctionCallItem("download_memo", "not-json"));
        assert.match(getLastOutputItem(agent.getInput()).output, /参数解析失败/);

        await agent.testRequestFunctionCall(createFunctionCallItem("download_memo", JSON.stringify({
        })));
        assert.match(getLastOutputItem(agent.getInput()).output, /参数校验失败/);
    });
});

describe("JezehAgent 工具注册", () => {
    it("只注册 download_memo，不注册 shell_execute", async () => {
        let capturedBody: Record<string, unknown> | undefined;
        mock.method(globalThis, "fetch", async (
            _input: string | URL | Request,
            init?: RequestInit,
        ) => {
            capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
            return new Response(JSON.stringify({
                output: [{
                    type: "message",
                    id: "msg_1",
                    status: "completed",
                    role: "assistant",
                    content: [{type: "output_text", text: "done"}],
                }],
            }), {
                status: 200,
                headers: {"Content-Type": "application/json"},
            });
        });

        const agent = new TestableJezehAgent(async () => "已下载");
        await agent.ask("下载备忘录");

        const tools = capturedBody?.tools as Array<Record<string, unknown>>;
        const downloadMemoTool = tools.find((tool) => tool.name === "download_memo");
        assert.ok(downloadMemoTool !== undefined);
        assert.deepEqual(
            (downloadMemoTool.parameters as {required: string[]}).required,
            ["memoPath"],
        );
        assert.ok(!tools.some((tool) => tool.name === "shell_execute"));
    });
});
