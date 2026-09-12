import { type Statement } from "better-sqlite3";
import { db } from "./db.ts";

export const selectIdFromAgentTableStmt: Statement = db.prepare(`
    SELECT id FROM agent WHERE name = ?;
`).pluck();

export const selectNameFromAgentTableStmt: Statement = db.prepare(`
    SELECT name FROM agent WHERE id = ?;
`).pluck();

export const selectMaxTurnFromAgentTableStmt: Statement = db.prepare(`
    SELECT max_turn FROM agent WHERE id = ?;
`).pluck();

export const insertIntoMessageTableStmt: Statement<[agentId: number, turn: number, content: string, isActivated: number]> = db.prepare(`
    INSERT INTO message (agent_id, turn, content, is_activated) VALUES (?, ?, ?, ?)
`);

export const selectMessageFromMessageTableStmt: Statement<[agentId: number], { content: string }> = db.prepare(`
    SELECT content FROM message WHERE agent_id = ? AND is_activated = 1 ORDER BY created_at ASC, id ASC;
`);
