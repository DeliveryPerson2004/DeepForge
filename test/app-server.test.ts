import {describe, it, mock} from "node:test";
import assert from "node:assert/strict";
import {AppServer} from "../src/backend/AppServer.ts";


describe("AppServer", () => {
    it("setModelProvider() 返回 true", () => {
        const server = new AppServer();
        assert.equal(server.setModelProvider("DeepSeek"), true);
    });

    it("未设置 model provider 时 checkEnvironment() 返回 false 且不触发网络请求", async () => {
        const fetchMock = mock.method(globalThis, "fetch", async () => {
            throw new Error("不应发起网络请求");
        });

        const server = new AppServer();
        assert.equal(await server.checkEnvironment(), false);
        assert.equal(fetchMock.mock.callCount(), 0);

        mock.restoreAll();
    });

    it("getSessionList() 返回会话数组", async () => {
        const server = new AppServer();
        const sessions = await server.getSessionList();
        assert.ok(Array.isArray(sessions));
    });
});
