import Database from "better-sqlite3";

const db = new Database("./database.db", { verbose: console.log });

const createAgentTable = `
    CREATE TABLE IF NOT EXISTS agent (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        max_turn INTEGER NOT NULL ,
        description TEXT
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

const insertIntoAgentTableStmt = db.prepare(`
    INSERT INTO agent (name, max_turn, description) VALUES (?, ?, ?)
`);

insertIntoAgentTableStmt.run("gexep", 0, "agent");