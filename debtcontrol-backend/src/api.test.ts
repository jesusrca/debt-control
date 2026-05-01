import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import Database from 'better-sqlite3';

import { createDatabase, setDb, closeDb } from './db/index.js';
import debtTemplatesRouter from './routes/debtTemplates.js';
import debtInstancesRouter from './routes/debtInstances.js';
import transactionsRouter from './routes/transactions.js';
import bankAccountsRouter from './routes/bankAccounts.js';
import categoriesRouter from './routes/categories.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const dbPath = ':memory:';
let app: express.Application;

function setupApp(): express.Application {
  const expressApp = express();
  expressApp.use(express.json());
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

describe('Categories API', () => {
  it('GET /api/categories returns seeded categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
  });

  it('POST /api/categories creates new category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Test Category', color: '#FF0000' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Category');
  });
});

describe('Bank Accounts API', () => {
  it('GET /api/bank-accounts returns seeded accounts', async () => {
    const res = await request(app).get('/api/bank-accounts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('POST /api/bank-accounts creates new account', async () => {
    const res = await request(app)
      .post('/api/bank-accounts')
      .send({ name: 'Test Bank', color: '#00FF00' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Bank');
  });
});

describe('Debt Templates API', () => {
  it('GET /api/debt-templates returns empty list initially', async () => {
    const res = await request(app).get('/api/debt-templates');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('POST /api/debt-templates creates template', async () => {
    const res = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Internet', amount: 50, frequency: 'monthly', due_day: 15 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Internet');
    expect(res.body.amount).toBe(50);
  });

  it('GET /api/debt-templates/:id returns template', async () => {
    const createRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Rent', amount: 1000, frequency: 'monthly', due_day: 1 });
    const res = await request(app).get(`/api/debt-templates/${createRes.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Rent');
  });

  it('PUT /api/debt-templates/:id updates template', async () => {
    const createRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Phone', amount: 30, frequency: 'monthly', due_day: 20 });
    const res = await request(app)
      .put(`/api/debt-templates/${createRes.body.id}`)
      .send({ amount: 35 });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(35);
  });

  it('DELETE /api/debt-templates/:id soft deletes', async () => {
    const createRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'ToDelete', amount: 10, frequency: 'weekly', due_day: 1 });
    const deleteRes = await request(app).delete(`/api/debt-templates/${createRes.body.id}`);
    expect(deleteRes.status).toBe(204);
    const getRes = await request(app).get('/api/debt-templates');
    const found = getRes.body.find((t: { id: string }) => t.id === createRes.body.id);
    expect(found).toBeUndefined();
  });
});

describe('Debt Instances API', () => {
  it('POST /api/debt-instances creates instance', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Water', amount: 100, frequency: 'monthly', due_day: 1 });

    const res = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'May 2026',
        amount_due: 100,
        due_date: '2026-05-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.period_label).toBe('May 2026');
  });

  it('POST /api/debt-instances/:id/pay partial payment keeps pending', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'PartialTest', amount: 100, frequency: 'monthly', due_day: 1 });

    const instanceRes = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'June 2026',
        amount_due: 100,
        due_date: '2026-06-01',
      });

    const payRes = await request(app)
      .post(`/api/debt-instances/${instanceRes.body.id}/pay`)
      .send({ amount: 50 });

    expect(payRes.status).toBe(200);
    expect(payRes.body.instance.status).toBe('pending');
    expect(payRes.body.instance.amount_paid).toBe(50);
    expect(payRes.body.transaction.amount).toBe(50);
  });

  it('POST /api/debt-instances/:id/pay full payment marks paid', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'FullPayTest', amount: 100, frequency: 'monthly', due_day: 1 });

    const instanceRes = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'July 2026',
        amount_due: 100,
        due_date: '2026-07-01',
      });

    const payRes = await request(app)
      .post(`/api/debt-instances/${instanceRes.body.id}/pay`)
      .send({ amount: 100 });

    expect(payRes.status).toBe(200);
    expect(payRes.body.instance.status).toBe('paid');
    expect(payRes.body.instance.amount_paid).toBe(100);
    expect(payRes.body.instance.paid_at).toBeDefined();
  });

  it('POST /api/debt-instances/:id/pay exceeds remaining returns error', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'OverpayTest', amount: 50, frequency: 'monthly', due_day: 1 });

    const instanceRes = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'Aug 2026',
        amount_due: 50,
        due_date: '2026-08-01',
      });

    const payRes = await request(app)
      .post(`/api/debt-instances/${instanceRes.body.id}/pay`)
      .send({ amount: 100 });

    expect(payRes.status).toBe(400);
    expect(payRes.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Transactions API', () => {
  it('POST /api/transactions creates and returns transaction', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ amount: 75, date: '2026-05-01' });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(75);
  });

  it('GET /api/transactions with bank_id filter works', async () => {
    const bankRes = await request(app)
      .post('/api/bank-accounts')
      .send({ name: 'FilterTest', color: '#ABCDEF' });

    await request(app)
      .post('/api/transactions')
      .send({ amount: 30, date: '2026-05-15', bank_account_id: bankRes.body.id });

    const res = await request(app)
      .get(`/api/transactions?bank_id=${bankRes.body.id}`);
    expect(res.status).toBe(200);
  });
});