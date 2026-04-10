import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(dbPath = './frame-forge.db') {
  if (!db) {
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(`
CREATE TABLE IF NOT EXISTS provider_secrets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  encrypted_token TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_secrets_tenant_provider
  ON provider_secrets(tenant_id, provider_id);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);
    `);
    ensureColumn(sqlite, 'tasks', 'tenant_id', "TEXT NOT NULL DEFAULT 'default-tenant'");
    ensureColumn(sqlite, 'task_steps', 'tenant_id', "TEXT NOT NULL DEFAULT 'default-tenant'");
    ensureColumn(sqlite, 'task_artifacts', 'tenant_id', "TEXT NOT NULL DEFAULT 'default-tenant'");
    sqlite.exec(`
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_created_at ON tasks(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_steps_task_id ON task_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_task_artifacts_task_id ON task_artifacts(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at ON audit_logs(tenant_id, created_at);
    `);
    db = drizzle(sqlite, { schema });
  }
  return db;
}

function ensureColumn(sqlite: Database.Database, table: string, column: string, ddl: string) {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const exists = rows.some((r) => r.name === column);
  if (!exists) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

export { schema };
export type Db = ReturnType<typeof getDb>;
