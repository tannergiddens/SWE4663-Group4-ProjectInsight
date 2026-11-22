import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { runDatabaseMigrations } from "./databaseMigrations.js";

const databaseDirectory = path.resolve(
  import.meta.dirname,
  "../../data"
);

if (!fs.existsSync(databaseDirectory)) {
  fs.mkdirSync(databaseDirectory, { recursive: true });
}

const databasePath = path.join(
  databaseDirectory,
  "managepro.db"
);

const db = new Database(databasePath);

// Enable relational integrity.
db.pragma("foreign_keys = ON");

// Improve read/write concurrency.
db.pragma("journal_mode = WAL");

// Initialize the database tables.
export function initializeDatabase(): void {
  const schemaPath = path.resolve(
    import.meta.dirname,
    "schema.sql"
  );

  const schema = fs.readFileSync(schemaPath, "utf8");

  db.exec(schema);

  console.log("ManagePro database initialized.");

  runDatabaseMigrations(db);
}

export default db;