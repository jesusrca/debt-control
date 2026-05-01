import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface DebtControlDB {
  runMigrations(): void;
}

export function createDatabase(dbPath: string): Database.Database & DebtControlDB {
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const extendedDb = db as Database.Database & DebtControlDB;

  extendedDb.runMigrations = function(): void {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    const migrationsDir = join(__dirname, 'migrations');
    let migrations: string[] = [];

    try {
      migrations = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
    } catch {
      console.log('No migrations directory found');
    }

    db.exec('CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY)');
    const current = (db.prepare('SELECT MAX(version) as v FROM migrations').get() as { v: number | null })?.v ?? 0;

    for (const file of migrations) {
      const version = parseInt(file.split('_')[0]);
      if (version > current) {
        console.log(`Applying migration ${file}...`);
        const migration = readFileSync(join(migrationsDir, file), 'utf8');
        db.exec(migration);
        db.prepare('INSERT INTO migrations (version) VALUES (?)').run(version);
      }
    }

    console.log('Database initialized successfully');
  };

  return extendedDb;
}

let dbInstance: (Database.Database & DebtControlDB) | null = null;

export function getDb(): Database.Database & DebtControlDB {
  if (!dbInstance) {
    const dbPath = process.env.DB_PATH || './data/debtcontrol.db';
    dbInstance = createDatabase(dbPath);
  }
  return dbInstance;
}

export function setDb(db: Database.Database & DebtControlDB): void {
  dbInstance = db;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}