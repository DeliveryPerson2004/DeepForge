// 开启 SQLite 外键级联约束
import {db, insertIntoAgentTableStmt} from "./database.ts";

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

insertIntoAgentTableStmt.run("Lexey", 0, "language agent");