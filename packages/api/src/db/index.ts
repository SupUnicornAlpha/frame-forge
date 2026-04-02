import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(dbPath = './frame-forge.db') {
  if (!db) {
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export { schema };
export type Db = ReturnType<typeof getDb>;
