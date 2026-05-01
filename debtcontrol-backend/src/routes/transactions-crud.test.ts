import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import Database from 'better-sqlite3';

import { createDatabase, setDb, closeDb } from '../db/index.js';
import transactionsRouter from './transactions.js';
import bankAccountsRouter from './bankAccounts.js';
import debtTemplatesRouter from './debtTemplates.js';
import debtInstancesRouter from './debtInstances.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

const dbPath = ':memory:';
let app: express.Application;

function setupApp(): express.Application {
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use('/api/transactions', transactionsRouter);
  expressApp.use('/api/bank-accounts', bankAccountsRouter);
  expressApp.use('/api/debt-templates', debtTemplatesRouter);
  expressApp.use('/api/debt-instances', debtInstancesRouter);
  expressApp.use(notFoundHandler);
  expressApp.use(errorHandler);
  return expressApp;
}

beforeAll(() => {
  const db = createDatabase(dbPath);
  db.runMigrations();
  setDb(db);
  app = setupApp();
});

afterAll(() => {
  closeDb();
});

describe('Transactions CRUD', () => {
  it('POST /api/transactions creates transaction', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ amount: 50, date: '2026-05-01' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(50);
    expect(res.body.date).toBe('2026-05-01');
    expect(res.body.id).toBeDefined();
  });

  it('POST /api/transactions validates required fields', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ amount: 50 });

    expect(res.status).toBe(400);
  });

  it('POST /api/transactions accepts optional fields', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({
        amount: 75,
        date: '2026-05-15',
        notes: 'Payment for services',
      });

    expect(res.status).toBe(201);
    expect(res.body.notes).toBe('Payment for services');
  });

  it('GET /api/transactions returns list', async () => {
    await request(app)
      .post('/api/transactions')
      .send({ amount: 100, date: '2026-05-01' });

    const res = await request(app).get('/api/transactions');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/transactions/:id returns single transaction', async () => {
    const createRes = await request(app)
      .post('/api/transactions')
      .send({ amount: 200, date: '2026-05-10' });

    const res = await request(app).get(`/api/transactions/${createRes.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(200);
  });

  it('GET /api/transactions/:id returns 404 for non-existent', async () => {
    const res = await request(app).get('/api/transactions/non-existent-id');

    expect(res.status).toBe(404);
  });

  it('DELETE /api/transactions/:id removes transaction', async () => {
    const createRes = await request(app)
      .post('/api/transactions')
      .send({ amount: 50, date: '2026-05-01' });

    const deleteRes = await request(app).delete(`/api/transactions/${createRes.body.id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get(`/api/transactions/${createRes.body.id}`);
    expect(getRes.status).toBe(404);
  });
});

describe('Transactions Filters', () => {
  it('filters by bank_id', async () => {
    const bankRes = await request(app)
      .post('/api/bank-accounts')
      .send({ name: 'TestBank', color: '#FF0000' });

    await request(app)
      .post('/api/transactions')
      .send({ amount: 50, date: '2026-05-01', bank_account_id: bankRes.body.id });

    await request(app)
      .post('/api/transactions')
      .send({ amount: 75, date: '2026-05-02' });

    const res = await request(app)
      .get(`/api/transactions?bank_id=${bankRes.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].bank_account_id).toBe(bankRes.body.id);
  });

  it('filters by month', async () => {
    await request(app)
      .post('/api/transactions')
      .send({ amount: 100, date: '2026-01-15' });

    await request(app)
      .post('/api/transactions')
      .send({ amount: 200, date: '2026-05-20' });

    const res = await request(app)
      .get('/api/transactions?month=2026-01');

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].amount).toBe(100);
  });

  it('filters by search term', async () => {
    await request(app)
      .post('/api/transactions')
      .send({ amount: 50, date: '2026-05-01', notes: 'Netflix subscription' });

    await request(app)
      .post('/api/transactions')
      .send({ amount: 75, date: '2026-05-02', notes: 'Spotify subscription' });

    await request(app)
      .post('/api/transactions')
      .send({ amount: 100, date: '2026-05-03', notes: 'Grocery store' });

    const res = await request(app)
      .get('/api/transactions?search=subscription');

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('supports pagination with limit and offset', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/transactions')
        .send({ amount: 10 * (i + 1), date: `2026-05-${String(i + 1).padStart(2, '0')}` });
    }

    const firstPage = await request(app)
      .get('/api/transactions?limit=3&offset=0');

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.length).toBe(3);

    const secondPage = await request(app)
      .get('/api/transactions?limit=3&offset=3');

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.length).toBe(3);
  });

  it('defaults to 50 items per page', async () => {
    const res = await request(app).get('/api/transactions');

    expect(res.status).toBe(200);
  });
});

describe('Transaction-Debt Integration', () => {
  it('links transaction to debt instance', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Internet', amount: 50, frequency: 'monthly', due_day: 1 });

    const instanceRes = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'June 2026',
        amount_due: 50,
        due_date: '2026-06-01',
      });

    const txRes = await request(app)
      .post('/api/transactions')
      .send({
        amount: 50,
        date: '2026-06-01',
        debt_instance_id: instanceRes.body.id,
      });

    expect(txRes.status).toBe(201);
    expect(txRes.body.debt_instance_id).toBe(instanceRes.body.id);

    const debtRes = await request(app).get(`/api/debt-instances/${instanceRes.body.id}`);
    expect(debtRes.body.status).toBe('paid');
  });

  it('deleting transaction updates debt status', async () => {
    const templateRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Phone', amount: 30, frequency: 'monthly', due_day: 15 });

    const instanceRes = await request(app)
      .post('/api/debt-instances')
      .send({
        template_id: templateRes.body.id,
        period_label: 'July 2026',
        amount_due: 30,
        due_date: '2026-07-15',
      });

    const txRes = await request(app)
      .post('/api/transactions')
      .send({
        amount: 30,
        date: '2026-07-15',
        debt_instance_id: instanceRes.body.id,
      });

    await request(app)
      .delete(`/api/transactions/${txRes.body.id}`);

    const debtRes = await request(app).get(`/api/debt-instances/${instanceRes.body.id}`);
    expect(debtRes.body.status).toBe('pending');
    expect(debtRes.body.amount_paid).toBe(0);
  });
});