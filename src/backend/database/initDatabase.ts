import { db } from "./db.ts";

export const createAgentTable = `
    CREATE TABLE IF NOT EXISTS agent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    max_turn INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`;

export const createMessageTable = `
    CREATE TABLE IF NOT EXISTS message (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id INTEGER NOT NULL,
        turn INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_activated BLOB NOT NULL ,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agent(id) ON DELETE CASCADE
    );
`;

db.exec(createAgentTable);
db.exec(createMessageTable);

db.exec("INSERT INTO agent (name, max_turn) VALUES ('Lexey', 0)");
