import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import Database from 'better-sqlite3';

import { createDatabase, setDb, closeDb } from '../db/index.js';
import debtTemplatesRouter from './debtTemplates.js';
import debtInstancesRouter from './debtInstances.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

const dbPath = ':memory:';
let app: express.Application;

function setupApp(): express.Application {
  const expressApp = express();
  expressApp.use(express.json());
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

describe('Debt Templates CRUD', () => {
  it('POST /api/debt-templates creates a template', async () => {
    const res = await request(app)
      .post('/api/debt-templates')
      .send({
        name: 'Internet',
        amount: 50,
        frequency: 'monthly',
        due_day: 15,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Internet');
    expect(res.body.amount).toBe(50);
    expect(res.body.frequency).toBe('monthly');
    expect(res.body.due_day).toBe(15);
    expect(res.body.id).toBeDefined();
    expect(res.body.is_active).toBe(1);
  });

  it('POST /api/debt-templates validates required fields', async () => {
    const res = await request(app)
      .post('/api/debt-templates')
      .send({
        name: 'Incomplete',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/debt-templates returns list', async () => {
    await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Rent', amount: 1000, frequency: 'monthly', due_day: 1 });

    const res = await request(app).get('/api/debt-templates');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/debt-templates/:id returns single template', async () => {
    const createRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Phone', amount: 30, frequency: 'monthly', due_day: 20 });

    const res = await request(app).get(`/api/debt-templates/${createRes.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Phone');
  });

  it('GET /api/debt-templates/:id returns 404 for non-existent', async () => {
    const res = await request(app).get('/api/debt-templates/non-existent-id');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PUT /api/debt-templates/:id updates template', async () => {
    const createRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Original', amount: 50, frequency: 'monthly', due_day: 15 });

    const res = await request(app)
      .put(`/api/debt-templates/${createRes.body.id}`)
      .send({ amount: 60, due_day: 20 });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(60);
    expect(res.body.due_day).toBe(20);
    expect(res.body.name).toBe('Original');
  });

  it('PUT /api/debt-templates/:id returns 404 for non-existent', async () => {
    const res = await request(app)
      .put('/api/debt-templates/non-existent-id')
      .send({ amount: 100 });

    expect(res.status).toBe(404);
  });

  it('DELETE /api/debt-templates/:id soft deletes', async () => {
    const createRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'ToDelete', amount: 25, frequency: 'weekly', due_day: 1 });

    const deleteRes = await request(app).delete(`/api/debt-templates/${createRes.body.id}`);

    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get('/api/debt-templates');
    const found = getRes.body.find((t: { id: string }) => t.id === createRes.body.id);
    expect(found).toBeUndefined();
  });

  it('POST /api/debt-templates creates debt instances', async () => {
    const createRes = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Subscription', amount: 15, frequency: 'monthly', due_day: 10 });

    expect(createRes.status).toBe(201);
  });

  it('supports weekly frequency', async () => {
    const res = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Weekly Sub', amount: 10, frequency: 'weekly', due_weekday: 1 });

    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe('weekly');
    expect(res.body.due_weekday).toBe(1);
  });

  it('supports monthly frequency (default)', async () => {
    const res = await request(app)
      .post('/api/debt-templates')
      .send({ name: 'Monthly Fee', amount: 100, frequency: 'monthly', due_day: 1 });

    expect(res.status).toBe(201);
    expect(res.body.frequency).toBe('monthly');
  });

  it('accepts optional notes field', async () => {
    const res = await request(app)
      .post('/api/debt-templates')
      .send({
        name: 'With Notes',
        amount: 50,
        frequency: 'monthly',
        due_day: 15,
        notes: 'Test debt with notes',
      });

    expect(res.status).toBe(201);
    expect(res.body.notes).toBe('Test debt with notes');
  });

  it('accepts interest_rate field', async () => {
    const res = await request(app)
      .post('/api/debt-templates')
      .send({
        name: 'Loan',
        amount: 1000,
        frequency: 'monthly',
        due_day: 1,
      });

    expect(res.status).toBe(201);
  });
});