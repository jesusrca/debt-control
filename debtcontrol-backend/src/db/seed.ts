import { getDb } from './index.js';
import { v4 as uuidv4 } from 'uuid';

export function seedDatabase(): void {
  const db = getDb();

  const existingSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  if (existingSettings.count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database...');

  const categories = [
    { id: uuidv4(), name: 'Utilities', icon: 'zap', color: '#F59E0B' },
    { id: uuidv4(), name: 'Subscriptions', icon: 'repeat', color: '#8B5CF6' },
    { id: uuidv4(), name: 'Loans', icon: 'landmark', color: '#EF4444' },
    { id: uuidv4(), name: 'Rent', icon: 'home', color: '#10B981' },
    { id: uuidv4(), name: 'Other', icon: 'credit-card', color: '#6366F1' },
  ];

  const insertCategory = db.prepare(
    'INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)'
  );

  for (const cat of categories) {
    insertCategory.run(cat.id, cat.name, cat.icon, cat.color);
  }

  const bankAccounts = [
    { id: uuidv4(), name: 'Checking', color: '#2563EB' },
    { id: uuidv4(), name: 'Savings', color: '#10B981' },
  ];

  const insertBank = db.prepare(
    'INSERT INTO bank_accounts (id, name, color) VALUES (?, ?, ?)'
  );

  for (const bank of bankAccounts) {
    insertBank.run(bank.id, bank.name, bank.color);
  }

  console.log(`Seeded ${categories.length} categories and ${bankAccounts.length} bank accounts`);

  console.log('Database seeded successfully');
}

if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase();
}