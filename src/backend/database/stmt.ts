import "./initDatabase.ts";
import { type Statement } from "better-sqlite3";
import { db } from "./db.ts";

export const insertIntoAgentTableStmt: Statement<[name: string, maxTurn: number, description: string]> = db.prepare(`
    INSERT INTO agent (name, max_turn, description) VALUES (?, ?, ?)
`);

export const selectIdFromAgentTableStmt: Statement = db.prepare(`
    SELECT id FROM agent WHERE name = ?;
`).pluck();

export const selectMaxTurnFromAgentTableStmt: Statement = db.prepare(`
    SELECT max_turn FROM agent WHERE id = ?;
`).pluck();

export const insertIntoMessageTableStmt: Statement = db.prepare(`
    INSERT INTO message (agent_id, turn, content, is_activated) VALUES (?, ?, ?, ?)
`);
