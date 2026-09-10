import Database, { type Database as DatabaseType, type Statement } from "better-sqlite3";

export const db: DatabaseType = new Database("./database.db", {
    verbose: console.log,
});

export const insertIntoAgentTableStmt: Statement<[name: string, maxTurn: number, description: string]> = db.prepare(`
    INSERT INTO agent (name, max_turn, description) VALUES (?, ?, ?)
`);

export const insertIntoMessageTableStmt: Statement<[agentId: number, turn: number, content: string]> = db.prepare(`
    INSERT INTO message (agent_id, turn, content) VALUES (?, ?, ?)
`);

export const selectIdFromAgentTableStmt: Statement = db.prepare(`
    SELECT id FROM agent WHERE name = ?;
`).pluck();

export const selectMaxTurnFromAgentTableStmt: Statement = db.prepare(`
    SELECT max_turn FROM agent WHERE id = ?;
`).pluck();

