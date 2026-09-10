import {afterEach, describe, it, mock} from "node:test";
import assert from "node:assert/strict";
import {askDeveloper} from "../src/backend/Tools/askDeveloper.ts";
import {logger} from "../src/backend/logger.ts";


describe("askDeveloper()", () => {
    afterEach(() => {
        mock.restoreAll();
    });

    it("以 warn 日志转达问题并 resolve", async () => {
        const warnMock = mock.method(logger, "warn", () => logger);

        await assert.doesNotReject(() => askDeveloper("Lexey", "这是什么？"));

        assert.equal(warnMock.mock.callCount(), 1);
        assert.equal(warnMock.mock.calls[0]?.arguments[0], "Lexey agent ask developer a question: 这是什么？");
    });
});
