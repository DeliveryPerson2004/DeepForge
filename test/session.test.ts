import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Session} from "../src/backend/Session.ts";


describe("Session", () => {
    it("resumeSession() 传入不存在的 id 返回 null", async () => {
        const session = await Session.resumeSession(99999999);
        assert.equal(session, null);
    });
});
