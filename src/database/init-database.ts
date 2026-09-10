import Database, { type Database as DatabaseType, type Statement } from "better-sqlite3";

export const db: DatabaseType = new Database("./database.db", {
    verbose: console.log,
});

// 开启 SQLite 外键级联约束
db.pragma("foreign_keys = ON");

const createAgentTable = `
    CREATE TABLE IF NOT EXISTS agent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    max_turn INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`;

const createMessageTable = `
    CREATE TABLE IF NOT EXISTS message (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id INTEGER NOT NULL,
        turn INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agent(id) ON DELETE CASCADE
    );
`;

db.exec(createAgentTable);
db.exec(createMessageTable);

const insertIntoAgentTableStmt: Statement<[name: string, maxTurn: number, description: string]> = db.prepare(`
    INSERT INTO agent (name, max_turn, description) VALUES (?, ?, ?)
`);

export const insertIntoMessageTableStmt: Statement<[agentId: number, turn: number, content: string]> = db.prepare(`
    INSERT INTO message (agent_id, turn, content) VALUES (?, ?, ?)
`);

export const selectIdFromAgentTableStmt: Statement = db.prepare(`
    SELECT id FROM agent WHERE name = ?;
`)

insertIntoAgentTableStmt.run("gexep", 0, "agent");