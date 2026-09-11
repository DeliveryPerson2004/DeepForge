import {after, describe, it, mock} from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";


const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "deep-forge-test-"));
process.chdir(tempDir);

mock.method(console, "log", () => {});

const {db} = await import("../src/backend/database/db.ts");
const {initDefaultAgents} = await import("../src/backend/database/initDatabase.ts");
const {
    selectIdFromAgentTableStmt,
    selectMaxTurnFromAgentTableStmt,
    insertIntoMessageTableStmt,
    selectMessageFromMessageTableStmt,
} = await import("../src/backend/database/stmt.ts");

const agentId = selectIdFromAgentTableStmt.get("Lexey") as number;
const gexepAgentId = selectIdFromAgentTableStmt.get("Gexep") as number;

after(() => {
    db.close();
    fs.rmSync(tempDir, {recursive: true, force: true});
});

describe("initDatabase()", () => {
    it("创建 agent 表并插入 Lexey 与 Gexep", () => {
        assert.equal(typeof agentId, "number");
        assert.equal(selectMaxTurnFromAgentTableStmt.get(agentId), 0);
        assert.equal(typeof gexepAgentId, "number");
        assert.equal(selectMaxTurnFromAgentTableStmt.get(gexepAgentId), 0);
    });

    it("重复初始化不会插入同名 Agent", () => {
        initDefaultAgents();

        const rows = db.prepare("SELECT name, COUNT(*) AS count FROM agent GROUP BY name").all() as Array<{
            name: string;
            count: number;
        }>;
        assert.ok(rows.every((row) => row.count === 1));
    });

    it("创建 message 表", () => {
        const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'message'").get();
        assert.ok(table);
    });
});

describe("message prepared statements", () => {
    it("插入后可读回，且 is_activated = 1 的消息会被 select 返回", () => {
        const content = JSON.stringify([{type: "message", role: "user", content: "你好"}]);
        insertIntoMessageTableStmt.run(agentId, 1, content, 1);

        const rows = selectMessageFromMessageTableStmt.all(agentId);
        assert.equal(rows.length, 1);
        assert.equal(rows[0]?.content, content);
    });

    it("is_activated = 0 的消息不会被 select 返回", () => {
        insertIntoMessageTableStmt.run(agentId, 2, JSON.stringify([{type: "message", role: "user", content: "inactive"}]), 0);

        const rows = selectMessageFromMessageTableStmt.all(agentId);
        assert.equal(rows.length, 1);
        assert.ok(!rows.some((row) => row.content.includes("inactive")));
    });

    it("插入不存在的 agent_id 触发外键约束", () => {
        assert.throws(() => {
            insertIntoMessageTableStmt.run(99999999, 0, "{}", 1);
        });
    });
});
