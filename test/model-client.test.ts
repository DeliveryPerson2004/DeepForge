import {afterEach, beforeEach, describe, it, mock} from "node:test";
import assert from "node:assert/strict";
import {ModelClient} from "../src/backend/DeepSeek/ModelClient.ts";
import {ModelType, type ResponseSchema} from "../src/backend/DeepSeek/API/responses.ts";


const fakeResponse: ResponseSchema = {
    id: "resp_test_1",
    object: "response",
    created_at: 1700000000,
    status: "completed",
    error: {},
    incomplete_details: {},
    model: "deepseek-v4-flash",
    output: [
        {
            type: "message",
            id: "msg_1",
            status: "completed",
            role: "assistant",
            content: [{type: "output_text", text: "你好"}],
        },
    ],
    usage: {
        input_tokens: 10,
        input_tokens_details: {},
        output_tokens: 5,
        output_tokens_details: {},
        total_tokens: 15,
    },
};

describe("ModelClient", () => {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;

    beforeEach(() => {
        process.env.DEEPSEEK_API_KEY = "test-api-key";
        capturedUrl = undefined;
        capturedInit = undefined;

        mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
            capturedUrl = input.toString();
            capturedInit = init;
            return new Response(JSON.stringify(fakeResponse), {
                status: 200,
                headers: {"Content-Type": "application/json"},
            });
        });
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it("向 /responses 端点发送 POST 请求", async () => {
        const client = new ModelClient();
        await client.requestResponsesAPI(
            ModelType.DeepSeekV4Flash,
            [{type: "message", role: "user", content: "hi"}],
            "instructions",
            [],
            "test_user",
        );

        assert.equal(capturedUrl, "https://api.deepseek.com/responses");
        assert.equal(capturedInit?.method, "POST");
    });

    it("携带正确的请求头", async () => {
        const client = new ModelClient();
        await client.requestResponsesAPI(
            ModelType.DeepSeekV4Flash,
            [],
            "instructions",
            [],
            "test_user",
        );

        const headers = capturedInit?.headers as Record<string, string>;
        assert.equal(headers["Content-Type"], "application/json");
        assert.equal(headers["Accept"], "application/json");
        assert.equal(headers["Authorization"], "Bearer test-api-key");
    });

    it("请求体包含 model/input/instructions/tools/user", async () => {
        const client = new ModelClient();
        const tools = [
            {
                type: "function" as const,
                name: "execute_shell_command",
                description: "desc",
                parameters: {
                    "type": "object" as const,
                    properties: {},
                    required: [],
                },
            },
        ];
        const input = [{type: "message" as const, role: "user" as const, content: "hello"}];

        await client.requestResponsesAPI(
            ModelType.DeepSeekV4Flash,
            input,
            "system instructions",
            tools,
            "test_user",
        );

        const body = JSON.parse(capturedInit?.body as string);
        assert.equal(body.model, ModelType.DeepSeekV4Flash);
        assert.deepEqual(body.input, input);
        assert.equal(body.instructions, "system instructions");
        assert.deepEqual(body.tools, tools);
        assert.equal(body.user, "test_user");
    });

    it("返回解析后的 JSON 响应", async () => {
        const client = new ModelClient();
        const result = await client.requestResponsesAPI(
            ModelType.DeepSeekV4Flash,
            [],
            "instructions",
            [],
            "test_user",
        );

        assert.deepEqual(result, fakeResponse);
    });

    it("getLogs() 返回并清空日志", async () => {
        const client = new ModelClient();
        const logs = client.getLogs();
        assert.equal(logs.length, 1);
        assert.equal(logs[0]?.content, "new class ModelClient()");

        assert.deepEqual(client.getLogs(), []);
    });
});
