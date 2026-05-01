import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import Database from 'better-sqlite3';

import { createDatabase, setDb, closeDb } from '../db/index.js';
import debtInstancesRouter from '../routes/debtInstances.js';
import bankAccountsRouter from '../routes/bankAccounts.js';
import debtTemplatesRouter from '../routes/debtTemplates.js';
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
  expressApp.use('/api/debt-instances', debtInstancesRouter);
  expressApp.use('/api/debt-templates', debtTemplatesRouter);
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

describe('payment logic', () => {
  it('partial payment does not complete debt', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'PartialDebt', amount: 100, frequency: 'monthly', due_day: 1 });

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
      .send({ amount: 50 });

    expect(payRes.status).toBe(200);
    expect(payRes.body.instance.status).toBe('pending');
    expect(payRes.body.instance.amount_paid).toBe(50);
  });

  it('full payment marks as paid', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'FullPay', amount: 200, frequency: 'monthly', due_day: 15 });

    const instanceRes = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'August 2026',
        amount_due: 200,
        due_date: '2026-08-15',
      });

    const payRes = await request(app)
      .post(`/api/debt-instances/${instanceRes.body.id}/pay`)
      .send({ amount: 200 });

    expect(payRes.status).toBe(200);
    expect(payRes.body.instance.status).toBe('paid');
    expect(payRes.body.instance.amount_paid).toBe(200);
    expect(payRes.body.instance.paid_at).toBeDefined();
  });

  it('payment exceeding remaining returns error', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Overpay', amount: 75, frequency: 'monthly', due_day: 10 });

    const instanceRes = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'Sept 2026',
        amount_due: 75,
        due_date: '2026-09-10',
      });

    const payRes = await request(app)
      .post(`/api/debt-instances/${instanceRes.body.id}/pay`)
      .send({ amount: 150 });

    expect(payRes.status).toBe(400);
    expect(payRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('overpayment edge case returns error', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'SmallDebt', amount: 100, frequency: 'monthly', due_day: 5 });

    const instanceRes = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'Oct 2026',
        amount_due: 100,
        due_date: '2026-10-05',
      });

    const payRes = await request(app)
      .post(`/api/debt-instances/${instanceRes.body.id}/pay`)
      .send({ amount: 150 });

    expect(payRes.status).toBe(400);
    expect(payRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(payRes.body.error.details.remaining).toBe(100);
  });

  it('transaction is created correctly', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'WithBank', amount: 50, frequency: 'monthly', due_day: 20 });

    const instanceRes = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'Nov 2026',
        amount_due: 50,
        due_date: '2026-11-20',
      });

    const payRes = await request(app)
      .post(`/api/debt-instances/${instanceRes.body.id}/pay`)
      .send({ amount: 50 });

    expect(payRes.status).toBe(200);
    expect(payRes.body.transaction.amount).toBe(50);
    expect(payRes.body.transaction.debt_instance_id).toBeDefined();
  });
});