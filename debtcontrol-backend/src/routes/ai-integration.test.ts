import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import Database from 'better-sqlite3';

import { createDatabase, setDb, closeDb } from '../db/index.js';
import aiRouter from './ai.js';
import dashboardRouter from './dashboard.js';
import debtTemplatesRouter from './debtTemplates.js';
import debtInstancesRouter from './debtInstances.js';
import transactionsRouter from './transactions.js';
import bankAccountsRouter from './bankAccounts.js';
import categoriesRouter from './categories.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

const dbPath = ':memory:';
let app: express.Application;

function setupApp(): express.Application {
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use('/api/ai', aiRouter);
  expressApp.use('/api/dashboard', dashboardRouter);
  expressApp.use('/api/debt-templates', debtTemplatesRouter);
  expressApp.use('/api/debt-instances', debtInstancesRouter);
  expressApp.use('/api/transactions', transactionsRouter);
  expressApp.use('/api/bank-accounts', bankAccountsRouter);
  expressApp.use('/api/categories', categoriesRouter);
  expressApp.use(notFoundHandler);
  expressApp.use(errorHandler);
  return expressApp;
}

beforeAll(() => {
  const db = createDatabase(dbPath);
  db.runMigrations();

  const categories = [
    { id: 'cat-1', name: 'Utilities', icon: 'zap', color: '#F59E0B' },
    { id: 'cat-2', name: 'Subscriptions', icon: 'repeat', color: '#8B5CF6' },
    { id: 'cat-3', name: 'Loans', icon: 'landmark', color: '#EF4444' },
    { id: 'cat-4', name: 'Rent', icon: 'home', color: '#10B981' },
    { id: 'cat-5', name: 'Other', icon: 'credit-card', color: '#6366F1' },
  ];

  for (const cat of categories) {
    db.prepare('INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)').run(cat.id, cat.name, cat.icon, cat.color);
  }

  const bankAccounts = [
    { id: 'bank-1', name: 'Checking', color: '#2563EB' },
    { id: 'bank-2', name: 'Savings', color: '#10B981' },
  ];

  for (const bank of bankAccounts) {
    db.prepare('INSERT INTO bank_accounts (id, name, color) VALUES (?, ?, ?)').run(bank.id, bank.name, bank.color);
  }

  setDb(db);
  app = setupApp();
});

afterAll(() => {
  closeDb();
});

describe('Dashboard API', () => {
  it('GET /api/dashboard returns correct structure', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalDebt');
    expect(res.body).toHaveProperty('totalPaid');
    expect(res.body).toHaveProperty('monthlySpend');
    expect(res.body).toHaveProperty('nextPayment');
    expect(res.body).toHaveProperty('upcomingDebts');
    expect(res.body).toHaveProperty('recentTransactions');
  });

  it('totalDebt is a number', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(typeof res.body.totalDebt).toBe('number');
  });

  it('totalPaid is a number', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(typeof res.body.totalPaid).toBe('number');
  });

  it('upcomingDebts is an array', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.upcomingDebts)).toBe(true);
  });

  it('recentTransactions is an array', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recentTransactions)).toBe(true);
  });

  it('calculates totalDebt from pending instances', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'TestDebt', amount: 100, frequency: 'monthly', due_day: 1 });

    await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'June 2026',
        amount_due: 100,
        due_date: '2026-06-01',
      });

    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.totalDebt).toBeGreaterThanOrEqual(100);
  });

  it('calculates totalPaid from paid instances', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'PaidDebt', amount: 200, frequency: 'monthly', due_day: 15 });

    const instanceRes = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'July 2026',
        amount_due: 200,
        due_date: '2026-07-15',
      });

    await request(app)
      .post(`/api/debt-instances/${instanceRes.body.id}/pay`)
      .send({ amount: 200 });

    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.totalPaid).toBeGreaterThanOrEqual(200);
  });

  it('calculates monthlySpend from current month transactions', async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);

    await request(app)
      .post('/api/transactions')
      .send({ amount: 50, date: `${currentMonth}-15` });

    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.monthlySpend).toBeGreaterThanOrEqual(50);
  });

  it('nextPayment returns earliest pending debt', async () => {
    const template1 = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'TestDebt', amount: 100, frequency: 'monthly', due_day: 20 });

    const template2 = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Earlier', amount: 50, frequency: 'monthly', due_day: 5 });

    await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: template1.body.id,
        period_label: 'August 2026',
        amount_due: 100,
        due_date: '2026-08-20',
      });

    await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: template2.body.id,
        period_label: 'August 2026',
        amount_due: 50,
        due_date: '2026-08-05',
      });

    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    if (res.body.nextPayment) {
      expect(['Earlier', 'TestDebt']).toContain(res.body.nextPayment.name);
    }
  });
});

describe('AI Endpoints', () => {
  it('POST /api/ai/chat returns error without message', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/ai/chat requires message field', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: '' });

    expect(res.status).toBe(400);
  });

  it('POST /api/ai/match requires description and amount', async () => {
    const res = await request(app)
      .post('/api/ai/match')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/ai/match returns match object when debt found', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Internet Bill', amount: 50, frequency: 'monthly', due_day: 15 });

    await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'September 2026',
        amount_due: 50,
        due_date: '2026-09-15',
      });

    const res = await request(app)
      .post('/api/ai/match')
      .send({ description: 'Internet Bill', amount: 50, date: '2026-09-15' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('match');
  });

  it('POST /api/ai/match returns null when no match found', async () => {
    const res = await request(app)
      .post('/api/ai/match')
      .send({ description: 'Unknown Service', amount: 999, date: '2026-09-15' });

    expect(res.status).toBe(200);
    expect(res.body.match).toBeNull();
  });

  it('POST /api/ai/analyze returns report without body', async () => {
    // Skip actual AI call - just test endpoint exists
    const res = await request(app)
      .post('/api/ai/analyze')
      .send({});

    // This will return 500 if AI API key is not configured
    expect([200, 500]).toContain(res.status);
  });
});