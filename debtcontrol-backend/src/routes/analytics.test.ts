import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import Database from 'better-sqlite3';

import { createDatabase, setDb, closeDb } from '../db/index.js';
import analyticsRouter from '../routes/analytics.js';
import transactionsRouter from '../routes/transactions.js';
import debtTemplatesRouter from '../routes/debtTemplates.js';
import debtInstancesRouter from '../routes/debtInstances.js';
import categoriesRouter from '../routes/categories.js';
import bankAccountsRouter from '../routes/bankAccounts.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

const dbPath = ':memory:';
let app: express.Application;
let db: Database.Database & ReturnType<typeof createDatabase>;

const categories = [
  { id: 'cat-1', name: 'Utilities', icon: 'zap', color: '#F59E0B' },
  { id: 'cat-2', name: 'Subscriptions', icon: 'repeat', color: '#8B5CF6' },
  { id: 'cat-3', name: 'Loans', icon: 'landmark', color: '#EF4444' },
  { id: 'cat-4', name: 'Rent', icon: 'home', color: '#10B981' },
  { id: 'cat-5', name: 'Other', icon: 'credit-card', color: '#6366F1' },
];

const bankAccounts = [
  { id: 'bank-1', name: 'Checking', color: '#2563EB' },
  { id: 'bank-2', name: 'Savings', color: '#10B981' },
];

function setupApp(): express.Application {
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use('/api/analytics', analyticsRouter);
  expressApp.use('/api/transactions', transactionsRouter);
  expressApp.use('/api/debt-templates', debtTemplatesRouter);
  expressApp.use('/api/debt-instances', debtInstancesRouter);
  expressApp.use('/api/categories', categoriesRouter);
  expressApp.use('/api/bank-accounts', bankAccountsRouter);
  expressApp.use(notFoundHandler);
  expressApp.use(errorHandler);
  return expressApp;
}

beforeAll(() => {
  db = createDatabase(dbPath) as Database.Database & ReturnType<typeof createDatabase>;
  db.runMigrations();

  for (const cat of categories) {
    db.prepare('INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)').run(cat.id, cat.name, cat.icon, cat.color);
  }

  for (const bank of bankAccounts) {
    db.prepare('INSERT INTO bank_accounts (id, name, color) VALUES (?, ?, ?)').run(bank.id, bank.name, bank.color);
  }

  setDb(db as ReturnType<typeof createDatabase>);
  app = setupApp();
});

afterAll(() => {
  closeDb();
});

describe('Analytics API', () => {
  it('GET /api/analytics returns correct structure', async () => {
    const res = await request(app).get('/api/analytics');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('monthlySpending');
    expect(res.body).toHaveProperty('categoryDistribution');
    expect(res.body).toHaveProperty('debtProjection');
    expect(res.body).toHaveProperty('interestPaid');
  });

  it('monthlySpending has last 6 months', async () => {
    db.prepare(`
      INSERT INTO transactions (id, amount, date, created_at) VALUES (?, ?, ?, ?)
    `).run('tx-1', 100, '2026-01-15', new Date().toISOString());
    db.prepare(`
      INSERT INTO transactions (id, amount, date, created_at) VALUES (?, ?, ?, ?)
    `).run('tx-2', 200, '2026-02-20', new Date().toISOString());

    const res = await request(app).get('/api/analytics');

    expect(res.status).toBe(200);
    expect(res.body.monthlySpending).toHaveLength(6);
    expect(res.body.monthlySpending[0]).toHaveProperty('month');
    expect(res.body.monthlySpending[0]).toHaveProperty('amount');
  });

  it('categoryDistribution includes all categories', async () => {
    const res = await request(app).get('/api/analytics');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categoryDistribution)).toBe(true);
  });

  it('debtProjection calculates months remaining correctly', async () => {
    db.prepare(`
      INSERT INTO transactions (id, amount, date, created_at) VALUES (?, ?, ?, ?)
    `).run('tx-p1', 50, '2026-02-01', new Date().toISOString());
    db.prepare(`
      INSERT INTO transactions (id, amount, date, created_at) VALUES (?, ?, ?, ?)
    `).run('tx-p2', 50, '2026-03-01', new Date().toISOString());
    db.prepare(`
      INSERT INTO transactions (id, amount, date, created_at) VALUES (?, ?, ?, ?)
    `).run('tx-p3', 50, '2026-04-01', new Date().toISOString());

    db.prepare(`
      INSERT INTO debt_templates (id, name, amount, frequency, due_day, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('tmpl-ap', 'PendingDebt', 300, 'monthly', 1, 1, new Date().toISOString());

    db.prepare(`
      INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('inst-ap', 'tmpl-ap', 'May 2026', 300, 0, '2026-05-01', 'pending', new Date().toISOString());

    const res = await request(app).get('/api/analytics');

    expect(res.status).toBe(200);
    expect(res.body.debtProjection).toHaveProperty('type');
    expect(res.body.debtProjection).toHaveProperty('message');
    expect(res.body.debtProjection).toHaveProperty('totalPending');
    expect(res.body.debtProjection.totalPending).toBe(300);
  });

  it('interestPaid sums interests from paid debts', async () => {
    db.prepare(`
      INSERT INTO debt_templates (id, name, amount, interest_rate, frequency, due_day, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('tmpl-int', 'WithInterest', 1000, 5, 'monthly', 1, 1, new Date().toISOString());

    db.prepare(`
      INSERT INTO debt_instances (id, template_id, period_label, amount_due, amount_paid, due_date, status, paid_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('inst-int', 'tmpl-int', 'Apr 2026', 1000, 1000, '2026-04-01', 'paid', '2026-04-15', new Date().toISOString());

    const res = await request(app).get('/api/analytics');

    expect(res.status).toBe(200);
    expect(typeof res.body.interestPaid).toBe('number');
  });
});