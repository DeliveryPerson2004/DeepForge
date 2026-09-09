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

db.exec(createAgentTable);

const insertIntoAgentTableStmt = db.prepare(`
    INSERT INTO agent (name, max_turn, description) VALUES (?, ?, ?)
`);

insertIntoAgentTableStmt.run("gexep", 0, "agent");