import {describe, it} from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {PlanAgent} from "../src/backend/DeepSeek/Agents/Planner/PlanAgent.ts";
import type {InputFunctionCallItem, InputFunctionCallOutputItem, InputItemType} from "../src/backend/DeepSeek/API/responses.ts";


function isFunctionCallOutputItem(item: InputItemType): item is InputFunctionCallOutputItem {
    return (item as {type?: string}).type === "function_call_output";
}

function getSingleOutputItem(input: InputItemType[]): InputFunctionCallOutputItem {
    const item = input[0];
    assert.ok(item !== undefined, "input 应包含一个回填项");
    assert.ok(isFunctionCallOutputItem(item), "期望 function_call_output 回填项");
    return item;
}


class TestablePlanAgent extends PlanAgent {
    public testRequestFunctionCall(item: InputFunctionCallItem): Promise<void> {
        return this.requestFunctionCall(item);
    }
}

function createWorkspace(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "deep-forge-test-"));
}

function createAgent(workspacePath: string): TestablePlanAgent {
    return new TestablePlanAgent(workspacePath, 1, []);
}

function createFunctionCallItem(name: string, args: object): InputFunctionCallItem {
    return {
        type: "function_call",
        call_id: "call_1",
        name: name,
        arguments: JSON.stringify(args),
    };
}

describe("PlanAgent", () => {
    it("execute_shell_command 工具调用后回填 function_call_output", async () => {
        const workspacePath = createWorkspace();
        const agent = createAgent(workspacePath);

        await agent.testRequestFunctionCall(createFunctionCallItem("execute_shell_command", {command: "echo hello"}));

        const input = agent.getInput();
        assert.equal(input.length, 1);

        const outputItem = getSingleOutputItem(input);
        assert.equal(outputItem.call_id, "call_1");
        assert.equal(outputItem.name, "execute_shell_command");
        assert.equal(outputItem.output, "hello");
    });

    it("execute_shell_command 在 cwd 下执行命令", async () => {
        const workspacePath = createWorkspace();
        fs.writeFileSync(path.join(workspacePath, "agent-file.txt"), "data");
        const agent = createAgent(workspacePath);

        await agent.testRequestFunctionCall(createFunctionCallItem("execute_shell_command", {command: "ls"}));

        const outputItem = getSingleOutputItem(agent.getInput());
        assert.equal(outputItem.output, "agent-file.txt");
    });

    it("execute_shell_command 执行失败时回填错误信息而非抛异常", async () => {
        const workspacePath = createWorkspace();
        const agent = createAgent(workspacePath);

        await agent.testRequestFunctionCall(
            createFunctionCallItem("execute_shell_command", {command: "ls /nonexistent_deep_forge_dir"}),
        );

        const outputItem = getSingleOutputItem(agent.getInput());
        assert.ok(outputItem.output.length > 0);
    });

    it("execute_shell_command 拦截 sudo 命令", async () => {
        const workspacePath = createWorkspace();
        const agent = createAgent(workspacePath);

        await agent.testRequestFunctionCall(createFunctionCallItem("execute_shell_command", {command: "sudo rm -rf /"}));

        const outputItem = getSingleOutputItem(agent.getInput());
        assert.equal(outputItem.output, "不允许使用sudo权限");
    });

    it("ask_developer 工具调用不产生回填且不抛异常", async () => {
        const workspacePath = createWorkspace();
        const agent = createAgent(workspacePath);

        await agent.testRequestFunctionCall(createFunctionCallItem("ask_developer", {question: "test question?"}));

        assert.deepEqual(agent.getInput(), []);
    });
});
