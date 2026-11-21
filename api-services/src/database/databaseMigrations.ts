
import type Database from "better-sqlite3";

export function runDatabaseMigrations(
  db: Database.Database
): void {
  db.pragma("foreign_keys = ON");

  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
          DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const applied = db.prepare(`
      SELECT version
      FROM schema_migrations
    `).all() as { version: number }[];

    const versions = new Set(
      applied.map(row => row.version)
    );

    // Migration 1: Task and sub-task support
    if (!versions.has(1)) {
      const columns = db.pragma(
        "table_info(tasks)"
      ) as { name: string }[];

      const names = new Set(
        columns.map(column => column.name)
      );

      if (!names.has("hours_completed")) {
        db.exec(`
          ALTER TABLE tasks
          ADD COLUMN hours_completed REAL NOT NULL
          DEFAULT 0 CHECK (hours_completed >= 0);
        `);
      }

      if (!names.has("deleted_at")) {
        db.exec(`
          ALTER TABLE tasks
          ADD COLUMN deleted_at TEXT;
        `);
      }

      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
          idx_one_subtask_per_task
        ON tasks(parent_task_id)
        WHERE parent_task_id IS NOT NULL;
      `);

      db.prepare(`
        INSERT INTO schema_migrations (version)
        VALUES (1)
      `).run();
    }
    // Migration 2: Allow replacement of deleted sub-tasks.
    // Enforce one ACTIVE sub-task per parent task.
    if (!versions.has(2)) {
      db.exec(`
        DROP INDEX IF EXISTS idx_one_subtask_per_task;

        CREATE UNIQUE INDEX IF NOT EXISTS
          idx_one_active_subtask_per_task
        ON tasks(parent_task_id)
        WHERE parent_task_id IS NOT NULL
          AND deleted_at IS NULL;
      `);

      db.prepare(`
        INSERT INTO schema_migrations (version)
        VALUES (2)
      `).run();
    }

  });

  migrate();

  console.log("Database migrations completed.");
}
