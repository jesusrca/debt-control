import 'dotenv/config';
import { createDatabase } from './index.js';
import { seedDatabase } from './seed.js';
import { mkdirSync } from 'fs';

async function initDb(): Promise<void> {
  const dbPath = process.env.DB_PATH || './data/debtcontrol.db';

  mkdirSync('./data', { recursive: true });

  console.log(`Initializing database at ${dbPath}...`);

  const db = createDatabase(dbPath);
  db.runMigrations();
  seedDatabase();

  console.log('Database initialization complete');
}

initDb().catch(console.error);